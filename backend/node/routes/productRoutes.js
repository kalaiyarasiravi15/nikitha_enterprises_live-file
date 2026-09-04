const express = require('express');
const router  = express.Router();
const productController = require('../controllers/productController');
const { productUpload } = require('../middleware/upload');

router.post('/add',                       productUpload, productController.createProduct);
router.get('/by-category/:categoryId',                  productController.getProductsByCategory);
router.get('/all',                                       productController.getAllProducts);

router.get('/slug/:slug',                               productController.getProductBySlug);
router.get('/:id',                                       productController.getProductById);
router.put('/update-stock',                             productController.updateStock);
router.put('/update/:id',                 productUpload, productController.updateProduct);
router.delete('/delete/:id',                            productController.deleteProduct);

module.exports = router;