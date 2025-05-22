require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const getDB = require('./db');
const { generateSoalDariGroq, jawabPertanyaanGroq } = require('./service/groqService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'https://scholaria-app-mu.vercel.app', // izinkan hanya dari Vercel
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Serve static frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../lifeplan-main/Pages')));

// ========= ROUTES =========

// Default route
app.get('/', (req, res) => {
  res.send('✅ Backend aktif dan berjalan!');
});

setInterval(() => {
  const db = require('./db')();
  db.query('SELECT 1');
}, 5 * 60 * 1000); // setiap 5 menit


//loginn
// Login (sederhana, tanpa hashing)
const nodemailer = require('nodemailer');

const crypto = require('crypto');

// Request reset
app.post('/reset-password-request', (req, res) => {
  const { email } = req.body;
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  const query = 'UPDATE users SET reset_code = ?, reset_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE email = ?';
  const db = getDB();
  db.query(query, [resetCode, email], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Email tidak ditemukan' });

    // Kirim email kode reset
    const mailOptions = {
      from: 'scholaria51@gmail.com',
      to: email,
      subject: 'Kode Reset Password Scholaria',
      text: `Kode verifikasi reset password kamu adalah: ${resetCode}`
    };

    transporter.sendMail(mailOptions, (err2) => {
      if (err2) return res.status(500).json({ error: 'Gagal kirim email' });
      res.json({ message: 'Kode verifikasi terkirim ke email kamu.' });
    });
  });
});

//ubah password
app.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;

  const query = `SELECT * FROM users WHERE email = ? AND reset_code = ? AND reset_expires > NOW()`;
  const db = getDB();
  db.query(query, [email, code], (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ error: 'Kode salah atau kadaluarsa' });
    const db = getDB();
    db.query(`UPDATE users SET password = ?, reset_code = NULL, reset_expires = NULL WHERE email = ?`,
      [newPassword, email], (err2) => {
        if (err2) return res.status(500).json({ error: 'Gagal update password' });
        res.json({ message: 'Password berhasil diubah' });
      });
  });
});



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'scholaria51@gmail.com',
    pass: 'jqjh mvxp ttnn zncu'
  }
});

function sendVerificationEmail(to, code) {
  const mailOptions = {
    from: 'scholaria51@gmail.com',
    to,
    subject: 'Kode Verifikasi Akun',
    text: `Kode verifikasi akun Anda adalah: ${code}`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error('Email error:', err);
    else console.log('Email terkirim:', info.response);
  });
}




//loginn
// Login (sederhana, tanpa hashing)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = `
  SELECT * FROM users 
  WHERE (username = ? OR email = ?) AND password = ?
`;
const db = getDB();
db.query(query, [username, username, password], (err, results) => {
    if (err) {
  console.error("DB Error:", err);
  return res.status(500).json({ error: 'Server error' });
}
if (results.length === 0) {
  return res.status(401).json({ error: 'Login gagal: username/password salah' });
}

    const user = results[0];
    if (!user.verified) {
      return res.status(403).json({ error: 'Akun belum diverifikasi. Cek email kamu.' });
    }

    res.json({ message: 'Login berhasil', userId: user.id, username });
  });
});


// Daftar
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) return res.status(400).json({ error: 'Semua data wajib diisi' });

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const query = 'INSERT INTO users (username, password, email, verification_code, awal_kuis) VALUES (?, ?, ?, ?, NOW())';
  const db = getDB();
  db.query(query, [username, password, email, verificationCode], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const errorMessage = err.sqlMessage.includes('username') 
          ? 'Username sudah digunakan' 
          : 'Email sudah digunakan';
        return res.status(400).json({ error: errorMessage });
      }
      
      console.error('Register error:', err);
return res.status(500).json({ error: 'Gagal daftar', detail: err.message });
    }

    // Kirim email setelah sukses insert
    sendVerificationEmail(email, verificationCode);
    res.json({ message: 'Registrasi berhasil. Cek email untuk verifikasi.' });
  });
});



app.post('/verify', (req, res) => {
  const { username, code } = req.body;

  const query = 'SELECT verification_code FROM users WHERE username = ?';
  const db = getDB();
  db.query(query, [username], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (results[0].verification_code === code) {
      const db = getDB();
      db.query('UPDATE users SET verified = true WHERE username = ?', [username], (err2) => {
        if (err2) return res.status(500).json({ error: 'Gagal update status verifikasi' });
        res.json({ message: '✅ Verifikasi berhasil! Silakan login.' });
      });
    } else {
      res.status(400).json({ error: 'Kode salah!' });
    }
  });
});





// --- Input Jadwal Kuliah ---
app.post('/input-jadwal', (req, res) => {
  const { userId, hari, jam_mulai, jam_selesai, matkul } = req.body;

  if (!userId || !hari || !jam_mulai || !jam_selesai || !matkul) {
    return res.status(400).json({ error: 'Data tidak lengkap.' });
  }

  const query = 'INSERT INTO jadwal (user_id, hari, jam_mulai, jam_selesai, matkul) VALUES (?, ?, ?, ?, ?)';
  const db = getDB();
  db.query(query, [userId, hari, jam_mulai, jam_selesai, matkul], (err, result) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan ke database.' });
    }
    res.json({ message: '✅ Jadwal berhasil disimpan.' });
  });
});

// Update jadwal
app.put('/update-jadwal', (req, res) => {
  const { id, hari, jam_mulai, jam_selesai, matkul } = req.body;
  const db = getDB();
  db.query(
    'UPDATE jadwal SET hari = ?, jam_mulai = ?, jam_selesai = ?, matkul = ? WHERE id = ?',
    [hari, jam_mulai, jam_selesai, matkul, id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Gagal update jadwal' });
      res.json({ message: '✅ Jadwal berhasil diupdate' });
    }
  );
});

// Hapus jadwal
app.delete('/hapus-jadwal/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  db.query('DELETE FROM jadwal WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error("❌ Gagal hapus jadwal:", err);
      return res.status(500).json({ error: 'Gagal menghapus jadwal' });
    }
    res.json({ message: '✅ Jadwal berhasil dihapus' });
  });
});


// --- AI: Generate Soal dari Materi ---
app.post('/generate-soal', async (req, res) => {
  const { materi } = req.body;
  if (!materi) return res.status(400).json({ error: "Materi tidak boleh kosong." });

  try {
    const soalList = await generateSoalDariGroq(materi);
    res.json({ soalList });
  } catch (error) {
    console.error('Error generateSoal:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- AI: Jawab Pertanyaan Chat ---
app.post('/ask-groq', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages harus array." });
  }

  try {
    const answer = await jawabPertanyaanGroq(messages);
    res.json({ answer });
  } catch (error) {
    console.error('Error jawabPertanyaan:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Debug API Key
console.log('GROQ API KEY:', process.env.GROQ_API_KEY ? '✅ Terisi' : '❌ Tidak terisi');

// Jalankan server (hindari ganda)
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});

app.get('/list-jadwal', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId wajib diisi." });

  const query = `SELECT * FROM jadwal WHERE user_id = ? ORDER BY FIELD(hari, "Senin", "Selasa", "Rabu", "Kamis", "Jumat"), jam_mulai`;
  const db = getDB();
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Gagal mengambil data jadwal.' });
    }
    res.json(results);
  });
});



//akademik
//quizzz

app.get('/awal-kuis', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId wajib' });

  const query = 'SELECT awal_kuis FROM users WHERE id = ?';
  const db = getDB();
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil tanggal awal kuis' });
    if (results.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });

    res.json({ awal_kuis: results[0].awal_kuis });
  });
});


// Tambahkan fungsi ini
function getHariHariIni() {
  const offsetMs = 7 * 60 * 60 * 1000; // offset WIB (UTC+7)
  const nowWIB = new Date(Date.now() + offsetMs);
  const hariArray = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hariIndex = nowWIB.getDay();
  return hariArray[hariIndex];
}


app.get('/jadwal-hari-ini', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId wajib' });

  const hariIni = getHariHariIni(); // fungsi konversi new Date() ke nama hari

  const query = 'SELECT * FROM jadwal WHERE user_id = ? AND hari = ?';
  const db = getDB();
  db.query(query, [userId, hariIni], (err, result) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil jadwal' });
    res.json(result);
  });
});


//nilai
app.post('/simpan-nilai', (req, res) => {
 const { userId, matkul, topik, waktu, nilai, saran, minggu_ke, bulan_ke } = req.body;

 if (!userId || !matkul || !topik || !waktu || typeof nilai !== 'number') {
    return res.status(400).json({ error: 'Data nilai tidak lengkap.' });
  }

const query = `
  INSERT INTO nilai_quiz 
  (user_id, matkul, topik, waktu, nilai, saran, minggu_ke, bulan_ke)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;
const db = getDB();
db.query(query, [userId, matkul, topik, waktu, nilai, saran || null, minggu_ke, bulan_ke], (err) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan nilai.' });
    }
    res.json({ message: '✅ Nilai & saran berhasil disimpan.' });
  });
});

//analisis kesalahan
app.post('/analisis-kesalahan', async (req, res) => {
  const { topik, kesalahan } = req.body;

  if (!topik || !Array.isArray(kesalahan) || kesalahan.length === 0) {
    return res.status(400).json({ error: 'Data kesalahan tidak lengkap.' });
  }

const daftarKesalahan = kesalahan.map((item, i) => {
  const opsi = item.pilihan;
  return `
${i + 1}. ${item.soal}
  - Tingkat Kesulitan: ${item.tingkat}
  - Jawaban Benar: ${item.jawabanBenar} (${opsi[item.jawabanBenar]})
  - Jawaban Kamu: ${item.jawabanUser} (${opsi[item.jawabanUser]})
`;
}).join('\n');


 const messages = [
  {
    role: 'system',
    content: 'Kamu adalah asisten belajar untuk mahasiswa di Indonesia.'
  },
  {
    role: 'user',
    content: `Mahasiswa salah menjawab soal-soal berikut pada topik "${topik}":\n\n${daftarKesalahan}\n\nTingkat kesulitan setiap soal sudah ditentukan (mudah/sedang/sulit). Dalam penjelasanmu, mohon sebutkan tingkat kesulitannya dan berikan penjelasan singkat, padat dan jelas agar mahasiswa paham kesalahannya dan tahu bagian mana yang harus dipelajari. Jangan beri pembuka atau penutup.
              Jika soal atau pilihan mengandung rumus, ekspresi, atau perhitungan matematika, tuliskan dalam format LaTeX seperti \\(a^2 + b^2 = c^2\\), \\(\\int x^2 \\,dx\\), dan sebagainya.`
  }
];


  try {
    const saran = await jawabPertanyaanGroq(messages);
    res.json({ saran });
  } catch (error) {
    console.error('Gagal ambil analisis kesalahan:', error.message);
    res.status(500).json({ error: 'Gagal menganalisis kesalahan.' });
  }
});



//statistik
app.get('/list-matkul', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId wajib diisi.' });

  const query = 'SELECT DISTINCT matkul FROM nilai_quiz WHERE user_id = ?';
  const db = getDB();
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Gagal mengambil daftar matkul.' });
    }
    res.json(results);
  });
});


app.get('/nilai-perkembangan', (req, res) => {
  const { matkul, userId } = req.query;
  if (!matkul || !userId) return res.status(400).json({ error: 'Mata kuliah dan userId wajib diisi.' });

  const query = `
    SELECT minggu_ke, SUM(nilai) AS total_nilai
FROM nilai_quiz
WHERE matkul = ? AND user_id = ?
GROUP BY minggu_ke
ORDER BY minggu_ke

  `;
  const db = getDB();
  db.query(query, [matkul, userId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Gagal mengambil data statistik.' });
    }
    res.json(results);
  });
});


// Tambahkan di server.js
app.get('/saran-terakhir', (req, res) => {
  const { matkul, userId } = req.query;
  if (!matkul || !userId) return res.status(400).json({ error: 'Matkul dan userId wajib diisi.' });

  const query = `
    SELECT saran FROM nilai_quiz
    WHERE matkul = ? AND user_id = ? AND saran IS NOT NULL
    ORDER BY waktu DESC
    LIMIT 1
  `;
  const db = getDB();
  db.query(query, [matkul, userId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Gagal mengambil saran.' });
    }

    res.json({ saran: results[0]?.saran || 'Belum ada saran untuk mata kuliah ini.' });
  });
});

app.get('/statistik-mingguan', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId wajib diisi.' });

  // Ambil bulan_ke tertinggi dari data user
  const getBulan = `
    SELECT MAX(bulan_ke) AS latest_bulan FROM nilai_quiz WHERE user_id = ?
  `;
  const db = getDB();
  db.query(getBulan, [userId], (err, bulanRes) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil bulan ke.' });
    const bulanKe = bulanRes[0]?.latest_bulan || 1;

    const query = `
      SELECT minggu_ke, matkul, nilai, waktu
      FROM nilai_quiz
      WHERE user_id = ? AND bulan_ke = ?
      ORDER BY minggu_ke, waktu
    `;
    const db = getDB();
    db.query(query, [userId, bulanKe], (err, results) => {
      if (err) return res.status(500).json({ error: 'Gagal ambil data statistik.' });
      res.json(results);
    });
  });
});


app.get('/saran-minggu', (req, res) => {
  const { userId, mingguKe } = req.query;
  if (!userId || !mingguKe) return res.status(400).json({ error: 'Data tidak lengkap.' });

  const query = `
    SELECT saran 
    FROM nilai_quiz
    WHERE user_id = ? 
      AND saran IS NOT NULL
      AND FLOOR(DATEDIFF(waktu, '2025-02-26') / 7) + 1 = ?
    ORDER BY waktu DESC
    LIMIT 1
  `;
  const db = getDB();
  db.query(query, [userId, mingguKe], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Gagal ambil saran.' });
    }

    res.json({ saran: results[0]?.saran || 'Belum ada saran di minggu ini.' });
  });
});

app.delete('/hapus-nilai', (req, res) => {
  const { userId, matkul, minggu_ke } = req.query;

  if (!userId || !matkul || !minggu_ke) {
    return res.status(400).json({ error: 'Parameter tidak lengkap' });
  }

  const sql = 'DELETE FROM nilai_quiz WHERE user_id = ? AND matkul = ? AND minggu_ke = ?';
  const db = getDB();
  db.query(sql, [userId, matkul, minggu_ke], (err, result) => {
    if (err) return res.status(500).json({ error: 'Gagal menghapus nilai' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: '✅ Nilai berhasil dihapus' });
  });
});


app.get('/history-bulanan', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId wajib diisi.' });

  const query = `
    SELECT bulan_ke, minggu_ke, matkul, nilai, waktu
    FROM nilai_quiz
    WHERE user_id = ?
    ORDER BY bulan_ke, minggu_ke, waktu
  `;
  const db = getDB();
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil histori bulanan.' });
    res.json(results);
  });
});



app.get('/bulan-terbaru', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId wajib diisi' });

  const query = 'SELECT MAX(bulan_ke) AS bulan_terbaru FROM nilai_quiz WHERE user_id = ?';
  const db = getDB();
  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil data bulan terbaru' });
    res.json({ bulan_terbaru: result[0].bulan_terbaru || 1 });
  });
});



