const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { settingUpload } = require('../middleware/upload');

// Public route to fetch configurations (both Checkout and Admin Panel can fetch this)
router.get('/', settingController.getSettings);

// Admin route to save/update configurations (admin panel manages this)
router.put('/', settingController.updateSettings);

// Admin route to upload images for dynamic pages
router.post('/upload', settingUpload, settingController.uploadSettingImage);

module.exports = router;
