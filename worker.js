const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // POST /api/payments -> create QRIS payment
        if (request.method === 'POST' && path === '/api/payments') {
            return proxyPost(env, 'https://instanpay.net/api/v1/payments', request);
        }

        // POST /api/crypto-payments -> create crypto payment
        if (request.method === 'POST' && path === '/api/crypto-payments') {
            return proxyPost(env, 'https://instanpay.net/api/v1/crypto-payments', request);
        }

        // GET /api/status/:id -> check QRIS status
        if (request.method === 'GET' && path.startsWith('/api/status/')) {
            const txnId = path.split('/api/status/')[1];
            return proxyGet(env, 'https://instanpay.net/api/v1/status/' + txnId);
        }

        // GET /api/crypto-status/:id -> check crypto status
        if (request.method === 'GET' && path.startsWith('/api/crypto-status/')) {
            const txnId = path.split('/api/crypto-status/')[1];
            return proxyGet(env, 'https://instanpay.net/api/v1/crypto-status/' + txnId);
        }

        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    },
};

async function proxyPost(env, targetUrl, request) {
    const body = await request.text();
    const resp = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': env.INSTANPAY_API_KEY,
        },
        body: body,
    });
    const data = await resp.text();
    return new Response(data, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}

async function proxyGet(env, targetUrl) {
    const resp = await fetch(targetUrl, {
        method: 'GET',
        headers: {
            'X-API-Key': env.INSTANPAY_API_KEY,
        },
    });
    const data = await resp.text();
    return new Response(data, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}
