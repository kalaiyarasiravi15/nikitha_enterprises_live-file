const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
router.get('/badges', dashboardController.getBadgeCounts);
router.get('/stats', dashboardController.getAdminDashboardStats);
module.exports = router;
