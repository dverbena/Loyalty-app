

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