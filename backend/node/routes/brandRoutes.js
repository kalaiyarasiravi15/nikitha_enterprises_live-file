const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const { categoryUpload } = require('../middleware/upload');

router.post('/add', categoryUpload, brandController.addBrand);
router.get('/all', brandController.getAllBrands);
router.get('/:id', brandController.getSingleBrand);
router.put('/update/:id', categoryUpload, brandController.updateBrand);
router.delete('/delete/:id', brandController.deleteBrand);

module.exports = router;