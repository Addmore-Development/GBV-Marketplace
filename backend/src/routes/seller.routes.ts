import { Router } from 'express';
import {
    getVerifiedCentres,
    registerSeller,
    getSellerPublicProfile,
} from '../controllers/seller.controller';

const router = Router();

// Public routes
router.get('/centres/verified', getVerifiedCentres);
router.post('/register', registerSeller);
router.get('/:alias', getSellerPublicProfile);

export default router;