const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collectionController');

// GET all collections
router.get('/all', ctrl.getAllCollections);
router.get('/best-sellers', ctrl.getBestSellers);
router.get('/trending', ctrl.getTrending);
router.get('/new-arrivals', ctrl.getNewArrivals);
router.get('/top-rated', ctrl.getTopRated);

// Remove from collection
router.delete('/best-sellers/:productId', ctrl.removeFromBestSeller);
router.delete('/trending/:productId', ctrl.removeFromTrending);
router.delete('/new-arrivals/:productId', ctrl.removeFromNewArrival);
router.delete('/top-rated/:productId', ctrl.removeFromTopRated);

module.exports = router;
