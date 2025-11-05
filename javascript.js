/* ==========================================================
   Ausleih‑System – javascript.js
   ========================================================== */

/* -------------------- Konfiguration & Konstanten -------------------- */
const STORAGE_KEY = 'ausleih_kombinationen';
let codeReader = null;
let currentCameraId = null;

/* ------------------------ DOM‑Referenzen ------------------------ */
const $feedback    = document.getElementById('feedback');
const $tutorial    = document.getElementById('tutorial');
const $output      = document.getElementById('output');
const $barcodeScanner = document.getElementById('barcode-scanner');

/* Eingabefelder */
const $ausweisnummer  = document.getElementById('ausweisnummer');
const $laptopnummer   = document.getElementById('laptopnummer');
const $deleteNumber   = document.getElementById('deleteNumber');

/* Buttons (IDs für eindeutige Zuordnung) */
const $tutorialBtn     = document.getElementById('tutorialBtn');
const $saveBtn         = document.getElementById('saveBtn');
const $loadBtn         = document.getElementById('loadBtn');
const $deleteBtn       = document.getElementById('deleteBtn');
const $copyBtn         = document.getElementById('copyBtn');

/* Barcode‑Scanner‑Kontrolle */
const $cameraSelect    = document.getElementById('camera-select');
const $changeCameraBtn = document.getElementById('changeCameraBtn');
const $closeScannerBtn = document.getElementById('closeScannerBtn');

/* ------------------------ Hilfsfunktionen ----------------------- */

/**
 * Zeigt ein Feedback‑Overlay an.
 */
function showFeedback(msg, type) {
    $feedback.textContent = msg;
    $feedback.className  = `feedback ${type}`;
    $feedback.style.display = 'block';
    setTimeout(() => ($feedback.style.display = 'none'), 3000);
}

/**
 * Holt Daten aus localStorage (JSON → Array).
 */
function loadFromLocalStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

/**
 * Speichert ein Array in localStorage.
 */
function saveToLocalStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Zeigt die gespeicherten Kombinationen an.
 */
function displayCombinations() {
    const combos = loadFromLocalStorage();
    if (!combos.length) {
        $output.innerHTML =
            '<p class="no-data">Keine Daten vorhanden. Bitte speichern Sie Kombinationen.</p>';
        return;
    }
    const ul = document.createElement('ul');
    combos.forEach((c, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. Ausweis: ${c.ausweis}, Laptop: ${c.laptop}`;
        ul.appendChild(li);
    });
    $output.innerHTML = '';
    $output.appendChild(ul);
}

/**
 * Kopiert die aktuelle Liste in die Zwischenablage.
 */
function copyToClipboard() {
    const text = Array.from($output.querySelectorAll('li'))
                      .map(li => li.textContent)
                      .join('\n');
    navigator.clipboard.writeText(text).then(
        () => showFeedback('Liste kopiert', 'success'),
        err => showFeedback(`Kopieren fehlgeschlagen: ${err}`, 'error')
    );
}

/* ------------------------ CRUD‑Operationen ----------------------- */

function saveNumbers() {
    const ausweis = Number($ausweisnummer.value);
    const laptop  = Number($laptopnummer.value);

    if (!Number.isFinite(ausweis) || !Number.isFinite(laptop)) {
        return showFeedback('Bitte gültige Zahlen eingeben', 'error');
    }

    const combos = loadFromLocalStorage();
    combos.push({ ausweis, laptop });
    saveToLocalStorage(combos);
    displayCombinations();

    // Felder zurücksetzen
    $ausweisnummer.value  = '';
    $laptopnummer.value   = '';

    showFeedback('Kombination gespeichert', 'success');
}

function loadNumbers() {
    displayCombinations();
    showFeedback('Liste geladen', 'success');
}

function deleteNumber() {
    const del = Number($deleteNumber.value);
    if (!Number.isFinite(del)) return showFeedback('Bitte gültige Nummer eingeben', 'error');

    let combos = loadFromLocalStorage();
    const before = combos.length;
    combos = combos.filter(c => !(c.ausweis === del || c.laptop === del));

    if (combos.length === before) {
        return showFeedback(`Keine Kombination mit ${del} gefunden`, 'error');
    }

    saveToLocalStorage(combos);
    displayCombinations();
    $deleteNumber.value = '';
    showFeedback('Kombination(en) gelöscht', 'success');
}

/* ------------------------ Tutorial‑Handling ----------------------- */

/**
 * Lädt den Inhalt von `tutorial.html` per Fetch und zeigt ihn an.
 */
async function openTutorial() {
    try {
        const res = await fetch('tutorial.html');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        $tutorial.innerHTML = await res.text();
        $tutorial.style.display = 'block';

        // Schließen‑Button im geladenen Tutorial
        document.getElementById('closeTutorialBtn')
                .addEventListener('click', closeTutorial);
    } catch (err) {
        showFeedback(`Tutorial laden fehlgeschlagen: ${err}`, 'error');
    }
}

function closeTutorial() {
    $tutorial.style.display = 'none';
}

/* ------------------------ Barcode‑Scanner ----------------------- */

async function openBarcodeScanner() {
    $barcodeScanner.style.display = 'block';

    // Falls bereits ein Reader existiert, stoppen wir ihn
    stopScanning();

    codeReader = new ZXing.BrowserBarcodeReader();
    try {
        const devices = await codeReader.getVideoInputDevices();
        if (!devices.length) throw new Error('Keine Kamera gefunden');

        // Select füllen
        $cameraSelect.innerHTML = '';
        devices.forEach((dev, i) => {
            const opt = document.createElement('option');
            opt.value = dev.deviceId;
            opt.textContent = dev.label || `Kamera ${i + 1}`;
            $cameraSelect.appendChild(opt);
        });

        currentCameraId = devices[0].deviceId;

        // Event‑Listener für Kamera‑Wechsel
        $changeCameraBtn.onclick = changeCamera;
        $closeScannerBtn.onclick = closeBarcodeScanner;

        startScanning(currentCameraId);
    } catch (err) {
        showFeedback(`Scanner‑Fehler: ${err.message}`, 'error');
    }
}

function stopScanning() {
    const video = document.getElementById('barcode-video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }
}

async function startScanning(deviceId) {
    try {
        await codeReader.decodeFromVideoDevice(
            deviceId,
            'barcode-video',
            (result, err) => {
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error(err);
                    return;
                }
                if (!result) return; // keine Lesung

                handleScanResult(result.text);
                stopScanning();          // nach Erfolg stoppen
                $barcodeScanner.style.display = 'none';
            }
        );
    } catch (err) {
        showFeedback(`Scanner‑Fehler: ${err.message}`, 'error');
    }
}

function changeCamera() {
    const newId = $cameraSelect.value;
    if (!newId || newId === currentCameraId) return;

    stopScanning();
    currentCameraId = newId;
    startScanning(currentCameraId);
}

function closeBarcodeScanner() {
    stopScanning();
    $barcodeScanner.style.display = 'none';
}

/**
 * Schreibt das gescannte Ergebnis in das aktuell fokussierte Feld.
 * Falls kein Feld aktiv ist, wird die Nummer im Löschfeld eingesetzt.
 */
function handleScanResult(code) {
    const activeEl = document.activeElement;
    if (activeEl && ['ausweisnummer', 'laptopnummer'].includes(activeEl.id)) {
        activeEl.value = code;
    } else {
        $deleteNumber.value = code;
    }
}

/* ------------------------ Event‑Registrierung --------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // CRUD
    $saveBtn.onclick   = saveNumbers;
    $loadBtn.onclick   = loadNumbers;
    $deleteBtn.onclick = deleteNumber;
    $copyBtn.onclick   = copyToClipboard;

    // Tutorial
    $tutorialBtn.onclick = openTutorial;

    // Barcode‑Scanner (alle Buttons mit Klasse .barcodeBtn)
    document.querySelectorAll('.barcodeBtn')
             .forEach(btn => btn.addEventListener('click', openBarcodeScanner));

    // Initiale Anzeige
    displayCombinations();
});
