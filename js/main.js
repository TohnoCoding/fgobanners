// globals {
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {'packages':['corechart']});

    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(initialize);

    // Servant IDs, names, and profile image links
    let servantData = null;
    const spreadsheetLink = 'https://docs.google.com/spreadsheets/d/1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc/gviz/tq';
    const bannerOffset = 385;
    let bannersDataTable = [];
    let bannerRelationships = [];
// }



// Set stuff up once the DOM is fully loaded and do initial load of Servants
function initialize() {
    // Add event listeners to buttons
    document.getElementById('fetchSaber').addEventListener('click', () => fetchAllServantsInClass('Saber'));
    document.getElementById('fetchLancer').addEventListener('click', () => fetchAllServantsInClass('Lancer'));
    document.getElementById('fetchArcher').addEventListener('click', () => fetchAllServantsInClass('Archer'));
    document.getElementById('fetchRider').addEventListener('click', () => fetchAllServantsInClass('Rider'));
    document.getElementById('fetchCaster').addEventListener('click', () => fetchAllServantsInClass('Caster'));
    document.getElementById('fetchAssassin').addEventListener('click', () => fetchAllServantsInClass('Assassin'));
    document.getElementById('fetchBerserker').addEventListener('click', () => fetchAllServantsInClass('Berserker'));
    document.getElementById('fetchExtra').addEventListener('click', () => fetchAllServantsInClass('EXTRA'));
    document.getElementById('resetForm').addEventListener('click', () => resetAll());
    if (servantData === null) {
        const servantQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Servants`);
        // Query Servant names, IDs and profile images
        servantQuery.send(function (response) {
            const dataTable = response.getDataTable();
            servantData = servantArrayToObject(filterSheetData(dataTable, [0, 1, 4]));
        });
    }
}



// Clean out the form
function resetAll() {
    document.getElementById('servant-container').innerHTML = '&nbsp;';
    document.getElementById('banner-container').innerHTML = '&nbsp;';
    document.getElementById('classTitle').innerHTML = '&nbsp;';
}



// Get specific columns only from specified sheet in spreadsheet
function filterSheetData(dataTable, columnIndices) {
    if (!dataTable) {
        console.error('Invalid dataTable passed to filterSheetData');
        return [];
    }
    const numRows = dataTable.getNumberOfRows();
    const filteredData = [];

    for (let row = 0; row < numRows; row++) {
        const rowData = [];
        columnIndices.forEach(col => {
            rowData.push(dataTable.getValue(row, col));
        });
        filteredData.push(rowData);
    }
    return filteredData;
}