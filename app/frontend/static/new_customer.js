function submit_new_customer() {
    var formData = {
        name: $('#name').val(),
        last_name: $('#last_name').val(),
        email: $('#email').val(),
        address: $('#address').val()
    };

    $.ajax({
        type: 'POST',
        url: '/customers/add',
        contentType: 'application/json',  // Set content type to JSON
        data: JSON.stringify(formData),   // Send the form data as JSON
        success: function (response) {            
            $.ajax({
                type: 'POST',
                url: 'customers/send-qr-code',
                contentType: 'application/json',  // Set content type to JSON
                data: `{"id": ${response.id}}`  // Send the form data as JSON
            });

            // If the customer is created successfully, redirect to the customer list or show a success message
            navigateTo('customers');  // Assuming you have a navigation function
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            var errorMessage = "An unknown error occurred: " + (xhr.responseJSON && xhr.responseJSON.details ? xhr.responseJSON.details : "");
            $('#error-message').text(errorMessage).show();

            setTimeout(function () {
                $('#error-message').fadeOut();
            }, 10000);
        }
    });
}