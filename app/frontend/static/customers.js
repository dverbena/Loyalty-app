function handleAction(action, id, name, last_name) {
    switch (action) {
        case 'check_in':
            $.ajax({
                type: 'POST',
                url: 'accesses/add',
                contentType: 'application/json',  // Set content type to JSON
                data: `{"id": ${id}}`,   // Send the form data as JSON
                success: function (response) {
                    $('#success-message').text(`${response.customer.name} ${response.customer.last_name} checked in successfully!`).show();
        
                    setTimeout(function () {
                        $('#success-message').fadeOut();
                    }, 5000);
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
            
            break;
        case 'resend_qr':
            $.ajax({
                type: 'POST',
                url: 'customers/send-qr-code',
                contentType: 'application/json',  // Set content type to JSON
                data: `{"id": ${id}}`,   // Send the form data as JSON
                success: function (response) {
                    $('#success-message').text(`QR code sent to ${response.customer.name} ${response.customer.last_name}`).show();
        
                    setTimeout(function () {
                        $('#success-message').fadeOut();
                    }, 5000);
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

            break;
        case 'delete':            
            if (confirm(`Are you sure you want to delete ${name} ${last_name}?`)) {
                $.ajax({
                    type: 'DELETE',
                    url: `customers/${id}`,  // Adjust the endpoint as needed
                    success: function (response) {
                        $('#success-message').text(`Customer ${response.customer.name} ${response.customer.last_name} deleted successfully!`).show();
                        setTimeout(function () {
                            $('#success-message').fadeOut();
                        }, 5000);
                        
                        // Optionally remove the deleted customer's row from the table
                        $(`tr[data-id="${id}"]`).remove();
                    },
                    error: function (xhr, status, error) {
                        var errorMessage = "An error occurred: " + (xhr.responseJSON && xhr.responseJSON.details ? xhr.responseJSON.details : "");
                        $('#error-message').text(errorMessage).show();
                        setTimeout(function () {
                            $('#error-message').fadeOut();
                        }, 10000);
                    }
                });
            }
            break;
        default:
            console.log('Unknown action');
    }
}