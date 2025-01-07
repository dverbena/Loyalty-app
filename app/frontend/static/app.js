// Global State Object
const AppState = {
    cameraInitialized: false,
    html5QrcodeScanner: null,
    deviceId: null
};

// Function to initialize the application and handle default navigation
const initializeApp = () => {
    const currentHash = window.location.hash || "#customers"; // Default to #customers if no hash
    const page = currentHash.slice(1); // Remove '#' from hash
    navigateTo(page);
};

// Navigation Logic
const navigateTo = (page) => {
    const contentDiv = document.getElementById('main-content');

    // Fetch and replace content
    fetch(`/${page}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Page not found");
            }
            return response.text();
        })
        .then((html) => {
            contentDiv.innerHTML = html;

            // Trigger page-specific logic
            if (page === 'scan') {
                initializeCamera();
            }
        })
        .catch((err) => {
            console.error("Navigation error:", err);
            contentDiv.innerHTML = `<h1>404 - Page not found</h1>`;
        });

    // Update the URL hash
    window.location.hash = `#${page}`;
};


const startScan = () => {
    if (!AppState.html5QrcodeScanner) {
        console.error("QR scanner not initialized.");
        return;
    }

    if (AppState.html5QrcodeScanner.isScanning) {
        return; // Prevent duplicate scanning sessions
    }

    AppState.html5QrcodeScanner
        .start(
            AppState.deviceId,
            { fps: 10, qrbox: 250 },
            (decodedText) => handleScan(decodedText)
        )
        .catch((err) => alert(`Failed to start scan: ${err}`));
};

// Initialize Camera (Lazy Load)
const initializeCamera = () => {
    if (!AppState.cameraInitialized) {
        // Lazy load the Html5Qrcode library
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode";
        document.body.appendChild(script);

        script.onload = () => {
            Html5Qrcode.getCameras()
                .then((devices) => {
                    if (devices && devices.length) {
                        AppState.html5QrcodeScanner = new Html5Qrcode("qr-reader");
                        AppState.cameraInitialized = true;
                        AppState.deviceId = devices[3].id;

                        startScan();
                    }
                })
                .catch((err) => alert(`Camera initialization error: ${err}`));
        };

        script.onerror = () => { alert("Failed to load QR scanner library. Please try again later."); };
    }
    else
        startScan();
};

// Handle QR Code Scan
const handleScan = (decodedText) => {
    console.log("Scanned QR Code:", decodedText);

    AppState.html5QrcodeScanner.stop().then(() => {
        $.ajax({
            type: 'POST',
            url: 'accesses/add',
            contentType: 'application/json',
            data: JSON.stringify({ qr_code: decodedText }),
            success: function (response) {
                $('#success-message')
                    .text(`${response.customer.name} ${response.customer.last_name} checked in successfully!`)
                    .show();
                setTimeout(() => navigateTo('customers'), 2000);
            },
            error: function (xhr) {
                const errorMessage = xhr.responseJSON?.details || xhr.responseText || "An unknown error occurred.";
                $('#error-message').text(errorMessage).show();
                setTimeout(() => {
                    $('#error-message').fadeOut();
                    startScan(); // Restart scanning
                }, 1000);
            },
        });
    }).catch((err) => alert(`Failed to stop scanner: ${err}`));
};

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => console.log("Service Worker registered:", registration))
        .catch((err) => console.error("Service Worker registration failed:", err));
}

// Initialize the application on load
window.addEventListener("load", initializeApp);