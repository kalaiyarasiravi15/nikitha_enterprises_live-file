const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Coupon = sequelize.define('Coupon', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    type: { 
        type: DataTypes.ENUM('percentage', 'flat'), 
        defaultValue: 'percentage' 
    },
    discountValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    minOrderAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    maxOrderAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: null }, 
    maxDiscount: { type: DataTypes.DECIMAL(10, 2) }, 
    targetType: {
        type: DataTypes.ENUM('SHOP', 'PRODUCT'),
        allowNull: false,
        defaultValue: 'SHOP'
    },
    productId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    usageLimit: { type: DataTypes.INTEGER, defaultValue: 100 }, 
    usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Coupon;
