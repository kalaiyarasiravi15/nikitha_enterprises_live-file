const express = require('express');
const router = express.Router();
const wishCtrl = require('../controllers/whislistController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/guest/:guestSessionId',                wishCtrl.getGuestWishlist);
router.post('/guest/toggle',                        wishCtrl.toggleGuestWishlist);
router.delete('/guest/remove/:id',                  wishCtrl.removeGuestFromWishlist);

router.get('/check/:customerId/:productId',         authMiddleware, wishCtrl.checkWishlist);
router.get('/:customerId',                          authMiddleware, wishCtrl.getWishlist);
router.post('/toggle',                              authMiddleware, wishCtrl.toggleWishlist);
router.delete('/remove/:id',                        authMiddleware, wishCtrl.removeFromWishlist);

module.exports = router;
