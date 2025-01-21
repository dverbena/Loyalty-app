function initNewProgram() {      
    $(document).ready(function() {
        flatpickr(".date-picker", {
            dateFormat: "d/m/Y",
            allowInput: true, // Optional: Allows manual entry
        });

        if(AppSession.programBeingEdited) {
            $('#buttonsCreate').hide();
            $('#buttonsEdit').show();    

            $.ajax({
                type: 'GET',
                url: `/programs/${AppSession.programBeingEdited}`,
                headers: { 'Authorization': localStorage.getItem('token') },
                success: function (response) {                        
                    $('#name').val(response.name);

                    let valid_from = moment(response.valid_from).format('DD/MM/YYYY')
                    let valid_from_widget = $('#valid_from');
                    if ((valid_from_widget) && ((valid_from_widget.length == 1)) && (valid_from_widget[0]._flatpickr)) {
                        valid_from_widget[0]._flatpickr.setDate(valid_from); // Set the date for the Flatpickr instance
                    } else {
                        console.warn("Flatpickr instance not found for:", valid_from_widget);
                    }
                    
                    let valid_to = moment(response.valid_to).format('DD/MM/YYYY')
                    let valid_to_widget = $('#valid_to');
                    if ((valid_to_widget) && ((valid_to_widget.length == 1)) && (valid_to_widget[0]._flatpickr)) {
                        valid_to_widget[0]._flatpickr.setDate(valid_to); // Set the date for the Flatpickr instance
                    } else {
                        console.warn("Flatpickr instance not found for:", valid_to_widget);
                    }

                    $('#threshold').val(response.num_access_to_trigger);
                    $('#reward').val(response.num_accesses_reward);
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
        else  {
            $('#buttonsCreate').show();
            $('#buttonsEdit').hide(); 
        }
        
        $("input[required], select[required]").each(function () {
            const label = $(this).closest(".form-group").find("label");
            if (label.find(".required").length === 0) {
                label.append('<span class="required"> *</span>');
            }
        });
        
    });
}

function validateAndSubmitNewProgram(event) {
    // Prevent the default form submission
    event.preventDefault();

    // Get the form element
    const form = $('#programForm')[0];

    // Use the built-in form validation API
    if (form.checkValidity()) {
        submit_new_or_modify_program();
    } else {
        // Show validation errors
        form.reportValidity();
    }
}

function submit_new_or_modify_program() {
    var formData = {
        name: $('#name').val(),
        valid_from: moment($('#valid_from').val(), 'DD/MM/YYYY').format('YYYY-MM-DD'),
        valid_to: moment($('#valid_to').val(), 'DD/MM/YYYY').format('YYYY-MM-DD'),
        num_access_to_trigger: parseInt($('#threshold').val()),
        num_accesses_reward: parseInt($('#reward').val())
    };

    console.log(formData);
    $.ajax({
        type: AppSession.programBeingEdited ? 'PUT' : 'POST',
        headers: { 'Authorization': localStorage.getItem('token') },
        url: AppSession.programBeingEdited ? `programs/edit/${AppSession.programBeingEdited}` : '/programs/add',
        contentType: 'application/json',  // Set content type to JSON
        data: JSON.stringify(formData),   // Send the form data as JSON
        success: function (response) {   
            //create a message to be shown by the programs page
            sendMessageToProgramsPage(`Programma ${formData.name} ` + (AppSession.programBeingEdited ? 'modificato' : 'creato') + ' correttamente');

            AppSession.programBeingEdited = null;
            
            // If the program is created/updated successfully, redirect to the program list or show a success message
            navigateTo('programs');
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