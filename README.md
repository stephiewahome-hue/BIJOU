# BIJOU 💎 — Beauty & Fashion E-Commerce Store

> A full-stack e-commerce website built for a Kenyan beauty and fashion brand. Live at **[bijoustore.netlify.app](https://bijoustore.netlify.app)**

![BIJOU Store](https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80)

---

## 🌟 What is BIJOU?

BIJOU is a Kenyan beauty and fashion brand selling skincare, makeup, wigs/hair and fashion items. This website was built from scratch as a real-world e-commerce project — no templates, no page builders, just pure code.

---

## 🚀 Live Demo

🔗 **[bijoustore.netlify.app](https://bijoustore.netlify.app)**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| File Uploads | Multer (memory storage → base64) |
| Deployment — Frontend | Netlify |
| Deployment — Backend | Render |
| Payments | M-Pesa (via WhatsApp checkout) |
| Auth | JWT + sessionStorage |

---

## ✨ Features

### Customer Side
- 🛍️ **Product grid** with category filter tabs (Skincare, Makeup, Hair, Fashion)
- 🔍 **Search bar** with real-time filtering
- 🛒 **Slide-out cart drawer** — add, remove, change quantities
- 💳 **WhatsApp checkout** — cart sends a pre-written order message
- 📱 **Pay page** — M-Pesa instructions, deposit calculator, AI assistant
- 📦 **Product detail pages**
- 🌍 **Fully mobile responsive**
- 🇰🇪 **Afrocentric imagery** — Black/African models throughout

### Admin Side
- 🔐 **Password-protected admin panel** (`/admin.html`)
- ➕ **Add products** — name, category, price, badge, description, images
- ✏️ **Edit products** inline
- 🗑️ **Delete products**
- 📸 **Multiple image upload** (file upload or URL paste)
- 🔦 **Filter by category**

---

## 📁 Project Structure

```
BIJOU/
├── index.html          # Main storefront
├── pay.html            # M-Pesa payment instructions + AI chat
├── admin.html          # Admin panel (password protected)
├── admin-login.html    # Admin login page
├── product.html        # Product detail page
├── server.js           # Node.js/Express backend
├── .env                # Environment variables (never commit!)
├── .gitignore
├── css/
│   └── style.css       # All styles
└── js/
    └── script.js       # Cart, products, WhatsApp checkout
```

---

## 🏗️ How I Built This — Step by Step

### Step 1 — Project Setup
```bash
mkdir BIJOU
cd BIJOU
npm init -y
npm install express firebase-admin multer dotenv cors
```

### Step 2 — Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (`bijou-2ea5f`)
3. Enable **Firestore Database** (Native mode)
4. Go to Project Settings → Service Accounts → Generate new private key
5. Save the JSON file as `bijou-adminsk.json`

`.env` file:
```env
FIREBASE_KEY=./bijou-adminsk.json
FIREBASE_PROJECT_ID=bijou-2ea5f
PORT=3000
ADMIN_PASSWORD=your_strong_password_here
JWT_SECRET=your_jwt_secret_here
```

### Step 3 — Backend (server.js)
The Express server handles:
- `GET /api/products` — fetch all or filtered products
- `GET /api/products/:id` — fetch single product
- `POST /api/products` — add product (admin only)
- `PUT /api/products/:id` — update product (admin only)
- `DELETE /api/products/:id` — delete product (admin only)
- `POST /api/admin/login` — verify admin password, return JWT

**Key pattern — Multer for image uploads:**
```js
const storage = multer.memoryStorage();
const upload  = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Convert uploaded files to base64 for Firestore storage
function filesToBase64(files) {
  return (files || []).map(f =>
    `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
  );
}
```

**Admin auth middleware:**
```js
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
```

### Step 4 — Frontend (index.html + script.js)
Products are fetched from the API and rendered dynamically:
```js
async function fetchProducts(category = '') {
  const url = category
    ? `${API_URL}/api/products?category=${category}`
    : `${API_URL}/api/products`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.success) renderProducts(data.products);
}
```

**Cart uses localStorage** so items persist between page refreshes:
```js
let cart = JSON.parse(localStorage.getItem('bijouCart') || '[]');

function addToCart(id, name, price, imageUrl) {
  const existing = cart.find(i => i.id === id);
  if (existing) { existing.qty++; }
  else { cart.push({ id, name, price, imageUrl, qty: 1 }); }
  saveCart();
  updateCartBadge();
}
```

**WhatsApp checkout** builds a pre-filled message:
```js
function checkoutWhatsApp() {
  const lines = cart.map(i =>
    `• ${i.name} x${i.qty} — KSh ${(i.price * i.qty).toLocaleString()}`
  );
  const msg = `Hi BIJOU! I'd like to order:\n\n${lines.join('\n')}\n\nTotal: KSh ${getCartTotal().toLocaleString()}`;
  window.open(`https://wa.me/254XXXXXXXXX?text=${encodeURIComponent(msg)}`, '_blank');
}
```

### Step 5 — Admin Panel + Login
**admin-login.html** verifies password against the backend:
```js
async function handleLogin(e) {
  e.preventDefault();
  const res  = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: document.getElementById('password').value })
  });
  const data = await res.json();
  if (data.success) {
    sessionStorage.setItem('adminToken', data.token);
    window.location.href = 'admin.html';
  }
}
```

**admin.html** checks the token on load:
```js
function checkAuth() {
  const token = sessionStorage.getItem('adminToken');
  if (!token) window.location.href = 'admin-login.html';
}
document.addEventListener('DOMContentLoaded', checkAuth);
```

### Step 6 — Deployment

**Frontend → Netlify:**
1. Go to [netlify.com](https://netlify.com) → New site
2. Drag and drop your project folder
3. Or connect GitHub and auto-deploy on every push
4. Your site is live instantly — free SSL included

**Backend → Render:**
1. Push code to GitHub (make sure `.gitignore` excludes `.env` and service account keys)
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set Start Command: `node server.js`
5. Add Environment Variables in the Render dashboard:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_KEY_JSON` ← paste the entire contents of your `.json` key file
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
   - `PORT` = `10000`

6. Update your frontend `API_URL` to point to your Render URL:
```js
const API_URL = 'https://your-app.onrender.com';
```

---

## 🔐 Security Notes

- ✅ `.env` is in `.gitignore` — never committed
- ✅ Firebase service account key is never committed
- ✅ Admin routes protected by JWT middleware
- ✅ Tokens stored in `sessionStorage` (expire on browser close)
- ✅ Admin password stored as environment variable only

---

## 🐛 Key Bugs Fixed Along the Way

| Bug | Cause | Fix |
|---|---|---|
| `category` and `price` saving as empty | Postman form-data bug with files | Used `multer` before body parsing middleware |
| Cart "Add to Cart" button not working | `JSON.stringify()` quotes breaking `onclick` HTML attribute | Switched to `data-*` attributes + `addEventListener` |
| Firebase `ECONNREFUSED` | `.env` missing Firebase keys | Added `FIREBASE_KEY` and `FIREBASE_PROJECT_ID` to `.env` |
| Images not showing after upload | Server using `upload.single()` | Changed to `upload.array('images', 10)` |
| CSS not loading on `pay.html` | Wrong path `/style.css` | Fixed to `css/style.css` |

---

## 📱 Screenshots

| Home | Cart | Pay Page |
|---|---|---|
| Product grid with search & filters | Slide-out cart drawer | M-Pesa instructions + deposit calculator |

---

## 👩‍💻 Built By

**Stephanie Wahome**
- 📧 [stephiewahome@gmail.com](mailto:stephiewahome@gmail.com)
- 🐙 [github.com/stephiewahome-hue](https://github.com/stephiewahome-hue)
- 📍 Kenya
- 💼 Available for commercial web development projects

> Built as part of a web development course alongside real-world client work.
> Stack: HTML · CSS · JavaScript · Node.js · Firebase · Netlify · Render

---

## 📄 License

MIT — feel free to learn from this code. If you use it commercially, a credit would be appreciated!

---

*BIJOU — Beauty that speaks for itself* 💎
