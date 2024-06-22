// Load the Visualization API and the corechart package.
google.charts.load('current', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.charts.setOnLoadCallback(initialize);

// Servant IDs, names, and profile image links
let servantData = null;

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
        const servantQuery = new google.visualization.Query(`https://docs.google.com/spreadsheets/d/1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc/gviz/tq?sheet=Servants`);
        // Query Servant names, IDs and profile images with a callback function
        servantQuery.send(response => handleServantCall(response));
    }
}

function resetAll() {
    document.getElementById('data-container').innerHTML = '&nbsp;';
    document.getElementById('classTitle').innerHTML = '&nbsp;';
}

// Button trigger function to load all units in a class
function fetchAllServantsInClass(className) {
    const classQuery = new google.visualization.Query(`https://docs.google.com/spreadsheets/d/1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc/gviz/tq?sheet=${className}`);
    
    // Send the query with a callback function
    classQuery.send(response => fetchClass(response, className));
}

// Fill up Servant Data for later use
function handleServantCall(response) {
    if (servantData !== null) { return; }
    const dataTable = response.getDataTable();
    servantData = filterSheetData(dataTable, [0, 1, 4]);
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

// Fetch spreadsheet data for all unit in specified class
function fetchClass(response, className) {
    if (response.isError()) {
        console.error('Error fetching class data: ', response.getMessage());
        return;
    }
    const dataTable = response.getDataTable();
    if (!dataTable) {
        console.error('Invalid dataTable object for class', className);
        return;
    }
    if (servantData === null) {
        console.error('Error loading Servant list');
        return;
    }
    const classData = filterSheetData(dataTable, [0, 1]);
    displayServantsPerClass(classData, className);
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
            
            // Check if the cell contains a hyperlink by inspecting the formatted value
            if (cellFormattedValue && cellFormattedValue.includes('href="')) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(cellFormattedValue, 'text/html');
                const anchor = doc.querySelector('a');
                if (anchor) {
                    const url = anchor.getAttribute('href');
                    const displayText = anchor.textContent;
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

function displayServantsPerClass(processedData, sheetName) {
    const container = document.getElementById('data-container');
    container.innerHTML = ''; // Clear previous data
    document.getElementById('classTitle').innerHTML = `${sheetName}`;
    
    processedData.forEach(row => {
        // Get the servant info
        let servant = servantData.filter((svt) => svt[0] === row[0])[0];
        
        // Create HTML display table elements
        const servantContainer = document.createElement('div');
        servantContainer.addEventListener('click', () => displayServantByID(servant[0]));
        servantContainer.setAttribute('class', 'td');
        const servantImg = document.createElement('img');
        servantImg.setAttribute('class', 'svtImg');
        const linebreak = document.createElement('br');
        const servantName = document.createElement('span');
        servantName.setAttribute('class', 'svtName');
        
        servantName.innerHTML = servant[1];
        servantImg.setAttribute('src', servant[2]);
        servantContainer.setAttribute('aria-servantId', servant[0]);
        servantContainer.appendChild(servantImg);
        servantContainer.appendChild(linebreak);
        servantContainer.appendChild(servantName);
        container.appendChild(servantContainer);
    });
}

function displayServantByID(id) {
    const container = document.getElementById('data-container');
    const childNodes = container.childNodes;
    for (let i = childNodes.length - 1; i >= 0; i--) {
        const child = childNodes[i];
        if (child.nodeType === 1 && child.getAttribute('aria-servantId') != id) {
            container.removeChild(child);
        }
    }
}

// this code is kept temporarily as a reference of how to fetch complex data from the sheet
/*function genericDisplayData(processedData, sheetName) {
    const container = document.getElementById('data-container');
    container.innerHTML = ''; // Clear previous data
    const sheetDiv = document.createElement('div');
    sheetDiv.innerHTML = "";
    const divider = document.createElement('hr');
    document.getElementById('classTitle').innerHTML = `${sheetName}`;
    
    processedData.forEach(row => {
        const rowDiv = document.createElement('div');
        row.forEach(cell => {
            if(cell !== null) {
                if (typeof cell === 'object' && Object.hasOwn(cell, 'url') && Object.hasOwn(cell, 'displayText')) {
                    const hyperlink = document.createElement('a');
                    hyperlink.href = cell.url;
                    hyperlink.textContent = cell.displayText;
                    rowDiv.appendChild(hyperlink);
                } else {
                    const span = document.createElement('span');
                    span.innerHTML = cell;
                    span.setAttribute('class', 'dataCell');
                    rowDiv.appendChild(span);
                }
            }
            sheetDiv.appendChild(rowDiv);
        });
    });
    container.appendChild(sheetDiv);
}*/
