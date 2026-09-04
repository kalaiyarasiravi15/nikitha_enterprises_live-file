const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public route for customers to subscribe
router.post('/subscribe', newsletterController.subscribe);
router.post('/unsubscribe', newsletterController.unsubscribe);

// Admin routes
router.get('/', adminMiddleware, newsletterController.getSubscribers);
router.post('/send', adminMiddleware, newsletterController.sendNotification);
router.patch('/:id/status', adminMiddleware, newsletterController.updateSubscriberStatus);

module.exports = router;
