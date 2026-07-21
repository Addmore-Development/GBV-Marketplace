// ============================================================
// backend/src/routes/seller.routes.ts
// ============================================================
import { Router } from 'express';
import {
    getVerifiedCentres,
    getCentreById,
    uploadEvidence,
    uploadProductImage,           // NEW
    generateCourtPack,
    verifyID,
    registerSeller,
    loginSeller,
    logoutSeller,
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
    attachEmergencyRecording,
    uploadAlarmRecording,
    getCentreEmergencyAlerts,
    createCaseShare,
    getMyShares,
    revokeCaseShare,
    getSharedCaseData,
    getCaseJourney,
    updateCaseJourney,
    getEvidence,
    addEvidence,
    createSupportRequest,
    grantHiddenLayer,
    getVolunteerOpportunities,
    applyForVolunteer,
    getMyVolunteerApplications,
    withdrawVolunteerApplication,
    getAssignedRequests,
    acceptSupportRequest,
    getSellerNotifications,
    markNotificationRead,
    generateAffidavitPDF,
} from '../controllers/seller.controller';

const router = Router();

// ── Public ──────────────────────────────────────────────────
router.get('/centres/verified', getVerifiedCentres);
router.get('/centres/:id', getCentreById);
router.post('/verify-id', verifyID);
router.post('/register', registerSeller);
router.post('/login', loginSeller);
router.post('/logout', logoutSeller);
router.get('/public/:alias', getSellerPublicProfile);

// ── Profile ─────────────────────────────────────────────────
router.get('/profile/:id', getSellerProfile);
router.put('/profile/:id', updateSellerProfile);

// ── Products / Listings (ENHANCED: image upload) ─────────────
router.get('/products/:sellerId', getSellerProducts);
router.post('/products', uploadProductImage.single('image'), createProduct);     // <-- changed
router.put('/products/:id', uploadProductImage.single('image'), updateProduct);  // <-- changed
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
router.post('/emergency/:alertId/recording', uploadAlarmRecording.single('recording'), attachEmergencyRecording);
router.get('/emergency/centre/:centreId', getCentreEmergencyAlerts);

// ── Unified Case File Sharing ─────────────────────────────────
router.post('/case/share', createCaseShare);
router.get('/case/shares', getMyShares);
router.delete('/case/share/:shareId', revokeCaseShare);

// Public route (no authentication)
router.get('/public/shared-case/:token', getSharedCaseData);

// ── Hidden layer (case journey, evidence, support) ───────────
router.get('/journey/:sellerId', getCaseJourney);
router.put('/journey/:sellerId', updateCaseJourney);
router.get('/evidence/:sellerId', getEvidence);
router.post('/evidence', uploadEvidence.single('file'), addEvidence);
router.post('/generate-court-pack/:sellerId', generateCourtPack);
// Note: duplicate /evidence route below is removed; keep only the one with file upload
router.post('/support', createSupportRequest);
router.post('/volunteer', grantHiddenLayer);

// ── Volunteer opportunities and applications ─────────────────
router.get('/volunteer-opportunities', getVolunteerOpportunities);
router.post('/volunteer-applications', applyForVolunteer);
router.get('/volunteer-applications/:sellerId', getMyVolunteerApplications);
router.delete('/volunteer-applications/:id', withdrawVolunteerApplication);   // NEW

// ── Professional matching & notifications ─────────────────────
router.get('/professional/requests', getAssignedRequests);
router.post('/professional/accept', acceptSupportRequest);
router.get('/notifications', getSellerNotifications);
router.post('/notifications/mark-read', markNotificationRead);
// ── Voice Affidavit ─────────────────────────────────────────
router.post('/affidavit/generate', generateAffidavitPDF);

export default router;