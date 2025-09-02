/* eslint-disable prefer-template */
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const cron = require('node-cron');

// import routes
const userRouter = require('./routes/userRoutes');
const galeriRouter = require('./routes/galeriRoutes');
const imageRouter = require('./routes/imageRoutes');
const fileRouter = require('./routes/fileRoutes');
const regulasiRouter = require('./routes/regulasiRoutes');
const indikatorRouter = require('./routes/indikatorRoutes');
const pegawaiRouter = require('./routes/pegawaiRoutes');
const presensiRouter = require('./routes/presensiRoutes');
const izinRouter = require('./routes/izinRoutes');
const documentRouter = require('./routes/documentRoutes');
const kelasRouter = require('./routes/kelasRoutes');
const kehadiranRouter = require('./routes/kehadiranRoutes')
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errController');

// import models
const User = require('./models/userModel');
const Pegawai = require('./models/pegawaiModel');
const Presensi = require('./models/presensiModel');
const Izin = require('./models/izinModel');
const Siswa = require('./models/siswaModel');
const siswaRouter = require('./routes/siswaRoutes');
const Kelas = require('./models/kelasModel');
const Kehadiran = require('./models/kehadiranModel');

// test update
const app = express();
const URL = process.env.VITE_BASE_URL;

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
app.use('/api/v1/attendence', presensiRouter);
app.use('/api/v1/permissions', izinRouter);
app.use('/api/v1/document', documentRouter);
app.use('/api/v1/students', siswaRouter);
app.use('/api/v1/classes', kelasRouter);
app.use('/api/v1/kehadiran', kehadiranRouter)

app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
const sequelize = require('./utils/database');
const Document = require('./models/documentModel');

// Relasi antar tabel
// relasi user dan pegawai
User.belongsTo(Pegawai, { foreignKey: 'pegawaiId' });
Pegawai.hasOne(User, { foreignKey: 'pegawaiId' });

//relasi pegawai dan presensi
Presensi.belongsTo(Pegawai, { foreignKey: 'pegawaiId' });
Pegawai.hasMany(Presensi, { foreignKey: 'pegawaiId' });

//relasi pegawai dan pengajuan izin
Izin.belongsTo(Pegawai, { foreignKey: 'pegawaiId' });
Pegawai.hasMany(Izin, { foreignKey: 'pegawaiId' });

//relasi pegawai dan dokumen
Document.belongsTo(Pegawai, { foreignKey: 'pegawaiId' });
Pegawai.hasMany(Document, { foreignKey: 'pegawaiId' });

// relasi siswa ke user one to one
User.hasOne(Siswa, { foreignKey: 'userId' });
Siswa.belongsTo(User, { foreignKey: 'userId' });

// Teacher 1..* Kelas
Pegawai.hasMany(Kelas, {
  foreignKey: 'pegawaiId',
});

Kelas.belongsTo(Pegawai, {
  foreignKey: 'pegawaiId',
  as: 'pegawai',
});

// Kelas 1..* Siswa
Kelas.hasMany(Siswa, {
  foreignKey: 'kelasId',
  as: 'students',
});

Siswa.belongsTo(Kelas, {
  foreignKey: 'kelasId',
  as: 'class',
});

// Kehadiran
Kelas.hasMany(Kehadiran, { foreignKey: 'kelasId' });

Siswa.hasMany(Kehadiran, { foreignKey: 'siswaId' });

Kehadiran.belongsTo(Kelas, { foreignKey: 'kelasId', as: 'kelas' });

Kehadiran.belongsTo(Siswa, { foreignKey: 'siswaId', as: 'siswa' });

cron.schedule('00 18 * * 1-5', async () => {
  try {
    console.log('cronjob schedule berjalan pada jam 18.00 WIB');
    await axios.post(URL + `/api/v1/attendence/check-attendance`);
  } catch (error) {
    console.error('Error checking attendance:', error);
  }
});

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
