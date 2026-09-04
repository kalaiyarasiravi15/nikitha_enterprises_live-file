// FILE PATH: ars-fashion-backend/controllers/shippingController.js
// ACTION   : NEW FILE — create this file

const { ShippingRate } = require('../models');

// ─────────────────────────────────────────────────────────
// 1. ADMIN: Get all shipping rates
// GET /api/shipping
// ─────────────────────────────────────────────────────────
exports.getAllRates = async (req, res) => {
    try {
        const rates = await ShippingRate.findAll({ order: [['state', 'ASC']] });
        res.json(rates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────
// 2. ADMIN: Add or Update shipping rate for a state
// POST /api/shipping
// body: { state, amount }
// ─────────────────────────────────────────────────────────
exports.upsertRate = async (req, res) => {
    try {
        const { state, amount } = req.body;
        if (!state || amount === undefined || amount === null) {
            return res.status(400).json({ error: 'state and amount are required' });
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return res.status(400).json({ error: 'amount must be a non-negative number' });
        }

        const [rate, created] = await ShippingRate.findOrCreate({
            where: { state },
            defaults: { amount: parsedAmount, isActive: true },
        });

        if (!created) {
            await rate.update({ amount: parsedAmount, isActive: true });
        }

        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? 'Shipping rate added' : 'Shipping rate updated',
            rate,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────
// 3. ADMIN: Delete a shipping rate
// DELETE /api/shipping/:id
// ─────────────────────────────────────────────────────────
exports.deleteRate = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ShippingRate.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ error: 'Rate not found' });
        res.json({ success: true, message: 'Shipping rate deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────
// 4. PUBLIC: Get shipping amount for a specific state
// GET /api/shipping/rate?state=Tamil Nadu
// Frontend Checkout.js இது call பண்ணும்
// ─────────────────────────────────────────────────────────
exports.getRateByState = async (req, res) => {
    try {
        const { state } = req.query;
        if (!state) return res.status(400).json({ error: 'state query param required' });

        const rate = await ShippingRate.findOne({
            where: { state, isActive: true },
        });

        res.json({
            state,
            amount: rate ? parseFloat(rate.amount) : 0,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};