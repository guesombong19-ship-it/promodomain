const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS },
    });
}

function err(msg, status = 400) {
    return json({ success: false, error: msg }, status);
}

async function hashPassword(password) {
    const salt = 'dku_' + password.length;
    const data = new TextEncoder().encode(salt + password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getUser(env, request) {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.split(' ')[1];
    const session = await env.DB.prepare(
        "SELECT u.id, u.email, u.name, u.created_at FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
    ).bind(token).first();
    return session || null;
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS });
        }

        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        try {
            // ===== AUTH ROUTES =====

            // POST /api/auth/register
            if (method === 'POST' && path === '/api/auth/register') {
                const body = await request.json();
                const { email, name, password } = body;
                if (!email || !name || !password) return err('Email, nama, dan password wajib diisi');
                if (password.length < 6) return err('Password minimal 6 karakter');

                const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
                if (existing) return err('Email sudah terdaftar');

                const hash = await hashPassword(password);
                await env.DB.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').bind(email.toLowerCase(), name, hash).run();
                return json({ success: true, message: 'Registrasi berhasil' });
            }

            // POST /api/auth/login
            if (method === 'POST' && path === '/api/auth/login') {
                const body = await request.json();
                const { email, password } = body;
                if (!email || !password) return err('Email dan password wajib diisi');

                const hash = await hashPassword(password);
                const user = await env.DB.prepare('SELECT id, email, name FROM users WHERE email = ? AND password_hash = ?').bind(email.toLowerCase(), hash).first();
                if (!user) return err('Email atau password salah');

                const token = generateToken();
                const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                await env.DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').bind(user.id, token, expires).run();

                return json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name } } });
            }

            // POST /api/auth/forgot-password
            if (method === 'POST' && path === '/api/auth/forgot-password') {
                const body = await request.json();
                const { email } = body;
                if (!email) return err('Email wajib diisi');

                const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
                if (!user) return err('Email tidak ditemukan');

                const resetToken = generateToken();
                const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                await env.DB.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').bind(user.id, resetToken, expires).run();

                return json({ success: true, message: 'Link reset password berhasil dikirim', reset_token: resetToken });
            }

            // POST /api/auth/reset-password
            if (method === 'POST' && path === '/api/auth/reset-password') {
                const body = await request.json();
                const { token, password } = body;
                if (!token || !password) return err('Token dan password wajib diisi');
                if (password.length < 6) return err('Password minimal 6 karakter');

                const reset = await env.DB.prepare("SELECT user_id FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')").bind(token).first();
                if (!reset) return err('Token tidak valid atau sudah kadaluarsa');

                const hash = await hashPassword(password);
                await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, reset.user_id).run();
                await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').bind(token).run();

                return json({ success: true, message: 'Password berhasil diubah' });
            }

            // GET /api/auth/me
            if (method === 'GET' && path === '/api/auth/me') {
                const user = await getUser(env, request);
                if (!user) return err('Unauthorized', 401);
                return json({ success: true, data: user });
            }

            // POST /api/auth/logout
            if (method === 'POST' && path === '/api/auth/logout') {
                const auth = request.headers.get('Authorization');
                if (auth && auth.startsWith('Bearer ')) {
                    const token = auth.split(' ')[1];
                    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
                }
                return json({ success: true, message: 'Logout berhasil' });
            }

            // ===== TRANSACTION ROUTES =====

            // GET /api/transactions
            if (method === 'GET' && path === '/api/transactions') {
                const user = await getUser(env, request);
                const txns = user
                    ? await env.DB.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(user.id).all()
                    : { results: [] };
                return json({ success: true, data: txns.results || [] });
            }

            // ===== PAYMENT ROUTES (Instanpay Proxy) =====

            // POST /api/payments -> QRIS
            if (method === 'POST' && path === '/api/payments') {
                const body = await request.json();
                const user = await getUser(env, request);

                const resp = await fetch('https://instanpay.net/api/v1/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': env.INSTANPAY_API_KEY },
                    body: JSON.stringify(body),
                });
                const result = await resp.json();

                if (result.success) {
                    await env.DB.prepare(
                        'INSERT INTO transactions (user_id, transaction_id, domain, base_amount, total_amount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
                    ).bind(
                        user ? user.id : null,
                        result.data.transactionId,
                        body.domain || null,
                        result.data.baseAmount,
                        result.data.totalAmount,
                        'qris',
                        'PENDING'
                    ).run();
                }

                return new Response(JSON.stringify(result), {
                    status: resp.status,
                    headers: { 'Content-Type': 'application/json', ...CORS },
                });
            }

            // POST /api/crypto-payments
            if (method === 'POST' && path === '/api/crypto-payments') {
                const body = await request.json();
                const user = await getUser(env, request);

                const resp = await fetch('https://instanpay.net/api/v1/crypto-payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': env.INSTANPAY_API_KEY },
                    body: JSON.stringify(body),
                });
                const result = await resp.json();

                if (result.success) {
                    await env.DB.prepare(
                        'INSERT INTO transactions (user_id, transaction_id, domain, base_amount, total_amount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
                    ).bind(
                        user ? user.id : null,
                        result.data.transactionId,
                        body.domain || null,
                        Math.round(body.amount_usd * 100),
                        Math.round(body.amount_usd * 100),
                        'crypto_' + (body.chain || '').toLowerCase(),
                        'PENDING'
                    ).run();
                }

                return new Response(JSON.stringify(result), {
                    status: resp.status,
                    headers: { 'Content-Type': 'application/json', ...CORS },
                });
            }

            // GET /api/status/:id -> QRIS status
            if (method === 'GET' && path.startsWith('/api/status/')) {
                const txnId = path.split('/api/status/')[1];
                const resp = await fetch('https://instanpay.net/api/v1/status/' + txnId, {
                    headers: { 'X-API-Key': env.INSTANPAY_API_KEY },
                });
                const result = await resp.json();

                if (result.success && result.data.status === 'PAID') {
                    await env.DB.prepare("UPDATE transactions SET status = 'PAID', paid_at = ? WHERE transaction_id = ?").bind(result.data.paidAt || new Date().toISOString(), txnId).run();
                } else if (result.success && result.data.status === 'EXPIRED') {
                    await env.DB.prepare("UPDATE transactions SET status = 'EXPIRED' WHERE transaction_id = ?").bind(txnId).run();
                }

                return new Response(JSON.stringify(result), {
                    status: resp.status,
                    headers: { 'Content-Type': 'application/json', ...CORS },
                });
            }

            // GET /api/crypto-status/:id
            if (method === 'GET' && path.startsWith('/api/crypto-status/')) {
                const txnId = path.split('/api/crypto-status/')[1];
                const resp = await fetch('https://instanpay.net/api/v1/crypto-status/' + txnId, {
                    headers: { 'X-API-Key': env.INSTANPAY_API_KEY },
                });
                const result = await resp.json();

                if (result.success && result.data.status === 'PAID') {
                    await env.DB.prepare("UPDATE transactions SET status = 'PAID', paid_at = ? WHERE transaction_id = ?").bind(result.data.paid_at || new Date().toISOString(), txnId).run();
                } else if (result.success && result.data.status === 'EXPIRED') {
                    await env.DB.prepare("UPDATE transactions SET status = 'EXPIRED' WHERE transaction_id = ?").bind(txnId).run();
                }

                return new Response(JSON.stringify(result), {
                    status: resp.status,
                    headers: { 'Content-Type': 'application/json', ...CORS },
                });
            }

            return err('Not found', 404);

        } catch (e) {
            return err('Internal error: ' + e.message, 500);
        }
    },
};
