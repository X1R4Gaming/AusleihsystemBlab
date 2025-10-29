document.fonts.ready.then(() => {
    // Schriftart ist geladen, jetzt können wir die Seite anzeigen
});

// Tutorial-Inhalt direkt in der JS-Datei speichern
const tutorialContent = `
<div id="tutorial-content">
    <h3>Anleitung zum Speichern und Löschen von Einträgen:</h3>
    <h4>Speichern:</h4>
    <ol>
        <li>Öffne die Webseite.</li>
        <li>Gebe die gewünschten Zahlen in die Felder ein.</li>
        <li>Klicke auf "Speichern".</li>
        <li>Überprüfe die aktualisierte Liste.</li>
    </ol>
    <h4>Löschen:</h4>
    <ol>
        <li>Öffne die Webseite.</li>
        <li>Gebe die Nummer ein, die du löschen möchtest.</li>
        <li>Klicke auf "Löschen".</li>
        <li>Überprüfe die aktualisierte Liste.</li>
    </ol>
    <button onclick="closeTutorial()">Schließen</button>
</div>
`;

let currentCodeReader = null;
let currentDeviceId = null;
let videoInputDevices = [];

function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = `feedback ${type}`;
    feedback.style.display = 'block';
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 3000);
}

function openTutorial() {
    const tutorial = document.getElementById('tutorial');
    tutorial.innerHTML = tutorialContent;
    tutorial.style.display = 'block';
}

function closeTutorial() {
    document.getElementById('tutorial').style.display = 'none';
}

function openBarcodeScanner() {
    const barcodeScanner = document.getElementById('barcode-scanner');
    barcodeScanner.style.display = 'block';

    const video = document.getElementById('barcode-video');
    const codeReader = new ZXing.BrowserBarcodeReader();

    codeReader.getVideoInputDevices()
        .then(devices => {
            videoInputDevices = devices;
            if (devices.length === 0) {
                showFeedback('Keine Kamera gefunden!', 'error');
                return;
            }

            const cameraSelect = document.getElementById('camera-select');
            cameraSelect.innerHTML = '';
            devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Kamera ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            currentDeviceId = devices[0].deviceId;
            currentCodeReader = codeReader;
            startScanning(video, codeReader, devices[0].deviceId);
        })
        .catch(err => {
            showFeedback(`Fehler beim Zugriff auf die Kamera: ${err.message}`, 'error');
        });
}

function startScanning(video, codeReader, deviceId) {
    codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
        if (result) {
            const inputField = document.getElementById(document.getElementById('scanner-target').value);
            inputField.value = result.text;
            codeReader.reset();
            closeBarcodeScanner();
        }
        if (err && !(err instanceof ZXing.NotFoundException)) {
            showFeedback(`Fehler beim Scannen: ${err.message}`, 'error');
            codeReader.reset();
            closeBarcodeScanner();
        }
    });
}

function changeCamera() {
    if (videoInputDevices.length === 0) return;

    const cameraSelect = document.getElementById('camera-select');
    const selectedDeviceId = cameraSelect.value;

    if (selectedDeviceId === currentDeviceId) return;

    currentDeviceId = selectedDeviceId;
    const video = document.getElementById('barcode-video');

    if (currentCodeReader) {
        currentCodeReader.reset();
    }

    currentCodeReader = new ZXing.BrowserBarcodeReader();
    startScanning(video, currentCodeReader, selectedDeviceId);
}

function closeBarcodeScanner() {
    document.getElementById('barcode-scanner').style.display = 'none';

    if (currentCodeReader) {
        currentCodeReader.reset();
        currentCodeReader = null;
    }
}

function saveNumbers() {
    const number1 = document.getElementById('number1').value.trim();
    const number2 = document.getElementById('number2').value.trim();

    if (number1 && number2) {
        const combinations = JSON.parse(localStorage.getItem('combinations')) || [];
        const isNumber2Duplicate = combinations.some(combination => combination.number2 === number2);

        if (isNumber2Duplicate) {
            showFeedback('Die zweite Nummer darf nicht mehrmals vorkommen!', 'error');
            return;
        }

        const combination = { number1, number2 };
        combinations.push(combination);
        localStorage.setItem('combinations', JSON.stringify(combinations));
        showFeedback('Kombination gespeichert!', 'success');
        displayCombinations();
    } else {
        showFeedback('Bitte beide Nummern eingeben!', 'error');
    }
}

function loadNumbers() {
    const combinations = JSON.parse(localStorage.getItem('combinations')) || [];
    if (combinations.length > 0) {
        displayCombinations();
    } else {
        showFeedback('Keine Kombinationen gefunden!', 'error');
    }
}

function deleteNumber() {
    const deleteNum = document.getElementById('deleteNumber').value.trim();
    if (deleteNum) {
        const combinations = JSON.parse(localStorage.getItem('combinations')) || [];
        const updatedCombinations = combinations.filter(combination => combination.number2 !== deleteNum);
        if (updatedCombinations.length < combinations.length) {
            localStorage.setItem('combinations', JSON.stringify(updatedCombinations));
            showFeedback('Kombination gelöscht!', 'success');
            displayCombinations();
        } else {
            showFeedback('Keine passende Kombination gefunden!', 'error');
        }
    } else {
        showFeedback('Bitte eine Nummer zum Löschen eingeben!', 'error');
    }
}

function displayCombinations() {
    const combinations = JSON.parse(localStorage.getItem('combinations')) || [];
    const output = document.getElementById('output');

    // Clear previous output
    output.innerHTML = ''; 

    const list = document.createElement('ul');
    list.className = 'combinations-list';

    if (combinations.length > 0) {
        combinations.forEach((combination, index) => {
            const item = document.createElement('li');
            item.className = 'combination-item';

            const header = document.createElement('div');
            header.className = 'combination-header';
            header.textContent = `Kombination ${index + 1}`;

            const details = document.createElement('div');
            details.className = 'combination-details';

            const detail1 = document.createElement('div');
            detail1.className = 'combination-detail';
            detail1.textContent = `Nummer 1: ${combination.number1}`;

            const detail2 = document.createElement('div');
            detail2.className = 'combination-detail';
            detail2.textContent = `Nummer 2: ${combination.number2}`;

            details.appendChild(detail1);
            details.appendChild(detail2);
            item.appendChild(header);
            item.appendChild(details);
            list.appendChild(item);
        });
        output.appendChild(list);
        const noDataElement = output.querySelector('.no-data');
        if (noDataElement) {
            noDataElement.style.display = 'none'; // Überprüfen, ob das Element existiert
        }
    } else {
        output.innerHTML = '<p class="no-data">Keine Daten vorhanden. Bitte speichern Sie Kombinationen.</p>';
    }
}

function copyToClipboard() {
    const output = document.getElementById('output');
    const textToCopy = output.innerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
        showFeedback('Inhalt kopiert!', 'success');
    }).catch(err => {
        showFeedback(`Fehler beim Kopieren: ${err}`, 'error');
    });
}

// Initial load
displayCombinations();
