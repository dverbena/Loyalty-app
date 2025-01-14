const TIMEOUT_PROGRAM = 2000;

const sendMessageToProgramsPage = (message) => {
    AppSession.messageToProgramPage = { msg: message, type: 'info' };
}

const sendErrorMessageToProgramsPage = (message) => { 
    AppSession.messageToProgramPage = { msg: message, type: 'error' };
}

const showMessagesProgram = () => {
    if (AppSession.messageToProgramPage.msg) {
        if (!(AppSession.messageToProgramPage.type === 'info' ? AppSession.programSemaphore.info : AppSession.programSemaphore.error)) {
            if (AppSession.messageToProgramPage.type === 'info')
                AppSession.programSemaphore.info = true;//no message processing while a message is being shown
            else
                AppSession.programSemaphore.error = true;

            $('#' + (AppSession.messageToProgramPage.type === 'info' ? 'success-message' : 'error-message')).text(AppSession.messageToProgramPage.msg).show();

            setTimeout(function () {
                if (AppSession.messageToProgramPage.type === 'info')
                    AppSession.programSemaphore.info = false;//no message processing while a message is being shown
                else
                    AppSession.programSemaphore.error = false;
                    $('#' + (AppSession.messageToProgramPage.type === 'info' ? 'success-message' : 'error-message')).fadeOut();

                AppSession.messageToProgramPage.msg = null;
                AppSession.messageToProgramPage.type = null;

            }, TIMEOUT_PROGRAM);
        }
    }
}

const startMessagesTimerProgram = () => {
    AppSession.timer = window.setInterval(() => showMessagesProgram(), 200);
}

const stopMessagesTimerProgram = () => {
    clearInterval(AppSession.timer);
}

function handleActionProgram(action, id, name) {
    switch (action) {        
        case 'update':
            AppSession.programBeingEdited = id;            
            navigateTo("new_program");

            break;            
        case 'delete':            
            if (confirm(`Are you sure you want to delete ${name}?`)) {
                $.ajax({
                    type: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('token') },
                    url: `programs/${id}`,  // Adjust the endpoint as needed
                    success: function (response) {
                        sendMessageToProgramsPage(`Programma ${response.program.name} eliminato correttamente!`);
                        
                        // remove the deleted program's row from the table
                        $(`tr[data-id="${id}"]`).remove();
                    },
                    error: function (xhr, status, error) {
                        sendErrorMessageToProgramsPage("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""))
                    }
                });
            }
            break;
        default:
            console.log('Unknown action');
    }
}

function filterPrograms(event) {
    $.ajax({
        type: 'GET',
        url: 'programs/all',
        headers: { 'Authorization': localStorage.getItem('token') },
        success: function (response) {  
            $('#programs_table tbody').empty(); // remove all rows
            
            if (response && response.length > 0) {
                response.forEach(function(program) {
                    $('#programs_table tbody').append(`
                        <tr class="selectable-row" data-id="${program.id}">
                            <td class="d-flex flex-column flex-sm-row text-center" style="white-space: nowrap;">
                                <button title="Modifica" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleActionProgram("update", ${program.id}, "${program.name}")'>
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button title="Elimina" class="btn btn-danger mb-2 mb-sm-0" onclick='handleActionProgram("delete", ${program.id}, "${program.name}")'>
                                    <i class="fas fa-trash"></i> <!-- Delete icon -->
                                </button>  
                            </td>                          
                            <td>${program.name}</td>
                            <td>` + moment(program.valid_from).format('DD/MM/YYYY') + `</td>
                            <td>` + moment(program.valid_to).format('DD/MM/YYYY') + `</td>
                            <td>${program.num_access_to_trigger}</td>
                            <td>${program.num_accesses_reward}</td>
                        </tr>`);
                });
            } else {
                // If no data, display a message
                $('#programs_table tbody').append('<tr><td colspan="6" class="text-center">Nessun programma fedelt&agrave; trovato</td></tr>');
            }
        },
        error: function (xhr, status, error) {
            // If there is an error, display the error message on the page
            errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");            
            sendErrorMessageToCustomersPage(errorMessage);
        }
    });
}