

// Button trigger function to load all units in a class
function fetchAllServantsInClass(className) {
    const classQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=${className}`);
    
    // Send the query with a callback function
    classQuery.send(function (response) {
        if (response.isError()) {
            console.error('Error fetching class data: ', response.getMessage());
            return;
        }
        const dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for class', this.className);
            return;
        }
        if (servantData === null) {
            console.error('Error loading Servant list');
            return;
        }
        const classData = servantArrayToObject(filterSheetData(dataTable, [0, 1]));
        displayClassUnits(classData, this.className);
    }.bind({ className: className }));
}



// Converts fetched servant array to named objects
function servantArrayToObject(servantArray) {
    return servantArray.map(servant => ({
        id: servant[0],
        name: servant[1],
        imageUrl: servant[2]
    }));
}






// 
function displayClassUnits(processedData, className) {
    const container = document.getElementById('servant-container');
    container.innerHTML = ''; // Clear previous data
    document.getElementById('classTitle').innerHTML = `${className}`;
    processedData.forEach(row => {
        // Get the servant info
        let servant = servantData.find((svt) => svt.id === row.id);
        // Create HTML display table elements
        const servantContainer = document.createElement('div');
        const clickHandler = displaySingleServantByID.bind(null, servant.id);
        servantContainer.addEventListener('click', clickHandler);
        servantContainer.clickHandler = clickHandler;
        servantContainer.setAttribute('class', 'td');
       
        const servantImg = document.createElement('img');
        servantImg.setAttribute('src', servant.imageUrl);
        servantImg.setAttribute('class', 'svtImg');
        const linebreak = document.createElement('br');
        
        const servantName = document.createElement('span');
        servantName.setAttribute('class', 'svtName');
        servantName.innerHTML = servant.name;
        
        servantContainer.setAttribute('aria-servantId', servant.id);
        servantContainer.appendChild(servantImg);
        servantContainer.appendChild(servantName);
        container.appendChild(servantContainer);
    });
}



// Leaves only a single selected unit onscreen
function displaySingleServantByID(id) {
    const servantContainer = document.querySelector(`[aria-servantId="${id}"]`);
    if (servantContainer.clickHandler) {
        servantContainer.removeEventListener('click', servantContainer.clickHandler);
        delete servantContainer.clickHandler;
    }
    const container = document.getElementById('servant-container');
    const childNodes = container.childNodes;
    for (let i = childNodes.length - 1; i >= 0; i--) {
        const child = childNodes[i];
        if (child.nodeType === 1 && child.getAttribute('aria-servantId') != id) {
            child.remove();
        }
    }
    displayBanners(id);
}