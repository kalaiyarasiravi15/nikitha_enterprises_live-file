const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');
const { dealUpload } = require('../middleware/upload');

router.get('/active', dealController.getActiveDeal);
router.get('/all', dealController.getAllDeals);

router.post('/add', dealUpload, dealController.addDeal);
router.delete('/:id', dealController.deleteDeal);

router.put('/update/:id', dealUpload, dealController.updateDeal);

module.exports = router;