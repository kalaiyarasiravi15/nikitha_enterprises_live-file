const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bannerController');
const { categoryUpload } = require('../middleware/upload');


router.get('/all', ctrl.getBanners);
router.post('/add', categoryUpload, ctrl.addBanner);
router.get('/:id', ctrl.getSingleBanner);
router.put('/update/:id', categoryUpload, ctrl.updateBanner);
router.delete('/delete/:id', ctrl.deleteBanner);

module.exports = router;