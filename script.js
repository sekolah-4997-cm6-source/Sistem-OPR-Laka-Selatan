// --- GLOBAL VARIABLES & SYSTEM STATE ---
let currentStep = 1;
let selectedCategory = 'kurikulum';
let compressedImages = [null, null, null, null, null];
let isDrawingSignature = false;

// Dummy Storage Keys
const STORAGE_KEYS = { API_KEY: "OPR_API_KEY", TEACHER_LIST: "OPR_TEACHERS" };
let teacherList = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHER_LIST)) || ["Ali Bin Abu", "Siti Binti Aminah"];
let tempatList = ["Dewan", "Bilik Darjah", "Makmal Komputer", "Padang"];
let sasaranList = ["Semua Murid", "Tahun 6", "Guru-guru"];

// --- 1. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    // Splash screen logic
    const splashContent = document.getElementById('splashContent');
    const splashScreen = document.getElementById('splashScreen');
    setTimeout(() => { splashContent.classList.add('animate-splash-pop'); }, 100);
    setTimeout(() => { splashScreen.style.opacity = '0'; setTimeout(() => { splashScreen.style.display = 'none'; }, 1000); }, 2000);

    initTeacherDropdown(); 
    initDatalists();
    initUploadSlots();
    initSignatureCanvas();
});

// --- 2. NAVIGATION & VALIDATION ---
function goToStep(stepNumber) {
    if (stepNumber > currentStep) {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        if (currentStep === 3 && !validateStep3()) return;
    }

    document.querySelectorAll('.step-panel').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');

    for (let i = 1; i <= 4; i++) {
        const navItem = document.getElementById(`step-nav-${i}`);
        if (i === stepNumber) navItem.className = "step-nav-item text-blue-500 font-bold flex items-center space-x-1";
        else if (i < stepNumber) navItem.className = "step-nav-item text-emerald-500 flex items-center space-x-1";
        else navItem.className = "step-nav-item text-slate-400 flex items-center space-x-1";
    }
    
    currentStep = stepNumber;
    if (stepNumber === 4) renderA4Layout();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep1() {
    if (!getNamaGuruValue()) { showModal("Ralat", "Sila pilih atau masukkan nama guru."); return false; }
    return true;
}

function validateStep2() {
    const uploadedCount = compressedImages.filter(img => img !== null).length;
    if (uploadedCount < 5) { showModal("Ralat", `Sila muat naik 5 gambar. (Terkini: ${uploadedCount}/5)`); return false; }
    return true;
}

function validateStep3() { return true; }

// --- 3. UI DROPDOWNS & THEME ---
function initTeacherDropdown() {
    const select = document.getElementById('selectNamaGuru');
    select.innerHTML = '<option value="">-- Sila Pilih --</option>';
    teacherList.forEach(nama => select.innerHTML += `<option value="${nama}">${nama}</option>`);
    select.innerHTML += `<option value="LAIN">-- Taip Manual --</option>`;
}

function handleGuruChange(val) {
    document.getElementById('wrapperNamaManual').classList.toggle('hidden', val !== 'LAIN');
}

function getNamaGuruValue() {
    const sel = document.getElementById('selectNamaGuru').value;
    return sel === 'LAIN' ? document.getElementById('inputNamaGuruManual').value.trim() : sel;
}

function initDatalists() {
    document.getElementById('senaraiTempat').innerHTML = tempatList.map(t => `<option value="${t}">`).join('');
    document.getElementById('senaraiSasaran').innerHTML = sasaranList.map(s => `<option value="${s}">`).join('');
}

function updateCategoryTheme(category) {
    selectedCategory = category;
    const tag = document.getElementById('oprTagKategori');
    const banner = document.getElementById('oprHeaderBanner');
    const themes = {
        kurikulum: { tagClass: "bg-blue-700", text: "KURIKULUM", bannerClass: "border-blue-700" },
        hem: { tagClass: "bg-red-700", text: "HAL EHWAL MURID", bannerClass: "border-red-700" },
        koko: { tagClass: "bg-emerald-700", text: "KOKURIKULUM", bannerClass: "border-emerald-700" }
    };
    if (tag && banner) {
        tag.className = `inline-block mt-1 ${themes[category].tagClass} text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase`;
        tag.innerText = themes[category].text;
        banner.className = `border-b-4 ${themes[category].bannerClass} pb-3 mb-4 flex items-center justify-between`;
    }
}

// --- 4. IMAGE UPLOADS ---
function initUploadSlots() {
    const container = document.getElementById('imageSlotsContainer');
    const template = document.getElementById('slot-template').innerHTML;
    container.innerHTML = Array(5).fill(0).map((_, i) => template.replace(/INDEX/g, i)).join('');
}

function processImageUpload(input, index) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image(); img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                let w = img.width, h = img.height; const maxW = 800;
                if (w > maxW) { h = (maxW / w) * h; w = maxW; }
                canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
                compressedImages[index] = compressedBase64;
                const prevImg = document.getElementById(`preview-img-${index}`);
                prevImg.src = compressedBase64; prevImg.classList.remove('hidden');
                document.getElementById(`placeholder-img-${index}`).classList.add('hidden');
                document.getElementById(`remove-btn-${index}`).classList.remove('hidden');
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage(index) {
    compressedImages[index] = null;
    const prevImg = document.getElementById(`preview-img-${index}`);
    prevImg.src = ''; prevImg.classList.add('hidden');
    document.getElementById(`placeholder-img-${index}`).classList.remove('hidden');
    document.getElementById(`remove-btn-${index}`).classList.add('hidden');
}

// --- 5. GEMINI AI API ---
async function enhanceContentWithAI() {
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (!apiKey) { showModal("Ralat AI", "Sila masukkan API Key Gemini di ruangan tetapan Admin."); return; }

    const btn = document.getElementById('btnAiEnhance');
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...`;

    const promptText = `Perkemaskan laporan sekolah KPM ini. Format JSON sahaja: {"objektif": "", "impak": "", "kekuatan": "", "kelemahan": ""}. \nObjektif Asal: ${document.getElementById('objektifInput').value} \nImpak Asal: ${document.getElementById('impakInput').value}`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await res.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim());
            ['objektif', 'impak', 'kekuatan', 'kelemahan'].forEach(k => {
                if(parsed[k]) document.getElementById(`${k}Input`).value = parsed[k];
            });
            showModal("Berjaya", "Teks berjaya disunting AI.");
        }
    } catch (err) { showModal("Ralat", "Gagal memproses AI. Periksa API Key anda."); }
    finally { btn.disabled = false; btn.innerHTML = originalBtnHtml; }
}

// --- 6. CANVAS SIGNATURE & QR ---
function initSignatureCanvas() {
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    const getPos = (e) => { const rect = canvas.getBoundingClientRect(); return { x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top }; };

    const start = (e) => { isDrawingSignature = true; ctx.beginPath(); ctx.moveTo(getPos(e).x, getPos(e).y); };
    const draw = (e) => { if (!isDrawingSignature) return; e.preventDefault(); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; ctx.lineTo(getPos(e).x, getPos(e).y); ctx.stroke(); };
    const stop = () => { isDrawingSignature = false; };

    ['mousedown', 'touchstart'].forEach(evt => canvas.addEventListener(evt, start));
    ['mousemove', 'touchmove'].forEach(evt => canvas.addEventListener(evt, draw));
    ['mouseup', 'touchend', 'mouseleave'].forEach(evt => canvas.addEventListener(evt, stop));
}

function clearSignature() {
    const canvas = document.getElementById('signatureCanvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function generateQrCode(url) {
    const container = document.getElementById('qrcodeHidden');
    container.innerHTML = '';
    if (url.trim()) new QRCode(container, { text: url.trim(), width: 64, height: 64 });
}

// --- 7. RENDERING & PDF (A4 OUTPUT) ---
function renderA4Layout() {
    const contentArea = document.getElementById('oprDynamicContent');
    
    // Grab all values from form
    const data = {
        program: document.getElementById('namaProgram').value || 'Tiada Nama Program',
        tarikh: document.getElementById('tarikhProgram').value || 'Tiada',
        masa: (document.getElementById('masaMula').value || '-') + ' hingga ' + (document.getElementById('masaSelesai').value || '-'),
        tempat: document.getElementById('tempatProgram').value || '-',
        sasaran: document.getElementById('sasaranProgram').value || '-',
        objektif: document.getElementById('objektifInput').value || '-',
        impak: document.getElementById('impakInput').value || '-',
        kekuatan: document.getElementById('kekuatanInput').value || '-',
        kelemahan: document.getElementById('kelemahanInput').value || '-'
    };

    // Grab QR and Signature image sources if they exist
    let qrSrc = document.getElementById('qrcodeHidden').querySelector('img') ? document.getElementById('qrcodeHidden').querySelector('img').src : '';
    let sigSrc = document.getElementById('signatureCanvas').toDataURL();

    // Construct the HTML layout for the A4 content
    let html = `
        <h2 class="font-bold text-center text-lg mb-4 uppercase underline">${data.program}</h2>
        <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
            <div><p><strong>Tarikh:</strong> ${data.tarikh}</p><p><strong>Masa:</strong> ${data.masa}</p></div>
            <div><p><strong>Tempat:</strong> ${data.tempat}</p><p><strong>Sasaran:</strong> ${data.sasaran}</p></div>
        </div>
        
        <div class="mb-4">
            <h3 class="font-bold text-sm bg-gray-200 p-1 mb-2">GAMBAR AKTIVITI</h3>
            <div class="grid grid-cols-5 gap-2">
                ${compressedImages.map(img => img ? `<img src="${img}" class="w-full h-24 object-cover border border-gray-300">` : `<div class="w-full h-24 bg-gray-100 border border-gray-300 flex items-center justify-center text-[10px] text-gray-400">Tiada Imej</div>`).join('')}
            </div>
        </div>

        <div class="mb-4 text-xs space-y-2">
            <div><h3 class="font-bold bg-gray-200 p-1">1.0 OBJEKTIF</h3><p class="p-1">${data.objektif}</p></div>
            <div><h3 class="font-bold bg-gray-200 p-1">2.0 IMPAK / RINGKASAN</h3><p class="p-1">${data.impak}</p></div>
            <div class="grid grid-cols-2 gap-4">
                <div><h3 class="font-bold bg-gray-200 p-1">3.0 KEKUATAN</h3><p class="p-1">${data.kekuatan}</p></div>
                <div><h3 class="font-bold bg-gray-200 p-1">4.0 KELEMAHAN & PENAMBAHBAIKAN</h3><p class="p-1">${data.kelemahan}</p></div>
            </div>
        </div>

        <div class="mt-8 flex justify-between items-end border-t border-gray-300 pt-4 text-xs">
            <div class="text-center">
                <p class="mb-1 text-gray-500">Disediakan Oleh:</p>
                <img src="${sigSrc}" class="h-12 mx-auto mb-1">
                <p class="font-bold uppercase border-t border-gray-400 px-4">${getNamaGuruValue() || 'NAMA GURU'}</p>
            </div>
            ${qrSrc ? `<div class="text-center"><p class="text-[10px] mb-1">Imbas untuk dokumentasi</p><img src="${qrSrc}" class="w-16 h-16 mx-auto border p-1"></div>` : ''}
        </div>
    `;
    
    contentArea.innerHTML = html;
}

function printOPR() {
    const element = document.getElementById('opr-print-area');
    const namaProgram = document.getElementById('namaProgram').value || 'OPR';
    const opt = {
        margin:       0,
        filename:     `OPR_${namaProgram.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// --- 8. UTILS ---
function showModal(title, msg) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('notificationModal').classList.replace('hidden', 'flex');
}
function closeModal(id) { document.getElementById(id).classList.replace('flex', 'hidden'); }
function showAdminModal() { showModal("Info", "Ruangan Tetapan Admin perlu disuntik di sini (Contoh: Set API Key Gemini)."); }
