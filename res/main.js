//#region GLOBALS & INIT 

/***********************/
/* GLOBAL DECLARATIONS */
/***********************/
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initialize);
/**
 * Global properties storing critical read-only data for the application.
 * Initially declared as writable, then made read-only as soon as values
 * are injected into them.
 * @property {Array} servantData - Stores all Servant data
 * @property {Array} bannersDataTable - Stores banner data
 * @property {Object} bannerRelationships - Servant/banner correlations
 * @property {number} globalThreshold - Threshold for NA Servant IDs
 */
Object.defineProperty(window, 'servantData',
    { value: undefined, writable: true, configurable: true });
Object.defineProperty(window, 'bannersDataTable',
    { value: undefined, writable: true, configurable: true });
Object.defineProperty(window, 'bannerRelationships',
    { value: undefined, writable: true, configurable: true });
Object.defineProperty(window, 'globalThreshold',
    { value: undefined, writable: true, configurable: true });
const spreadsheetLink = 'https://docs.google.com/spreadsheets/d/' +
    '1rKtRX3WK9ZpbEHhDTy7yGSxYWIav1Hr_KhNM0jWN2wc/gviz/tq';
const atlasLink = 'https://apps.atlasacademy.io/db/REGION/servant/';
const classNumbers = new Map([ ["Saber", 1], ["Archer", 2], ["Lancer", 3],
        ["Rider", 4], ["Caster", 5], ["Assassin", 6], ["Berserker", 7],
        ["Ruler", 9], ["Alter-Ego", 10], ["Avenger", 11], ["Moon-Cancer", 23],
        ["Foreigner", 25], ["Pretender", 28], ["Beast", 33] ]);


/***********************/
/* PAGE INITIALIZATION */
/***********************/
/**
 * Initializes all required elements by calling all necessary functions when 
 * the DOM is finished loading.
 */
function initialize() {
    try {
        Promise.all([fetchLastUpdate(), // get last update timestamp
            fetchGlobalThreshold(), // get threshold value for NA Servants
            fetchBannerDatesAndLinks(), // get raw banner data
            fetchBannerCorrelations()]) // get collated data to keep in memory
            .then(() => {
                addListeners();
                if (servantData == undefined) { fetchServantsAndCategories(); }
            }).catch((error) => {
                console.error("Data fetch error: ", error);
                let errorMessage = "There has been an error fetching " +
                    "spreadsheet data or Servant portraits:<br>" +
                    error.toString();
                killPageWithErrorMessage(errorMessage);
            });
    } catch (error) {
        document.getElementById('loader').style.visibility = 'hidden';
        let errorMessage = "There has been an error loading the Google " +
            "Charts API, and as such, the spreadsheet data cannot be loaded." +
            "<br><br>I apologize for the inconvenience, but usually these " +
            "errors tend to occur on Google's side, so correcting the " +
            "problem is entirely out of my hands.<br><br>Please try again " +
            "later.<br><br>The received error message was:" + error.toString();
            killPageWithErrorMessage(errorMessage);
    }
}


/*******************/
/* EVENT LISTENERS */
/*******************/
/**
 * Adds all event listeners to the DOM elements that require them.
 */
function addListeners() {
    ['Saber', 'Lancer', 'Archer', 'Rider', 'Caster', 'Assassin',
        'Berserker', 'EXTRAI', 'EXTRAII'].forEach(cls => {
        document.getElementById(`fetch${cls}`)
            .addEventListener('click', (e) => { 
                e.stopPropagation(); // Prevent event bubbling
                fetchAllServantsInClass(cls);
            });
    });
    document.getElementById('footerToggle').addEventListener('click', () => {
        document.getElementById('footer').classList.toggle('open');
    });
}
//#endregion


//#region HELPERS

/****************/
/* PAGE CLEANUP */
/****************/
/**
 * Shows an error message to the user when something goes wrong.
 * @param {string} errorContents The message to display in the page body.
 */
function killPageWithErrorMessage(errorContents) {
    document.getElementById('loader').style.visibility = 'hidden';
    document.getElementById("pageContainer")
        .innerHTML(`<h3>${errorContents}</h3>`);
}

/**
 * Resets all UI elements to their default state. Required when selecting a
 * class.
 */
function resetUIComponents() {
    document.getElementById('servant-container').innerHTML = '&nbsp;';
    document.getElementById('banner-container').innerHTML = '&nbsp;';
    document.getElementById('classTitle').innerHTML = '&nbsp;';
    document.getElementById('classTitle').style.display = 'block';
    document.getElementById('disclaimer').style.display = 'none';
    [...document.getElementsByClassName('svtButton')].forEach(elem => {
        elem.classList.remove("svtButtonSelected");
    });
}


/**********************************/
/* SPECIFIC COLUMN DATA RETRIEVAL */
/**********************************/
/**
 * Filters the information from the provided dataTable object to return only
 * the information in the specified column indices.
 * @param {Object} dataTable - The dataTable to extract the information from.
 * @param {number[]} columnIndices - The columns to include in the final data.
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
//#endregion


//#region DATA FETCH

/****************************/
/* FETCH LAST NA SERVANT ID */
/****************************/
/**
 * Uses the Atlas Academy API to get the internal game ID of the latest Servant
 * released, in the global/EN server, in order to know when to construct NA/EN
 * links to the the Atlas Academy Database Servant pages.
 * @returns {Promise<void>} A promise that resolves when the fetch is complete.
 */
async function fetchGlobalThreshold() {
    try {
        const NAreleases = // get all NA indexes
            (await fetch
                ("https://api.atlasacademy.io/export/NA/basic_servant.json")
            .then(r => r.json()))
            .map(s => s.collectionNo);
        const th = NAreleases[NAreleases.length - 1]; // last valid NA index
        Object.defineProperty(window, 'globalThreshold', {
            value: th,
            writable: false,
            configurable: false
        });
    } catch (error) {
        Object.defineProperty(window, 'globalThreshold', {
            value: 0,
            writable: false,
            configurable: false
        });
        console.error('Error fetching global NA threshold from Atlas, will ' +
            'only display JP Atlas links!');
        alert('Error fetching global NA threshold from Atlas, will only ' +
            'display JP Atlas links!');
    }
}

/*******************************************/
/* FETCH LAST SPREADSHEET UPDATE TIMESTAMP */
/*******************************************/
/**
 * Gets the recorded timestamp at which the spreadsheet was last updated.
 */
function fetchLastUpdate() {
    try {
        const query = new google.visualization.
            Query(spreadsheetLink.replace("gviz/tq", "edit?range=A7"));
        query.send(response => {
            const dataTable = response.getDataTable();
            document.getElementById("lastupdate").innerHTML =
                dataTable.getValue(0, 0);
        });
    } catch { document.getElementById("lastupdate").innerHTML = "[Error]"; }
}


/****************************/
/* FETCH FULL SERVANTS LIST */
/****************************/
/**
 * Fetches all the currently released Servants (including JP-only Servants)
 * from the Google spreadsheet, along with their corresponding categories
 * (permanent, limited, welfare, et al).
 */
function fetchServantsAndCategories() {
    const query = new google.visualization.
        Query(`${spreadsheetLink}?sheet=Servants`);
    query.send(servantResponse => {
        const servantData = 
            filterDataTable(
                servantResponse.getDataTable(),
                [0, 1, 4, 3]  // Servant ID, EN name, Atlas image, class code           
            ).map(servant => {
                const img = new Image();
                img.src = servant[2].replace(".png", "_bordered.png");
                return {
                    id: servant[0],
                    name: servant[1].
                        replace("Altria", "Artoria"),  // can't change my mind
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
            const filteredSvtData = 
                servantData.slice(1).filter(row => !unwantedIds.has(row.id));
            const imgPromises = filteredSvtData.map(s => {
                return new Promise(resolve => {
                    const img = s.imageObject;
                    s.imageObject.onload = resolve;
                    s.imageObject.onerror = resolve;    // resolve even on fail
                    img.src = img.src;  // src reload to force fire "on" events
                });
            });
            Promise.all(imgPromises).finally(() => {  // preload images...
                fetchAllServantsInClass('Saber');  // then default load Sabers
                document.getElementById("loader").style.visibility = "hidden";
            });
            Object.defineProperty(window, 'servantData', {
                value: filteredSvtData, writable: false, configurable: false
            });
        });
    });
}

/***************************/
/* FETCH FULL BANNERS LIST */
/***************************/
/**
 * Fetches dates and link data for all banners from the Google spreadsheet.
 */
function fetchBannerDatesAndLinks() {
    const bannerQuery = new google.visualization.
        Query(`${spreadsheetLink}?sheet=Data`);
    bannerQuery.send(function(response) {
        if (response.isError()) {
            console.error('Error fetching banners data: ',
                response.getMessage());
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


/**********************************/
/* CORRELATE BANNERS AND SERVANTS */
/**********************************/
/**
 * Gets the correlations between the fetched banners and the Servants in each.
 */
function fetchBannerCorrelations() {
    return new Promise((resolve, reject) => {
        try {
            const query = new google.visualization.Query
                (`${spreadsheetLink}?sheet=Data2`);
            query.send(function(response) {
                if (response.isError()) {
                    return reject(new Error('Error fetching banner ' +
                        'correlations: ' + response.getMessage()));
                }
                const dataTable = response.getDataTable();
                if (!dataTable) {
                    return reject(new Error('Invalid dataTable for ' +
                        'banner correlations'));
                }
                const cols = [];
                for (let i = 0; i < dataTable.getNumberOfColumns(); i++) {
                    cols.push(i);
                }
                Object.defineProperty(window, 'bannerRelationships', {
                    value: filterDataTable(dataTable, cols),
                    writable: false,
                    configurable: false
                });
                resolve();
            });
        } catch (error) {
            reject(error);  // Catch any synchronous errors
        }
    });
}


/***************************************/
/* LOAD ALL SERVANTS IN SELECTED CLASS */
/***************************************/
/**
 * Fetches all the Servants in a given class.
 * @param {string} className - The name of the class. If 'EXTRAI' is provided,
 *                 displays Ruler, Avenger and Moon-Cancer. If 'EXTRAII' is
 *                 provided, displays Alter-Ego, Foreigner, Pretender,
 *                 Beast.
 */
function fetchAllServantsInClass(className) {
    let classData = null;
    switch(className)
    {
        case "EXTRAI":
            classData = servantData
            .filter(servant => 
                [classNumbers.get('Ruler'), classNumbers.get('Avenger'),
                    classNumbers.get('Moon-Cancer')]
                .includes(servant.sClass));
            break;
        case "EXTRAII":
            classData = servantData
            .filter(servant => 
                [classNumbers.get('Alter-Ego'), classNumbers.get('Foreigner'),
                    classNumbers.get('Pretender'), classNumbers.get('Beast')]
                .includes(servant.sClass));
            break;
        default:
            classData = servantData
                .filter(servant => 
                    servant.sClass === classNumbers.get(className));
            break;
    }
    displayClassServants(classData, className);
}
//#endregion



//#region DISPLAY FUNCTIONS

/********************************************/
/* DISPLAY ALL SERVANTS FROM SELECTED CLASS */
/********************************************/
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
    resetUIComponents();
    document.getElementById('selector').style.visibility = 'visible';
    document.getElementById('fetch' + className).classList.
        add('svtButtonSelected');
    document.getElementById('dynamic-contents').style.display = "block";
    const container = document.getElementById('servant-container');
    container.innerHTML = '';
    const classTitleMap = {
        'EXTRAI': 'EXTRA I (Ruler, Avenger, Moon-Cancer)',
        'EXTRAII': 'EXTRA II (Alter-Ego, Foreigner, Pretender, Beast)'
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


/**************************/
/* DISPLAY SINGLE SERVANT */
/**************************/
/**
 * Removes all Servants other than the selected one from the viewing area.
 */
function displaySingleServantByID(id) {
    document.getElementById('selector').style.visibility = 'hidden';
    const servantContainer = document.
        querySelector(`[aria-servantId="${id}"]`);
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
    servantContainer.insertBefore(atlasLinks,
        servantContainer.querySelector('span'));
    const itemContainer = document.querySelector(`[class='item']`);
    if (itemContainer.clickHandler) {
        itemContainer.removeEventListener('click', itemContainer.clickHandler);
        delete itemContainer.clickHandler;
    }
    if (document.getElementById('disclaimer').style.display != 'block')
    { displayBannersForServant(id); }
}


/***************************************************************/
/* DISPLAY COLLATED BANNERS CORRESPONDING TO SINGLE SERVANT ID */
/***************************************************************/
/**
 * Displays a table with the banners found in the Google spreadsheet for the
 * selected Servant.
 * @param {number} servantID - The internal game ID of the Servant to isolate.
 */
function displayBannersForServant(servantID) {
    window.scrollTo(0, 0);
    [...document.getElementsByClassName('svtName')]
        .forEach(name => name.remove());
    const bannersArea = document.getElementById('banner-container');
    bannersArea.innerHTML = "";
    let bannersForUnit = bannerRelationships.find(row => row[0] == servantID);
    if (bannersForUnit === undefined) {
        const svtName = servantData.find(svt => svt.id === servantID).name;
        const msg = document.createElement('h1');
        msg.setAttribute('class', 'bannerstext');
        msg.innerHTML =
            "[" + svtName + "],<br>at the time of the last spreadsheet " +
            "update,<br>is/was an extremely new Servant and hasn't had<br>" +
            "banners logged yet.";
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
                "<img class='yn' src='./img/y.png' />" :
                "<img class='yn' src='./img/n.png' />",
            isNAConfirmed: bannersForUnit[i].toString().includes('.') ? 
                "<img class='yn' src='./img/y.png' />" :
                "<img class='yn' src='./img/n.png' />"
        });
    }
    const unitCategories = {
        "Limited": "<span class='summon " +
            "limited'>&nbsp;Limited&nbsp;</span>",
        "FP Limited": "<span class='summon " +
            "fp'>&nbsp;Limited Friend Point&nbsp;</span>",
        "Perma": "<span class='summon " +
            "permanent'>&nbsp;Permanent&nbsp;</span>",
        "Story": "<span class='summon " +
            "storylocked'>&nbsp;Storylocked&nbsp;</span>"
    };
    const classTitle = document.createElement('h2');
    classTitle.setAttribute('class', 'bannerstext');
    classTitle.innerHTML = `Recent/current/projected ` +
        ` banners for <br>${unitCategories[bannersObject.unitCategory]}` +
        ` Servant [${bannersObject.unitName}]:`;
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
//#endregion