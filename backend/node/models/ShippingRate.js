// FILE PATH: ars-fashion-backend/models/ShippingRate.js
// ACTION   : NEW FILE — create this file

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ShippingRate = sequelize.define('ShippingRate', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    timestamps: true,
});

module.exports = ShippingRate;