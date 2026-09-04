const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Banner = sequelize.define('Banner', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: true },
    subtitle: { type: DataTypes.STRING, allowNull: true },
    buttonText: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Shop Now' },
    image: { type: DataTypes.STRING, allowNull: false },
    link: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Banner;
