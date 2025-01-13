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
            localStorage.setItem('token', response.token );            
            navigateTo('customers');
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");
            $('#error-message').text(errorMessage).show();

            setTimeout(function () {
                $('#error-message').fadeOut();
            }, 10000);
        }
    });
}