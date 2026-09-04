const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderSlot = sequelize.define('OrderSlot', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    orderId: { 
        type: DataTypes.STRING, 
        allowNull: false
    },


    productId: { 
        type: DataTypes.INTEGER, 
        allowNull: true   
    },
    variantId: { 
        type: DataTypes.INTEGER, 
        allowNull: true   
    },
    selectedSubOption: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isPreorder: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },

    productName: {
        type: DataTypes.STRING,
        allowNull: true   
    },
    productImage: {
        type: DataTypes.STRING,
        allowNull: true   
    },
    variantLabel: {
        type: DataTypes.STRING,
        allowNull: true   
    },

    salesPrice: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false 
    },
    mrpPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    basePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    gstPercent: { type: DataTypes.INTEGER, allowNull: true },
    gstAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    finalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    gstType: { type: DataTypes.STRING(10), allowNull: true },
    quantity: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    }
});

module.exports = OrderSlot;
