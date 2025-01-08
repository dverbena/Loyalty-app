function populateProgramsForNewCustomer() {    
    $(document).ready(function() {
        $('#programs').select2({
            placeholder: "Select programs",
            allowClear: true
        });

        fetch("/programs/current") // Fetch programs from the API
            .then((response) => response.json())
            .then((programs) => {
                const programSelect = document.getElementById("programs");

                programs.forEach((program) => {
                    const option = document.createElement("option");
                    option.value = program.id;
                    option.textContent = program.name;
                    programSelect.appendChild(option);
                });
            })
            .catch((error) => {
                console.error("Error fetching programs:", error);
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
        // Form validation was successful, call your function
        submit_new_customer();
    } else {
        // Show validation errors
        form.reportValidity();
    }
}

function submit_new_customer() {
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

            //create a message to be shown by the customers page
            sendMessageToCustomersPage(`Socio ${formData.name} ${formData.last_name} creato correttamente`);

            // If the customer is created successfully, redirect to the customer list or show a success message
            navigateTo('customers');
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.details ? xhr.responseJSON.details : "");
            $('#error-message').text(errorMessage).show();

            setTimeout(function () {
                $('#error-message').fadeOut();
            }, 10000);
        }
    });
}