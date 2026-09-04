const ContactMessage = require('../models/ContactMessage');

// 1. SEND (from website Contact page)
exports.sendMessage = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body || {};

        const trimmedName    = (name || '').trim();
        const trimmedEmail   = (email || '').trim().toLowerCase();
        const trimmedPhone   = (phone || '').trim();
        const trimmedSubject = (subject || '').trim();
        const trimmedMessage = (message || '').trim();

        if (!trimmedName || !/^[a-zA-Z\s]+$/.test(trimmedName)) {
            return res.status(400).json({ message: "Name can contain only letters and spaces!" });
        }

        if (!trimmedEmail || !trimmedEmail.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            return res.status(400).json({ message: "Enter a valid email address with '@' symbol!" });
        }

        if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
            return res.status(400).json({ message: "Phone number must be exactly 10 digits!" });
        }

        if (!trimmedSubject) {
            return res.status(400).json({ message: "Subject is required!" });
        }

        if (!trimmedMessage) {
            return res.status(400).json({ message: "Message is required!" });
        }

        const msg = await ContactMessage.create({
            name:    trimmedName,
            email:   trimmedEmail,
            phone:   trimmedPhone || null,
            subject: trimmedSubject,
            message: trimmedMessage
        });
        res.status(201).json({ message: "Message sent successfully!", data: msg });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 2. GET ALL (Admin inbox)
exports.getAllMessages = async (req, res) => {
        try {
            const page = parseInt(req.query.page, 10);
            const limit = parseInt(req.query.limit, 10) || 10;

            if (page) {
                const offset = (page - 1) * limit;
                const { count, rows } = await ContactMessage.findAndCountAll({
                    order: [['createdAt', 'DESC']],
                    limit,
                    offset
                });
                return res.json({
                    success: true,
                    messages: rows,
                    totalCount: count,
                    totalPages: Math.ceil(count / limit)
                });
            }

            const messages = await ContactMessage.findAll({ order: [['createdAt', 'DESC']] });
            res.json(messages);
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    };

// 3. GET SINGLE
exports.getMessage = async (req, res) => {
    try {
        const msg = await ContactMessage.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ message: "Not found" });
        // Mark as read
        if (!msg.isRead) await msg.update({ isRead: true });
        res.json(msg);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 4. MARK READ
exports.markRead = async (req, res) => {
    try {
        const msg = await ContactMessage.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ message: "Not found" });
        await msg.update({ isRead: true });
        res.json({ message: "Marked as read" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 5. DELETE (soft)
exports.deleteMessage = async (req, res) => {
    try {
        const msg = await ContactMessage.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ message: "Not found" });
        await msg.destroy();
        res.json({ message: "Message deleted!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 6. UNREAD COUNT
exports.getUnreadCount = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const count = await ContactMessage.count({ where: { isRead: false, isDeleted: false } });
        res.json({ unreadCount: count });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
