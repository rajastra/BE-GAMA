const { DataTypes: DT } = require('sequelize');
const sequelize = require('../utils/database');

const Assessment = sequelize.define('Assessment', {
  id: { type: DT.UUID, defaultValue: DT.UUIDV4, primaryKey: true },
  classSubjectId: { type: DT.UUID, allowNull: false },
  termId: { type: DT.UUID, allowNull: false },
  title: { type: DT.STRING(160), allowNull: false },
  type: { type: DT.ENUM('task','quiz','uts','uas','project','practical'), allowNull: false },
  weight: { type: DT.DECIMAL(5,2), allowNull: false, defaultValue: 0 }, // opsional
  dueDate: { type: DT.DATEONLY, allowNull: true },
  isPublished: { type: DT.BOOLEAN, allowNull: false, defaultValue: false },
  state: { type: DT.ENUM('draft','locked','published'), allowNull: false, defaultValue: 'draft' },
}, { tableName: 'assessments', timestamps: true });

module.exports = Assessment;