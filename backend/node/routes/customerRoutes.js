
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');

const requireOwnAccount = (req, res, next) => {
  if (String(req.customerId) !== String(req.params.id)) {
    return res.status(403).json({ message: 'You can only manage your own account.' });
  }
  next();
};

// Registration OTP flow
router.post('/send-register-otp',     customerController.sendRegisterOtp);
router.post('/resend-register-otp',   customerController.resendRegisterOtp);
router.post('/verify-register-otp',   customerController.verifyRegisterOtp);
router.post('/register',              customerController.registerCustomer);
router.post('/login',                 customerController.loginCustomer);
router.get('/all',                    customerController.getAllCustomers);
router.get('/guests',                 customerController.getGuestCustomers);
router.get('/business',               customerController.getBusinessCustomers);


// Customer CRUD
router.get('/:id',                    customerController.getSingleCustomer);
router.get('/:id/stats',              customerController.getCustomerStats);
router.put('/update/:id',             authMiddleware, requireOwnAccount, customerController.updateCustomer);
router.post('/delete/:id/request-otp', authMiddleware, requireOwnAccount, customerController.requestDeleteOtp);
router.delete('/delete/:id',          authMiddleware, requireOwnAccount, customerController.deleteCustomer);
router.put('/change-password/:id',   authMiddleware, requireOwnAccount, customerController.changePassword);

// Legacy Customer (primary/registered) Address update
router.put('/address/update/:id',     customerController.updateCustomerAddress);

// Shipping Address (used during orders)
router.get('/last-shipping-address/:id', customerController.getLastShippingAddress);
router.post('/add-shipping',          customerController.addShippingAddress);
router.delete('/shipping/:id',        customerController.deleteShippingAddress);
router.put('/shipping/update/:id',    customerController.updateShippingAddress);

// Settings
router.put('/settings/:id',           customerController.saveSettings);

// Password (OTP flow)
router.post('/forgot-password',       customerController.forgotPassword);
router.post('/verify-otp',            customerController.verifyOtp);
router.post('/reset-password',        customerController.resetPassword);

// Delivery review mail
router.post('/send-review-mail/:orderId', customerController.sendDeliveryReviewMail);

module.exports = router;
