function validateAndSubmitChangeInfo(event) {    
    // Prevent the default form submission
    event.preventDefault();

    // Get the form element
    const form = $('#updateInfoForm')[0];

    // Use the built-in form validation API
    if (form.checkValidity()) {
        if($('#new_password').val() === $('#new_password_confirm').val()) {            
            send_validation_email().then(function (response) { 
                $("#updateInfoForm").hide();
                $("#confirmUserForm").show();
            })
        } 
        else {
            onError("Le password non corrispondono", false);
        }
    } 
    else {
        // Show validation errors
        form.reportValidity();
    }
}

function validateAndSubmitChangeInfoConfirmUser(event) {    
    // Prevent the default form submission
    event.preventDefault();

    // Get the form element
    const form = $('#confirmUserForm')[0];

    // Use the built-in form validation API
    if (form.checkValidity()) {
        validate_customer();
    } else {
        // Show validation errors
        form.reportValidity();
    }
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
            onError("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""), xhr.responseJSON.restart);
        }
    });
}

function updatePassword() {
    return ajaxRequest({
        type: 'PUT',
        url: 'users/password_update',
        contentType: 'application/json',  // Set content type to JSON        
        headers: { 'Authorization': localStorage.getItem('token') },
        data: JSON.stringify({ password: $('#new_password').val() }),   // Send the form data as JSON
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            onError("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""), xhr.responseJSON.restart);           
        }
    });
}

function updateEmail() {
    return ajaxRequest({
        type: 'PUT',
        url: 'users/email_update',
        contentType: 'application/json',  // Set content type to JSON        
        headers: { 'Authorization': localStorage.getItem('token') },
        data: JSON.stringify({ email: $('#new_email').val() }),   // Send the form data as JSON
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            onError("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""), xhr.responseJSON.restart);            
        }                
    });
}

function onSuccess() {
    $('#success-message').text("Profilo aggiornato correttamente").show();
                                    
    $("#confirm_otp").val("");
    $("#new_password").val("");
    $("#new_password_confirm").val("");
    
    $("#updateInfoForm").show();
    $("#confirmUserForm").hide();

    setTimeout(function () {
        $('#success-message').fadeOut();
    }, AppSession.successMessageDuration);
}

function onError(errorMessage, restart) {
    $('#error-message').text(errorMessage).show();              
    $("#confirm_otp").val("");

    if(restart === true) {
        $("#new_password").val("");
        $("#new_password_confirm").val("");
        $("#updateInfoForm").show();
        $("#confirmUserForm").hide();
    }

    setTimeout(function () {
        $('#error-message').fadeOut();
    }, AppSession.errorMessageDuration);
}

function validate_customer() {
    ajaxRequest({
        type: 'PUT',
        url: 'users/validate',
        contentType: 'application/json',  // Set content type to JSON        
        headers: { 'Authorization': localStorage.getItem('token') },
        data: JSON.stringify({ otp: $('#confirm_otp').val() }),   // Send the form data as JSON
        success: function (response) { 
            if($('#new_password').val() !== '') {
                updatePassword().then(function(response_pwd) {
                    if($('#new_email').val() != '') {
                        updateEmail().then(function (response_email) {
                            onSuccess();
                        })
                    }
                })
            }
            else {
                if($('#new_email').val() != '') {
                    updateEmail().then(function (response_email) {
                        onSuccess();
                    }) 
                }
            }
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            onError("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""), xhr.responseJSON.restart);
        }
    });
}

function initProfile() {        
    $('#updateInfoForm').on('submit', function(event) {
        event.preventDefault();
        validateAndSubmitChangeInfo(event);
    });
    
    $('#confirmUserForm').on('submit', function(event) {
        event.preventDefault();
        validateAndSubmitChangeInfoConfirmUser(event);
    });
}