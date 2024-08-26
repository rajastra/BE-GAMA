const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Presensi = sequelize.define(
  'Presensi',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tgl_absensi: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lampiran: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false }
);

module.exports = Presensi;
