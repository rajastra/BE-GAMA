const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const userRouter = require('./routes/userRoutes');
const galeriRouter = require('./routes/galeriRoutes');
const imageRouter = require('./routes/imageRoutes');
const fileRouter = require('./routes/fileRoutes');
const regulasiRouter = require('./routes/regulasiRoutes');
const indikatorRouter = require('./routes/indikatorRoutes');
const pegawaiRouter = require('./routes/pegawaiRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errController');
const User = require('./models/userModel');
const Pegawai = require('./models/pegawaiModel');

// test update
const app = express();

// add cors
app.use(cors());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use(express.json());

app.use('/api/v1/users', userRouter);
app.use('/api/v1/galeris', galeriRouter);
app.use('/api/v1/image', imageRouter);
app.use('/api/v1/file', fileRouter);
app.use('/api/v1/regulations', regulasiRouter);
app.use('/api/v1/indicators', indikatorRouter);
app.use('/api/v1/employees', pegawaiRouter);

app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
const sequelize = require('./utils/database');

// Relasi antar tabel
// relasi user dan pegawaiq
User.belongsTo(Pegawai, { foreignKey: 'pegawaiId' });
Pegawai.hasOne(User, { foreignKey: 'pegawaiId' });

const sync = async () => await sequelize.sync({ force: false });
sync()
  .then(() => {
    console.log('Database synced successfully');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });

app.use(globalErrorHandler);

module.exports = app;
