import { Router } from 'express';
import {
    getVerifiedCentres,
    registerSeller,
    getSellerPublicProfile,
    getSellerProfile,
    getSellerProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    loginSeller,
} from '../controllers/seller.controller';

const router = Router();

// Public
router.get('/centres/verified', getVerifiedCentres);
router.post('/register', registerSeller);
router.get('/:alias', getSellerPublicProfile);
router.post('/login', loginSeller);

// Dashboard & Products
router.get('/profile/:id', getSellerProfile);
router.get('/products/:sellerId', getSellerProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:productId', deleteProduct);

export default router;