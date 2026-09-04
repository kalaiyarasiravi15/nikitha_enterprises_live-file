const sms = require('../utils/smsService');
const { Customer, SmsLog } = require('../models');

// 1. Send Bulk Promotional SMS to all or selected customers
exports.sendBulkSMS = async (req, res) => {
    try {
        const { message, customerIds, customNumbers } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message content is required!' });
        }

        let numbersToTarget = [];

        if (customNumbers && Array.isArray(customNumbers) && customNumbers.length > 0) {
            numbersToTarget = customNumbers;
        } else if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
            const customers = await Customer.findAll({
                where: { id: customerIds },
                attributes: ['phone']
            });
            numbersToTarget = customers.map(c => c.phone).filter(Boolean);
        } else {
            // Target all customers
            const customers = await Customer.findAll({
                attributes: ['phone']
            });
            numbersToTarget = customers.map(c => c.phone).filter(Boolean);
        }

        if (numbersToTarget.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid customer phone numbers found!' });
        }

        const result = await sms.sendBulkSMS(numbersToTarget, message.trim());
        if (!result.success) {
            return res.status(502).json({
                success: false,
                message: 'SMS provider did not accept every message batch.',
                details: result
            });
        }
        return res.json({
            success: true,
            message: `Bulk SMS sent to ${result.total || numbersToTarget.length} recipient(s).`,
            details: result
        });
    } catch (error) {
        console.error('sendBulkSMS error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Check SMS Balance/Credits
exports.getCredits = async (req, res) => {
    try {
        const result = await sms.checkCredits();
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Live SMS activity for the admin monitor. Phone numbers are masked at rest.
exports.getLogs = async (req, res) => {
    try {
        const requested = Number(req.query.limit || 50);
        const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 200) : 50;
        const logs = await SmsLog.findAll({
            limit,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'recipients', 'messageType', 'status', 'providerMessageId', 'error', 'sentAt', 'deliveredAt', 'createdAt', 'updatedAt']
        });
        return res.json({ success: true, logs });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 4. Sends the already-approved welcome template to one number for an explicit live test.
exports.sendTestSMS = async (req, res) => {
    try {
        const phone = String(req.body?.phone || '').trim();
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Enter a valid 10-digit test number.' });
        }
        const result = await sms.sendTestSMS(phone);
        return res.status(result.success ? 200 : 502).json({
            success: result.success,
            message: result.success ? 'SMS provider accepted the test message. Check the live log for delivery status.' : 'SMS provider rejected the test message.',
            logId: result.logId || null,
            providerMessageId: result.messageId || null,
            error: result.error || null
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 5. Provider DLR webhook. Configure this exact callback URL in the SMS provider portal:
// https://api.anyrastrove.com/api/sms/dlr?token=<SMS_DLR_CALLBACK_TOKEN>
exports.receiveDeliveryReport = async (req, res) => {
    const callbackToken = String(process.env.SMS_DLR_CALLBACK_TOKEN || '').trim();
    const suppliedToken = String(req.query.token || req.headers['x-sms-dlr-token'] || '').trim();
    if (!callbackToken || suppliedToken !== callbackToken) {
        return res.status(401).json({ success: false, message: 'Invalid delivery-report callback token.' });
    }
    try {
        const result = await sms.recordDeliveryReport({ ...req.query, ...req.body });
        return res.status(result.success ? 200 : 202).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
