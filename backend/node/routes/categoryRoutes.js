const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { categoryUpload } = require('../middleware/upload'); 


router.post('/add', categoryUpload, categoryController.addCategory);


router.get('/all', categoryController.getAllCategories);


router.get('/:id', categoryController.getCategoryById);


router.put('/update/:id', categoryUpload, categoryController.updateCategory);


router.delete('/delete/:id', categoryController.deleteCategory);

module.exports = router;