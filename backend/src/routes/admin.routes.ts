// ============================================================
// backend/src/routes/admin.routes.ts
// Mount in index.ts: app.use('/api/admin', adminRoutes);
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import {
  getAdminStats,
  getSellers,
  approveSeller,
  rejectSeller,
  deleteSeller,
  getCentres,
  approveCentre,
  rejectCentre,
  deleteCentre,
  getBuyers,
  createBuyer,
  deleteBuyer,
  getMessages,
  markMessageRead,
  replyToMessage,
  getDonations,
  getEmergencyAlerts,
  getEmergencyStats,
} from '../controllers/admin.controller';

const router = Router();

// ── PIN middleware (upgrade to JWT session for production) ──
const ADMIN_PIN = process.env.ADMIN_PIN || 'amani2024';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const pin = (req.headers['x-admin-pin'] as string) || (req.query['pin'] as string);
  if (pin !== ADMIN_PIN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// ── Stats ──────────────────────────────────────────────────
router.get('/stats', requireAdmin, getAdminStats);

// ── Sellers ───────────────────────────────────────────────
router.get('/sellers',            requireAdmin, getSellers);
router.put('/sellers/:id/approve', requireAdmin, approveSeller);
router.put('/sellers/:id/reject',  requireAdmin, rejectSeller);
router.delete('/sellers/:id',      requireAdmin, deleteSeller);

// ── Centres ───────────────────────────────────────────────
router.get('/centres',             requireAdmin, getCentres);
router.put('/centres/:id/approve', requireAdmin, approveCentre);
router.put('/centres/:id/reject',  requireAdmin, rejectCentre);
router.delete('/centres/:id',      requireAdmin, deleteCentre);

// ── Buyers ────────────────────────────────────────────────
router.get('/buyers',     requireAdmin, getBuyers);
router.post('/buyers',    requireAdmin, createBuyer);
router.delete('/buyers/:id', requireAdmin, deleteBuyer);

// ── Messages ──────────────────────────────────────────────
router.get('/messages',              requireAdmin, getMessages);
router.put('/messages/:id/read',     requireAdmin, markMessageRead);
router.post('/messages/:id/reply',   requireAdmin, replyToMessage);

// ── Donations ─────────────────────────────────────────────
router.get('/donations', requireAdmin, getDonations);

// ── Emergency / SOS alerts ────────────────────────────────
router.get('/emergency',       requireAdmin, getEmergencyAlerts);
router.get('/emergency/stats', requireAdmin, getEmergencyStats);

export default router;