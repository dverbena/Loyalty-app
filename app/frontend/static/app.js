// Global State Object
var AppSession = {
    timer: null,
    messageToCustomerPage: { msg: null, type: null },
    semaphore: {info: false, error: false },
    rewardBannerTimer: null,
    showRewardBanner: false,
    rewardSempahore: false
};

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

            stopScanning().finally(() => {                    
                // Trigger page-specific logic
                if(page === 'customers') {
                    $('#filterForm').on('submit', function(event) {
                        event.preventDefault();
                        filterCustomers(event);
                    });
    
                    startMessagesTimer();
                    startRewardBannerTimer();
                }
                else 
                {
                    stopMessagesTimer();
                    stopRewardBannerTimer();
    
                    if (page === 'scan') {
                        initializeCamera();
                    }
                    else if (page === 'new_customer') {
                        $('#customerForm').on('submit', function(event) {
                            event.preventDefault();
                            validateAndSubmitNewCustomer(event);
                        });
                        
                        populateProgramsForNewCustomer();
                    }
                }
            });
        })
        .catch((err) => {
            console.error("Navigation error:", err);
            contentDiv.innerHTML = `<h1>404 - Page not found</h1>`;
        });

    // Update the URL hash
    window.location.hash = `#${page}`;
};

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => console.log("Service Worker registered:", registration))
        .catch((err) => console.error("Service Worker registration failed:", err));
}

// Initialize the application on load
window.addEventListener("load", initializeApp);
