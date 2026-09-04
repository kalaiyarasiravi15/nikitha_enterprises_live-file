const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Wishlist = sequelize.define('Wishlist', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // A wishlist belongs either to a registered customer or to an anonymous browser session.
    customerId: { type: DataTypes.INTEGER, allowNull: true },
    guestSessionId: { type: DataTypes.STRING(80), allowNull: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    variantId: { type: DataTypes.INTEGER, allowNull: true },
    selectedSubOption: { type: DataTypes.STRING, allowNull: true }
});

module.exports = Wishlist;
