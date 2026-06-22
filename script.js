/* =========================================================
   BIJOU — script.js (Cart + Search + Category Filter)
========================================================= */

const API_URL = 'https://bijou-kndx.onrender.com';

/* ── CART STATE ─────────────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem('bijouCart') || '[]');

function saveCart() { localStorage.setItem('bijouCart', JSON.stringify(cart)); }
function getCartCount() { return cart.reduce((sum, i) => sum + i.qty, 0); }
function getCartTotal() { return cart.reduce((sum, i) => sum + i.price * i.qty, 0); }

function updateCartBadge() {
  const count = getCartCount();
  const btn = document.querySelector('.cart-btn');
  if (btn) btn.textContent = count > 0 ? `Cart (${count})` : 'Cart';
}

/* ── ADD TO CART ─────────────────────────────────────────── */
function addToCart(id, name, price, imageUrl) {
  if (!id || !name) return;
  const existing = cart.find(i => i.id === id);
  if (existing) { existing.qty++; } 
  else { cart.push({ id, name, price, imageUrl: imageUrl || '', qty: 1 }); }
  saveCart();
  updateCartBadge();
  showToast(`"${name}" added to cart ✓`);
}

/* ── CART UI ─────────────────────────────────────────────── */
function showCart() {
  renderCartDrawer();
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('open');
}

function hideCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('open');
}

function renderCartDrawer() {
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  if (!body || !footer) return;

  if (!cart.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛍️</div>
        <p>Your cart is empty</p>
        <button class="cart-shop-btn" onclick="hideCart()">Continue Shopping</button>
      </div>`;
    footer.style.display = 'none';
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.imageUrl ? `<img src="${item.imageUrl}" />` : '✨'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">KSh ${Number(item.price).toLocaleString()}</div>
        <div class="cart-item-qty">
          <button onclick="changeQty('${item.id}', -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${item.id}', 1)">＋</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕</button>
    </div>`).join('');

  footer.style.display = 'block';
  document.getElementById('cartTotal').textContent = 'KSh ' + Number(getCartTotal()).toLocaleString();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart(); updateCartBadge(); renderCartDrawer();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); updateCartBadge(); renderCartDrawer();
}

function clearCart() {
  cart = []; saveCart(); updateCartBadge(); renderCartDrawer();
}

function injectCartDrawer() {
  if (document.getElementById('cartDrawer')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cart-overlay" id="cartOverlay" onclick="hideCart()"></div>
    <aside class="cart-drawer" id="cartDrawer" role="dialog" aria-label="Shopping cart">
      <div class="cart-header">
        <div class="cart-title">Your cart</div>
        <button class="cart-close" onclick="hideCart()" aria-label="Close cart">✕</button>
      </div>
      <div class="cart-body" id="cartBody"></div>
      <div class="cart-footer" id="cartFooter">
        <div class="cart-total-row"><span>Total</span><strong id="cartTotal">KSh 0</strong></div>
        <button class="cart-checkout-btn" onclick="goToPayment()">Checkout</button>
        <button class="cart-clear-btn" onclick="clearCart()">Clear cart</button>
      </div>
    </aside>`);
  renderCartDrawer();
}

function goToPayment() {
  if (!cart.length) { showToast('Your cart is empty'); return; }
  localStorage.setItem('bijouCart', JSON.stringify(cart));
  window.location.href = 'pay.html';
}

/* ── PRODUCT STORE (for search) ─────────────────────────── */
let allLoadedProducts = [];
let activeCategory = '';

/* ── FETCH PRODUCTS ──────────────────────────────────────── */
async function fetchProducts(category = '') {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  activeCategory = category;
  updateSectionHeader(category);

  try {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    const url = `${API_URL}/api/products${params.toString() ? `?${params}` : ''}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || `Server returned ${res.status}`);
    allLoadedProducts = data.products || [];
    renderProducts(allLoadedProducts);
  } catch (err) {
    console.error('Product load error:', err);
    grid.innerHTML = `<div class="cart-empty"><p>Cannot connect to the server.</p><p>${err.message}</p></div>`;
  }
}

/* ── RENDER PRODUCTS ─────────────────────────────────────── */
function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `<div class="no-results"><div class="icon">📦</div><p>No products yet</p></div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const mainImage = (p.imageUrls && p.imageUrls.length) ? p.imageUrls[0] : (p.imageUrl || '');
    const image = mainImage
      ? `<img src="${mainImage}" style="width:100%;height:100%;object-fit:cover;">`
      : '✨';
    const outOfStock = p.inStock === false;
    const stockBadge = outOfStock
      ? `<div class="product-badge sale">Out of stock</div>`
      : p.badge ? `<div class="product-badge ${p.badge}">${p.badge}</div>` : '';

    return `
      <div class="product-card"
           data-id="${p.id}"
           data-name="${(p.name || '').replace(/"/g, '&quot;')}"
           data-price="${p.price}"
           data-image="${(mainImage || '').replace(/"/g, '&quot;')}">
        <div class="product-image">${image}${stockBadge}</div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-price">KSh ${Number(p.price).toLocaleString()}</div>
        </div>
        <div class="product-actions">
          <a class="product-detail-link" href="product.html?id=${encodeURIComponent(p.id)}">View Details</a>
          <button class="${outOfStock ? 'add-to-cart-btn disabled' : 'add-to-cart-btn'}" ${outOfStock ? 'disabled' : ''}>
            ${outOfStock ? 'Out of stock' : 'Add to Cart'}
          </button>
        </div>
      </div>`;
  }).join('');

  attachAddToCartListeners();
}

function attachAddToCartListeners() {
  document.querySelectorAll('.add-to-cart-btn:not(.disabled)').forEach(btn => {
    btn.removeEventListener('click', handleAddClickEvent);
    btn.addEventListener('click', handleAddClickEvent);
  });
}

function handleAddClickEvent(e) {
  const card = e.currentTarget.closest('.product-card');
  if (!card) return;
  addToCart(card.dataset.id, card.dataset.name, parseFloat(card.dataset.price), card.dataset.image);
}

/* ── SEARCH ─────────────────────────────────────────────── */
function handleSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.classList.toggle('visible', q.length > 0);

  if (!q) {
    renderProducts(allLoadedProducts);
    updateSectionHeader(activeCategory);
    return;
  }

  const filtered = allLoadedProducts.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q)
  );

  if (!filtered.length) {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = `
      <div class="no-results">
        <div class="icon">🔍</div>
        <p>No products found for "<strong>${query}</strong>"</p>
        <p style="font-size:.8rem;margin-top:.5rem">Try "wig", "serum", "lipstick"...</p>
      </div>`;
  } else {
    renderProducts(filtered);
  }

  const tag = document.getElementById('productSectionTag');
  const title = document.getElementById('productSectionTitle');
  if (tag) tag.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;
  if (title) title.textContent = `Search: "${query}"`;

  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.getElementById('searchClear')?.classList.remove('visible');
  renderProducts(allLoadedProducts);
  updateSectionHeader(activeCategory);
}

/* ── CATEGORY ICON FILTER ───────────────────────────────── */
function catIconFilter(el, cat) {
  document.querySelectorAll('.cat-icon-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  clearSearch();
  filterProducts(cat || 'all');
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
}

function updateSectionHeader(cat) {
  const tag   = document.getElementById('productSectionTag');
  const title = document.getElementById('productSectionTitle');
  if (!tag || !title) return;
  if (!cat || cat === 'all') {
    tag.textContent   = 'Featured Picks';
    title.textContent = 'Our Collection';
  } else {
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    tag.textContent   = label;
    title.textContent = label + ' Products';
  }
}

/* ── FILTER WRAPPER ─────────────────────────────────────── */
function filterProducts(elOrCat, maybeCat) {
  let el = null, cat = '';
  if (typeof elOrCat === 'string') { cat = elOrCat; }
  else if (elOrCat && typeof elOrCat === 'object') { el = elOrCat; cat = maybeCat || ''; }

  const desired  = cat && cat !== 'all' ? cat : 'all';
  const fetchCat = desired === 'all' ? '' : desired;

  document.querySelectorAll('.filter-tab').forEach(t => {
    t.classList.toggle('active', (t.dataset && t.dataset.filter) === desired);
  });

  if (el) {
    document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  }

  fetchProducts(fetchCat);
}

/* ── TOAST ──────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── SUBSCRIBE ──────────────────────────────────────────── */
function handleSubscribe(e) {
  e.preventDefault();
  showToast('Thanks for subscribing! 💌');
  document.getElementById('emailInput').value = '';
}

/* ── WHATSAPP BUBBLE ────────────────────────────────────── */
function closeBubble() {
  document.getElementById('waBubble')?.style && (document.getElementById('waBubble').style.display = 'none');
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  injectCartDrawer();
  updateCartBadge();
  fetchProducts();
});