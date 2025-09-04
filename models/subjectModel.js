const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Subject = sequelize.define(
  'Subject',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
  },
  { tableName: 'subjects', timestamps: true }
);

module.exports = Subject;
