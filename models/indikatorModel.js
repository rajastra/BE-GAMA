const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Indikator = sequelize.define(
  'Indikator',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    aspek: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    indikator: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    penanggungJawab: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    penjelasan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dataPendukung: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tingkatKematangan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: false }
);

module.exports = Indikator;
