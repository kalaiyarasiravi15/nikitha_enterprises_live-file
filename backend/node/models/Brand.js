const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Brand = sequelize.define('Brand', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    image: { type: DataTypes.STRING }, 
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Brand;