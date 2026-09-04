const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    name: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    slug: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
    },
    description: { 
        type: DataTypes.TEXT 
    },
    mainImage: { 
        type: DataTypes.STRING 
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
    basePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
    gstPercent: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    gstAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
    finalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
    gstType: { type: DataTypes.ENUM('include', 'exclude'), allowNull: true, defaultValue: null },
    categoryId: { 
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true
    },
    salesStock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true
    },

    thumbVideo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    }
}, {
    timestamps: true,
    paranoid: true
});

module.exports = Product;
