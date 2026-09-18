/**
 * app.js — logic utama tools "Lepas"
 * Hapus background foto di browser pakai TensorFlow.js + BodyPix.
 * tfjs & body-pix di-load lewat CDN di app.html sebelum file ini.
 */
(function () {
  "use strict";

  const dropStage     = document.getElementById('dropStage');
  const workStage     = document.getElementById('workStage');
  const dropzone      = document.getElementById('dropzone');
  const selectBtn     = document.getElementById('selectBtn');
  const fileInput     = document.getElementById('fileInput');
  const baseCanvas    = document.getElementById('baseCanvas');
  const resultCanvas  = document.getElementById('resultCanvas');
  const canvasWrap    = document.getElementById('canvasWrap');
  const compareHandle = document.getElementById('compareHandle');
  const statusRow     = document.getElementById('statusRow');
  const statusText    = document.getElementById('statusText');
  const thresholdRange = document.getElementById('thresholdRange');
  const thresholdVal   = document.getElementById('thresholdVal');
  const featherRange   = document.getElementById('featherRange');
  const featherVal     = document.getElementById('featherVal');
  const downloadBtn   = document.getElementById('downloadBtn');
  const compareBtn    = document.getElementById('compareBtn');
  const resetBtn      = document.getElementById('resetBtn');
  const readout       = document.getElementById('readout');

  const baseCtx = baseCanvas.getContext('2d');
  const resultCtx = resultCanvas.getContext('2d');

  let net = null;
  let currentImage = null;
  let currentFile = null;
  let segmentation = null;
  let compareMode = false;

  function setStatus(text, mode) {
    statusText.textContent = text;
    statusRow.className = 'status-row' + (mode ? (' ' + mode) : '');
  }

  async function ensureModel() {
    if (net) return net;
    setStatus('MEMUAT MODEL DETEKSI (SEKALI SAJA)...', 'busy');
    net = await bodyPix.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    });
    return net;
  }

  function openWorkStage() {
    dropStage.classList.remove('active');
    workStage.classList.add('active');
  }

  function resetAll() {
    workStage.classList.remove('active');
    dropStage.classList.add('active');
    fileInput.value = '';
    currentImage = null;
    currentFile = null;
    segmentation = null;
    downloadBtn.disabled = true;
    compareHandle.style.left = '50%';
    resultCanvas.style.clipPath = '';
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    currentFile = file;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async function () {
      currentImage = img;
      URL.revokeObjectURL(url);
      openWorkStage();
      await processImage();
    };
    img.src = url;
  }

  // --- OPSI 1: pilih file lewat tombol ---
  selectBtn.addEventListener('click', () => fileInput.click());

  // --- OPSI 2: drag & drop ---
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadFile(e.target.files[0]);
  });

  async function processImage() {
    if (!currentImage) return;
    downloadBtn.disabled = true;
    setStatus('MENGANALISIS FOTO...', 'busy');

    const MAX_DIM = 1600;
    let { width, height } = currentImage;
    if (width > MAX_DIM || height > MAX_DIM) {
      const scale = MAX_DIM / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    [baseCanvas, resultCanvas].forEach(c => { c.width = width; c.height = height; });
    baseCtx.drawImage(currentImage, 0, 0, width, height);

    try {
      const model = await ensureModel();
      setStatus('MENDETEKSI OBJEK UTAMA...', 'busy');
      segmentation = await model.segmentPerson(baseCanvas, {
        internalResolution: 'medium',
        segmentationThreshold: parseFloat(thresholdRange.value),
        maxDetections: 1
      });
      renderCutout();
      setStatus('SELESAI — SIAP DIUNDUH.', 'ready');
      downloadBtn.disabled = false;
      readout.textContent = width + '×' + height + 'px · ' + (currentFile ? Math.round(currentFile.size / 1024) + ' KB asli' : '');
    } catch (err) {
      console.error(err);
      setStatus('GAGAL MEMPROSES FOTO INI, COBA FOTO LAIN.', '');
    }
  }

  function renderCutout() {
    if (!segmentation) return;
    const { width, height, data } = segmentation;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width; maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImageData = maskCtx.createImageData(width, height);
    for (let i = 0; i < data.length; i++) {
      const on = data[i] === 1;
      maskImageData.data[i * 4 + 0] = 255;
      maskImageData.data[i * 4 + 1] = 255;
      maskImageData.data[i * 4 + 2] = 255;
      maskImageData.data[i * 4 + 3] = on ? 255 : 0;
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    const feather = parseInt(featherRange.value, 10);
    const featheredCanvas = document.createElement('canvas');
    featheredCanvas.width = width; featheredCanvas.height = height;
    const featheredCtx = featheredCanvas.getContext('2d');
    featheredCtx.filter = feather > 0 ? `blur(${feather}px)` : 'none';
    featheredCtx.drawImage(maskCanvas, 0, 0);
    featheredCtx.filter = 'none';

    resultCtx.clearRect(0, 0, width, height);
    resultCtx.drawImage(baseCanvas, 0, 0, width, height);
    resultCtx.globalCompositeOperation = 'destination-in';
    resultCtx.drawImage(featheredCanvas, 0, 0, width, height);
    resultCtx.globalCompositeOperation = 'source-over';

    applyCompareClip();
  }

  function applyCompareClip() {
    const pct = compareMode ? (parseFloat(compareHandle.style.left) || 50) : 100;
    resultCanvas.style.clipPath = `inset(0 0 0 ${pct}%)`;
  }

  thresholdRange.addEventListener('input', () => {
    thresholdVal.textContent = parseFloat(thresholdRange.value).toFixed(2);
  });
  thresholdRange.addEventListener('change', () => { if (currentImage) processImage(); });

  featherRange.addEventListener('input', () => {
    featherVal.textContent = featherRange.value;
    if (segmentation) renderCutout();
  });

  compareBtn.addEventListener('click', () => {
    compareMode = !compareMode;
    compareHandle.style.display = compareMode ? 'block' : 'none';
    compareBtn.textContent = compareMode ? 'SELESAI MEMBANDINGKAN' : 'GESER UNTUK BANDINGKAN';
    applyCompareClip();
  });
  compareHandle.style.display = 'none';

  function dragHandlePos(clientX) {
    const rect = canvasWrap.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    compareHandle.style.left = pct + '%';
    applyCompareClip();
  }
  let dragging = false;
  compareHandle.addEventListener('mousedown', () => dragging = true);
  window.addEventListener('mouseup', () => dragging = false);
  window.addEventListener('mousemove', (e) => { if (dragging) dragHandlePos(e.clientX); });
  compareHandle.addEventListener('touchstart', () => dragging = true, { passive: true });
  window.addEventListener('touchend', () => dragging = false);
  window.addEventListener('touchmove', (e) => {
    if (dragging && e.touches[0]) dragHandlePos(e.touches[0].clientX);
  }, { passive: true });

  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    const base = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'foto';
    link.download = base + '-lepas-bg.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
  });

  resetBtn.addEventListener('click', resetAll);

  // --- Modal Promo (tampil tiap kali halaman dibuka / di-refresh) ---
  const promoOverlay = document.getElementById('promoOverlay');
  const promoClose   = document.getElementById('promoClose');
  const promoSkip    = document.getElementById('promoSkip');

  function openPromo() { promoOverlay.classList.add('open'); }
  function closePromo() { promoOverlay.classList.remove('open'); }

  promoClose.addEventListener('click', closePromo);
  promoSkip.addEventListener('click', closePromo);
  promoOverlay.addEventListener('click', (e) => {
    if (e.target === promoOverlay) closePromo();
  });

  // --- Modal Developer ---
  const devBtn     = document.getElementById('devBtn');
  const devOverlay = document.getElementById('devOverlay');
  const devClose   = document.getElementById('devClose');

  function openDev() { devOverlay.classList.add('open'); }
  function closeDev() { devOverlay.classList.remove('open'); }

  devBtn.addEventListener('click', openDev);
  devClose.addEventListener('click', closeDev);
  devOverlay.addEventListener('click', (e) => {
    if (e.target === devOverlay) closeDev();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (promoOverlay.classList.contains('open')) closePromo();
    if (devOverlay.classList.contains('open')) closeDev();
  });

  // munculkan promo begitu halaman selesai dimuat
  openPromo();

  ensureModel()
    .then(() => setStatus('MODEL SIAP. UNGGAH FOTO UNTUK MULAI.', 'ready'))
    .catch(() => setStatus('MODEL GAGAL DIMUAT, CEK KONEKSI LALU REFRESH.', ''));
})();
