require('dotenv').config();
const { Sequelize } = require('sequelize');

// dialect prod untuk production
const sequelize = new Sequelize(process.env.DATABASE_URL_LOCAL, {
  dialect: process.env.DIALECT_LOCAL,
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

testConnection();

module.exports = sequelize;
