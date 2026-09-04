const express = require('express');
const router = express.Router();
const subCategoryController = require('../controllers/subCategoryController');
const { categoryUpload } = require('../middleware/upload');

router.post('/add', categoryUpload, subCategoryController.addSubCategory);
router.get('/all', subCategoryController.getAllSubCategories);
router.get('/:id', subCategoryController.getSingleSubCategory);
router.delete('/delete/:id', subCategoryController.deleteSubCategory);

module.exports = router;