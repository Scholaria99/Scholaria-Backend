const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function generateSoalDariGroq(materi) {
  try {
const prompt = `
Buatkan 10 soal pilihan ganda untuk mahasiswa di Indonesia tentang materi: "${materi}".
Bagi soal menjadi 3 tingkat kesulitan: mudah (3 soal), sedang (4 soal), sulit (3 soal).

Jika mata kuliah atau materi yang diminta menggunakan Bahasa Inggris (misalnya English Grammar, Vocabulary, dsb), maka buat seluruh soal dan pilihan dalam Bahasa Inggris yang baik dan akademis.

Namun jika materi bukan Bahasa Inggri atau mata kuliah bahas inggris, gunakan Bahasa Indonesia yang baik dan benar.

Hanya gunakan rumus atau ekspresi matematika (format LaTeX seperti \\(a^2 + b^2 = c^2\\), \\(\\int x^2 \\,dx\\), dll) 
jika memang materinya mengandung perhitungan seperti Kalkulus, Fisika, atau mata kuliah eksakta lainnya. 
Jika bukan, seperti Basis Data, Agama, Pancasila, dll, jangan gunakan rumus matematika sama sekali.

Jangan tampilkan kalimat pembuka apapun seperti:
- "Berikut soalnya:"
- "Here are the questions:"
- "Here are the 10 multiple-choice questions for the "Sentence Verb" material, categorized into three levels of difficulty:"
- "Soal-soal berikut ini..."
Langsung tampilkan soal nomor 1, kata kata diatas.

Hindari soal tipe benar/salah atau soal hafalan langsung. Buatlah soal yang menguji pemahaman konsep, penerapan, atau analisis.

Format soal:
1. [soal]  
   A. pilihan A  
   B. pilihan B  
   C. pilihan C  
   D. pilihan D  
   Jawaban: [huruf pilihan yang benar]

Jangan tampilkan penjelasan apapun seperti kalimat pembuka dan penutup yang anda berikan seperti "Here are the questions:", tampilkan soal dan jawabannya saja.
`;



    const response = await axios.post(GROQ_API_URL, {
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: "Anda adalah pembuat soal latihan untuk mahasiswa di negara Indonesia ,Gunakan bahasa sesuai mata kuliah. selain mata kuliah bahasa inggris , pakai bahasa indonesia yang baik dan benar."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const rawContent = response.data.choices[0].message.content;

    // Fungsi untuk membungkus kata/frasa matematika ke dalam LaTeX
function wrapIfMath(text) {
  let result = text;

  // 🔢 Integral: ∫ f(x) dx dari x = a hingga b
  result = result.replace(/∫\s*(.*?)\s*dx\s*dari\s*x\s*=\s*(-?\d+)\s*hingga\s*(-?\d+)/gi, (_, expr, a, b) => {
    return `\\(\\int_{${a}}^{${b}} ${expr}\\,dx\\)`;
  });

  // ➗ Limit: lim x→0 dari f(x)
  result = result.replace(/lim\s*(x|[a-z])\s*→\s*(-?\d+)\s*dari\s*(.*)/gi, (_, varName, val, func) => {
    return `\\(\\lim_{${varName} \\to ${val}} ${func}\\)`;
  });

  // 📉 Turunan: d/dx dari f(x)
  result = result.replace(/d\/dx\s*dari\s*(.*)/gi, (_, expr) => {
    return `\\(\\frac{d}{dx}(${expr})\\)`;
  });

  // 🔁 Logaritma: log x atau log_2 x
  result = result.replace(/log_?(\d+)?\s*(\w+)/gi, (_, base, arg) => {
    if (base) {
      return `\\(\\log_{${base}} ${arg}\\)`;
    } else {
      return `\\(\\log ${arg}\\)`;
    }
  });

  // ⬆️ Pangkat: x^2 atau x pangkat 2
  result = result.replace(/(\w+)\s*pangkat\s*(-?\w+)/gi, (_, base, exp) => {
    return `\\(${base}^{${exp}}\\)`;
  });

  // 🧮 Akar: akar dari x atau akar pangkat 3 dari y
  result = result.replace(/akar\s*pangkat\s*(\d+)\s*dari\s*(\w+)/gi, (_, n, val) => {
    return `\\(\\sqrt[${n}]{${val}}\\)`;
  });

  result = result.replace(/akar\s*dari\s*(\w+)/gi, (_, val) => {
    return `\\(\\sqrt{${val}}\\)`;
  });

  return result;
}



    // Parsing soal
    const soalList = rawContent
      .split(/\n(?=\d+\.\s)/) // Pisahkan setiap soal dengan angka di awal baris
 .map((item, index) => {
  const lines = item.trim().split('\n').map(line => line.trim());

  const pertanyaanRaw = lines[0].replace(/^\d+\.\s*/, '');
  const pertanyaan = wrapIfMath(pertanyaanRaw);

  const pilihan = {
    A: wrapIfMath(lines.find(l => l.startsWith('A.'))?.slice(2).trim() || ''),
    B: wrapIfMath(lines.find(l => l.startsWith('B.'))?.slice(2).trim() || ''),
    C: wrapIfMath(lines.find(l => l.startsWith('C.'))?.slice(2).trim() || ''),
    D: wrapIfMath(lines.find(l => l.startsWith('D.'))?.slice(2).trim() || ''),
  };

  const jawabanMatch = lines.find(l => l.toLowerCase().startsWith('jawaban'));
  const jawaban = jawabanMatch ? jawabanMatch.split(':')[1].trim().toUpperCase() : '';

  // Otomatis tetapkan tingkat kesulitan
  let tingkat = 'sedang';
  if (index < 3) tingkat = 'mudah';
  else if (index < 7) tingkat = 'sedang';
  else tingkat = 'sulit';

  return { pertanyaan, pilihan, jawaban, tingkat };
});



    return soalList;

  } catch (error) {
  console.error('Error generateSoal:', error.response?.status, error.response?.data || error.message);
  throw new Error("Gagal membuat soal.");
}

}



async function jawabPertanyaanGroq(messages) {
  try {
    const response = await axios.post(GROQ_API_URL, {
      model: "llama3-8b-8192",
      messages: messages
    }, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error jawabPertanyaan:', error.message);
    throw new Error("Gagal menjawab pertanyaan.");
  }
}

module.exports = { generateSoalDariGroq, jawabPertanyaanGroq };
