const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const adminMiddleware = require('../middleware/adminMiddleware');

// Provider delivery callback is secured with SMS_DLR_CALLBACK_TOKEN, not an admin JWT.
router.all('/dlr', smsController.receiveDeliveryReport);

// SMS sending and logs are admin-only.
router.post('/bulk', adminMiddleware, smsController.sendBulkSMS);
router.get('/credits', adminMiddleware, smsController.getCredits);
router.get('/logs', adminMiddleware, smsController.getLogs);
router.post('/test', adminMiddleware, smsController.sendTestSMS);

module.exports = router;
