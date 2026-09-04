const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contactController');

router.post('/send', ctrl.sendMessage);
router.get('/all', ctrl.getAllMessages);
router.get('/unread-count', ctrl.getUnreadCount);
router.get('/:id', ctrl.getMessage);
router.put('/read/:id', ctrl.markRead);
router.delete('/delete/:id', ctrl.deleteMessage);

module.exports = router;
