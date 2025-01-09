function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

// Function to get a cookie by name
function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(`${name}=`)) {
            return cookie.substring(name.length + 1);
        }
    }
    return null;
}

const stopScanning = () => { 
    if(AppState.html5QrcodeScanner)
    {
        if (AppState.html5QrcodeScanner.isScanning)
            return AppState.html5QrcodeScanner.stop(); 
    }

    return Promise.resolve();
}

const startScan = () => {
    if (!AppState.html5QrcodeScanner) {
        console.error("QR scanner not initialized.");
        return;
    }

    if (AppState.html5QrcodeScanner.isScanning) {
        stopScanning().then(() => {
            AppState.html5QrcodeScanner.start(
                AppState.deviceId,
                { fps: 10, qrbox: 250 },
                (decodedText) => handleScan(decodedText)
            )
            .catch((err) => alert(`Failed to start scan: ${err}`));
        }); // Prevent duplicate scanning sessions
    }
    else {
        AppState.html5QrcodeScanner
            .start(
                AppState.deviceId,
                { fps: 10, qrbox: 250 },
                (decodedText) => handleScan(decodedText)
            )
            .catch((err) => alert(`Failed to start scan: ${err}`));
    }
};

const initializeCameraDropDown = () => {
    return Html5Qrcode.getCameras().then((devices) => {
        const dropdown = document.getElementById('cameraDropdown');
        
        if (devices && devices.length) {                        
            // Get saved camera ID from cookie
            const savedCameraId = getCookie('selectedCamera');

            // Populate dropdown and set default selection
            devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.label || `Camera ${index + 1}`;
                dropdown.appendChild(option);
            });

            // Set dropdown to saved camera or first option
            if (savedCameraId && devices.some(d => d.id === savedCameraId)) {
                dropdown.value = savedCameraId;
                AppState.deviceId = savedCameraId;
            } else {
                dropdown.value = devices[0].id;
                AppState.deviceId = devices[0].id;
            }

            // Save initial selection to cookie
            setCookie('selectedCamera', AppState.deviceId, 30);

            // Handle dropdown change event
            dropdown.addEventListener('change', (event) => {
                AppState.deviceId = event.target.value;
                setCookie('selectedCamera', AppState.deviceId, 30); // Save selected camera to cookie

                stopScanning().then(() => { startScan(); })
            });
        }
    })
    .catch((err) => alert(`Camera initialization error: ${err}`));
}

// Initialize Camera (Lazy Load)
const initializeCamera = () => {
    initializeCameraDropDown().then(() => {    
        if (!AppState.cameraInitialized) {
            // Lazy load the Html5Qrcode library
            const script = document.createElement('script');
            script.src = "https://unpkg.com/html5-qrcode";
            document.body.appendChild(script);
    
            script.onload = () => {            
                AppState.html5QrcodeScanner = new Html5Qrcode("qr-reader");
                AppState.cameraInitialized = true;
    
                startScan();
            };
    
            script.onerror = () => { alert("Failed to load QR scanner library. Please try again later."); };
        }
        else
            startScan();
    });
};

// Handle QR Code Scan
const handleScan = (decodedText) => {
    console.log("Scanned QR Code:", decodedText);

    stopScanning().then(() => {        
        $.ajax({
            type: 'GET',
            url: `accesses/reward_due_qr/${decodedText}`,
            success: function (responseReward) {//sendRewardMessageToCustomersPage
                $.ajax({
                    type: 'POST',
                    url: 'accesses/add',
                    contentType: 'application/json',
                    data: JSON.stringify({ qr_code: decodedText }),
                    success: function (responseAdd) {
                        if(responseReward.reward_due) sendRewardMessageToCustomersPage();
                        sendMessageToCustomersPage(`$Check in di {responseAdd.customer.name} ${responseAdd.customer.last_name} riuscito!`);

                        navigateTo('customers');
                    },
                    error: function (xhr) {
                        const errorMessage = xhr.responseJSON?.details || xhr.responseText || "Errore generico";
                        $('#error-message').text(errorMessage).show();
        
                        setTimeout(() => {
                            $('#error-message').fadeOut();
                            startScan(); // Restart scanning
                        }, 1000);
                    },
                });
            },
            error: function (xhr) {
                const errorMessage = xhr.responseJSON?.details || xhr.responseText || "Errore generico";
                $('#error-message').text(errorMessage).show();

                setTimeout(() => {
                    $('#error-message').fadeOut();
                    startScan(); // Restart scanning
                }, 1000);
            },
        });        
    }).catch((err) => alert(`Failed to stop scanner: ${err}`));
};
