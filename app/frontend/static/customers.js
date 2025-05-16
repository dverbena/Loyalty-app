var customersTable;
var accessTable;

const sendMessageToCustomersPage = (message) => {
    AppSession.messageToCustomerPage = { msg: message, type: 'info' };
}

const sendErrorMessageToCustomersPage = (message) => { 
    AppSession.messageToCustomerPage = { msg: message, type: 'error' };
}

const sendRewardMessageToCustomersPage = () => { 
    AppSession.showRewardBanner = true;
}

const showRewardBanner = () => { 
    if(!AppSession.rewardSempahore) {
        if(AppSession.showRewardBanner) {
            AppSession.rewardSempahore = true;
            $("#reward").show();
            $("#divCustomers").hide();

            setTimeout(function () {
                $("#reward").hide();
                $("#divCustomers").show();
                
                AppSession.showRewardBanner = false;
                AppSession.rewardSempahore = false;
            }, AppSession.successMessageDuration);
        }
    }
}

const showMessages = () => {
    if (AppSession.messageToCustomerPage.msg) {
        if (!(AppSession.messageToCustomerPage.type === 'info' ? AppSession.semaphore.info : AppSession.semaphore.error)) {
            if (AppSession.messageToCustomerPage.type === 'info')
                AppSession.semaphore.info = true;//no message processing while a message is being shown
            else
                AppSession.semaphore.error = true;

            $('#' + (AppSession.messageToCustomerPage.type === 'info' ? 'success-message' : 'error-message')).text(AppSession.messageToCustomerPage.msg).show();

            setTimeout(function () {
                if (AppSession.messageToCustomerPage.type === 'info')
                    AppSession.semaphore.info = false;//no message processing while a message is being shown
                else
                    AppSession.semaphore.error = false;
                    $('#' + (AppSession.messageToCustomerPage.type === 'info' ? 'success-message' : 'error-message')).fadeOut();

                AppSession.messageToCustomerPage.msg = null;
                AppSession.messageToCustomerPage.type = null;

            }, AppSession.messageToCustomerPage.type === 'info' ? AppSession.successMessageDuration : AppSession.errorMessageDuration);
        }
    }
}

const startMessagesTimer = () => {
    AppSession.timer = window.setInterval(() => showMessages(), 200);
}

const stopMessagesTimer = () => {
    clearInterval(AppSession.timer);
}

const startRewardBannerTimer = () => {
    AppSession.rewardBannerTimer = window.setInterval(() => showRewardBanner(), 200);
}

const stopRewardBannerTimer = () => {
    clearInterval(AppSession.rewardBannerTimer);
}

function handleAction(action, id, name, last_name) {
    switch (action) {
        case 'check_in':
            ajaxRequest({
                type: 'GET',
                url: `accesses/reward_due/${id}`,
                headers: { 'Authorization': localStorage.getItem('token') },
                success: function (responseReward) {//sendRewardMessageToCustomersPage
                    ajaxRequest({
                        type: 'POST',
                        url: 'accesses/add',
                        contentType: 'application/json',
                        headers: { 'Authorization': localStorage.getItem('token') },
                        data: `{"id": ${id}, "imported": false, "reward": ${responseReward.reward_due}}`,   // Send the form data as JSON
                        success: function (response) {
                            if(responseReward.reward_due) sendRewardMessageToCustomersPage();
                            else sendMessageToCustomersPage(`Check in di ${response.customer.name} ${response.customer.last_name} (${responseReward.program}) riuscito!`);
                            
                            customersTable.ajax.reload(null, false); // 'false' prevents resetting the pagination
                        },
                        error: function (xhr, status, error) {
                            sendErrorMessageToCustomersPage("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""))
                        }
                    });
                },
                error: function (xhr, status, error) {
                    sendErrorMessageToCustomersPage("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""))
                }
            });
            
            break;
        case 'resend_qr':
            ajaxRequest({
                type: 'POST',
                url: 'customers/send-qr-code',
                contentType: 'application/json',  // Set content type to JSON
                data: `{"id": ${id}}`,   // Send the form data as JSON
                headers: { 'Authorization': localStorage.getItem('token') },
                success: function (response) {
                    sendMessageToCustomersPage(`QR mandato a ${response.customer.name} ${response.customer.last_name}`);
                },
                error: function (xhr, status, error) {
                    sendErrorMessageToCustomersPage("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""))
                }
            });

            break;
        case 'update':
            AppSession.customerBeingEdited = id;            
            navigateTo("new_customer");

            break;
        case 'delete':            
            if (confirm(`Are you sure you want to delete ${name} ${last_name}?`)) {
                ajaxRequest({
                    type: 'DELETE',
                    url: `customers/${id}`,  // Adjust the endpoint as needed
                    headers: { 'Authorization': localStorage.getItem('token') },
                    success: function (response) {
                        sendMessageToCustomersPage(`Socio ${response.customer.name} ${response.customer.last_name} eliminato correttamente!`);
                        
                        // remove the deleted customer's row from the table
                        // Reload the table but keep the current page
                        customersTable.ajax.reload(null, false); // 'false' prevents resetting the pagination
                    },
                    error: function (xhr, status, error) {
                        sendErrorMessageToCustomersPage("Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : ""))
                    }
                });
            }

            break;
        case 'access_logs':
            // // Make AJAX call to fetch access logs
            // ajaxRequest({
            //     url: `/accesses/customer/${id}`,  // The endpoint to fetch access logs
            //     type: 'GET',
            //     headers: { 'Authorization': localStorage.getItem('token') },
            //     success: function(data) {
            //         // Empty the table before adding new rows
            //         $('#accessLogsTable tbody').empty();

            //         // Check if we have data
            //         if (data && data.length > 0) {
            //             // Populate the table with access times
            //             data.forEach(function(log) {
            //                 var formattedDate = moment(log.access_time).format('DD/MM/YYYY HH:mm');
            //                 $('#accessLogsTable tbody').append(`<tr><td>${formattedDate}</td></tr>`);
            //             });
            //         } else {
            //             // If no data, display a message
            //             $('#accessLogsTable tbody').append('<tr><td>Nessun accesso effettuato</td></tr>');
            //         }

            //         // Show the modal
            //         $('#accessLogsModal').modal('show');
            //     },
            //     error: function() {
            //         sendErrorMessageToCustomersPage("Errore nel tentativo di registrare l'accesso");
            //     }
            // });
            
            $('#accessLogsModal').modal('show');            
            
            if(accessTable)
                accessTable.ajax.url(`/accesses/customer/${id}`).load();
            else {
                accessTable = $('#accessLogsTable').DataTable({
                    processing: true,
                    serverSide: true,
                    autoWidth: false,
                    searching: false,
                    ajax: {
                        url: `/accesses/customer/${id}`,
                        headers: { 'Authorization': localStorage.getItem('token') },
                        dataSrc: 'data' // Key in the response containing the data array
                    },
                    language: {
                        url: 'https://cdn.datatables.net/plug-ins/2.2.1/i18n/it-IT.json',
                    },
                    columns: [                        
                        { 
                            data: 'num',
                            orderable: false,
                            render: function(data, type, row, meta) {
                                if (row.num == -1) return '';
                                if (row.reward) return '<i title="Premio" class="fas fa-gift"></i>';
                                if (row.imported) return '<i title="Importato" class="fas fa-file-import"></i>';

                                return row.num;
                            }
                        },
                        { 
                            data: 'access_time', 
                            render: function(data, type, row, meta) {
                                return moment(row.access_time).format('DD/MM/YYYY HH:mm');
                            }
                        }
                    ],
                    lengthMenu: [
                        [10, 25, 50, 100],
                        [10, 25, 50, 100]
                    ],
                    pageLength: 25,
                    order: [[1, 'desc']] // Default ordering
                });
            }

            break;
        default:
            console.log('Unknown action');
    }
}

// function filterCustomers(event) {
//     var formData = {
//         name: $('#filterName').val(),
//         last_name: $('#filterLastName').val()
//     };

//     ajaxRequest({
//         type: 'GET',
//         url: `customers/search?name=${formData.name}&last_name=${formData.last_name}`,
//         headers: { 'Authorization': localStorage.getItem('token') },
//         success: function (response) {  
//             $('#customers_table tbody').empty(); // remove all rows
            
//             if (response && response.length > 0) {
//                 // Populate the table with access times
//                 response.forEach(function(customer) {
//                     $('#customers_table tbody').append(`
//                         <tr class="selectable-row" data-id="${customer.id}">
//                             <td style="white-space: nowrap;">
//                                 <!-- Action buttons with Font Awesome icons -->
//                                 <button title="Check in" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("check_in", ${customer.id}, "${customer.name}", "${customer.last_name}")'>
//                                     <i class="fas fa-check"></i> <!-- Edit icon -->
//                                 </button>
//                                 <button title="Rimanda QR code" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("resend_qr", ${customer.id}, "${customer.name}", "${customer.last_name}")'>
//                                     <i class="fas fa-at"></i> <!-- View icon -->
//                                 </button>
//                                 <button title="Mostra ingressi" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("access_logs", ${customer.id}, "${customer.name}", "${customer.last_name}")'>
//                                     <i class="fas fa-history"></i>
//                                 </button>
//                                 <button title="Modifica" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("update", ${customer.id}, "${customer.name}", "${customer.last_name}")'>
//                                     <i class="fas fa-edit"></i>
//                                 </button>
//                                 <button title="Elimina" class="btn btn-danger mb-2 mb-sm-0" onclick='handleAction("delete", ${customer.id}, "${customer.name}", "${customer.last_name}")'>
//                                     <i class="fas fa-trash"></i> <!-- Delete icon -->
//                                 </button>
//                             </td>
//                             <td>${customer.name}</td>
//                             <td>${customer.last_name}</td>
//                             <td>${customer.email}</td>
//                             <td>${customer.address}</td>
//                         </tr>`);
//                 });
//             } else {
//                 // If no data, display a message
//                 $('#customers_table tbody').append('<tr><td colspan="5" class="text-center">Nessun socio trovato</td></tr>');
//             }
//         },
//         error: function (xhr, status, error) {
//             // If there is an error, display the error message on the page
//             errorMessage = "Errore: " + (xhr.responseJSON && xhr.responseJSON.error? xhr.responseJSON.error : "");            
//             sendErrorMessageToCustomersPage(errorMessage);
//         }
//     });
// }

function loadCustomers() {
    customersTable = $('#customers_table').DataTable({
        processing: true,
        serverSide: true,
        autoWidth: false,
        ajax: {
            url: '/customers/all',
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
                            <div class="col-12 col-lg-6 col-xl-2">
                                <button title="Check in" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("check_in", ${row.id}, ${JSON.stringify(row.name)}, ${JSON.stringify(row.last_name)})'>
                                    <i class="fas fa-check"></i> <!-- Check in icon -->
                                </button>
                            </div>
                            <div class="col-12 col-lg-6 col-xl-2">
                                <button title="Rimanda QR code" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("resend_qr", ${row.id}, ${JSON.stringify(row.name)}, ${JSON.stringify(row.last_name)})'>
                                    <i class="fas fa-at"></i> <!-- Resend QR code icon -->
                                </button>
                            </div>
                            <div class="col-12 col-lg-6 col-xl-2">
                                <button title="Mostra ingressi" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("access_logs", ${row.id}, ${JSON.stringify(row.name)}, ${JSON.stringify(row.last_name)})'>
                                    <i class="fas fa-history"></i> <!-- Access logs icon -->
                                </button>
                            </div>
                            <div class="col-12 col-lg-6 col-xl-2">
                                <button title="Modifica" style="margin-right: 10px" class="btn btn-info mb-2 mb-sm-0" onclick='handleAction("update", ${row.id}, ${JSON.stringify(row.name)}, ${JSON.stringify(row.last_name)})'>
                                    <i class="fas fa-edit"></i> <!-- Edit icon -->
                                </button>
                            </div>
                            <div class="col-12 col-lg-12 col-xl-4 d-xl-flex justify-content-center">
                                <button title="Elimina" class="btn btn-danger mb-2 mb-sm-0" onclick='handleAction("delete", ${row.id}, ${JSON.stringify(row.name)}, ${JSON.stringify(row.last_name)})'>
                                    <i class="fas fa-trash"></i> <!-- Delete icon -->
                                </button>
                            </div>
                        </div>
                    </div>`;
                },
                orderable: false // Disable sorting for the first column
            },
            { data: 'last_name', width: '20%' },
            { data: 'name', width: '25%' },
            { data: 'email', width: '20%' },
            { 
                data: 'program', width: '30%', 
                orderable: false
            },
            { 
                data: 'last_access', 
                width: '5%', 
                orderable: false,
                render: function(data, type, row, meta) {
                    if (row.last_access == -1) return '';
                    if (row.last_access == 0) return '<i title="Premio" class="fas fa-gift"></i>';

                    return row.last_access;
                }
            },
            //{ data: 'qr_code' },
            //{ data: 'created_at' }
        ],
        lengthMenu: [
            [5, 10, 25, 50, 100],
            [5, 10, 25, 50, 100]
        ],
        pageLength: 25,
        order: [['1', 'asc']] // Default ordering
    });
}

function initCustomers() {
    $(document).ready(function() {  
        loadCustomers();
        accessTable = null;
    });
}