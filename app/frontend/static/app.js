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
    menuCollapsed: true,
    lastPageRequested: null,
    successMessageDuration: 3000,
    errorMessageDuration: 5000
};

var AppTitles = {
    customers: "Elenco soci",
    login: "Login",
    programs: "Programmi fedeltà",
    new_program: "Nuovo (modifica) programma",
    new_customer: "Nuovo (modifica) socio",
    scan: "Scansione QR"
}

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
    if(page != 'login') {
        AppSession.lastPageRequested = page;
        $("#menutrigger").show();
    }
    else {
        $("#menutrigger").hide();
    }

    const token = localStorage.getItem('token');
    if (!token) {
        page = 'login'; //force login
        $("#menutrigger").hide();
    }
    
    const contentDiv = document.getElementById('main-content');
    $("#apptitle").text(AppTitles[page]);

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
                    initCustomers();
                    
                    startMessagesTimer();
                    startRewardBannerTimer();
                } 
                else {
                    stopMessagesTimer();
                    stopRewardBannerTimer();
    
                    if (page === 'programs') {
                        initPrograms();
                        startMessagesTimerProgram();
                    } 
                    else {
                        stopMessagesTimerProgram();
    
                        if (page === 'scan') {
                            initCamera();
                        } 
                        else {
                            if (page === 'new_customer') {    
                                initNewCustomer();
                            } 
                            else {
                                if (page === 'new_program') {    
                                    initNewProgram();
                                } 
                                else {
                                    if (page === 'login') {
                                        initLogin();
                                    }
                                }
                            }
                        }
                    }
                }
            });
        },
        error: function(xhr, status, error) {
            if(xhr.status === 401) {
                navigateTo('login');
            }
            else {
                console.error("Navigation error:", error);
                contentDiv.innerHTML = `<h1 class="alert alert-danger mt-3">Errore: ${(xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : error)} </h1>`;
            }
        },
        complete: function() {                
            $(document).ready(function() {        
                $("input[required], select[required]").each(function () {
                    const label = $(this).closest(".form-group").find("label");
                    if (label.find(".required").length === 0) {
                        label.append('<span class="required"> *</span>');
                    }
                });        
            });
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
        
        $("#rightPane").addClass("col-2");
        $("#rightPane").addClass("col-sm-7");
        $("#rightPane").addClass("col-md-8");
        $("#rightPane").addClass("col-lg-9");
    }
    else {
        $("#sidebar").hide();

        $("#rightPane").removeClass("col-2");
        $("#rightPane").removeClass("col-sm-7");
        $("#rightPane").removeClass("col-md-8");
        $("#rightPane").removeClass("col-lg-9");

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
