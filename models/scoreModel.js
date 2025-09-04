const { DataTypes: DT } = require('sequelize');
const sequelize = require('../utils/database');

const Score = sequelize.define('Score', {
  id: { type: DT.UUID, defaultValue: DT.UUIDV4, primaryKey: true },
  assessmentId: { type: DT.UUID, allowNull: false },
  studentId: { type: DT.UUID, allowNull: false },
  score: { type: DT.DECIMAL(6,2), allowNull: false },
  note: { type: DT.STRING(255), allowNull: true },
}, {
  tableName: 'scores',
  timestamps: true,
  indexes: [{ unique: true, fields: ['assessmentId', 'studentId'] }]
});

module.exports = Score;