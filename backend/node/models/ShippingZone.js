const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ShippingZone = sequelize.define('ShippingZone', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    zoneType: {
        type: DataTypes.ENUM('LOCAL', 'ZONAL', 'REGIONAL'),
        allowNull: false
    },
    stateName: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: true });

module.exports = ShippingZone;
