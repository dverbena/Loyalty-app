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