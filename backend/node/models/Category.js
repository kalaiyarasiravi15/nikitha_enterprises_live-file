const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Category = sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    image: { type: DataTypes.STRING }, 
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    timestamps: true,
    paranoid: true
});

module.exports = Category;