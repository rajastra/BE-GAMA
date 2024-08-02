const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../utils/database');
// const { subscription } = require('../controllers/authController');

const User = sequelize.define(
  'User',
  {
    // make id uuid
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user',
    },
    photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false }
);

Model.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const DEFAULT_SALT_ROUNDS = 10;

User.addHook('beforeCreate', async (user) => {
  const encryptedPassword = await bcrypt.hash(
    user.password,
    DEFAULT_SALT_ROUNDS
  );
  user.password = encryptedPassword;
});

module.exports = User;
