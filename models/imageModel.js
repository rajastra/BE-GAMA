const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Image = sequelize.define('Image', {
  image: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Image;
