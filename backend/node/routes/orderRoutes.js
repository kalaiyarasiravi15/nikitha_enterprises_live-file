const router      = require('express').Router();
const orderCtrl   = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');


router.post('/place',                   authMiddleware, orderCtrl.placeOrder);
router.post('/guest-place',             orderCtrl.placeOrder);
router.get('/recent',                   orderCtrl.getRecentOrders);
router.get('/all',                      orderCtrl.getAllOrders);
router.get('/customer/:customerId',     authMiddleware, orderCtrl.getOrdersByCustomer);
router.put('/update/:id',               orderCtrl.updateStatus);
router.delete('/delete/:id',            authMiddleware, orderCtrl.deleteOrder);
const courierCtrl = require('../controllers/courierController');

router.post('/shipping/assign/:orderId', authMiddleware, courierCtrl.assignCourier);
router.get('/shipping/tracking/:orderId', courierCtrl.getTracking);
router.get('/shipping/label/:orderId', authMiddleware, courierCtrl.getLabel);

router.post('/cancel-request/:id', authMiddleware, orderCtrl.requestCancellation);
router.post('/cancel-approve/:id', authMiddleware, orderCtrl.approveCancellation);

// Shipping Settlement
router.post('/shipping/update-settlement', orderCtrl.updateCourierSettlement);
router.get('/shipping/settlement-summary', orderCtrl.getCourierSettlementSummary);

module.exports = router;
