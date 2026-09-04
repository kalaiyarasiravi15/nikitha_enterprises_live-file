const express = require('express');
const router  = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware  = require('../middleware/authMiddleware');

// Public routes
router.get('/seed-default',     adminController.seedDefaultAdmin);
router.post('/login',           adminController.login);
router.post('/register',        adminController.register);
router.post('/forgot-password', adminController.forgotPassword);
router.post('/verify-otp',      adminController.verifyOtp);
router.post('/reset-password',  adminController.resetPassword);

// Protected routes 
router.get('/all',           authMiddleware, adminController.getAllAdmins);
router.get('/:id',           authMiddleware, adminController.getAdminProfile);
router.put('/:id',           authMiddleware, adminController.updateAdmin);
router.delete('/delete/:id', authMiddleware, adminController.deleteAdmin);

module.exports = router;
