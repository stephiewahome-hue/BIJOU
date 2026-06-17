/* ============================================
   BIJOU — server.js (Firebase version)
   ============================================ */

const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const jwt     = require('jsonwebtoken');
const admin   = require('firebase-admin');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── MIDDLEWARE ── */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

/* ── FIREBASE ── */
let serviceAccount;
if (process.env.FIREBASE_KEY_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
} else {
  serviceAccount = require(process.env.FIREBASE_KEY);
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.europe-west1.firebasedatabase.app`
});
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
console.log('✅ Firebase connected');

/* ── AUTH CONFIG ── */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET      = process.env.JWT_SECRET;

if (!ADMIN_PASSWORD || !JWT_SECRET) {
  console.error('❌ ADMIN_PASSWORD or JWT_SECRET missing from .env — admin login will not work until these are set');
}

/* ── MULTER — accept multiple files under field "images" ── */
const storage = multer.memoryStorage();
const upload  = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/* ── helper: convert uploaded files to base64 URLs ── */
function filesToBase64(files) {
  return (files || []).map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`);
}

/* ── helper: parse imageUrls field (newline or comma separated) ── */
function parseImageUrls(raw) {
  if (!raw) return [];
  return raw.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
}

/* ── middleware: verify admin JWT ── */
function verifyAdminToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/* ══════════════════════════════════════
   POST — admin login
══════════════════════════════════════ */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};

  if (!ADMIN_PASSWORD || !JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'Server auth is not configured' });
  }

  if (password && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: 'Invalid password' });
});

/* ══════════════════════════════════════
   GET all products (public)
══════════════════════════════════════ */
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let query = db.collection('products').orderBy('createdAt', 'desc');
    if (category) {
      query = db.collection('products')
        .where('category', '==', category)
        .orderBy('createdAt', 'desc');
    }
    const snap     = await query.get();
    const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════
   GET single product (public)
══════════════════════════════════════ */
app.get('/api/products/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, product: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════
   POST — add product (protected)
══════════════════════════════════════ */
app.post('/api/products', verifyAdminToken, upload.array('images', 10), async (req, res) => {
  try {
    console.log('POST /api/products');
    console.log('Body:', req.body);
    console.log('Files:', (req.files || []).map(f => f.originalname));

    const name        = (req.body.name     || '').trim();
    const category    = (req.body.category || '').trim();
    const badge       = (req.body.badge    || '').trim();
    const description = (req.body.description || '').trim();
    const price       = parseFloat(req.body.price)    || 0;
    const original    = parseFloat(req.body.original) || null;
    const inStock     = req.body.inStock !== 'false';

    if (!name)     return res.status(400).json({ success: false, message: 'Name is required' });
    if (!category) return res.status(400).json({ success: false, message: 'Category is required' });
    if (!price)    return res.status(400).json({ success: false, message: 'Price is required' });

    /* collect images — uploaded files take priority, then URLs */
    let imageUrls = filesToBase64(req.files);
    if (!imageUrls.length) {
      imageUrls = parseImageUrls(req.body.imageUrls || req.body.imageUrl);
    }

    const product = {
      name,
      category,
      price,
      original,
      badge,
      description,
      inStock,
      imageUrls,
      imageUrl  : imageUrls[0] || '',   /* keep legacy field for frontend */
      createdAt : admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('products').add(product);
    console.log('✅ Saved product:', name, '| id:', docRef.id);
    res.status(201).json({ success: true, product: { id: docRef.id, ...product } });

  } catch (err) {
    console.error('POST error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════
   PUT — update product (protected)
══════════════════════════════════════ */
app.put('/api/products/:id', verifyAdminToken, upload.array('images', 10), async (req, res) => {
  try {
    console.log('PUT /api/products/' + req.params.id);
    console.log('Body:', req.body);

    const updates = {};
    if (req.body.name)        updates.name        = req.body.name.trim();
    if (req.body.category)    updates.category    = req.body.category.trim();
    if (req.body.badge !== undefined) updates.badge = req.body.badge.trim();
    if (req.body.description !== undefined) updates.description = req.body.description.trim();
    if (req.body.price)       updates.price       = parseFloat(req.body.price);
    if (req.body.original)    updates.original    = parseFloat(req.body.original);
    if (req.body.inStock !== undefined) updates.inStock = req.body.inStock !== 'false';

    /* images */
    let imageUrls = filesToBase64(req.files);
    if (!imageUrls.length && (req.body.imageUrls || req.body.imageUrl)) {
      imageUrls = parseImageUrls(req.body.imageUrls || req.body.imageUrl);
    }
    if (imageUrls.length) {
      updates.imageUrls = imageUrls;
      updates.imageUrl  = imageUrls[0];
    }

    await db.collection('products').doc(req.params.id).update(updates);
    console.log('✅ Updated product:', req.params.id);
    res.json({ success: true, message: 'Product updated' });

  } catch (err) {
    console.error('PUT error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════
   DELETE product (protected)
══════════════════════════════════════ */
app.delete('/api/products/:id', verifyAdminToken, async (req, res) => {
  try {
    await db.collection('products').doc(req.params.id).delete();
    console.log('🗑️  Deleted product:', req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── START ── */
app.listen(PORT, () => {
  console.log(`🚀 BIJOU server running at http://localhost:${PORT}`);
});