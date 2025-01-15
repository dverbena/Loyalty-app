var tempToken;

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
        if($('#new_password').val() === $('#new_password_confirm').val())
            changePassword();
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

function do_login() {
    var formData = {
        username: $('#username').val(),
        password: $('#password').val()
    };

    $.ajax({
        type: 'POST',
        url: 'users/login',
        contentType: 'application/json',  // Set content type to JSON
        data: JSON.stringify(formData),   // Send the form data as JSON
        success: function (response) {   
            if(formData.password === 'changeme') {
                tempToken = response.token;

                $('#password').val("");
                $("#loginForm").hide();
                $("#updatePasswordForm").show();

                setTimeout(function () {
                    $('#error-message').fadeOut();
                }, AppSession.errorMessageDuration);
            }
            else {
                localStorage.setItem('token', response.token );            
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

function changePassword() {
    var formData = {
        password: $('#new_password').val()
    };

    $.ajax({
        type: 'PUT',
        url: 'users/password_update',
        contentType: 'application/json',  // Set content type to JSON        
        headers: { 'Authorization': tempToken },
        data: JSON.stringify(formData),   // Send the form data as JSON
        success: function (response) { 
            tempToken = null;

            $("#loginForm").show();
            $("#updatePasswordForm").hide();
                
            $('#success-message').text("Password aggiornata con successo").show();
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