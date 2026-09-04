const express = require('express');
const router = express.Router();
const cartCtrl = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// Anonymous cart APIs. guestSessionId is an unguessable UUID created by the storefront.
router.get('/guest/:guestSessionId', cartCtrl.getGuestCart);
router.post('/guest/add',            cartCtrl.addGuestToCart);
router.put('/guest/update/:id',      cartCtrl.updateGuestCartItem);
router.delete('/guest/remove/:id',   cartCtrl.removeGuestFromCart);
router.delete('/guest/clear/:guestSessionId', cartCtrl.clearGuestCart);

// Registered-customer cart APIs
router.get('/:customerId',           authMiddleware, cartCtrl.getCart);
router.post('/add',                  authMiddleware, cartCtrl.addToCart);
router.put('/update/:id',            authMiddleware, cartCtrl.updateCartItem);
router.delete('/remove/:id',         authMiddleware, cartCtrl.removeFromCart);
router.delete('/clear/:customerId',  authMiddleware, cartCtrl.clearCart);

module.exports = router;
