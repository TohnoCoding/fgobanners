// GLOBALS & INIT {
// Global declarations {
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initialize);
Object.defineProperty(window, 'servantData', { value: undefined, writable: true, configurable: true });
Object.defineProperty(window, 'bannersDataTable', { value: undefined, writable: true, configurable: true });
Object.defineProperty(window, 'bannerRelationships', { value: undefined, writable: true, configurable: true });
Object.defineProperty(window, 'globalThreshold', { value: undefined, writable: true, configurable: true });
const spreadsheetLink = 'https://docs.google.com/spreadsheets/d/1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc/gviz/tq';
const atlasLink = 'https://apps.atlasacademy.io/db/REGION/servant/';
const bannerSheetRowOffset = 395;
const versionNumber = '1.0';
const classNumbers = new Map([ ["Saber", 1], ["Archer", 2], ["Lancer", 3],
        ["Rider", 4], ["Caster", 5], ["Assassin", 6], ["Berserker", 7],
        ["Ruler", 9], ["Alter-Ego", 10], ["Avenger", 11], ["Moon-Cancer", 23],
        ["Foreigner", 25], ["Pretender", 28], ["Beast", 33] ]);
const freeUnitIDs = [1, 4, 16, 19, 21, 24, 25, 33, 34, 36, 39, 40, 43, 44,
        45, 53, 54, 57, 61, 69, 73, 83, 92, 107, 111, 115, 133, 137, 138,
        141, 151, 152, 162, 166, 168, 174, 182, 190, 191, 197, 208, 211,
        219, 225, 233, 240, 243, 252, 255, 256, 257, 258, 259, 260, 264,
        271, 283, 288, 301, 304, 308, 315, 320, 326, 328, 330, 333, 338,
        359, 360, 361, 364, 367, 379, 389, 399, 401, 405, 414];
// }


// Page initialization {
/**
 * Initializes all required elements by calling all necessary functions when the DOM is finished loading.
 */
function initialize() {
    fetchGlobalThreshold(); // Fetch the global threshold value for NA-released units
    Promise.all([fetchBanners(), fetchBannerRelationships()]) // Fetch banner information to keep in memory
        .then(() => {
            addListeners();
            if (servantData == undefined) { fetchServantData(); }
        });
    displayVersionNumber();
}
// }


// Event listeners {
/**
 * Adds all event listeners to the DOM elements that require them.
 */
function addListeners() {
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
        blinds.style.height = isVisible ? '141px' : '0';
    });
}
// }
// }


// HELPERS {
// Display version number {
/**
 * Updates the displayed version number in both the visible DOM and the meta tags.
 */
function displayVersionNumber() {
    document.title += ` v${versionNumber}`;
    document.getElementById('versionNumber').textContent = versionNumber;
    const metaTags = [
        { selector: 'meta[property="og:title"]', prefix: 'FGO Servant Banners ' },
        { selector: 'meta[name="twitter:title"]', prefix: 'FGO Servant Banners ' }
    ];
    metaTags.forEach(tag => {
        const element = document.querySelector(tag.selector);
        if (element) { element.setAttribute('content', `${tag.prefix}v${versionNumber}`); }
    });
}
// }


// Clean out the page {
/**
 * Resets all UI elements to their default state. Required when selecting a class.
 */
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
// }


// Get specific columns only from provided sheet in spreadsheet {
/**
 * Filters the information from the provided dataTable object to return only the
 * information in the specified column indices.
 * @param {Object} dataTable - The dataTable object to extract the information from.
 * @param {number[]} columnIndices - The zero-based columns to include in the filtered data.
 * @returns {Array} The filtered data as a two-dimensional array.
 */
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
// }


// Converts fetched servant array to named objects {
/**
 * Creates a plain Javascript object from the specified Servant array.
 * @param {Array} servantArray - The array of Servants to create an object from.
 * @returns {Object} A plain Javascript object containing the Servant data (internal game ID, name, portrait image URL and class number).
 */
function servantArrayToObject(servantArray) {
    return servantArray.map(servant => ({
        id: servant[0],
        name: servant[1],
        imageUrl: servant[2],
        sClass: servant[3]
    }));
}
// }
// }


// DATA FETCH {
// Fetch last NA unit ID {
/**
 * Uses the Atlas Academy API to get the internal game ID of the latest unit released in the global/EN
 * server, in order to know when to construct NA/EN links to the the Atlas Academy Database unit pages.
 * @returns {Promise<void>} A promise that resolves when the fetch is complete.
 */
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
// }


// Fetch full list of units {
/**
 * Fetches all the currently released Servants (including JP-only units) from the Google spreadsheet.
 */
function fetchServantData() {
    const servantQuery = new google.visualization.Query(`${spreadsheetLink}?sheet=Servants`);
    servantQuery.send(function (response) {
        const dataTable = response.getDataTable();
        let nonFreeServants = servantArrayToObject(filterSheetData(dataTable, [0, 1, 4, 3]))
        nonFreeServants = nonFreeServants.filter(svt => !freeUnitIDs.includes(svt.id));
        Object.defineProperty(window, 'servantData', {
            value: nonFreeServants,
            writable: false,
            configurable: false
        });
    });
}
// }


// Get the full list of banners {
/**
 * Fetches all the banner data from the Google spreadsheet.
 */
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
            value: filterSheetData(dataTable, [0, 1, 2, 4, 5]),
            writable: false,
            configurable: false
        });
    });
}
// }


// Get the correlations between banners and units {
/**
 * Gets the relationships between the fetched banners and the units that appear in each.
 */
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
// }


// Load all units in the selected class {
/**
 * Fetches all the Servants in a given class.
 * @param {string} className - the name of the class. If 'EXTRA' is provided, displays all Extra-class units in this order: Ruler, Alter-Ego, Avenger, Moon-Cancer, Foreigner, Pretender, Beast.
 */
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
// }
// }


// DISPLAY FUNCTIONS {
// Display all units from the selected class {
/**
 * Displays all the units in the selected class. If 'EXTRA' is selected, displays all Extra-class units (Ruler, Alter-Ego, Avenger, Moon-Cancer, Foreigner, Pretender, Beast).
 * @param {Array} processedData - The collection of units to display.
 * @param {string} className - The name of the class to display. If 'EXTRA' is provided, displays 'EXTRA' followed by the names of all the subclasses contained in the Extra group.
 */
function displayClassUnits(processedData, className) {
    resetAll();
    document.getElementById('fetch' + className).setAttribute('class', 'svtButton svtButtonSelected');
    document.getElementById('dynamic-contents').style.display = "block";
    const container = document.getElementById('servant-container');
    container.innerHTML = ''; // Clear previous data
    let classTitle = className;
    if (className === 'EXTRA') {
        classTitle = 'EXTRA (Ruler, Alter-Ego, Avenger, Moon-Cancer, Foreigner, Pretender, Beast)';
    }
    document.getElementById('classTitle').innerHTML = `${classTitle}<br />`;
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
// }


// Leave only a single selected unit onscreen {
/**
 * Removes all units other than the selected one from the page.
 */
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
// }


// Display the collated banners corresponding to a single servant ID {
/**
 * Displays a table with the banners found in the Google spreadsheet for the selected unit.
 * @param {number} servantID - The internal game ID of the unit to isolate.
 */
function displayBanners(servantID) {
    const bannersArea = document.getElementById('banner-container');
    bannersArea.innerHTML = "";
    
    let bannersForUnit = bannerRelationships.filter(row => row[0] == servantID);
    bannersForUnit = bannersForUnit[0].filter(col => col !== null);
    
    if (bannersForUnit.length > 3) {
        document.getElementById('disclaimer').style.display = 'block';
        const bannersObject = {
            unitName: document.getElementById('svtName' + servantID).textContent,
            unitCategory: bannersForUnit[1],
            banners: []
        };
        for (let i = 3; i < bannersForUnit.length; i = i + 2) {
            const currentBanner = bannersDataTable.find(row => row[3] == bannersForUnit[i] );
            bannersObject.banners.push({ 
                 bannerID: bannersForUnit[i]
                ,bannerName: '<a target="_blank" href="' + currentBanner[4] + '">' + currentBanner[0] + '</a>'
                ,bannerStartDate: currentBanner[1]
                ,bannerEndDate: currentBanner[2]
                ,soloBanner: bannersForUnit[i + 1] == "Yes" ?
                    "<span class='b'>" + bannersForUnit[i + 1] + "</span>" :
                    "<span class='i'>No, shared</span>"
                ,isNAConfirmed: bannersForUnit[i].toString().includes('.') ? 
                    "<span class='b'>Yes! <img class='yesno' src='./img/yes.png' /></span>" :
                    "<span class='i'>No <img class='yesno' src='./img/no.png' /></span>"
            });
        }
        let unitCat = "";
        switch (bannersObject.unitCategory.toString()) {
            case "Limited":
                unitCat = "<span class='b'>Limited</span>";
                break;
            case "FP Limited":
                unitCat = "<span class='i'>Limited Friend Point</span>";
                break;
            case "Perma":
                unitCat = "Permanent";
                break;
            case "Story":
                unitCat = "<span class='u'>Storylocked</span>";
                break;
        }
        const br = document.createElement('br');
        const titleText = document.createElement('h2');
        titleText.innerHTML = "Currently active and projected future banners for [" + bannersObject.unitName + "], who is a " + unitCat + " Unit:";
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
            tdName.innerHTML = item.bannerName;
            const tdStart = document.createElement('td');
            tdStart.textContent = item.bannerStartDate;
            const tdEnd = document.createElement('td');
            tdEnd.textContent = item.bannerEndDate;
            const tdSolo = document.createElement('td');
            tdSolo.innerHTML = item.soloBanner;
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
// }
// }
