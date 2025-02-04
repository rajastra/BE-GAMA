const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Izin = sequelize.define(
  'Izin',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tgl_mulai: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tgl_selesai: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    jenis: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    alasan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('diajukan', 'disetujui', 'ditolak'),
      allowNull: false,
      defaultValue: 'diajukan',
    },
    lampiran: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = Izin;
