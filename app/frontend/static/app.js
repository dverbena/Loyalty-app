// Global State Object
var AppSession = {
    timer: null,
    messageToCustomerPage: { msg: null, type: null },
    semaphore: {info: false, error: false },
    rewardBannerTimer: null,
    showRewardBanner: false,
    rewardSempahore: false,
    customerBeingEdited: null,   
    messageToProgramPage: { msg: null, type: null },
    programSemaphore: {info: false, error: false }, 
    programBeingEdited: null,
    menuCollapsed: true
};

const AppState = {
    cameraInitialized: false,
    html5QrcodeScanner: null,
    deviceId: null
};

// Function to initialize the application and handle default navigation
const initializeApp = () => {
    navigateTo('customers');
};

// Navigation Logic
const navigateTo = (page) => {
    const token = localStorage.getItem('token');
    if (!token) page = 'login'; //force login
    
    const contentDiv = document.getElementById('main-content');

    // Fetch and replace content
    $.ajax({
        url: `/${page}`,
        headers: { 'Authorization': localStorage.getItem('token') },
        method: 'GET', 
        success: function(html) {
            contentDiv.innerHTML = html;
    
            stopScanning().finally(() => {
                // Trigger page-specific logic
                if (page === 'customers') {
                    $('#filterForm').on('submit', function(event) {
                        event.preventDefault();
                        filterCustomers(event);
                    });
                    
                    filterCustomers();
                    startMessagesTimer();
                    startRewardBannerTimer();
                } else {
                    stopMessagesTimer();
                    stopRewardBannerTimer();
    
                    if (page === 'programs') {
                        filterPrograms();
                        startMessagesTimerProgram();
                    } else {
                        stopMessagesTimerProgram();
    
                        if (page === 'scan') {
                            initializeCamera();
                        } else {
                            if (page === 'new_customer') {
                                $('#customerForm').on('submit', function(event) {
                                    event.preventDefault();
                                    validateAndSubmitNewCustomer(event);
                                });
    
                                initNewCustomer();
                                populateProgramsForCustomer();
                            } else {
                                if (page === 'new_program') {
                                    $('#programForm').on('submit', function(event) {
                                        event.preventDefault();
                                        validateAndSubmitNewProgram(event);
                                    });
    
                                    initNewProgram();
                                } else {
                                    if (page === 'login') {
                                        $('#loginForm').on('submit', function(event) {
                                            event.preventDefault();
                                            validateAndSubmitLogin(event);
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            });
        },
        error: function(xhr, status, error) {
            console.error("Navigation error:", error);
            contentDiv.innerHTML = `<h1 class="alert alert-danger mt-3">Errore: ${(xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : error)} </h1>`;
        }
    });
    

    // Update the URL hash
    window.location.hash = `#${page}`;
};

const logout = () => {
    localStorage.removeItem('token');
    navigateTo('login');
}

const toggleMenu = () => {
    if(AppSession.menuCollapsed) {
        $("#sidebar").show();
        $("#rightPane").removeClass("col-12");
        $("#rightPane").addClass("col-9");
    }
    else {
        $("#sidebar").hide();
        $("#rightPane").removeClass("col-9");
        $("#rightPane").addClass("col-12");
    }

    AppSession.menuCollapsed = !AppSession.menuCollapsed;
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/frontend/static/service-worker.js')
        .then((registration) => console.log("Service Worker registered:", registration))
        .catch((err) => console.error("Service Worker registration failed:", err));
}

// Initialize the application on load
window.addEventListener("load", initializeApp);
