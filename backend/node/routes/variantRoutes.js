const express = require('express');
const router = express.Router();
const variantController = require('../controllers/variantController');

router.post('/add',           variantController.addVariants);
router.get('/all',            variantController.getAllVariants);
router.get('/:id',            variantController.getVariantById);
router.put('/update/:id',     variantController.updateVariant);
router.delete('/delete/:id',  variantController.deleteVariant);

module.exports = router;