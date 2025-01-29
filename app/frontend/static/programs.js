const TIMEOUT_PROGRAM = 2000;
var programsTable;

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

            }, AppSession.messageToProgramPage.type === 'info' ? AppSession.successMessageDuration : AppSession.errorMessageDuration);
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
                ajaxRequest({
                    type: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('token') },
                    url: `programs/${id}`,  // Adjust the endpoint as needed
                    success: function (response) {
                        sendMessageToProgramsPage(`Programma ${response.program.name} eliminato correttamente!`);
                        
                        // remove the deleted customer's row from the table
                        // Reload the table but keep the current page
                        programsTable.ajax.reload(null, false); // 'false' prevents resetting the pagination
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

// function filterPrograms(event) {
//     ajaxRequest({
//         type: 'GET',
//         url: 'programs/all',
//         headers: { 'Authorization': localStorage.getItem('token') },
//         success: function (response) {  
//             $('#programs_table tbody').empty(); // remove all rows
            
//             if (response && response.length > 0) {
//                 response.forEach(function(program) {
//                     $('#programs_table tbody').append(`
//                         <tr class="selectable-row" data-id="${program.id}">
//                             <th scope="row" style="white-space: nowrap;">
//                                 <button title="Modifica" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleActionProgram("update", ${program.id}, ${JSON.stringify(program.name)})'>
//                                     <i class="fas fa-edit"></i>
//                                 </button>
//                                 <button title="Elimina" class="btn btn-danger mb-2 mb-sm-0" onclick='handleActionProgram("delete", ${program.id}, ${JSON.stringify(program.name)})'>
//                                     <i class="fas fa-trash"></i> <!-- Delete icon -->
//                                 </button>  
//                             </th>                          
//                             <td>${program.name}</td>
//                             <td>` + moment(program.valid_from).format('DD/MM/YYYY') + `</td>
//                             <td>` + moment(program.valid_to).format('DD/MM/YYYY') + `</td>
//                             <td>${program.num_access_to_trigger}</td>
//                             <td>${program.num_accesses_reward}</td>
//                         </tr>`);
//                 });
//             } else {
//                 // If no data, display a message
//                 $('#programs_table tbody').append('<tr><td colspan="6" class="text-center">Nessun programma fedelt&agrave; trovato</td></tr>');
//             }
//         },
//         error: function (xhr, status, error) {
//             // If there is an error, display the error message on the page
//             errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");            
//             sendErrorMessageToCustomersPage(errorMessage);
//         }
//     });
// }

function loadPrograms() {
    programsTable = $('#programs_table').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: '/programs/all',
            headers: { 'Authorization': localStorage.getItem('token') },
            dataSrc: 'data' // Key in the response containing the data array
        },
        language: {
            url: 'https://cdn.datatables.net/plug-ins/2.2.1/i18n/it-IT.json',
        },
        columns: [            
            { 
                data: 'id', 
                render: function(data, type, row, meta) {
                    return `
                    <div>
                        <div class="row g-3">
                            <div class="col-12 col-md-6">
                                <button title="Modifica" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleActionProgram("update", ${row.id}, ${JSON.stringify(row.name)})'>
                                     <i class="fas fa-edit"></i>
                                 </button>
                            </div>
                            <div class="col-12 col-md-6">
                                <button title="Elimina" class="btn btn-danger mb-2 mb-sm-0" onclick='handleActionProgram("delete", ${row.id}, ${JSON.stringify(row.name)})'>
                                     <i class="fas fa-trash"></i> <!-- Delete icon -->
                                 </button>  
                            </div>
                        </div>
                    </div>`;
                },
                orderable: false // Disable sorting for the first column
            },     
            { data: 'name' },
            { 
                data: 'valid_from',
                render: function(data) {
                    return moment(data).format('DD/MM/YYYY'); // Format date to Italian format
                }
            },
            { 
                data: 'valid_to',
                render: function(data) {
                    return moment(data).format('DD/MM/YYYY'); // Format date to Italian format
                }
            },
            { data: 'num_access_to_trigger' },
            { data: 'num_accesses_reward' },
            //{ data: 'qr_code' },
            //{ data: 'created_at' }
        ],
        lengthMenu: [
            [5, 10, 25, 50, 100],
            [5, 10, 25, 50, 100]
        ],
        pageLength: 10,
        order: [[1, 'asc']] // Default ordering
    });
}

function initPrograms() {
    $(document).ready(function() {  
        loadPrograms();
    });
}