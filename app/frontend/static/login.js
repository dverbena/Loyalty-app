var resettingForm;

function validateAndSubmitLogin(event) {
    // Prevent the default form submission
    event.preventDefault();

    // Get the form element
    const form = $('#loginForm')[0];

    // Use the built-in form validation API
    if (form.checkValidity()) {
        do_login();
    } else {
        // Show validation errors
        form.reportValidity();
    }
}

function validateAndSubmitChangePassword(event) {    
    // Prevent the default form submission
    event.preventDefault();

    // Get the form element
    const form = $('#updatePasswordForm')[0];

    // Use the built-in form validation API
    if (form.checkValidity()) {
        if($('#new_password').val() === $('#new_password_confirm').val()) {
            send_validation_email().then(function (response) {   
                $("#loginForm").hide();
                $("#updatePasswordForm").hide();
                $("#confirmUserForm").show();
            }).catch(function(error) {
                $("#loginForm").show();
                $("#updatePasswordForm").hide();
                $("#confirmUserForm").hide();
            });
        }
        else {
            $('#error-message').text("Le password non corrispondono").show();

            setTimeout(function () {
                $('#error-message').fadeOut();
            }, AppSession.errorMessageDuration);
        }
    } else {
        // Show validation errors
        form.reportValidity();
    }
}

function validateAndSubmitConfirmUser(event) {    
    // Prevent the default form submission
    event.preventDefault();

    // Get the form element
    const form = $('#confirmUserForm')[0];

    // Use the built-in form validation API
    if (form.checkValidity()) {
        validate_user();
    } else {
        // Show validation errors
        form.reportValidity();
    }
}

function do_login() {
    resettingForm = false;

    ajaxRequest({
        type: 'POST',
        url: 'users/login',
        contentType: 'application/json',  // Set content type to JSON
        data: JSON.stringify({ username: $('#username').val(), password: $('#password').val() }),   // Send the form data as JSON
        success: function (response) {  
            localStorage.setItem('token', response.token );    

            if(response.validated === false) {
                $('#password').val("");
                $("#loginForm").hide();
                $("#updatePasswordForm").show();
                $("#confirmUserForm").hide();
            }
            else {          
                navigateTo(AppSession.lastPageRequested ? AppSession.lastPageRequested : 'customers');
            }
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");
            $('#error-message').text(errorMessage).show();

            setTimeout(function () {
                $('#error-message').fadeOut();
            }, AppSession.errorMessageDuration);
        }
    });
}

function send_validation_email() {
    return ajaxRequest({
        type: 'POST',
        url: 'users/send_validate',
        contentType: 'application/json',  // Set content type to JSON        
        headers: { 'Authorization': localStorage.getItem('token') },   // Send the form data as JSON
        data: JSON.stringify({ email: $('#new_email').val() }),   // Send the form data as JSON
        success: function (response) {              
            $('#success-message').text(`Email di convalida spedita a ${$('#new_email').val()}`).show();
                    
            setTimeout(function () {
                $('#success-message').fadeOut();
            }, AppSession.successMessageDuration);
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");
            $('#error-message').text(errorMessage).show();  
    
            setTimeout(function () {
                $('#error-message').fadeOut();
            }, AppSession.errorMessageDuration);
        }
    });
}

function send_reset_email() {
    return ajaxRequest({
        type: 'POST',
        url: 'users/send_reset',
        contentType: 'application/json',  // Set content type to JSON 
        success: function (response) {     
            resettingForm = true;

            $('#success-message').text("Email spedita all'indirizzo dell'amministratore").show();
                    
            $("#loginForm").hide();
            $("#updatePasswordForm").hide();
            $("#confirmUserForm").show();

            setTimeout(function () {
                $('#success-message').fadeOut();
            }, AppSession.successMessageDuration);
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");
            $('#error-message').text(errorMessage).show();  
    
            setTimeout(function () {
                $('#error-message').fadeOut();
            }, AppSession.errorMessageDuration);
        }
    });
}

function validate_user() {
    ajaxRequest({
        type: 'PUT',
        url: resettingForm ? 'users/admin_password_reset' : 'users/validate',
        contentType: 'application/json',  // Set content type to JSON        
        headers: { 'Authorization': localStorage.getItem('token') },
        data: JSON.stringify({ otp: $('#confirm_otp').val() }),   // Send the form data as JSON
        success: function (response) { 
            if(resettingForm){
                resettingForm = false;                

                $('#success-message').text("Password reimpostata correttamente").show();
                        
                $("#confirm_otp").val();
                $("#loginForm").show();
                $("#updatePasswordForm").hide();
                $("#confirmUserForm").hide();

                setTimeout(function () {
                    $('#success-message').fadeOut();
                }, AppSession.successMessageDuration);
            }
            else {
                ajaxRequest({
                    type: 'PUT',
                    url: 'users/password_update',
                    contentType: 'application/json',  // Set content type to JSON        
                    headers: { 'Authorization': localStorage.getItem('token') },
                    data: JSON.stringify({ password: $('#new_password').val() }),   // Send the form data as JSON
                    success: function (response) { 
                        ajaxRequest({
                            type: 'PUT',
                            url: 'users/email_update',
                            contentType: 'application/json',  // Set content type to JSON        
                            headers: { 'Authorization': localStorage.getItem('token') },
                            data: JSON.stringify({ email: $('#new_email').val() }),   // Send the form data as JSON
                            success: function (response) {                               
                                navigateTo('customers');
                            },
                            error: function (xhr, status, error) {
                                // If there is an error, display the error message on the page
                                errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");
                                $('#error-message').text(errorMessage).show(); 
        
                                if((xhr.responseJSON.restart) && (xhr.responseJSON.restart === true)) {
                                    $("#loginForm").show();
                                    $("#updatePasswordForm").hide();
                                    $("#confirmUserForm").hide();
                                }
        
                                setTimeout(function () {
                                    $('#error-message').fadeOut();
                                }, AppSession.errorMessageDuration);
                            }                
                        });
                    },
                    error: function (xhr, status, error) {
                        // If there is an error, display the error message on the page
                        errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");
                        $('#error-message').text(errorMessage).show();
        
                        if(xhr.responseJSON.restart === true) {
                            $("#loginForm").show();
                            $("#updatePasswordForm").hide();
                            $("#confirmUserForm").hide();
                        }
        
                        setTimeout(function () {
                            $('#error-message').fadeOut();
                        }, AppSession.errorMessageDuration);
                    }
                });   
            }         
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");
            $('#error-message').text(errorMessage).show();

            $('#confirm_otp').val("");

            if(xhr.responseJSON.restart === true) {
                $("#loginForm").show();
                $("#updatePasswordForm").hide();
                $("#confirmUserForm").hide();
            }
            setTimeout(function () {
                $('#error-message').fadeOut();
            }, AppSession.errorMessageDuration);
        }
    });
}

function initLogin() {
    resettingForm = false;    
                           
    $(document).ready(function() {               
        $('#loginForm').on('submit', function(event) {
            event.preventDefault();
            validateAndSubmitLogin(event);
        });
        
        $('#updatePasswordForm').on('submit', function(event) {
            event.preventDefault();
            validateAndSubmitChangePassword(event);
        });
        
        $('#confirmUserForm').on('submit', function(event) {
            event.preventDefault();
            validateAndSubmitConfirmUser(event);
        });
    });
}