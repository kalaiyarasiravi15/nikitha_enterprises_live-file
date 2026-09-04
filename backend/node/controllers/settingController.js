const { Setting } = require('../models');
const sequelize = require('../config/db');

// 1. PUBLIC / ADMIN: Get all settings as key-value map
// GET /api/settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.findAll();
        const configMap = {};
        settings.forEach(s => {
            configMap[s.key] = s.value;
        });
        res.json({
            success: true,
            data: configMap
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. ADMIN: Update settings (bulk updates)
// PUT /api/settings
// body: { "FREE_SHIPPING_THRESHOLD": "1000", "DEFAULT_SHIPPING_FEE": "150" }
exports.updateSettings = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const payload = req.body;
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid payload' });
        }

        const keys = Object.keys(payload);
        for (const key of keys) {
            const value = String(payload[key]);
            
            if (['FREE_SHIPPING_THRESHOLD', 'DEFAULT_SHIPPING_FEE', 'FREE_SHIPPING_COD_THRESHOLD', 'FREE_SHIPPING_ONLINE_THRESHOLD'].includes(key)) {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0) {
                    throw new Error(`Value for ${key} must be a non-negative number`);
                }
            }
            if (key === 'COMPANY_STATE' && !value.trim()) {
                throw new Error('Company state is required for GST invoices');
            }

            const [setting, created] = await Setting.findOrCreate({
                where: { key },
                defaults: { value },
                transaction: t
            });

            if (!created) {
                await setting.update({ value }, { transaction: t });
            }
        }

        await t.commit();
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.uploadSettingImage = (req, res) => {
    try {
        if (!req.files || !req.files.images || req.files.images.length === 0) {
            return res.status(400).json({ success: false, error: 'No image uploaded' });
        }
        const file = req.files.images[0];
        res.json({ success: true, imageUrl: '/uploads/' + file.filename });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
