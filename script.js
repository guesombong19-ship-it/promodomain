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

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    populatePricingTable();
    animateCounters();
    createConfetti();
    setupNavbar();
    setupScrollAnimation();
    setupSearchEnter();
    updateCartUI();
});
