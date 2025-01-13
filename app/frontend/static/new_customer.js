function initNewCustomer() {      
    $(document).ready(function() {
        if(AppSession.customerBeingEdited) {
            $('#buttonsCreate').hide();
            $('#titleNew').hide();     
            $('#access_import_div').hide();
            $('#buttonsEdit').show();  
            $('#titleEdit').show();       

            $.ajax({
                type: 'GET',
                url: `/customers/${AppSession.customerBeingEdited}`,
                headers: { 'Authorization': localStorage.getItem('token') },
                success: function (response) {              
                    $('#name').val(response.name);
                    $('#last_name').val(response.last_name);
                    $('#email').val(response.email);
                    $('#address').val(response.address);
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
        else  {
            $('#buttonsCreate').show();
            $('#titleNew').show();     
            $('#access_import_div').show();
            $('#buttonsEdit').hide(); 
            $('#titleEdit').hide();    
        }
        
        $("input[required], select[required]").each(function () {
            const label = $(this).closest(".form-group").find("label");
            if (label.find(".required").length === 0) {
                label.append('<span class="required"> *</span>');
            }
        });
        
    });
}

function populateProgramsForCustomer() {    
    $(document).ready(function() {
        $('#programs').select2({
            placeholder: "Select programs",
            allowClear: true
        });

        // Fetch programs from the API
        $.ajax({
            url: "/programs/current",
            method: "GET",
            dataType: "json",
            headers: { 'Authorization': localStorage.getItem('token') },
            success: function(programs) {
                const programSelect = document.getElementById("programs");

                // Populate the dropdown with the fetched programs
                programs.forEach((program) => {
                    const option = document.createElement("option");
                    option.value = program.id;
                    option.textContent = program.name;
                    programSelect.appendChild(option);
                });

                if (AppSession.customerBeingEdited) {
                    // Fetch programs linked to the customer being edited
                    $.ajax({
                        url: `/programs/customer/${AppSession.customerBeingEdited}`,
                        method: "GET",
                        headers: { 
                            "Authorization": localStorage.getItem("token") 
                        },
                        success: function(response) {
                            // Set the selected programs in the dropdown
                            $('#programs').val(response.map(program => program.id)).trigger('change'); // Notify Select2 of changes
                        },
                        error: function(xhr, status, error) {
                            // Handle errors
                            const errorMessage = "Error: " + 
                                (xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : "An error occurred");
                            
                            $('#error-message').text(errorMessage).show();

                            // Hide the error message after 10 seconds
                            setTimeout(function() {
                                $('#error-message').fadeOut();
                            }, 10000);
                        }
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error("Error fetching programs:", error);
            }
        });
    });    
}

function validateAndSubmitNewCustomer(event) {
    // Prevent the default form submission
    event.preventDefault();

    // Get the form element
    const form = $('#customerForm')[0];

    // Use the built-in form validation API
    if (form.checkValidity()) {
        submit_new_or_modify_customer();
    } else {
        // Show validation errors
        form.reportValidity();
    }
}

function submit_new_or_modify_customer() {
    const selectedPrograms = Array.from(document.getElementById("programs").selectedOptions).map(
        (option) => option.value
    );

    var formData = {
        name: $('#name').val(),
        last_name: $('#last_name').val(),
        email: $('#email').val(),
        address: $('#address').val(),
        programs: selectedPrograms
    };

    if(!AppSession.customerBeingEdited)        
        formData.access_import = parseInt($('#access_import').val());

    $.ajax({
        type: AppSession.customerBeingEdited ? 'PUT' : 'POST',
        url: AppSession.customerBeingEdited ? `customers/edit/${AppSession.customerBeingEdited}` : '/customers/add',
        contentType: 'application/json',  // Set content type to JSON
        data: JSON.stringify(formData),   // Send the form data as JSON
        headers: { 'Authorization': localStorage.getItem('token') },
        success: function (response) {   
            if((!AppSession.customerBeingEdited) || (response.email_changed)) {
                $.ajax({
                    type: 'POST',
                    url: 'customers/send-qr-code',
                    headers: { 'Authorization': localStorage.getItem('token') },
                    contentType: 'application/json',  // Set content type to JSON
                    data: `{"id": ${response.id}}`  // Send the form data as JSON
                });
            }

            //create a message to be shown by the customers page
            sendMessageToCustomersPage(`Socio ${formData.name} ${formData.last_name} ` + (AppSession.customerBeingEdited ? 'modificato' : 'creato') + ' correttamente');

            AppSession.customerBeingEdited = null;
            
            // If the customer is created/updated successfully, redirect to the customer list or show a success message
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