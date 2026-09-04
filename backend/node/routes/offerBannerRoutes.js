const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/offerBannerController');
const { categoryUpload } = require('../middleware/upload'); // Assuming your multer file is in middleware folder

// Public Routes
router.get('/all', ctrl.getOfferBanners);

// Admin Routes
router.get('/admin/all', ctrl.getAllOfferBanners);
router.post('/add', categoryUpload, ctrl.addOfferBanner);
router.get('/:id', ctrl.getSingleOfferBanner);
router.put('/update/:id', categoryUpload, ctrl.updateOfferBanner);
router.delete('/delete/:id', ctrl.deleteOfferBanner);

module.exports = router;