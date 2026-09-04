const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// HDFC SmartGateway Routes (Official Flow)
router.post('/create-hdfc-session', paymentController.createHdfcSession);  // STEP 1: Create Session
router.post('/verify-hdfc',         paymentController.verifyHdfcPayment);  // STEP 5: Verify Payment
router.post('/hdfc-webhook',        paymentController.hdfcWebhook);        // STEP 6: Webhook Receiver
router.all('/hdfc-return',          paymentController.hdfcReturn);
router.get('/mock-hdfc-page',       paymentController.mockHdfcPage);         // Browser return after HDFC OTP

// Razorpay & General Routes (Legacy)
router.post('/create-order', paymentController.createOrder);
router.post('/verify',       paymentController.verifyPayment);
router.get('/get-key',       paymentController.getKey);

module.exports = router;
