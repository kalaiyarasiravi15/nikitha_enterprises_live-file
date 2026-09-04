const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OfferBanner = sequelize.define('OfferBanner', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.STRING, allowNull: true },
    buttonText: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Shop Now' },
    image: { type: DataTypes.STRING, allowNull: false },
    link: { type: DataTypes.STRING, allowNull: true },
    discountTag: { type: DataTypes.STRING, allowNull: true },
    productId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Products', key: 'id' } },
    discountPercentage: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    startDate: { type: DataTypes.DATE, allowNull: true },
    expiryDate: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    discountType: { type: DataTypes.ENUM('PERCENTAGE', 'FLAT'), defaultValue: 'PERCENTAGE', allowNull: false },
    discountValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00, allowNull: false },
    targetAudience: { type: DataTypes.ENUM('ALL', 'NEW_CUSTOMER', 'REGULAR_CUSTOMER'), defaultValue: 'ALL', allowNull: false }
}, {
    timestamps: true,
    tableName: 'OfferBanners'
});

module.exports = OfferBanner;
