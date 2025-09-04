// src/models/classSubjectModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const ClassSubject = sequelize.define(
  'ClassSubject',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    classId: { type: DataTypes.UUID, allowNull: false },
    subjectId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    tableName: 'class_subjects',
    timestamps: true,
    indexes: [{ unique: true, fields: ['classId', 'subjectId'] }],
  }
);

module.exports = ClassSubject;
