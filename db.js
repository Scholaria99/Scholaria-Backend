// db.js
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'sql12.freesqldatabase.com',
  user: 'sql12780107',
  password: 'e2vQdPNbdq',
  database: 'sql12780107',
  port: 3306
});

connection.connect((err) => {
  if (err) throw err;
  console.log('✅ Terkoneksi ke database MySQL (hosting)!');
});

module.exports = connection;
