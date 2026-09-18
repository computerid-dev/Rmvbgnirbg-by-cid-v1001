# Lepas — Remove Background Tool

Tool hapus background foto yang jalan 100% di browser (client-side), pakai TensorFlow.js + BodyPix. Desain Neo-Brutalism. Nggak ada backend, jadi nggak ada biaya API dan nggak perlu sistem limit.

## Struktur file

```
index.html     -> halaman gerbang (cuma pakai anti-clone.js)
anti-clone.js   -> proteksi ringan (domain lock, disable klik kanan, dsb)
app.html        -> tools asli (upload, proses, download, modal promo, menu developer)
app.js          -> logic utama tools (upload, BodyPix, canvas, download, modal)
```

`index.html` sengaja TIDAK punya link statis (`<a href="app.html">`) ke halaman tools. Navigasinya dipicu lewat JavaScript (`onclick` → `location.href`), jadi downloader statis (tools semacam web2zip/HTTrack yang cuma parsing HTML tanpa eksekusi JS) hanya akan menemukan `index.html` + `anti-clone.js` sebagai satu-satunya referensi eksplisit di source-nya, bukan `app.html`/`app.js`. Ini bukan proteksi 100% pasti — kalau ada yang buka devtools dan cek tab Network/Sources secara manual, `app.html` tetap kelihatan begitu dia diakses. Tapi buat downloader otomatis yang cuma scraping HTML mentah, ini cukup efektif menahan langkah pertama mereka.

## Sebelum deploy

Buka `anti-clone.js`, cari bagian `ALLOWED_HOSTS`, ganti `"your-project.vercel.app"` dengan domain Vercel kamu yang sebenarnya:

```js
const ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "nama-project-kamu.vercel.app",
  "domainkustom.com",
];
```

## Deploy ke Vercel

Static site biasa, zero-config:

**Opsi A — CLI**
```bash
npm i -g vercel
cd lepas-bg-remover
vercel
```

**Opsi B — Dashboard**
1. Push folder ini ke repo GitHub/GitLab
2. Import repo di [vercel.com/new](https://vercel.com/new)
3. Framework preset: "Other"
4. Deploy

Vercel otomatis serve `index.html` sebagai entry point default di root domain.

## Catatan penting

- Model & proses gambar jalan di browser pengunjung, bukan di server Vercel — makanya nggak ada biaya per-foto dan nggak ada limit pemakaian yang perlu diatur.
- Model BodyPix dioptimalkan untuk segmentasi orang/potret. Untuk objek lain hasilnya bisa kurang rapi.
- `anti-clone.js` itu deterrent, bukan proteksi mutlak — kode client-side selalu bisa dilihat lewat devtools oleh siapapun yang niat.
- Load pertama butuh beberapa detik buat download model (±5–6 MB) dari CDN, setelah itu ke-cache di browser pengunjung.
- Popup promo saluran WhatsApp muncul otomatis tiap `app.html` dibuka/refresh (nggak disimpan status "sudah dilihat", jadi selalu tampil). Kalau nanti mau diubah supaya cuma muncul sekali per sesi, tinggal bilang.
- Menu "DEVELOPER" di header buka modal info pembuat + sosmed (YouTube & TikTok).
