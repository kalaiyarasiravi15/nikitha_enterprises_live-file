const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Medical-device product variant schema
// Each variant row represents ONE value for ONE variant type
// e.g. variantType="Model Variant", variantValue="HA-500"
const ProductVariant = sequelize.define('ProductVariant', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    groupId: {
        // Groups all values of the same variantType together (e.g. all "Weight" options share a groupId)
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    },
    variantType: {
        // One of 10 supported types or custom
        type: DataTypes.STRING(100),
        allowNull: true
    },
    variantValue: {
        // Free text: "HA-500", "Small", "300 × 400 × 500 mm", etc.
        type: DataTypes.STRING(255),
        allowNull: true
    },
    name: {
        // Optional product name override for this variant
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
    },
    description: {
        // Optional description override for this variant
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    video: {
        // Optional video filename for this variant
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    stock: {
        // Stock / quantity for this specific variant
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true
    },
    salesStock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true
    },
    mrpPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
    },
    salesPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
    },
    mainImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    thumbnails: {
        type: DataTypes.TEXT, // JSON array of variant thumbnail filenames
        allowNull: true
    },
    specifications: {
        type: DataTypes.TEXT, // JSON array of variant specifications key-value pairs
        allowNull: true
    },
    subOptions: {
        type: DataTypes.TEXT, // JSON array of capacities/sub-options (e.g., ["1.8 L", "2.4 L"])
        allowNull: true
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = ProductVariant;