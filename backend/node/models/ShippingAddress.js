
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ShippingAddress = sequelize.define('ShippingAddress', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Customers', key: 'id' },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  addressLine: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pincode: {
    type: DataTypes.STRING(6),
    allowNull: true,
  },
  district: { type: DataTypes.STRING, allowNull: true }
});

module.exports = ShippingAddress;