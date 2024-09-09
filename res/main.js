// GLOBALS & INIT {
// Global declarations {
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initialize);
Object.defineProperty(window,
    'servantData', { value: undefined, writable: true, configurable: true });
Object.defineProperty(window,
    'bannersDataTable', { value: undefined, writable: true, configurable: true });
Object.defineProperty(window,
    'bannerRelationships', { value: undefined, writable: true, configurable: true });
Object.defineProperty(window,
    'globalThreshold', { value: undefined, writable: true, configurable: true });
const spreadsheetLink = 'https://docs.google.com/spreadsheets/d/' +
    '1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc/gviz/tq';
const atlasLink = 'https://apps.atlasacademy.io/db/REGION/servant/';
const classNumbers = new Map([ ["Saber", 1], ["Archer", 2], ["Lancer", 3],
        ["Rider", 4], ["Caster", 5], ["Assassin", 6], ["Berserker", 7],
        ["Ruler", 9], ["Alter-Ego", 10], ["Avenger", 11], ["Moon-Cancer", 23],
        ["Foreigner", 25], ["Pretender", 28], ["Beast", 33] ]);
// }


// Page initialization {
/**
 * Initializes all required elements by calling all necessary functions when 
 * the DOM is finished loading.
 */
function initialize() {
    Promise.all([fetchLastUpdate(), // gets last update timestamp
        fetchGlobalThreshold(), // get threshold value for NA Servants
        fetchBannerDatesAndLinks(), // gets raw banner data
        fetchBannerCorrelations()]) // get collated banner data to keep in memory
        .finally(() => {
            addListeners();
            if (servantData == undefined) { fetchServantsAndCategories(); }
        });
}
// }


// Event listeners {
/**
 * Adds all event listeners to the DOM elements that require them.
 */
function addListeners() {
    ['Saber', 'Lancer', 'Archer', 'Rider', 'Caster', 'Assassin',
        'Berserker', 'EXTRA'].forEach(cls => {
        document.getElementById(`fetch${cls}`)
            .addEventListener('click', () => fetchAllServantsInClass(cls));
    });
    document.getElementById('footerToggle').addEventListener('click', () => {
        document.getElementById('footer').classList.toggle('open');
    });
}
// }
// }


// HELPERS {
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
 * @param {number[]} columnIndices - The columns to include in the filtered data.
 * @returns {Array} The filtered data as a two-dimensional array.
 */
function filterDataTable(dataTable, columnIndices) {
    if (!dataTable) {
        console.error('Invalid dataTable passed to filterDataTable');
        alert('Invalid dataTable passed to filterDataTable');
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
// }


// DATA FETCH {
// Fetch last NA Servant ID {
/**
 * Uses the Atlas Academy API to get the internal game ID of the latest Servant
 * released, in the global/EN server, in order to know when to construct NA/EN
 * links to the the Atlas Academy Database Servant pages.
 * @returns {Promise<void>} A promise that resolves when the fetch is complete.
 */
async function fetchGlobalThreshold() {
    try {
        const threshold = 
            (await fetch("https://api.atlasacademy.io/export/NA/basic_servant.json")
            .then(r => r.json()))
            .map(s => s.collectionNo).at(-1);   // get last valid index
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
        console.error('Error fetching global NA threshold from Atlas, will only ' +
            'display JP links!');
        alert('Error fetching global NA threshold from Atlas, will only ' +
            'display JP links!');
    }
}
// }

// Fetches the last update timestamp {
/**
 * Gets the recorded timestamp at which the spreadsheet was last updated.
 */
function fetchLastUpdate() {
    const query = new google.visualization.
        Query(spreadsheetLink.replace("gviz/tq", "edit?range=A7"));
    query.send(response => {
        const dataTable = response.getDataTable();
        document.getElementById("lastupdate").innerHTML = dataTable.getValue(0, 0);
    });
}
// }


// Fetch full list of Servants {
/**
 * Fetches all the currently released Servants (including JP-only Servants) from
 * the Google spreadsheet, along with their corresponding categories (permanent,
 * limited, welfare, et al).
 */
function fetchServantsAndCategories() {
    const query = new google.visualization.
        Query(`${spreadsheetLink}?sheet=Servants`);
    query.send(servantResponse => {
        const servantData = 
            filterDataTable(
                servantResponse.getDataTable(),
                [0, 1, 4, 3]    // Servant ID, EN name, Atlas image, class code           
            ).map(servant => {
                const img = new Image();
                img.src = servant[2].replace(".png", "_bordered.png");
                return {
                    id: servant[0],
                    name: servant[1].
                        replace("Altria", "Artoria"), // you can't change my mind
                    sClass: servant[3],
                    imageObject: img
                };
            });
        const statusQuery = 
            new google.visualization.Query(`${spreadsheetLink}?sheet=Data2`);
        statusQuery.send(statusResponse => {
            const unwantedIds = new 
                Set([...filterDataTable(
                    statusResponse.getDataTable(),
                    [0, 1]      // Servant ID, category (perma, limited, etc.)
                ).filter(row => row[1] === 'FP' || row[1] === 'Welfare')
                .map(row => row[0]), 83, 152]);     // includes Solomon IDs
            const filteredServantData = 
                servantData.slice(1).filter(row => !unwantedIds.has(row.id));
            const imagePromises = filteredServantData.map(s => {
                return new Promise(resolve => {
                    const img = s.imageObject;
                    s.imageObject.onload = resolve;
                    s.imageObject.onerror = resolve;    // resolve even on failure
                    img.src = img.src;  // src reload to force fire onload/onerror
                });
            });
            Promise.all(imagePromises).finally(() => {  // after all imgs preload...
                fetchAllServantsInClass('Saber');       // ...load Sabers by default
            });
            Object.defineProperty(window, 'servantData', {
                value: filteredServantData,
                writable: false,
                configurable: false
            });
        });
    });
}
// }


// Get the full list of banners {
/**
 * Fetches dates and link data for all banners from the Google spreadsheet.
 */
function fetchBannerDatesAndLinks() {
    const bannerQuery = new google.visualization.
        Query(`${spreadsheetLink}?sheet=Data`);
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching banners data: ', response.getMessage());
            alert('Error fetching banners data: ' + response.getMessage());
            return;
        }
        const dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for banners list');
            alert('Invalid dataTable object for banners list');
            return;
        }
        Object.defineProperty(window, 'bannersDataTable', {
            value: filterDataTable(dataTable, [0, 1, 2, 4, 5]),
            writable: false,
            configurable: false
        });
    });
}
// }


// Get the correlations between banners and Servants {
/**
 * Gets the correlations between the fetched banners and the Servants in each.
 */
function fetchBannerCorrelations() {
    const bannerQuery = new google.visualization.
        Query(`${spreadsheetLink}?sheet=Data2`);
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching banner correlation data: ',
                response.getMessage());
            alert('Error fetching banner correlation data: ',
                response.getMessage());
            return;
        }
        const dataTable = response.getDataTable();
        if (!dataTable) {
            console.error('Invalid dataTable object for banner correlations');
            alert('Invalid dataTable object for banner correlations');
            return;
        }
        const cols = [];
        for (let i = 0; i < dataTable.getNumberOfColumns(); i++)
        { cols.push(i); }
        Object.defineProperty(window, 'bannerRelationships', {
            value: filterDataTable(dataTable, cols),
            writable: false,
            configurable: false
        });
    });
}
// }


// Load all Servants in the selected class {
/**
 * Fetches all the Servants in a given class.
 * @param {string} className - The name of the class. If 'EXTRA' is provided,
 *                 displays all Extra-class Servants in this order: Ruler,
 *                 Alter-Ego, Avenger, Moon-Cancer, Foreigner, Pretender,
 *                 Beast.
 */
function fetchAllServantsInClass(className) {
    const classQuery = new google.visualization.
        Query(`${spreadsheetLink}?sheet=${className}`);
    classQuery.send(function (response) {
        let classData, selectedClassName = className;
        if (response.isError()) {
            console
                .error('Error fetching class data: ', response.getMessage());
            alert('Error fetching class data: ', response.getMessage());
            return;
        }
        const dataTable = response.getDataTable();
        if (!dataTable) {
            console
                .error('Invalid dataTable object for class', selectedClassName);
            alert('Invalid dataTable object for class', selectedClassName);
            return;
        }
        if (servantData === null) {
            console.error('Error loading Servant list');
            alert('Error loading Servant list');
            return;
        }
        if (selectedClassName == "EXTRA") {
            classData = servantData
                .filter(servant => servant.sClass > 8)
                .sort((a, b) => a.sClass - b.sClass);
        } else {
            const classNumber = classNumbers.get(selectedClassName);            
            classData = servantData
                .filter(servant => servant.sClass === classNumber);
        }
        displayClassServants(classData, selectedClassName);
    });
}
// }
// }


// DISPLAY FUNCTIONS {
// Display all Servants from the selected class {
/**
 * Displays all the Servants in the selected class. If 'EXTRA' is selected,
 * displays all Extra-class Servants (Ruler, Alter-Ego, Avenger, Moon-Cancer,
 * Foreigner, Pretender, Beast).
 * @param {Array} processedData - The collection of Servants to display.
 * @param {string} className - The name of the class to display. If 'EXTRA' is
 *                 provided, displays 'EXTRA' followed by the names of all the
 *                 subclasses grouped under Extra.
 */
function displayClassServants(processedData, className) {
    resetAll();
    document.getElementById('selector').style.visibility = 'visible';
    document.getElementById('fetch' + className).classList.add('svtButtonSelected');
    document.getElementById('dynamic-contents').style.display = "block";
    const container = document.getElementById('servant-container');
    container.innerHTML = '';
    const classTitleMap = {
        'EXTRA': 'EXTRA (Ruler, Alter-Ego, Avenger, Moon-Cancer, Foreigner, ' +
        'Pretender, Beast)'
    };
    document.getElementById('classTitle').innerHTML = 
        `${classTitleMap[className] || className}<br>`;
    processedData.forEach(row => {
        let servant = servantData.find(svt => svt.id === row.id);
        const servantContainer = document.createElement('div');
        servantContainer.addEventListener
            ('click', () => displaySingleServantByID(servant.id));
        servantContainer.classList.add('item');
        servantContainer.setAttribute('aria-servantId', servant.id);
        const servantImg = servant.imageObject.cloneNode();
        servantImg.classList.add('svtImg');
        const servantName = document.createElement('div');
        servantName.setAttribute('class', 'svtName');
        servantName.id = 'svtName' + servant.id;
        servantName.innerHTML = servant.name;
        servantContainer.append(servantImg, servantName);
        container.appendChild(servantContainer);
    });
    document.getElementById('loader').style.visibility = 'hidden';
}
// }


// Leave only a single selected Servant onscreen {
/**
 * Removes all Servants other than the selected one from the viewing area.
 */
function displaySingleServantByID(id) {
    document.getElementById('selector').style.visibility = 'hidden';
    const servantContainer = document.querySelector(`[aria-servantId="${id}"]`);
    const servantImg = servantContainer.querySelector('img');
    servantImg.style.marginTop = '15px';
    const container = document.getElementById('servant-container');
    [...container.children].forEach(child => {
        if (child.getAttribute('aria-servantId') != id) {
            child.remove();
        }
    });
    let atlasLinks = document.querySelectorAll(`[class='atlas']`);
    atlasLinks.forEach(atlasItem => { atlasItem.remove(); });
    document.getElementById('classTitle').style.display = 'none';
    atlasLinks = document.createElement('div');
    atlasLinks.classList.add('atlas');
    const createLink = (region) => {
        const link = document.createElement('a');
        link.href = atlasLink.replace('REGION', region) + id;
        link.target = '_blank';
        link.textContent = `Atlas (${region})`;
        return link;
    };
    atlasLinks.appendChild(createLink('JP'));
    if (id <= globalThreshold) {
        atlasLinks.append(document.createElement('br'), createLink('NA'));
    }
    servantContainer.insertBefore(atlasLinks, servantContainer.querySelector('span'));
    const itemContainer = document.querySelector(`[class='item']`);
    if (itemContainer.clickHandler) {
        itemContainer.removeEventListener('click', itemContainer.clickHandler);
        delete itemContainer.clickHandler;
    }
    if (document.getElementById('disclaimer').style.display != 'block')
    { displayBannersForServant(id); }
}
// }


// Display the collated banners corresponding to a single Servant ID {
/**
 * Displays a table with the banners found in the Google spreadsheet for the selected
 * Servant.
 * @param {number} servantID - The internal game ID of the Servant to isolate.
 */
function displayBannersForServant(servantID) {
    window.scrollTo(0, 0);
    [...document.getElementsByClassName('svtName')].forEach(name => name.remove());
    const bannersArea = document.getElementById('banner-container');
    bannersArea.innerHTML = "";
    let bannersForUnit = bannerRelationships.find(row => row[0] == servantID);
    if (bannersForUnit === undefined) {
        const svtName = servantData.find(svt => svt.id === servantID).name;
        const msg = document.createElement('h1');
        msg.setAttribute('class', 'bannerstext');
        msg.innerHTML =
            "[" + svtName + "]<br>is an extremely new Servant at this time " +
            "and<br>hasn't had banners logged in the spreadsheet yet.";
        bannersArea.appendChild(msg);
        return;
    }
    bannersForUnit = bannersForUnit.filter(col => col !== null);
    if (bannersForUnit.length <= 3) {
        const svtName = servantData.find(svt => svt.id === servantID).name;
        const msg = document.createElement('h1');
        msg.setAttribute('class', 'bannerstext');
        msg.innerHTML =
            "There are no projected banners for Servant<br>[" + svtName + 
            "]<br> for EN in the foreseeable future.";
        bannersArea.appendChild(msg);
        return;
    }
    document.getElementById('disclaimer').style.display = 'block';
    const bannersObject = {
        unitName: servantData.find(svt => svt.id === servantID).name,
        unitCategory: bannersForUnit[1],
        banners: []
    };
    for (let i = 3; i < bannersForUnit.length; i += 2) {
        let currentBanner = bannersDataTable.
            find(row => row[3] == bannersForUnit[i]);
        if (currentBanner[4] === null || currentBanner[4] == "")
        { currentBanner[4] = "#"; }
        bannersObject.banners.push({
            bannerID: bannersForUnit[i],
            bannerName:
                `<a target="_blank" ` +
                `href="${currentBanner[4]}">${currentBanner[0]}</a>`,
            bannerStartDate: currentBanner[1],
            bannerEndDate: currentBanner[2],
            soloBanner: bannersForUnit[i + 1] === "Yes" ?
                "<span class='b'>Yes</span>" : "<span class='i'>No, shared</span>",
            isNAConfirmed: bannersForUnit[i].toString().includes('.') ? 
                "<span class='b'>Yes! <img class='yn' src='./img/y.png' /></span>" :
                "<span class='i'>No <img class='yn' src='./img/n.png' /></span>"
        });
    }
    const unitCategories = {
        "Limited": "<span class='summon limited'>&nbsp;Limited&nbsp;</span>",
        "FP Limited": "<span class='summon fp'>&nbsp;Limited Friend Point&nbsp;</span>",
        "Perma": "<span class='summon permanent'>&nbsp;Permanent&nbsp;</span>",
        "Story": "<span class='summon storylocked'>&nbsp;Storylocked&nbsp;</span>"
    };
    const classTitle = document.createElement('h2');
    classTitle.setAttribute('class', 'bannerstext');
    classTitle.innerHTML = `Recent/current/projected ` +
        ` banners for <br>${unitCategories[bannersObject.unitCategory]} Servant ` +
        ` [${bannersObject.unitName}]:`;
    bannersArea.appendChild(classTitle);
    const tbl = document.createElement('table');
    const thead = tbl.createTHead();
    const headRow = thead.insertRow();
    ['Banner Name', 'Banner Start Date', 'Banner End Date', 'Solo Banner?',
        'Dates confirmed for Global?'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headRow.appendChild(th);
    });
    const tbody = document.createElement('tbody');
    bannersObject.banners.forEach(item => {
        const row = tbody.insertRow();
        row.classList.add('small');
        ['bannerName', 'bannerStartDate', 'bannerEndDate', 'soloBanner',
            'isNAConfirmed'].forEach(field => {
            const cell = row.insertCell();
            cell.innerHTML = item[field];
        });
    });
    tbl.appendChild(tbody);
    bannersArea.appendChild(tbl);
}
// }
// }