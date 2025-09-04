// src/models/termModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Term = sequelize.define(
  'Term',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(40), allowNull: false },       // "Ganjil"
    yearLabel: { type: DataTypes.STRING(20), allowNull: false },  // "2025/2026"
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'terms', timestamps: true }
);

module.exports = Term;
