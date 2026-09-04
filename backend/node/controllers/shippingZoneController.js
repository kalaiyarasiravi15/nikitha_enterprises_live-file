const { ShippingZone } = require('../models/index');

// Zone definitions
const LOCAL_STATES = ['Karnataka'];
const ZONAL_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Delhi', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Jammu and Kashmir', 'Ladakh'
];
const REGIONAL_STATES = [
    'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Goa',
    'Puducherry'
];

// Admin: Get all zones
exports.getAll = async (req, res) => {
    try {
        const zones = await ShippingZone.findAll({ order: [['zoneType', 'ASC'], ['stateName', 'ASC']] });
        res.json({ success: true, data: zones });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Add zone
exports.create = async (req, res) => {
    try {
        const { zoneType, stateName, amount } = req.body;
        if (!zoneType || !stateName || amount === undefined) {
            return res.status(400).json({ success: false, message: 'zoneType, stateName, amount required' });
        }
        // Auto-determine zone type if not provided
        const zone = await ShippingZone.create({ zoneType, stateName: stateName.trim(), amount: Number(amount), isActive: true });
        res.json({ success: true, data: zone });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Update zone
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, isActive } = req.body;
        const zone = await ShippingZone.findByPk(id);
        if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
        await zone.update({ amount: amount !== undefined ? Number(amount) : zone.amount, isActive: isActive !== undefined ? isActive : zone.isActive });
        res.json({ success: true, data: zone });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Delete zone
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        const zone = await ShippingZone.findByPk(id);
        if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
        await zone.destroy();
        res.json({ success: true, message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Public: Get shipping rate by state
exports.getRateByState = async (req, res) => {
    try {
        const { state } = req.query;
        if (!state) return res.status(400).json({ success: false, message: 'state required' });

        // Determine zone type
        let zoneType;
        if (LOCAL_STATES.some(s => s.toLowerCase() === state.toLowerCase())) {
            zoneType = 'LOCAL';
        } else if (ZONAL_STATES.some(s => s.toLowerCase() === state.toLowerCase())) {
            zoneType = 'ZONAL';
        } else {
            zoneType = 'REGIONAL';
        }

        // Try to find exact state rate first (case-insensitive)
        const { Op } = require('sequelize');
        let zone = await ShippingZone.findOne({
            where: {
                stateName: { [Op.like]: state.trim() },
                isActive: true
            }
        });

        // Only a deliberately configured DEFAULT rate may be used as a
        // zone fallback. A charge configured for another state must not leak.
        if (!zone) {
            zone = await ShippingZone.findOne({
                where: {
                    zoneType,
                    stateName: { [Op.like]: 'DEFAULT' },
                    isActive: true
                },
                order: [['createdAt', 'DESC']]
            });
        }

        const zoneName = zoneType === 'LOCAL' ? 'Local' : zoneType === 'ZONAL' ? 'Zonal' : 'Regional';

        if (!zone) {
            // No zone configured — return null so checkout uses defaultFee
            return res.json({ success: true, state, zoneType, amount: null, zoneName, configured: false });
        }

        res.json({ success: true, state, zoneType, amount: Number(zone.amount), zoneName, configured: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Get zone type for a state (utility)
exports.getZoneType = (state) => {
    if (!state) return 'REGIONAL';
    if (LOCAL_STATES.some(s => s.toLowerCase() === state.toLowerCase())) return 'LOCAL';
    if (ZONAL_STATES.some(s => s.toLowerCase() === state.toLowerCase())) return 'ZONAL';
    return 'REGIONAL';
};
