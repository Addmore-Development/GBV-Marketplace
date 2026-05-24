// ============================================================
// backend/src/routes/marketplace.routes.ts
// ============================================================
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getProducts, getProduct, getCategories,
  getCart, updateCart, placeOrder, getImpactReceipt,
  addProduct, approveProduct,
} from '../controllers/marketplace.controller';
import { verifyAdminToken } from '../middleware/auth.middleware';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/products/'),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// ── Public ──────────────────────────────────────────────────
router.get('/products',           getProducts);
router.get('/products/:id',       getProduct);
router.get('/categories',         getCategories);

// ── Cart ────────────────────────────────────────────────────
router.get('/cart',               getCart);
router.post('/cart',              updateCart);

// ── Checkout ────────────────────────────────────────────────
router.post('/orders',            placeOrder);
router.get('/orders/:orderId/receipt', getImpactReceipt);

// ── Centre: add product ─────────────────────────────────────
router.post('/products', upload.fields([{ name: 'images', maxCount: 5 }]), addProduct);

// ── Admin ───────────────────────────────────────────────────
router.patch('/admin/products/:id', verifyAdminToken, approveProduct);

export default router;