// ==================== PRICING DATA ====================
const pricingData = [
    { ext: '.com', normal: 189000, promo: 47250, discount: 75 },
    { ext: '.id', normal: 299000, promo: 56810, discount: 81 },
    { ext: '.co.id', normal: 149000, promo: 44700, discount: 70 },
    { ext: '.net', normal: 179000, promo: 53700, discount: 70 },
    { ext: '.org', normal: 179000, promo: 53700, discount: 70 },
    { ext: '.io', normal: 499000, promo: 174650, discount: 65 },
    { ext: '.dev', normal: 399000, promo: 159600, discount: 60 },
    { ext: '.store', normal: 599000, promo: 179700, discount: 70 },
    { ext: '.xyz', normal: 99000, promo: 19800, discount: 80 },
    { ext: '.site', normal: 149000, promo: 29800, discount: 80 },
];

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

function checkout() {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    alert('Terima kasih! Total pembayaran Anda: ' + formatRupiah(total) + '\n\nFitur pembayaran akan segera tersedia.');
}

// ==================== DOMAIN SEARCH ====================
function searchDomain() {
    const nameEl = document.getElementById('domain-search');
    const extEl = document.getElementById('domain-ext');
    const resultsEl = document.getElementById('search-results');

    const name = nameEl.value.trim().toLowerCase();
    if (!name) {
        nameEl.focus();
        return;
    }

    resultsEl.innerHTML =
        '<div class="search-loading">' +
            '<div class="spinner"></div>' +
            '<p>Mencari ketersediaan domain...</p>' +
        '</div>';

    setTimeout(function() {
        const extensions = ['.com', '.id', '.co.id', '.net', '.org', '.io'];
        const results = extensions.map(function(ext) {
            const fullDomain = name + ext;
            const available = Math.random() > 0.3;
            const priceData = pricingData.find(function(p) { return p.ext === ext; });
            const price = priceData ? priceData.promo : 99000;
            return {
                domain: fullDomain,
                ext: ext,
                available: available,
                price: price
            };
        });

        resultsEl.innerHTML = results.map(function(r) {
            if (r.available) {
                return '<div class="search-result-item">' +
                    '<div>' +
                        '<div class="domain-name">' + r.domain + '</div>' +
                        '<div class="domain-status available">Tersedia</div>' +
                    '</div>' +
                    '<div style="text-align:right">' +
                        '<div class="domain-price"><strong>' + formatRupiah(r.price) + '</strong>/thn</div>' +
                        '<button class="btn btn-primary" style="margin-top:8px;padding:8px 16px;font-size:0.85rem" onclick="addToCart(\'' + r.ext + '\', ' + r.price + ')">Tambah</button>' +
                    '</div>' +
                '</div>';
            } else {
                return '<div class="search-result-item">' +
                    '<div>' +
                        '<div class="domain-name">' + r.domain + '</div>' +
                        '<div class="domain-status taken">Sudah terdaftar</div>' +
                    '</div>' +
                    '<div style="text-align:right">' +
                        '<div class="domain-price" style="color:var(--gray)">—</div>' +
                    '</div>' +
                '</div>';
            }
        }).join('');
    }, 1500);
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
