// ============================================================
// backend/src/routes/centre.routes.ts
// ============================================================
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { registerCentre, getCentreStatus, adminGetPending, adminReviewCentre, loginCentre, logoutCentre, getAllCentres, uploadCentreProfilePicture } from '../controllers/centre.controller';
import { verifyAdminToken, verifyCentreToken } from '../middleware/auth.middleware';

const router = Router();

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/centre-documents/');
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  },
});

const documentFields = upload.fields([
  { name: 'npo_certificate', maxCount: 1 },
  { name: 'dsd_registration', maxCount: 1 },
  { name: 'id_document', maxCount: 1 },
  { name: 'proof_of_address', maxCount: 1 },
  { name: 'bank_statement', maxCount: 1 },
  { name: 'site_photos', maxCount: 5 },
  { name: 'reference_letter', maxCount: 3 },
  { name: 'annual_report', maxCount: 1 },
  { name: 'constitution', maxCount: 1 },
  { name: 'tax_exemption', maxCount: 1 },
]);

// Profile picture upload config
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/centre-profile/');
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }
  },
});

// Public routes
router.get('/all', getAllCentres);
router.post('/register', documentFields, registerCentre);
router.post('/login', loginCentre);
router.post('/logout', logoutCentre);
router.get('/status/:id', getCentreStatus);

// Centre self-service routes (requires the centre to be logged in)
router.post(
  '/:id/profile-picture',
  verifyCentreToken,
  profilePictureUpload.single('profile_picture'),
  uploadCentreProfilePicture
);

// Admin routes
router.get('/admin/pending', verifyAdminToken, adminGetPending);
router.patch('/admin/:id/review', verifyAdminToken, adminReviewCentre);

export default router;