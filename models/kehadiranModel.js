// models/kehadiranModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Kehadiran = sequelize.define(
  'Kehadiran',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,     // presensi harian -> YYYY-MM-DD
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('present', 'excused', 'sick', 'absent', 'late'),
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    kelasId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: { model: 'kelas', key: 'id' } // optional: aktifkan jika FK hard
    },
    siswaId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: { model: 'siswa', key: 'id' }
    },
    // markedById: { type: DataTypes.UUID } // optional: siapa yang input
  },
  {
    tableName: 'kehadiran',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['kelasId', 'siswaId', 'date'] }, // 1-hari-1-record
      { fields: ['kelasId', 'date'] },
      { fields: ['siswaId', 'date'] },
    ],
  }
);

module.exports = Kehadiran;
