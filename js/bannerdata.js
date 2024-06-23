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


function fetchBanners() {
    bannersDataTable.length = 0;
    const bannerQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Data&q=select * offset ${bannerOffset}`);
    
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching banners data: ', response.getMessage());
            return;
        }
        const dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for banners list');
            return;
        }
        bannersDataTable = filterSheetData(dataTable, [0, 1, 2, 4]);
        
        /*
        // testing displaying the banners here; ideally all we want is
        // to fetch the datatable and pass it to a new function that will
        // collate and correlate it to the units
        bannersDataTable.unshift(['Banner Title', 'Start Date', 'End Date', 'Banner ID']);
        const bannersTable = formatBanners(bannersDataTable[0]);
        const bannersArea = document.getElementById('banner-container');
        bannersArea.appendChild(bannersTable);
        */
    });
}



function displayBanners(servantID) {
    fetchBanners();
    fetchBannerRelationships();
    
    if (!bannersDataTable || !bannerRelationships ) {
        console.error('Main tables empty!');
        alert('Main tables empty!');
        return;
    }
    
    console.log(bannersDataTable);
    console.log(bannerRelationships);
    
    const bannersByServant = bannerRelationships.filter(rels => rels[0] == servantID);
    
}



function fetchBannerRelationships() {
    let dataTable = null;
    const bannerQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Data2`);
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching banner relationship data: ', response.getMessage());
            return;
        }
        
        dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for banner relationships');
            return;
        }
        
        const cols = [];
        for (let i = 0; i < dataTable.getNumberOfColumns(); i++)
        { cols.push(i); }
        
        bannerRelationships = filterSheetData(dataTable, cols);
    });
}