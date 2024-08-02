const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const File = sequelize.define('File', {
  file: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = File;
