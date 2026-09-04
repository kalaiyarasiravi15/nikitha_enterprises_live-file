const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/codTrackerController');

router.get('/cod-orders', ctrl.getCodOrders);
router.get('/cod-summary', ctrl.getCodSummary);
router.put('/cod-status/:orderId', ctrl.updateCodStatus);
router.get('/online-orders', ctrl.getOnlineOrders);

module.exports = router;
