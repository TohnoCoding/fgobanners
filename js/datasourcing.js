// Load the Visualization API and the corechart package.
google.charts.load('current', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.charts.setOnLoadCallback(initialize);

function initialize() {
    // Add event listeners to buttons
    document.getElementById('fetchSaber').addEventListener('click', () => fetchSpreadsheetData('Saber'));
    document.getElementById('fetchLancer').addEventListener('click', () => fetchSpreadsheetData('Lancer'));
    document.getElementById('fetchArcher').addEventListener('click', () => fetchSpreadsheetData('Archer'));
    document.getElementById('fetchRider').addEventListener('click', () => fetchSpreadsheetData('Rider'));
    document.getElementById('fetchCaster').addEventListener('click', () => fetchSpreadsheetData('Caster'));
    document.getElementById('fetchAssassin').addEventListener('click', () => fetchSpreadsheetData('Assassin'));
    document.getElementById('fetchBerserker').addEventListener('click', () => fetchSpreadsheetData('Berserker'));
    document.getElementById('fetchExtra').addEventListener('click', () => fetchSpreadsheetData('EXTRA'));
}

function fetchSpreadsheetData(sheetName) {
    const spreadsheetId = '1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc';
    const query = new google.visualization.Query(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?sheet=${sheetName}`);

    // Send the query with a callback function
    query.send(response => handleQueryResponse(response, sheetName));
}

function handleQueryResponse(response, sheetName) {
    if (response.isError()) {
        console.error('Error fetching data:', response.getMessage());
        return;
    }

    const data = response.getDataTable();
    //console.log(`Data from ${sheetName}:`, data); // Data from sheet

    // Process the data to extract both hyperlink target and display text
    const processedData = processData(data);
    //console.log(`Processed data from ${sheetName}:`, processedData); // Processed data from sheet

    // Display the processed data
    displayData(processedData, sheetName);
}

function processData(dataTable) {
    const numRows = dataTable.getNumberOfRows();
    const numCols = dataTable.getNumberOfColumns();
    const processedRows = [];

    for (let row = 0; row < numRows; row++) {
        const rowData = [];
        for (let col = 0; col < numCols; col++) {
            const cellValue = dataTable.getValue(row, col);
            const cellFormattedValue = dataTable.getFormattedValue(row, col);
            
            // Check if the cell contains a hyperlink formula
            if (cellFormattedValue.startsWith('=HYPERLINK')) {
                const match = cellFormattedValue.match(/=HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)/);
                if (match) {
                    const url = match[1];
                    const displayText = match[2];
                    rowData.push({ url, displayText });
                } else {
                    rowData.push(cellValue); // Fallback to cell value if parsing fails
                }
            } else {
                rowData.push(cellValue);
            }
        }
        processedRows.push(rowData);
    }
    return processedRows;
}

function displayData(processedData, sheetName) {
    const container = document.getElementById('data-container');
    container.innerHTML = ''; // Clear previous data
    const sheetDiv = document.createElement('div');
    sheetDiv.innerHTML = `<h3>${sheetName}</h3>`;
    processedData.forEach(row => {
        console.log(row);
        const rowDiv = document.createElement('div');
        const spanName = document.createElement('span');
        spanName.setAttribute('id', row[0]);
        spanName.textContent = row[0] + ' ' + row[1];
        rowDiv.appendChild(spanName);
        /*row.forEach(cell => {
            if (typeof cell === 'object' && Object.hasOwn(cell, 'url') && Object.hasOwn(cell, 'displayText')) {
                const link = document.createElement('a');
                link.href = cell.url;
                link.textContent = cell.displayText;
                rowDiv.appendChild(link);
            } else {
                const span = document.createElement('span');
                span.textContent = cell + ' ';
                rowDiv.appendChild(span);
            }
            const span = document.createElement('span');
            if (cell !== null) {
                //console.log(cell);
                span.textContent = cell + ' ';
                rowDiv.appendChild(span);
            }
        });*/
        const divider = document.createElement('hr');
        rowDiv.appendChild(divider);
        sheetDiv.appendChild(rowDiv);
    });
    container.appendChild(sheetDiv);
}
