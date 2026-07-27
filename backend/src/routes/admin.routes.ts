// ============================================================
// backend/src/routes/admin.routes.ts
// Mount in index.ts: app.use('/api/admin', adminRoutes);
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import {
  getAdminStats,
  getSellers,
  getSellerById,
  approveSeller,
  rejectSeller,
  updateSeller,
  deleteSeller,
  getCentres,
  getCentreById,
  approveCentre,
  rejectCentre,
  updateCentre,
  deleteCentre,
  getBuyers,
  deleteBuyer,
  getMessages,
  markMessageRead,
  replyToMessage,
  getDonations,
  getVolunteers,
  getEmergencyAlerts,
  getEmergencyStats,
  getLoginActivity,
  getSales,
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
router.get('/sellers/:id',        requireAdmin, getSellerById);
router.patch('/sellers/:id',      requireAdmin, updateSeller);
router.put('/sellers/:id/approve', requireAdmin, approveSeller);
router.put('/sellers/:id/reject',  requireAdmin, rejectSeller);
router.delete('/sellers/:id',      requireAdmin, deleteSeller);

// ── Centres ───────────────────────────────────────────────
router.get('/centres',             requireAdmin, getCentres);
router.get('/centres/:id',         requireAdmin, getCentreById);
router.patch('/centres/:id',       requireAdmin, updateCentre);
router.put('/centres/:id/approve', requireAdmin, approveCentre);
router.put('/centres/:id/reject',  requireAdmin, rejectCentre);
router.delete('/centres/:id',      requireAdmin, deleteCentre);

// ── Buyers ────────────────────────────────────────────────
router.get('/buyers', requireAdmin, getBuyers);
router.delete('/buyers/:email', requireAdmin, deleteBuyer);

// ── Messages ──────────────────────────────────────────────
router.get('/messages',              requireAdmin, getMessages);
router.put('/messages/:id/read',     requireAdmin, markMessageRead);
router.post('/messages/:id/reply',   requireAdmin, replyToMessage);

// ── Donations ─────────────────────────────────────────────
router.get('/donations', requireAdmin, getDonations);

// ── Volunteers ────────────────────────────────────────────
router.get('/volunteers', requireAdmin, getVolunteers);

// ── Emergency / SOS alerts ────────────────────────────────
router.get('/emergency',       requireAdmin, getEmergencyAlerts);
router.get('/emergency/stats', requireAdmin, getEmergencyStats);

// ── Login / Logout Activity ────────────────────────────────
router.get('/activity', requireAdmin, getLoginActivity);

// ── Sales ─────────────────────────────────────────────────
router.get('/sales', requireAdmin, getSales);

export default router;