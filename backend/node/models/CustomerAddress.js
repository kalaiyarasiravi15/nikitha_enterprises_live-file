// models/CustomerAddress.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CustomerAddress = sequelize.define('CustomerAddress', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false }, 
    houseNo: { type: DataTypes.STRING, allowNull: false },
    street: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    pincode: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false, defaultValue: 'India' },
    // Add this line:
    district: { type: DataTypes.STRING, allowNull: true } 
});

module.exports = CustomerAddress;