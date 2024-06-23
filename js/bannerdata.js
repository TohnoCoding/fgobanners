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
        console.log(bannerData);
    }).bind(bannerData: bannerData);
    
    const bannerContainer = document.getElementById('banner-container');
    const bannerTable = document.createElement('table');
    const bannerRow = document.createElement('tr');
    const bannerCell = document.createElement('td');
    
    bannerCell.textContent = "Banner";
    bannerRow.appendChild(bannerCell);
    
    bannerCell.textContent = "Start Date";
    bannerRow.appendChild(bannerCell);
    
    bannerCell.textContent = "End Date";
    bannerRow.appendChild(bannerCell);
    
    bannerCell.textContent = "Banner ID"
    bannerRow.appendChild(bannerCell);
    
    bannerTable.appendChild(bannerRow);
    
    bannerData.forEach(row => {
        bannerRow.innerHTML = "";
        bannerCell.textContent = row[0];
        bannerRow.appendChild(bannerCell);
        
        bannerCell.textContent = row[1];
        bannerRow.appendChild(bannerCell);
        
        bannerCell.textContent = row[2];
        bannerRow.appendChild(bannerCell);
        
        bannerCell.textContent = row[3];
        bannerRow.appendChild(bannerCell);
        
        bannerTable.appendChild(bannerRow);
    });
    
}


