/**
 * anti-clone.js
 * -------------------------------------------------------------------------
 * PENTING (baca dulu sebelum deploy):
 * Ini bukan sistem keamanan yang "kebal". Semua kode di sisi client (HTML/
 * CSS/JS) SELALU bisa dibuka & disalin oleh siapapun yang cukup niat —
 * browser wajib mengirim source-nya ke pengunjung supaya halamannya bisa
 * jalan. Script ini cuma bikin proses nyalin jadi tidak nyaman buat
 * kebanyakan orang (klik kanan, view-source cepat, devtools refleks),
 * bukan mencegah developer yang serius mem-fork project ini.
 *
 * Kalau butuh proteksi yang beneran kuat (misal: melindungi IP/algoritma
 * inti), itu harus dipindah ke server (API), bukan dititipkan di browser.
 * -------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // 1) DOMAIN LOCK ----------------------------------------------------------
  // Ganti dengan domain Vercel / custom domain kamu sendiri sebelum deploy.
  const ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "your-project.vercel.app", // TODO: ganti sesuai domain Vercel kamu
    // "domainkustom.com",     // tambahin domain custom kalau ada
  ];

  function isAllowedHost(hostname) {
    return ALLOWED_HOSTS.some(function (h) {
      return hostname === h || hostname.endsWith("." + h);
    });
  }

  function showCloneBanner() {
    const bar = document.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText = [
      "position:fixed", "top:0", "left:0", "right:0", "z-index:2147483647",
      "background:#E2604F", "color:#12151A", "font-family:system-ui,sans-serif",
      "font-size:13px", "padding:10px 16px", "text-align:center",
      "box-shadow:0 2px 8px rgba(0,0,0,.25)"
    ].join(";");
    bar.style.borderBottom = "3px solid #0A0A0A";
    bar.style.fontWeight = "700";
    bar.textContent =
      "HALAMAN INI TERDETEKSI BERJALAN DI LUAR DOMAIN RESMINYA (KEMUNGKINAN HASIL SALINAN/CLONE).";
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(bar);
    });
  }

  if (!isAllowedHost(location.hostname)) {
    showCloneBanner();
  }

  // 2) DISABLE KLIK KANAN & SHORTCUT DEVTOOLS UMUM --------------------------
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  document.addEventListener("keydown", function (e) {
    const key = e.key ? e.key.toUpperCase() : "";
    const blockCombo =
      key === "F12" ||
      (e.ctrlKey && e.shiftKey && (key === "I" || key === "J" || key === "C")) ||
      (e.metaKey && e.altKey && (key === "I" || key === "J" || key === "C")) || // macOS Safari/Chrome
      (e.ctrlKey && key === "U") ||
      (e.metaKey && key === "U");
    if (blockCombo) {
      e.preventDefault();
    }
  });

  // 3) DETEKSI DEVTOOLS TERBUKA (heuristik, tidak 100% akurat) --------------
  // Prinsip: kalau devtools didock, selisih outer/inner dimension membesar.
  let devtoolsWarned = false;
  const THRESHOLD = 160;

  function checkDevtools() {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const likelyOpen = widthDiff > THRESHOLD || heightDiff > THRESHOLD;

    if (likelyOpen && !devtoolsWarned) {
      devtoolsWarned = true;
      console.log(
        "%cDevtools terdeteksi terbuka.",
        "font-size:14px;font-weight:bold;color:#E8A33D;"
      );
    }
    if (!likelyOpen) {
      devtoolsWarned = false;
    }
  }
  setInterval(checkDevtools, 1000);

  // 4) CONSOLE WARNING (perlindungan self-XSS, praktik umum situs besar) ---
  function printConsoleWarning() {
    const bigStyle =
      "color:#E2604F; font-size:46px; font-weight:bold; " +
      "text-shadow: 1px 1px 0 #12151A;";
    const bodyStyle = "color:#EDEAE3; font-size:15px; line-height:1.5;";

    console.log("%cSTOP", bigStyle);
    console.log(
      "%cFitur ini untuk developer. Kalau ada orang yang minta kamu copy-paste " +
        "kode apapun di sini dengan iming-iming 'akses gratis', 'hack akun', dsb — " +
        "itu kemungkinan besar penipuan (self-XSS) yang bisa membahayakan datamu.",
      bodyStyle
    );
  }
  printConsoleWarning();
})();
