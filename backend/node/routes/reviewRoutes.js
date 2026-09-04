// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { reviewUpload } = require('../middleware/upload');


// Admin
router.get('/all', reviewController.getAllReviews);
router.put('/update/:id', reviewController.updateReview);
router.delete('/delete/:id', reviewController.deleteReview);

router.get('/product/:productId', reviewController.getPublishedReviewsByProduct);
router.get('/customer/:customerId', reviewController.getReviewsByCustomer);
router.post('/create', reviewUpload, reviewController.createFeedback);

router.get('/order/:orderId/product/:productId', reviewController.getReviewByOrderAndProduct);

router.get('/:id', reviewController.getParticularReview);

module.exports = router;