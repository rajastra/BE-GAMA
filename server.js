// const fs = require('fs');
// const https = require('https');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({
  path: './.env',
});
const app = require('./app');

// const options = {
//   key: fs.readFileSync('/etc/letsencrypt/live/apps-api-gama.shop/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/apps-api-gama.shop/fullchain.pem')
// };

// const PORT = process.env.PORT || 3000;

// https.createServer(options, app).listen(PORT, () => {
//   console.log(`Server running on https://localhost:${PORT}`);
// });

// Alert => use this for env development
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`app listening on port ${port}!`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
