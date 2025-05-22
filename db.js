// db.js
require('dotenv').config(); // Pastikan ini di atas

const mysql = require('mysql2');

const db_config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

let connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config);

  connection.connect((err) => {
    if (err) {
      console.error('❌ Gagal konek DB:', err.message);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('✅ Terhubung ke DB MySQL (env config)');
    }
  });

  connection.on('error', (err) => {
    console.error('⚠️ Error koneksi DB:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

module.exports = () => connection;
