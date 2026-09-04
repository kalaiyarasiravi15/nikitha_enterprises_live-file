const express = require('express');
const router = express.Router();
const thumbController = require('../controllers/thumbController');
const { thumbnailUpload } = require('../middleware/upload');

router.post('/add', thumbnailUpload, thumbController.addThumbnails);
router.get('/all', thumbController.getAllThumbnails);
router.get('/:id', thumbController.getThumbnailById);
router.delete('/delete/:id', thumbController.deleteThumbnail);

module.exports = router;