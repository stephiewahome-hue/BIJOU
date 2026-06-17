/* =========================================================
   BIJOU — script.js (Cart + Direct Checkout to pay.html)
========================================================= */

const API_URL = window.location.protocol === 'file:'
  ? 'http://localhost:3000'
  : window.location.origin;

/* ── CART STATE ─────────────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem('bijouCart') || '[]');

function saveCart() {
  localStorage.setItem('bijouCart', JSON.stringify(cart));
}

function getCartCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function getCartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  const btn = document.querySelector('.cart-btn');
  if (btn) btn.textContent = count > 0 ? `Cart (${count})` : 'Cart';
}

/* ── ADD TO CART ─────────────────────────────────────────── */
function addToCart(id, name, price, imageUrl) {
  if (!id || !name) {
    console.error('Missing id or name for addToCart');
    return;
  }

  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, imageUrl: imageUrl || '', qty: 1 });
  }

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
      </div>
    `;
    footer.style.display = 'none';
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.imageUrl ? `<img src="${item.imageUrl}" />` : '✨'}
      </div>

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
    </div>
  `).join('');

  footer.style.display = 'block';
  document.getElementById('cartTotal').textContent =
    'KSh ' + Number(getCartTotal()).toLocaleString();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function injectCartDrawer() {
  if (document.getElementById('cartDrawer')) return;

  const html = `
    <div class="cart-overlay" id="cartOverlay" onclick="hideCart()"></div>
    <aside class="cart-drawer" id="cartDrawer" role="dialog" aria-label="Shopping cart">
      <div class="cart-header">
        <div class="cart-title">Your cart</div>
        <button class="cart-close" onclick="hideCart()" aria-label="Close cart">✕</button>
      </div>
      <div class="cart-body" id="cartBody"></div>
      <div class="cart-footer" id="cartFooter">
        <div class="cart-total-row">
          <span>Total</span>
          <strong id="cartTotal">KSh 0</strong>
        </div>
        <button class="cart-checkout-btn" onclick="goToPayment()">Checkout</button>
        <button class="cart-clear-btn" onclick="clearCart()">Clear cart</button>
      </div>
    </aside>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  renderCartDrawer();
}

/* ── CHECKOUT → PAY.HTML ─────────────────────────── */
function goToPayment() {
  if (!cart.length) {
    showToast('Your cart is empty');
    return;
  }

  localStorage.setItem('bijouCart', JSON.stringify(cart));
  window.location.href = 'pay.html';
}

/* ── PRODUCTS ────────────────────────────────────────────── */
async function fetchProducts(category = '') {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  try {
    const params = new URLSearchParams();
    if (category) params.set('category', category);

    const url = `${API_URL}/api/products${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || `Server returned ${res.status}`);
    }

    renderProducts(data.products || []);
  } catch (err) {
    console.error('Product load error:', err);
    grid.innerHTML = `
      <div class="cart-empty">
        <p>Cannot connect to the server.</p>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `<p>No products yet</p>`;
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
      : p.badge
        ? `<div class="product-badge ${p.badge}">${p.badge}</div>`
        : '';

    const buttonLabel = outOfStock ? 'Out of stock' : 'Add to Cart';
    const buttonClass = outOfStock ? 'disabled' : 'add-to-cart-btn';

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
          <button class="${buttonClass}" ${outOfStock ? 'disabled' : ''}>
            ${buttonLabel}
          </button>
        </div>
      </div>
    `;
  }).join('');

  attachAddToCartListeners();
}

function attachAddToCartListeners() {
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    // Remove old listeners to prevent duplicates
    btn.removeEventListener('click', handleAddClickEvent);
    btn.addEventListener('click', handleAddClickEvent);
  });
}

function handleAddClickEvent(e) {
  const card = e.currentTarget.closest('.product-card');
  if (!card) return;

  const id = card.dataset.id;
  const name = card.dataset.name;
  const price = parseFloat(card.dataset.price);
  const imageUrl = card.dataset.image;

  addToCart(id, name, price, imageUrl);
}

/* ── FILTER WRAPPER FOR UI ─────────────────────────────── */
function filterProducts(elOrCat, maybeCat) {
  let el = null;
  let cat = '';

  if (typeof elOrCat === 'string') {
    cat = elOrCat;
  } else if (elOrCat && typeof elOrCat === 'object') {
    el = elOrCat;
    cat = maybeCat || '';
  }

  const desired = cat && cat !== 'all' ? cat : 'all';
  const fetchCat = desired === 'all' ? '' : desired;

  // update filter-tab buttons
  document.querySelectorAll('.filter-tab').forEach(t => {
    if ((t.dataset && t.dataset.filter) === desired) t.classList.add('active');
    else t.classList.remove('active');
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

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  injectCartDrawer();
  updateCartBadge();
  fetchProducts();

  // sanitize any malformed SVGs (fix leftover corrupted WhatsApp CTA)
  try {
    const wa = document.querySelector('.wa-cta-btn');
    if (wa) {
      const svg = wa.querySelector('svg');
      const path = svg?.querySelector('path');
      const d = path?.getAttribute('d') || '';
      if (/[^\x00-\x7F]/.test(d)) {
        svg.innerHTML = '<path d="M16.7 7.6c-.3-.1-1.7-.6-2-.6-.3 0-.5-.1-.7.3-.2.3-.7 1-.' +
          '8 1.2-.2.2-.3.2-.6.1-.3-.1-.9-.3-1.8-1.1-.7-.6-1.2-1.1-1.6-1.5-.2-.2-.4-.1-.6 0-.2.1-.4.3-.6.5-.2.3-.5.7-.7 1-.2.4-.4.4-.8.1-.4-.3-1.4-.9-2.1-1-.6-.1-1.2 0-1.8.7-.6.7-1.1 1.8-1.1 3.8 0 1.9.9 3.5 1.1 3.8.2.3 2 3.7 5.9 5.8 1 .5 1.8.8 2.6.9.9.1 1.8 0 2.4-.3.8-.3 1.8-1.1 2.1-2 .3-.9.3-1.7.2-2-.1-.3-.3-.5-.7-.8zm-2.1 8.6c-.2.6-1.2 1.2-1.7 1.3-.5.1-1 .2-2-.3-1.1-.3-2.1-1-3.4-2.2-1.3-1.2-2-2.5-2.3-3.6-.3-1.1 0-1.4.2-1.5.2-.1.4-.1.6-.1.2 0 .5 0 .7 0 .3 0 .6-.1.9.7.3.7.9 2.4 1 2.6.1.2.1.4 0 .6-.1.2-.1.4-.4.6-.2.2-.4.4-.6.6-.2.2-.4.3-.1.7.3.4 1.1 1.9 2.4 2.8 1.6 1.3 2.8 1.7 3.2 1.9.4.2.6.2.8-.1.2-.3 1-1.1 1.2-1.5.2-.4.4-.4.7-.2.3.1 1.4.8 1.7.9.3.1.5.2.6.3.1.1.1.5-.1.8z"/>';
      }
    }
  } catch (e) {
    console.error('SVG sanitize error', e);
  } 
});
