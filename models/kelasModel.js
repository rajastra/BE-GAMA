const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Kelas = sequelize.define('Kelas', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: { // contoh: "X IPA 1"
    type: DataTypes.STRING,
    allowNull: false,
  },
  grade: { // opsional: tingkat kelas
    type: DataTypes.STRING,
    allowNull: true,
  },
  pegawaiId: {
    type: DataTypes.UUID,
    allowNull: false, // kelas wajib punya wali/teacher
  },
}, {
  tableName: 'kelas',
  timestamps: true,
});

module.exports = Kelas;
