function formatBanners(bannerData) {
    const table = document.createElement('table');
    
    const headerRow = document.createElement('tr');
    bannerData[0].forEach(cellData => {
        const headerCell = document.createElement('th');
        headerCell.textContent = cellData;
        headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);
    
    for (let i = 1; i < bannerData.length; i++) {
        const dataRow = document.createElement('tr');
        bannerData[i].forEach(cellData => {
            const dataCell = document.createElement('td');
            dataCell.textContent = cellData;
            dataRow.appendChild(dataCell);
        });
        table.appendChild(dataRow);
    }
    
    return table;
}


function displayBanners() {
    let dataTable = null;
    let bannerData = null;
    const bannerQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Data&q=select * offset ${bannerOffset}`);
    
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching class data: ', response.getMessage());
            return;
        }
        dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for class', this.className);
            return;
        }
        
        bannerData = filterSheetData(dataTable, [0, 1, 2, 4]);
        bannerData.unshift(['Banner Title', 'Start Date', 'End Date', 'Banner ID']);
        const bannersTable = formatBanners(bannerData);
        const bannersArea = document.getElementById('banner-container');
        bannersArea.appendChild(bannersTable);
    });
}