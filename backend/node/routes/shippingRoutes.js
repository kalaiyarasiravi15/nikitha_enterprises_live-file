// FILE PATH: ars-fashion-backend/routes/shippingRoutes.js
// ACTION   : NEW FILE — create this file

const express    = require('express');
const router     = express.Router();
const shippingController = require('../controllers/shippingController');
const authMiddleware     = require('../middleware/authMiddleware');

// Public — frontend checkout uses this (no token needed)
router.get('/rate', shippingController.getRateByState);

// Admin only — protected by JWT
router.get('/',       authMiddleware, shippingController.getAllRates);
router.post('/',      authMiddleware, shippingController.upsertRate);
router.delete('/:id', authMiddleware, shippingController.deleteRate);

module.exports = router;