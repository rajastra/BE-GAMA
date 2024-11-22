const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Pegawai = sequelize.define('Pegawai', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nama: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tgl_lahir: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  alamat: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  jabatan: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  jenis_kelamin: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nomor_telepon: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  foto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Pegawai;
