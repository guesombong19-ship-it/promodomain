// ==================== CONFIG ====================
// Ganti URL ini dengan URL Worker Cloudflare kamu setelah deploy
const API_BASE = window.location.origin + '/api';
const rdapEndpoints = {
    '.com':   'https://rdap.verisign.com/com/v1/domain/',
    '.net':   'https://rdap.verisign.com/net/v1/domain/',
    '.org':   'https://rdap.publicinterestregistry.org/rdap/domain/',
    '.id':    'https://rdap.pandi.id/domain/',
    '.io':    'https://rdap.centralnic.com/io/domain/',
    '.dev':   'https://pubapi.registry.google/rdap/domain/',
    '.store': 'https://rdap.radix.host/rdap/domain/',
    '.xyz':   'https://rdap.centralnic.com/xyz/domain/',
    '.site':  'https://rdap.centralnic.com/site/domain/',
};

// ==================== PRICING DATA ====================
const pricingData = [
    { ext: '.com', normal: 189000, promo: 47250, discount: 75 },
    { ext: '.id', normal: 299000, promo: 56810, discount: 81 },
    { ext: '.net', normal: 179000, promo: 53700, discount: 70 },
    { ext: '.org', normal: 179000, promo: 53700, discount: 70 },
    { ext: '.io', normal: 499000, promo: 174650, discount: 65 },
    { ext: '.dev', normal: 399000, promo: 159600, discount: 60 },
    { ext: '.store', normal: 599000, promo: 179700, discount: 70 },
    { ext: '.xyz', normal: 99000, promo: 19800, discount: 80 },
    { ext: '.site', normal: 149000, promo: 29800, discount: 80 },
];

// ==================== RDAP CHECK ====================
function checkDomainRDAP(domain) {
    const ext = '.' + domain.split('.').slice(-1)[0];
    const baseUrl = rdapEndpoints[ext];
    if (!baseUrl) return Promise.resolve({ available: null, error: 'TLD tidak didukung' });

    return fetch(baseUrl + domain)
        .then(function(response) {
            if (response.ok) return { available: false, status: 'registered' };
            if (response.status === 404) return { available: true, status: 'available' };
            return { available: null, status: 'error' };
        })
        .catch(function() {
            return { available: null, status: 'error' };
        });
}

// ==================== CART ====================
let cart = [];

function formatRupiah(num) {
    return 'Rp ' + num.toLocaleString('id-ID');
}

function addToCart(ext, price) {
    const existing = cart.find(item => item.ext === ext);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ext: ext, price: price, qty: 1 });
    }
    updateCartUI();
    toggleCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    const bodyEl = document.getElementById('cart-body');
    const footerEl = document.getElementById('cart-footer');
    const totalEl = document.getElementById('cart-total');

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    countEl.textContent = totalItems;

    if (cart.length === 0) {
        bodyEl.innerHTML = '<p class="cart-empty">Keranjang masih kosong</p>';
        footerEl.style.display = 'none';
    } else {
        bodyEl.innerHTML = cart.map((item, i) =>
            '<div class="cart-item">' +
                '<div>' +
                    '<div class="cart-item-domain">Domain ' + item.ext + (item.qty > 1 ? ' x' + item.qty : '') + '</div>' +
                    '<div class="cart-item-price">' + formatRupiah(item.price * item.qty) + '</div>' +
                '</div>' +
                '<button class="cart-item-remove" onclick="removeFromCart(' + i + ')">&times;</button>' +
            '</div>'
        ).join('');
        footerEl.style.display = 'block';
        totalEl.textContent = formatRupiah(totalPrice);
    }
}

function toggleCart() {
    const panel = document.getElementById('cart-panel');
    panel.classList.toggle('open');

    let overlay = document.querySelector('.cart-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cart-overlay';
        overlay.onclick = toggleCart;
        document.body.appendChild(overlay);
    }
    overlay.classList.toggle('show');
}

// ==================== RDAP ENDPOINTS ====================

// ==================== DOMAIN SEARCH ====================
function searchDomain() {
    const nameEl = document.getElementById('domain-search');
    const extEl = document.getElementById('domain-ext');
    const resultsEl = document.getElementById('search-results');

    const name = nameEl.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!name) {
        nameEl.focus();
        return;
    }

    const extensions = ['.com', '.id', '.net', '.org', '.io', '.dev', '.store', '.xyz', '.site'];
    var checkDomains = extensions.map(function(ext) {
        return name + ext;
    });

    // Show loading with individual items
    resultsEl.innerHTML =
        '<div class="search-loading">' +
            '<div class="spinner"></div>' +
            '<p>Mengecek ketersediaan domain via RDAP...</p>' +
        '</div>';

    // Show placeholders first
    var placeholderHTML = checkDomains.map(function(domain) {
        var ext = '.' + domain.split('.').slice(-1)[0];
        return '<div class="search-result-item checking" id="result-' + domain.replace(/\./g, '-') + '">' +
            '<div>' +
                '<div class="domain-name">' + domain + '</div>' +
                '<div class="domain-status" style="color:var(--gray)">Mengecek...</div>' +
            '</div>' +
            '<div style="text-align:right">' +
                '<div class="domain-price"><div class="mini-spinner"></div></div>' +
            '</div>' +
        '</div>';
    }).join('');

    setTimeout(function() {
        resultsEl.innerHTML = placeholderHTML;

        // Check each domain via RDAP
        checkDomains.forEach(function(domain) {
            var ext = '.' + domain.split('.').slice(-1)[0];
            var priceData = pricingData.find(function(p) { return p.ext === ext; });
            var price = priceData ? priceData.promo : 99000;
            var elId = 'result-' + domain.replace(/\./g, '-');
            var el = document.getElementById(elId);

            checkDomainRDAP(domain).then(function(result) {
                if (!el) return;

                if (result.available === true) {
                    el.className = 'search-result-item';
                    el.innerHTML =
                        '<div>' +
                            '<div class="domain-name">' + domain + '</div>' +
                            '<div class="domain-status available">Tersedia</div>' +
                        '</div>' +
                        '<div style="text-align:right">' +
                            '<div class="domain-price"><strong>' + formatRupiah(price) + '</strong>/thn</div>' +
                            '<button class="btn btn-primary" style="margin-top:8px;padding:8px 16px;font-size:0.85rem" onclick="addToCart(\'' + ext + '\', ' + price + ')">Tambah</button>' +
                        '</div>';
                } else if (result.available === false) {
                    el.className = 'search-result-item taken';
                    el.innerHTML =
                        '<div>' +
                            '<div class="domain-name">' + domain + '</div>' +
                            '<div class="domain-status taken">Sudah terdaftar</div>' +
                        '</div>' +
                        '<div style="text-align:right">' +
                            '<div class="domain-price" style="color:var(--gray)">—</div>' +
                        '</div>';
                } else {
                    el.className = 'search-result-item';
                    el.innerHTML =
                        '<div>' +
                            '<div class="domain-name">' + domain + '</div>' +
                            '<div class="domain-status" style="color:var(--gray)">Gagal mengecek</div>' +
                        '</div>' +
                        '<div style="text-align:right">' +
                            '<div class="domain-price" style="color:var(--gray)">—</div>' +
                        '</div>';
                }
            });
        });
    }, 300);
}

// ==================== POPULATE PRICING TABLE ====================
function populatePricingTable() {
    const tbody = document.getElementById('pricing-body');
    tbody.innerHTML = pricingData.map(function(item) {
        return '<tr>' +
            '<td><strong>' + item.ext + '</strong></td>' +
            '<td class="old-price">' + formatRupiah(item.normal) + '</td>' +
            '<td class="new-price">' + formatRupiah(item.promo) + '</td>' +
            '<td><span class="discount-badge">' + item.discount + '% OFF</span></td>' +
            '<td><button class="btn btn-primary" onclick="addToCart(\'' + item.ext + '\', ' + item.promo + ')">Pesan</button></td>' +
        '</tr>';
    }).join('');
}

// ==================== ANIMATED COUNTERS ====================
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(function(counter) {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        function updateCounter() {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current).toLocaleString('id-ID');
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target.toLocaleString('id-ID');
            }
        }
        updateCounter();
    });
}

// ==================== CONFETTI EFFECT ====================
function createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#CE1126', '#FFFFFF', '#FFD700', '#E8384F', '#FF6B6B'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText =
            'position:absolute;' +
            'width:' + (Math.random() * 10 + 5) + 'px;' +
            'height:' + (Math.random() * 10 + 5) + 'px;' +
            'background:' + colors[Math.floor(Math.random() * colors.length)] + ';' +
            'top:-10px;' +
            'left:' + (Math.random() * 100) + '%;' +
            'opacity:' + (Math.random() * 0.7 + 0.3) + ';' +
            'border-radius:' + (Math.random() > 0.5 ? '50%' : '0') + ';' +
            'animation:confettiFall ' + (Math.random() * 3 + 4) + 's linear ' + (Math.random() * 5) + 's infinite;' +
            'pointer-events:none;';
        container.appendChild(confetti);
    }

    const style = document.createElement('style');
    style.textContent =
        '@keyframes confettiFall {' +
            '0% { transform: translateY(0) rotate(0deg); opacity: 1; }' +
            '100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }' +
        '}';
    document.head.appendChild(style);
}

// ==================== NAVBAR TOGGLE ====================
function setupNavbar() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    toggle.addEventListener('click', function() {
        links.classList.toggle('active');
    });

    document.querySelectorAll('.nav-links a').forEach(function(link) {
        link.addEventListener('click', function() {
            links.classList.remove('active');
        });
    });
}

// ==================== SCROLL ANIMATION ====================
function setupScrollAnimation() {
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.promo-card, .feature-card').forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ==================== ENTER KEY FOR SEARCH ====================
function setupSearchEnter() {
    const input = document.getElementById('domain-search');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchDomain();
        });
    }
}

// ==================== PAYMENT ====================
let currentTxnId = null;
let statusInterval = null;

function openCheckout() {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const summaryEl = document.getElementById('payment-summary');
    summaryEl.innerHTML = cart.map(function(item) {
        return '<div class="summary-item"><span>Domain ' + item.ext + (item.qty > 1 ? ' x' + item.qty : '') + '</span><span>' + formatRupiah(item.price * item.qty) + '</span></div>';
    }).join('') + '<div class="summary-total"><span>Total</span><span>' + formatRupiah(total) + '</span></div>';

    toggleCart();
    showStep('step-choose');
    document.getElementById('payment-overlay').classList.add('show');
    document.getElementById('payment-modal').classList.add('open');
}

function closePaymentModal() {
    document.getElementById('payment-overlay').classList.remove('show');
    document.getElementById('payment-modal').classList.remove('open');
    if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
    currentTxnId = null;
}

function showStep(stepId) {
    document.querySelectorAll('.payment-step').forEach(function(s) { s.style.display = 'none'; });
    document.getElementById(stepId).style.display = 'block';
}

function selectMethod(method) {
    if (method === 'qris') {
        createQRISPayment();
    } else {
        showStep('step-crypto');
        document.getElementById('crypto-form').style.display = 'flex';
        document.getElementById('crypto-loading').style.display = 'none';
        document.getElementById('crypto-content').style.display = 'none';
        document.getElementById('crypto-error').style.display = 'none';
    }
}

// --- QRIS ---
function createQRISPayment() {
    if (cart.length === 0) return;
    const total = cart.reduce(function(sum, item) { return sum + (item.price * item.qty); }, 0);

    showStep('step-qris');
    document.getElementById('qris-loading').style.display = 'block';
    document.getElementById('qris-content').style.display = 'none';
    document.getElementById('qris-error').style.display = 'none';

    fetch(API_BASE + '/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, customer_name: 'DomainKu Customer' })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success) {
            var d = res.data;
            currentTxnId = d.transactionId;
            document.getElementById('qris-qr').innerHTML = d.qrCodeSvg;
            document.getElementById('qris-total').textContent = d.totalFormatted + ' (termasuk kode unik ' + d.uniqueCode + ')';
            document.getElementById('qris-expire').textContent = 'Berlaku hingga ' + d.expiredAt;
            document.getElementById('qris-loading').style.display = 'none';
            document.getElementById('qris-content').style.display = 'block';
            startStatusPolling(d.transactionId);
        } else {
            throw new Error(res.error || 'Gagal membuat pembayaran');
        }
    })
    .catch(function() {
        document.getElementById('qris-loading').style.display = 'none';
        document.getElementById('qris-error').style.display = 'block';
    });
}

function retryQRIS() {
    createQRISPayment();
}

// --- CRYPTO ---
function createCryptoPayment() {
    if (cart.length === 0) return;
    var total = cart.reduce(function(sum, item) { return sum + (item.price * item.qty); }, 0);
    var amountUsd = parseFloat((total / 16000).toFixed(2));
    if (amountUsd < 0.01) amountUsd = 0.01;
    var chain = document.getElementById('crypto-chain').value;
    var token = document.getElementById('crypto-token').value;
    var name = document.getElementById('crypto-name').value;

    document.getElementById('crypto-form').style.display = 'none';
    document.getElementById('crypto-loading').style.display = 'block';
    document.getElementById('crypto-content').style.display = 'none';
    document.getElementById('crypto-error').style.display = 'none';

    var payload = { amount_usd: amountUsd, chain: chain, token: token };
    if (name) payload.customer_name = name;

    fetch(API_BASE + '/crypto-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success) {
            var d = res.data;
            currentTxnId = d.transactionId;
            document.getElementById('crypto-address').textContent = d.deposit_address;
            document.getElementById('crypto-usd-amount').textContent = '$' + d.amount_usd + ' ' + d.token;
            document.getElementById('crypto-expire').textContent = 'Berlaku hingga ' + new Date(d.expires_at).toLocaleString('id-ID');
            document.getElementById('crypto-pay-btn').href = d.payment_url;
            document.getElementById('crypto-loading').style.display = 'none';
            document.getElementById('crypto-content').style.display = 'block';
            startCryptoStatusPolling(d.transactionId);
            // Copy address on click
            document.getElementById('crypto-address').onclick = function() {
                navigator.clipboard.writeText(d.deposit_address).then(function() {
                    document.getElementById('crypto-address').style.background = '#D1FAE5';
                    setTimeout(function() { document.getElementById('crypto-address').style.background = ''; }, 1000);
                });
            };
        } else {
            throw new Error(res.error || 'Gagal membuat order');
        }
    })
    .catch(function() {
        document.getElementById('crypto-loading').style.display = 'none';
        document.getElementById('crypto-error').style.display = 'block';
    });
}

// --- STATUS POLLING ---
function startStatusPolling(txnId) {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(function() {
        fetch(API_BASE + '/status/' + txnId)
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success && res.data.status === 'PAID') {
                clearInterval(statusInterval);
                showPaymentSuccess(res.data);
            }
        }).catch(function() {});
    }, 5000);
}

function startCryptoStatusPolling(txnId) {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(function() {
        fetch(API_BASE + '/crypto-status/' + txnId)
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success && res.data.status === 'PAID') {
                clearInterval(statusInterval);
                showPaymentSuccess(res.data);
            }
        }).catch(function() {});
    }, 5000);
}

function showPaymentSuccess(data) {
    var detail = '<p><strong>Transaction ID:</strong> ' + (data.transactionId || currentTxnId) + '</p>';
    if (data.totalAmount) detail += '<p><strong>Total Dibayar:</strong> ' + formatRupiah(data.totalAmount) + '</p>';
    if (data.amount_usd) detail += '<p><strong>Amount:</strong> $' + data.amount_usd + ' ' + (data.asset_received || data.token) + '</p>';
    if (data.tx_hash) detail += '<p><strong>TX Hash:</strong> <span style="font-size:0.8rem;word-break:break-all;">' + data.tx_hash + '</span></p>';
    document.getElementById('success-detail').innerHTML = detail;
    showStep('step-success');
    cart = [];
    updateCartUI();
}

// ==================== AUTH ====================
let currentUser = null;
let authToken = localStorage.getItem('dku_token');

function authHeaders() {
    return authToken ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken } : { 'Content-Type': 'application/json' };
}

function openAuthModal(form) {
    showAuthForm(form || 'login');
    document.getElementById('auth-overlay').classList.add('show');
    document.getElementById('auth-modal').classList.add('open');
}

function closeAuthModal() {
    document.getElementById('auth-overlay').classList.remove('show');
    document.getElementById('auth-modal').classList.remove('open');
    document.querySelectorAll('.auth-alert').forEach(function(a) { a.style.display = 'none'; });
}

function showAuthForm(name) {
    document.querySelectorAll('.auth-form').forEach(function(f) { f.style.display = 'none'; });
    document.getElementById('auth-' + name).style.display = 'block';
}

function showAuthAlert(id, msg, type) {
    var el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'auth-alert ' + type;
    el.style.display = 'block';
}

function doRegister() {
    var name = document.getElementById('reg-name').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var password = document.getElementById('reg-password').value;
    if (!name || !email || !password) return showAuthAlert('register-alert', 'Semua field wajib diisi', 'error');

    fetch(API_BASE + '/auth/register', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: name, email: email, password: password }) })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success) {
            showAuthAlert('register-alert', 'Registrasi berhasil! Silakan masuk.', 'success');
            setTimeout(function() { showAuthForm('login'); }, 1500);
        } else {
            showAuthAlert('register-alert', res.error || 'Gagal mendaftar', 'error');
        }
    })
    .catch(function() { showAuthAlert('register-alert', 'Terjadi kesalahan jaringan', 'error'); });
}

function doLogin() {
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    if (!email || !password) return showAuthAlert('login-alert', 'Email dan password wajib diisi', 'error');

    fetch(API_BASE + '/auth/login', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ email: email, password: password }) })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success) {
            authToken = res.data.token;
            currentUser = res.data.user;
            localStorage.setItem('dku_token', authToken);
            localStorage.setItem('dku_user', JSON.stringify(currentUser));
            updateNavAuth();
            closeAuthModal();
        } else {
            showAuthAlert('login-alert', res.error || 'Login gagal', 'error');
        }
    })
    .catch(function() { showAuthAlert('login-alert', 'Terjadi kesalahan jaringan', 'error'); });
}

function doForgotPassword() {
    var email = document.getElementById('forgot-email').value.trim();
    if (!email) return showAuthAlert('forgot-alert', 'Email wajib diisi', 'error');

    fetch(API_BASE + '/auth/forgot-password', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ email: email }) })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success) {
            showAuthAlert('forgot-alert', 'Reset token: ' + res.reset_token, 'success');
            document.getElementById('forgot-reset').style.display = 'block';
        } else {
            showAuthAlert('forgot-alert', res.error || 'Gagal', 'error');
        }
    })
    .catch(function() { showAuthAlert('forgot-alert', 'Terjadi kesalahan jaringan', 'error'); });
}

function doResetPassword() {
    var token = document.getElementById('reset-token').value.trim();
    var password = document.getElementById('reset-password').value;
    if (!token || !password) return showAuthAlert('forgot-alert', 'Token dan password wajib diisi', 'error');

    fetch(API_BASE + '/auth/reset-password', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ token: token, password: password }) })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success) {
            showAuthAlert('forgot-alert', 'Password berhasil diubah! Silakan masuk.', 'success');
            setTimeout(function() { showAuthForm('login'); }, 1500);
        } else {
            showAuthAlert('forgot-alert', res.error || 'Gagal', 'error');
        }
    })
    .catch(function() { showAuthAlert('forgot-alert', 'Terjadi kesalahan jaringan', 'error'); });
}

function logout() {
    fetch(API_BASE + '/auth/logout', { method: 'POST', headers: authHeaders() }).catch(function() {});
    authToken = null;
    currentUser = null;
    localStorage.removeItem('dku_token');
    localStorage.removeItem('dku_user');
    updateNavAuth();
    closeUserMenu();
}

function updateNavAuth() {
    var authEl = document.getElementById('nav-auth');
    var userEl = document.getElementById('nav-user');
    if (currentUser) {
        authEl.style.display = 'none';
        userEl.style.display = 'block';
        document.getElementById('user-name-nav').textContent = currentUser.name;
        document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    } else {
        authEl.style.display = 'flex';
        userEl.style.display = 'none';
    }
}

function toggleUserMenu() {
    document.getElementById('user-menu').classList.toggle('show');
}

function closeUserMenu() {
    document.getElementById('user-menu').classList.remove('show');
}

function checkExistingSession() {
    if (authToken) {
        fetch(API_BASE + '/auth/me', { headers: authHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success) {
                currentUser = res.data;
                updateNavAuth();
            } else {
                authToken = null;
                localStorage.removeItem('dku_token');
                localStorage.removeItem('dku_user');
            }
        })
        .catch(function() {});
    }
}

// ==================== DASHBOARD ====================
function showDashboard() {
    closeUserMenu();
    document.getElementById('dash-overlay').classList.add('show');
    document.getElementById('dashboard-modal').classList.add('open');
    document.getElementById('dash-content').innerHTML = '<div class="dash-loading"><div class="spinner"></div><p>Memuat riwayat...</p></div>';

    fetch(API_BASE + '/transactions', { headers: authHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success && res.data.length > 0) {
            var html = '<table class="dash-table"><thead><tr><th>Tanggal</th><th>Domain</th><th>Metode</th><th>Total</th><th>Status</th></tr></thead><tbody>';
            res.data.forEach(function(t) {
                var date = new Date(t.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                var method = t.payment_method === 'qris' ? 'QRIS' : t.payment_method.replace('crypto_', '').toUpperCase();
                var amount = t.total_amount ? formatRupiah(t.total_amount) : '-';
                var statusClass = t.status === 'PAID' ? 'paid' : t.status === 'EXPIRED' ? 'expired' : 'pending';
                html += '<tr><td>' + date + '</td><td>' + (t.domain || '-') + '</td><td>' + method + '</td><td>' + amount + '</td><td><span class="dash-status ' + statusClass + '">' + t.status + '</span></td></tr>';
            });
            html += '</tbody></table>';
            document.getElementById('dash-content').innerHTML = html;
        } else {
            document.getElementById('dash-content').innerHTML = '<div class="dash-empty"><p>Belum ada riwayat transaksi</p></div>';
        }
    })
    .catch(function() {
        document.getElementById('dash-content').innerHTML = '<div class="dash-empty"><p>Gagal memuat data</p></div>';
    });
}

function closeDashboard() {
    document.getElementById('dash-overlay').classList.remove('show');
    document.getElementById('dashboard-modal').classList.remove('open');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    populatePricingTable();
    animateCounters();
    createConfetti();
    setupNavbar();
    setupScrollAnimation();
    setupSearchEnter();
    updateCartUI();
    checkExistingSession();

    // Close user menu on outside click
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-user')) closeUserMenu();
    });

    // Enter key on login/register forms
    document.getElementById('login-password').addEventListener('keypress', function(e) { if (e.key === 'Enter') doLogin(); });
    document.getElementById('reg-password').addEventListener('keypress', function(e) { if (e.key === 'Enter') doRegister(); });
    document.getElementById('forgot-email').addEventListener('keypress', function(e) { if (e.key === 'Enter') doForgotPassword(); });
});
