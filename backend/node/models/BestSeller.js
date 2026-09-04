const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BestSeller = sequelize.define('BestSeller', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'Products', key: 'id' }
    },
    addedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: false });

module.exports = BestSeller;
