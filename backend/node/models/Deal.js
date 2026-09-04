const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Deal = sequelize.define('Deal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    image: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: true },
    expiryDate: { type: DataTypes.DATE, allowNull: false },
    buttonText: { type: DataTypes.STRING, defaultValue: "SHOP NOW" },
    buttonLink: { type: DataTypes.STRING, defaultValue: "/shop" },
    discountPercentage: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    discountType: { type: DataTypes.ENUM('PERCENTAGE', 'FLAT'), defaultValue: 'PERCENTAGE', allowNull: false },
    discountValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00, allowNull: false },
    targetAudience: { type: DataTypes.ENUM('ALL', 'NEW_CUSTOMER', 'REGULAR_CUSTOMER'), defaultValue: 'ALL', allowNull: false },
    targetType: { type: DataTypes.ENUM('SHOP', 'PRODUCT'), defaultValue: 'SHOP', allowNull: false },
    targetProductId: { type: DataTypes.INTEGER, allowNull: true }
}, {
    timestamps: true,
    tableName: 'deals'
});

module.exports = Deal;