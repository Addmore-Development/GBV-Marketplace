// ============================================================
// backend/src/routes/seller.routes.ts
// ============================================================
import { Router } from 'express';
import {
    getVerifiedCentres,
    verifyID,
    registerSeller,
    loginSeller,
    getSellerPublicProfile,
    getSellerProfile,
    updateSellerProfile,
    getSellerProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getSellerEarnings,
    getTrainingModules,
    updateTrainingProgress,
    getTrustedContacts,
    addTrustedContact,
    deleteTrustedContact,
    triggerEmergencyAlert,
    getCaseJourney,
    updateCaseJourney,
    getEvidence,
    addEvidence,
    createSupportRequest,
    grantHiddenLayer,
} from '../controllers/seller.controller';

const router = Router();

// ── Public ──────────────────────────────────────────────────
router.get('/centres/verified', getVerifiedCentres);
router.post('/verify-id', verifyID);
router.post('/register', registerSeller);
router.post('/login', loginSeller);
router.get('/public/:alias', getSellerPublicProfile);

// ── Profile ─────────────────────────────────────────────────
router.get('/profile/:id', getSellerProfile);
router.put('/profile/:id', updateSellerProfile);

// ── Products / Listings ──────────────────────────────────────
router.get('/products/:sellerId', getSellerProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:productId', deleteProduct);

// ── Earnings ────────────────────────────────────────────────
router.get('/earnings/:sellerId', getSellerEarnings);

// ── Training ────────────────────────────────────────────────
router.get('/training/:sellerId', getTrainingModules);
router.put('/training/:sellerId/:moduleId', updateTrainingProgress);

// ── Trusted contacts & Emergency ─────────────────────────────
router.get('/contacts/:sellerId', getTrustedContacts);
router.post('/contacts', addTrustedContact);
router.delete('/contacts/:id', deleteTrustedContact);
router.post('/emergency', triggerEmergencyAlert);

// ── Hidden layer (case journey, evidence, support) ───────────
router.get('/journey/:sellerId', getCaseJourney);
router.put('/journey/:sellerId', updateCaseJourney);
router.get('/evidence/:sellerId', getEvidence);
router.post('/evidence', addEvidence);
router.post('/support', createSupportRequest);
router.post('/volunteer', grantHiddenLayer);

export default router;