const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');



router.post('/add', couponController.createCoupon); 

router.get('/all', couponController.getAllCoupons);
router.get('/:id/usage', couponController.getCouponUsage);


router.patch('/status/:id', couponController.toggleStatus); 

router.put('/update/:id', couponController.updateCoupon);

router.delete('/:id', couponController.deleteCoupon); 



router.get('/list', couponController.getVisibleCoupons); 


router.post('/validate', couponController.validateCoupon); 

module.exports = router;
