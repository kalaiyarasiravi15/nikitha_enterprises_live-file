const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cancellationController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/cancellations')),
    filename: (req, file, cb) => cb(null, `cancel_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Create uploads/cancellations dir if not exists
const fs = require('fs');
const dir = path.join(__dirname, '../uploads/cancellations');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// User routes
router.post('/request', upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]), ctrl.requestCancel);
router.get('/order/:orderId', ctrl.getByOrder);

// Admin routes
router.get('/', ctrl.getAll);
router.get('/stats', ctrl.stats);
router.put('/:id/approve', ctrl.approve);
router.put('/:id/reject', ctrl.reject);
router.put('/:id/product-received', ctrl.markProductReceived);
router.put('/:id/initiate-refund', ctrl.initiateRefund);
router.put('/:id/complete-refund', ctrl.completeRefund);

module.exports = router;
