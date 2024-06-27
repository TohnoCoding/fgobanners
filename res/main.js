// Globals {
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {'packages':['corechart']});

    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(initialize);

    // Servant IDs, names, and profile image links
    Object.defineProperty(window, 'servantData', {
        value: undefined,
        writable: true,
        configurable: true
    });
    const spreadsheetLink = 'https://docs.google.com/spreadsheets/d/1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc/gviz/tq';
    const bannerSheetRowOffset = 370;
    Object.defineProperty(window, 'bannersDataTable', {
        value: undefined,
        writable: true,
        configurable: true
    });
    Object.defineProperty(window, 'bannerRelationships', {
        value: undefined,
        writable: true,
        configurable: true
    });
    Object.defineProperty(window, 'globalThreshold', {
        value: undefined,
        writable: true,
        configurable: true
    });
    const atlasLink = 'https://apps.atlasacademy.io/db/REGION/servant/';
    const versionNumber = '0.3.8';
    const classNumbers = new Map([
        ["Saber", 1],
        ["Archer", 2],
        ["Lancer", 3],
        ["Rider", 4],
        ["Caster", 5],
        ["Assassin", 6],
        ["Berserker", 7],
        ["Ruler", 9],
        ["Alter-Ego", 10],
        ["Avenger", 11],
        ["Moon-Cancer", 23],
        ["Foreigner", 25],
        ["Pretender", 28],
        ["Beast", 33]
    ]);
// }

// Set stuff up once the DOM is fully loaded and do initial load of Servants
function initialize() {
    // Fetch the global threshold value for NA-released units
    fetchGlobalThreshold();
    // Fetch banner information to keep in memory
    Promise.all([fetchBanners(), fetchBannerRelationships()])
        .then(() => {
            // Add event listeners to buttons
            document.getElementById('fetchSaber').addEventListener('click', () => fetchAllServantsInClass('Saber'));
            document.getElementById('fetchLancer').addEventListener('click', () => fetchAllServantsInClass('Lancer'));
            document.getElementById('fetchArcher').addEventListener('click', () => fetchAllServantsInClass('Archer'));
            document.getElementById('fetchRider').addEventListener('click', () => fetchAllServantsInClass('Rider'));
            document.getElementById('fetchCaster').addEventListener('click', () => fetchAllServantsInClass('Caster'));
            document.getElementById('fetchAssassin').addEventListener('click', () => fetchAllServantsInClass('Assassin'));
            document.getElementById('fetchBerserker').addEventListener('click', () => fetchAllServantsInClass('Berserker'));
            document.getElementById('fetchEXTRA').addEventListener('click', () => fetchAllServantsInClass('EXTRA'));
            document.getElementById('toggler').addEventListener('click', function() {
                const blinds = document.getElementById('blinds');
                const isVisible = blinds.classList.toggle('visible');
                blinds.style.height = isVisible ? '131px' : '0';
            });
            if (servantData === null) {
                const servantQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Servants`);
                // Query Servant names, IDs and profile images
                servantQuery.send(function (response) {
                    const dataTable = response.getDataTable();
                    Object.defineProperty(window, 'servantData' {
                        value: servantArrayToObject(filterSheetData(dataTable, [0, 1, 2, 4])),
                        writable: false,
                        configurable: false
                    });
                });
            }
        });
    document.title += ` v${versionNumber}`;
    document.getElementById('versionNumber').textContent = versionNumber;
    const metaTags = [{ selector: 'meta[property="og:title"]', prefix: 'FGO Servant Banners ' },
        { selector: 'meta[name="twitter:title"]', prefix: 'FGO Servant Banners ' }];
    metaTags.forEach(tag => {
        const element = document.querySelector(tag.selector);
        if (element) { element.setAttribute('content', `${tag.prefix}v${versionNumber}`); }
    });
}

// Gets the ID of the latest released unit in NA, used to build links to Atlas Database
async function fetchGlobalThreshold() {
    try {
        const threshold = (await fetch("https://api.atlasacademy.io/export/NA/basic_servant.json")
            .then(r => r.json())).map(s => s.collectionNo).at(-1);
        Object.defineProperty(window, 'globalThreshold', {
            value: threshold,
            writable: false,
            configurable: false
        });
    } catch (error) {
        Object.defineProperty(window, 'globalThreshold', {
            value: 0,
            writable: false,
            configurable: false
        });
        console.error('Error fetching global NA threshold from Atlas, will only display JP links!');
    }
}

// Clean out the page
function resetAll() {
    document.getElementById('servant-container').innerHTML = '&nbsp;';
    document.getElementById('banner-container').innerHTML = '&nbsp;';
    document.getElementById('classTitle').innerHTML = '&nbsp;';
    document.getElementById('classTitle').style.display = 'block';
    document.getElementById('disclaimer').style.display = 'none';
    [...document.getElementsByClassName('svtButton')].forEach(elem => {
        elem.removeAttribute('class');
        elem.setAttribute('class', 'svtButton');
    });
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
        let classData;
        if (className == "EXTRA") {
            classData = servantData.filter(servant => servant.sClass > 8).sort((a, b) => a.sClass - b.sClass);
        } else {
            const classNumber = classNumbers.get(className);            
            classData = servantData.filter(servant => servant.sClass === classNumber);
        }
        displayClassUnits(classData, this.className);
    }.bind({ className: className }));
}

// Converts fetched servant array to named objects
function servantArrayToObject(servantArray) {
    return servantArray.map(servant => ({
        id: servant[0],
        name: servant[1],
        imageUrl: servant[2],
        sClass: servant[3]
    }));
}

// Displays all units from the selected class
function displayClassUnits(processedData, className) {
    resetAll();
    document.getElementById('fetch' + className).setAttribute('class', 'svtButton svtButtonSelected');
    document.getElementById('dynamic-contents').style.display = "block";
    const container = document.getElementById('servant-container');
    container.innerHTML = ''; // Clear previous data
    document.getElementById('classTitle').innerHTML = `${className}<br /><br />`;
    processedData.forEach(row => {
        // Get the servant info
        let servant = servantData.find((svt) => svt.id === row.id);
        // Create HTML display table elements
        const servantContainer = document.createElement('div');
        const clickHandler = displaySingleServantByID.bind(null, servant.id);
        servantContainer.addEventListener('click', clickHandler);
        servantContainer.clickHandler = clickHandler;
        servantContainer.setAttribute('class', 'item');
        // Create unit image
        const servantImg = document.createElement('img');
        servantImg.setAttribute('src', servant.imageUrl.substring(0, servant.imageUrl.length - 4) + "_bordered.png");
        servantImg.setAttribute('class', 'svtImg');
        // Create invisible area with servant name
        const servantName = document.createElement('span');
        servantName.setAttribute('class', 'svtName invisible');
        servantName.setAttribute('id', 'svtName' + servant.id);
        servantName.innerHTML = servant.name;
        // Render sevant container into the DOM
        servantContainer.setAttribute('aria-servantId', servant.id);
        servantContainer.appendChild(servantImg);
        servantContainer.appendChild(servantName);
        container.appendChild(servantContainer);
    });
}

// Leaves only a single selected unit onscreen
function displaySingleServantByID(id) {
    const servantContainer = document.querySelector(`[aria-servantId="${id}"]`);
    servantContainer.querySelector('img').style.marginTop = '15px';
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
    document.getElementById('classTitle').style.display = 'none';
    // Create the DOM container for the Atlas link, and output JP link
    const linkSpan = document.createElement('div');
    linkSpan.setAttribute('class', 'atlas');
    const jp = document.createElement('a');
    jp.href = atlasLink.replace('REGION', 'JP') + id;
    jp.setAttribute('target', '_blank');
    jp.textContent = 'Atlas (JP)';
    linkSpan.appendChild(jp);
    // If the current unit ID is lower or equal than globalThreshold, create the NA link
    if (id <= globalThreshold) {
        const br = document.createElement('br');
        const na = document.createElement('a');
        na.href = atlasLink.replace('REGION', 'NA') + id;
        na.setAttribute('target', '_blank');
        na.textContent = 'Atlas (NA)';
        linkSpan.appendChild(br);
        linkSpan.appendChild(na);
    }
    servantContainer.insertBefore(linkSpan, servantContainer.querySelector('span'));
    displayBanners(id);
}

// Gets the full list of banners
function fetchBanners() {
    const bannerQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Data&q=select * offset ${bannerSheetRowOffset}`);
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching banners data: ', response.getMessage());
            reject('Error fetching banners data: ', response.getMessage());
            alert('Error fetching banners data: ' + response.getMessage());
            return;
        }
        const dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for banners list');
            reject('Invalid dataTable object for banners list');
            alert('Invalid dataTable object for banners list');
            return;
        }
        Object.defineProperty(window, 'bannersDataTable', {
            value: filterSheetData(dataTable, [0, 1, 2, 4]),
            writable: false,
            configurable: false
        });
    });
}

// Gets the correlations between banners and units
function fetchBannerRelationships() {
    const bannerQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Data2`);
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching banner relationship data: ', response.getMessage());
            reject('Error fetching banner relationship data: ', response.getMessage());
            alert('Error fetching banner relationship data: ', response.getMessage());
            return;
        }
        const dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for banner relationships');
            reject('Invalid dataTable object for banner relationships');
            alert('Invalid dataTable object for banner relationships');
            return;
        }
        const cols = [];
        for (let i = 0; i < dataTable.getNumberOfColumns(); i++)
        { cols.push(i); }
        Object.defineProperty(window, 'bannerRelationships', {
            value: filterSheetData(dataTable, cols),
            writable: false,
            configurable: false
        });
    });
}

// Displays the collated banners corresponding to a single servant ID
function displayBanners(servantID) {
    const bannersArea = document.getElementById('banner-container');
    bannersArea.innerHTML = "";
    document.getElementById('disclaimer').style.display = 'block';
    
    let bannersForUnit = bannerRelationships.filter(row => row[0] == servantID);
    bannersForUnit = bannersForUnit[0].filter(col => col !== null);
    
    if (bannersForUnit.length > 3) {
        const bannersObject = {
            unitName: document.getElementById('svtName' + servantID).textContent,
            unitCategory: bannersForUnit[1],
            banners: []
        };
        for (let i = 3; i < bannersForUnit.length; i = i + 2) {
            const currentBanner = bannersDataTable.find(row => row[3] == bannersForUnit[i] );
            bannersObject.banners.push({ 
                 bannerID: bannersForUnit[i]
                ,bannerName: currentBanner[0]
                ,bannerStartDate: currentBanner[1]
                ,bannerEndDate: currentBanner[2]
                ,soloBanner: bannersForUnit[i + 1]
                ,isNAConfirmed: bannersForUnit[i].toString().includes('.') ? "<span class='b'>Yes</span>" : "<span class='i'>No</span>"
            });
        }
        let unitCat = "";
        switch (bannersObject.unitCategory.toString()) {
            case "Limited":
                unitCat = " <span class='b'>Limited</span>";
                break;
            case "FP":
                unitCat = " <span class='i'>Friend Point</span>";
                break;
            case "FP Limited":
                unitCat = " <span class='b i'>Limited Friend Point</span>";
                break;
            case "Perma":
                unitCat = " Permanent";
                break;
            case "Story":
                unitCat = " <span class='u'>Storylocked</span>";
                break;
            case "Welfare":
                unitCat = 'n Event prize ("Welfare")';
                break;
            default:
                unitCat = "n Unsummonable (lol)";
        }
        const br = document.createElement('br');
        const titleText = document.createElement('h2');
        titleText.innerHTML = "Currently active and projected future banners for " + bannersObject.unitName + ", who is a" + unitCat + " Unit:";
        bannersArea.appendChild(titleText);
        const tbl = document.createElement('table');
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        const headers = ['Banner Name', 'Banner Start Date', 'Banner End Date', 'Solo Banner?', 'Dates confirmed for Global?'];
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        tbl.appendChild(thead);
        const tbody = document.createElement('tbody');
        bannersObject.banners.forEach(item => {
            const row = document.createElement('tr');
            row.setAttribute('class', 'small');
            const tdName = document.createElement('td');
            tdName.textContent = item.bannerName;
            const tdStart = document.createElement('td');
            tdStart.textContent = item.bannerStartDate;
            const tdEnd = document.createElement('td');
            tdEnd.textContent = item.bannerEndDate;
            const tdSolo = document.createElement('td');
            tdSolo.textContent = item.soloBanner;
            const tdConfirmed = document.createElement('td');
            tdConfirmed.innerHTML = item.isNAConfirmed;
            row.appendChild(tdName);
            row.appendChild(tdStart);
            row.appendChild(tdEnd);
            row.appendChild(tdSolo);
            row.appendChild(tdConfirmed);        
            tbody.appendChild(row);
        });
        tbl.appendChild(tbody);
        const nameBox = document.getElementsByClassName('svtName');
        [...nameBox].forEach(name => {
            name.remove();
        });
        document.getElementById('banner-container').appendChild(tbl);
    } else {
        const msg = document.createElement('h1');
        msg.innerText = "There are no projected banners for this unit for EN in the foreseeable future.";
        document.getElementById('banner-container').appendChild(msg);
    }
}
