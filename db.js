// db.js
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // ganti kalau kamu pakai password di MySQL
  database: 'akademik'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('✅ Terkoneksi ke MySQL!');
});

module.exports = connection;
