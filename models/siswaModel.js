const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Siswa = sequelize.define('Siswa', {
   id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
   },
   name: {
      type: DataTypes.STRING,
      allowNull: false,
   },
   nis: {
      type: DataTypes.STRING,
      allowNull: true,
   },
   nik : {
      type: DataTypes.STRING,
      allowNull: true,
   },
   nisn : {
      type: DataTypes.STRING,
      allowNull: true,
   },
   gender : {
      type: DataTypes.STRING,
      allowNull: false,
   },
   religion : {
      type: DataTypes.STRING,
      allowNull: false,
   },
   city_of_birth : {
      type: DataTypes.STRING,
      allowNull: false,
   },
});

module.exports = Siswa;
