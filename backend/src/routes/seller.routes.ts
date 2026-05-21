import { Router } from 'express';
import {
    getVerifiedCentres,
    registerSeller,
    getSellerPublicProfile,
    getSellerProfile,      // new
    getSellerProducts,     // new
    deleteProduct,         // new
} from '../controllers/seller.controller';

const router = Router();

// Public routes
router.get('/centres/verified', getVerifiedCentres);
router.post('/register', registerSeller);
router.get('/:alias', getSellerPublicProfile);

// Dashboard routes
router.get('/profile/:id', getSellerProfile);
router.get('/products/:sellerId', getSellerProducts);
router.delete('/products/:productId', deleteProduct);

export default router;