// db.js
const mysql = require('mysql2');

let connection;

function handleDisconnect() {
  connection = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12780107',
    password: 'e2vQdPNbdq',
    database: 'sql12780107',
    port: 3306
  });

  connection.connect((err) => {
    if (err) {
      console.error('❌ Error connecting to MySQL:', err.message);
      setTimeout(handleDisconnect, 2000); // coba lagi setelah 2 detik
    } else {
      console.log('✅ Terkoneksi ke database MySQL (hosting)!');
    }
  });

  connection.on('error', (err) => {
    console.error('⚠️ MySQL error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔄 Reconnecting to MySQL...');
      handleDisconnect(); // reconnect
    } else {
      throw err;
    }
  });
}

handleDisconnect();

module.exports = () => connection;
