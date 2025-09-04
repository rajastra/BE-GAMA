const { DataTypes: DT } = require('sequelize');
const sequelize = require('../utils/database');

const GradingPolicy = sequelize.define('GradingPolicy', {
  id: { type: DT.UUID, defaultValue: DT.UUIDV4, primaryKey: true },
  classSubjectId: { type: DT.UUID, allowNull: false },
  termId: { type: DT.UUID, allowNull: false },
  policyJson: { type: DT.JSONB, allowNull: false },        // {task:30, quiz:20, uts:25, uas:25}
  kkm: { type: DT.INTEGER, allowNull: false, defaultValue: 75 },
  effectiveFrom: { type: DT.DATEONLY, allowNull: false, defaultValue: DT.NOW },
}, {
  tableName: 'grading_policies',
  timestamps: true,
  indexes: [{ unique: true, fields: ['classSubjectId', 'termId'] }]
});

module.exports = GradingPolicy;