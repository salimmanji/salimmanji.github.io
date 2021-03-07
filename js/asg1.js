/*
* COMP3512 Assignment 1
* Salim Manji
*/

var map;
function initMap() {
}

document.addEventListener("DOMContentLoaded", function () {
    const elementMaker = element => document.createElement(`${element}`);
    const $ = element => document.querySelector(`${element}`);
    const $$ = element => document.querySelectorAll(`${element}`);
    let currentStock;

    const companiesAPI = 'https://www.randyconnolly.com/funwebdev/3rd/api/stocks/companies.php';
    const stockAPI = 'https://www.randyconnolly.com/funwebdev/3rd/api/stocks/history.php';
    let companies = [];
    let stocks = [];
    let filterableStockData;
    const searchBox = $('.search');
    const companyList = $('#companyList');
    const eBox = $("div.e section");
    const dBox = $("div.d section");

    $("#creditLabel").addEventListener("mouseover", () => {
        
            const referenceDetails = elementMaker("div");
            referenceDetails.innerHTML = `<strong>Author:</strong> Salim Manji <strong>References:</strong> <u>https://dyclassroom.com/chartjs/how-to-create-a-bar-graph-using-chartjs</u>, <u>https://www.chartjs.org/docs/latest/</u>, <u>https://developer.mozilla.org/en-US/</u> (numerous pages including speach synthesis, number formatting, scroll bar/overflow-y, array sorting, etc.), <u>https://www.w3schools.com/</u>(numerous pages including selectors, events, style properties, etc.)`
            $("#header").appendChild(referenceDetails);
            setTimeout(function() {
                referenceDetails.innerHTML = "";
        }, 5000)
    }, false);

    /*
    * The first fetch based on the user's selection of a company in the list of comanies. The fetched information is stored in the browser after being fetched once.
    * Once the data has been retrieved, the information boxes are created and populated.
    */
    if (localStorage.getItem("companies") === null) {
        fetch(companiesAPI)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error("Fetch failed");
                }
            })
            .then(data => {
                companies.push(...data);
                companylist(data)
                updateStorage(data);
            })
            .catch(error => console.error(error));
    } else {
        data = retrieveStorage();
        resetCompanyList(data);
    }

    /*
    * Event Listener for filtering the list of companies based on user's input.
    * Also, the event listener for clearing the filter on the list of companies.
    */
    searchBox.addEventListener('keyup', displayMatches);

    $('#clearButton').addEventListener('click', () => {
        $(`#companyList`).innerHTML = "";
        $(`.search`).value = "";
        data = retrieveStorage();
        resetCompanyList(data);
    });

    function retrieveStorage() {
        return JSON.parse(localStorage.getItem('companies'))
            || [];
    }

    function updateStorage(data) {
        localStorage.setItem('companies',
            JSON.stringify(data));
    }

    function resetCompanyList() {
        companies.push(...data);
        companylist(data);
    }

    function displayMatches() {
        if (this.value.length >= 2) {
            const matches = findMatches(this.value, companies);
            companyList.innerHTML = "";
            matches.forEach(company => {
                var li = elementMaker('li');
                li.textContent = `${company.name}`;
                li.addEventListener("click", (e) => {
                    $("div.a section").innerHTML = "";
                    const companyToPopulate = companies.find(c => c.name == e.target.textContent);
                    populateDivs(companyToPopulate);
                })
                companyList.appendChild(li);
            });
        }
    }

    function findMatches(wordToMatch, companies) {
        return companies.filter(obj => {
            const regex = new RegExp(wordToMatch, 'gi');
            return obj.name.match(regex);
        });
    }

    /*
    * Once the data has been received (or pulled from storage), populate each box for the default view.
    */
    function companylist(data) {
        $("div.b section").style.display = "block";
        data.sort((a, b) => {
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        });
        for (let c of data) {
            const li = elementMaker("li");
            li.textContent = c.name;
            companyList.appendChild(li);
        }
        $("#companyList").addEventListener("click", (e) => {
            if (e.target.nodeName == "LI") {
                $("div.a section").innerHTML = "";
                const companyToPopulate = companies.find(c => c.name == e.target.textContent);
                populateDivs(companyToPopulate);
            }
        });
    }

    /*
    * The two event listeners below provide visual feedback for the user that they can click on a company to see the relevant information.
    */
    $("#companyList").addEventListener("mouseover", (e) => {
        if (e.target.nodeName == "LI") {
            e.target.style.color = 'red';
        }
    });

    $("#companyList").addEventListener("mouseout", (e) => {
        if (e.target.nodeName == "LI") {
            e.target.style.color = 'black';
        }
    });

    /*
    * The functions below handles the population of data for a specific company.
    */
    function populateDivs(c) {
        buildCompanyDetails(c);
        populateMap(c);
        createMarker(map, c.latitude, c.longitude, c.name);
        populateStockData(c.symbol)
        currentStock = c;
    }

    /*
    * The second fetch to consume specific stock data for the user selected company
    */
    function populateStockData(s) {
        const specificData = `${stockAPI}?symbol=${s}`;
        fetch(specificData)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error("Fetch failed");
                }
            })
            .then(data => {
                stocks.splice(0, stocks.length);
                stocks.push(...data);
                stocks = stocks.sort((a, b) => {
                    return a.date < b.date ? -1 : 1;
                });
                buildStockData();
                determineStats();
            })
            .catch(error => console.error(error));
    }

    function buildStockData() {
        $("div.e section").style.display = "grid";
        eBox.innerHTML = "";
        dBox.innerHTML = "";
        createStockHeader();
        mountStockData();
    }

    function determineStats() {
        $("div.d section").style.display = "grid";
        createAverages();
        createMin();
        createMax();
    }

    function createMax() {
        const minheader = newHeaderElement("Max");
        dBox.appendChild(minheader);

        sortSmallest("open");
        let curr = open();
        dBox.appendChild(curr);

        sortSmallest("close");
        curr = close();
        dBox.appendChild(curr);

        sortSmallest("low");
        curr = low();
        dBox.appendChild(curr);

        sortSmallest("high");
        curr = high();
        dBox.appendChild(curr);

        sortSmallest("volume");
        curr = vol();
        dBox.appendChild(curr);
    }

    /*
    * Sort functions
    */
    function sortLargest(prop) {
        filterableStockData = stocks.sort((a, b) => {
            return a[prop] - b[prop];
        });
    }

    function sortSmallest(prop) {
        filterableStockData = stocks.sort((a, b) => {
            return b[prop] - a[prop];
        });
    }

    /*
    * This function creates headers for the Stock Data table. 
    */
    function createMin() {
        const minheader = newHeaderElement("Min");
        dBox.appendChild(minheader);

        sortLargest("open");
        let curr = open();
        dBox.appendChild(curr);

        sortLargest("close");
        curr = close();
        dBox.appendChild(curr);

        sortLargest("low");
        curr = low();
        dBox.appendChild(curr);

        sortLargest("high");
        curr = high();
        dBox.appendChild(curr);

        sortLargest("volume")
        curr = vol();
        dBox.appendChild(curr);
    }

    function vol() {
        const vol = newvolmaker(filterableStockData[0].volume);
        return vol;
    }

    function high() {
        const high = newh4maker(filterableStockData[0].high);
        return high;
    }

    function low() {
        const low = newh4maker(filterableStockData[0].low);
        return low;
    }

    function close() {
        const close = newh4maker(filterableStockData[0].close);
        return close;
    }

    function open() {
        const open = newh4maker(filterableStockData[0].open);
        return open;
    }

    /*
    * The following functions populate data for the Average, Minimum and Maximum values for each stock detail.
    */
    function createAverages() {
        const avgheader = newHeaderElement("Average");
        dBox.appendChild(avgheader);
        const avgopen = avgFinder("open");
        dBox.appendChild(avgopen);
        const avgclose = avgFinder("close");
        dBox.appendChild(avgclose);
        const avglow = avgFinder("low");
        dBox.appendChild(avglow);
        const avghigh = avgFinder("high");
        dBox.appendChild(avghigh);
        const avgvol = avgVol();
        dBox.appendChild(avgvol);
    }

    function avgVol() {
        let dataCount = 0;
        let average = 0;
        for (let s of stocks) {
            average += parseFloat(s.volume);
            dataCount++;
        }
        average /= dataCount;
        return newvolmaker(average)
    }

    function avgFinder(prop) {
        let dataCount = 0;
        let average = 0;
        for (let s of stocks) {
            average += parseFloat(s[prop]);
            dataCount++;
        }
        average /= dataCount;
        return newh4maker(average)
    }

    function mountStockData() {
        stocks.forEach(d => {
            const dataDate = newdatemaker(d.date);
            eBox.appendChild(dataDate);
            const dataOpen = newh4maker(d.open);
            eBox.appendChild(dataOpen);
            const dataClose = newh4maker(d.close);
            eBox.appendChild(dataClose);
            const dataLow = newh4maker(d.low);
            eBox.appendChild(dataLow);
            const dataHigh = newh4maker(d.high);
            eBox.appendChild(dataHigh);
            const dataVol = newvolmaker(d.volume);
            eBox.appendChild(dataVol);
        });
    }

    /*
    * Helper method provided from the labs to format currency values.
    */
    const currency = function (num) {
        return new Intl.NumberFormat('en-us', {
            style: 'currency',
            currency: 'USD'
        }).format(num);
    };

    /*
    * Similar to the above helper method, this method formats the stock volume fields with commas.
    */
    function newvolmaker(d) {
        const ele = elementMaker('h4');
        ele.textContent = new Intl.NumberFormat('en-us', {
            style: 'decimal',
            maximumFractionDigits: 0
        }).format(d);
        return ele;
    }

    /*
    * Helper method to create an H4 element for each value for the relevant stock data.
    */
    function newh4maker(d) {
        const ele = elementMaker('h4');
        ele.textContent = currency(d);
        return ele;
    }

    /*
    * Helper method to create a new Date element. 
    */
    function newdatemaker(d) {
        const ele = elementMaker('h4');
        ele.textContent = d;
        return ele;
    }

    /*
    * Function to create stock header, add relevant data and attach event listeners.
    */
    function createStockHeader() {
        if (!$(`#headerBox`)) {
            const headerBox = elementMaker("div");
            headerBox.setAttribute('id', 'headerBox')
            headerBox.addEventListener("mouseover", (e) => {
                if (e.target.nodeName == "H3") {
                    e.target.style.color = 'red';
                    e.target.style.cursor = "pointer";
                }
            })
            headerBox.addEventListener("mouseout", (e) => {
                if (e.target.nodeName == "H3") {
                    e.target.style.color = 'black';
                }
            });
            headerBox.addEventListener("click", (e) => {
                if (e.target.nodeName == "H3") {
                    const sortVal = e.target.textContent.toLowerCase();
                    if (e.target.textContent == "Date") {
                        stocks = stocks.sort((a, b) => {
                            return a[sortVal] < b[sortVal] ? -1 : 1;
                        });
                    } else {
                        stocks = stocks.sort((a, b) => {
                            return a[sortVal] - b[sortVal];
                        });
                    }
                    buildStockData();
                    determineStats();
                }
            });
            const stockHeader = elementMaker("h2");
            stockHeader.innerHTML = "<strong>Stock Data</strong>";
            stockHeader.setAttribute("id", "stockData");
            headerBox.appendChild(stockHeader);
            const stockButton = elementMaker("button");
            stockButton.setAttribute("id", "dataButton");
            stockButton.classList.add("buttons");
            stockButton.textContent = "View Charts";
            headerBox.appendChild(stockButton);
            const dateheader = newHeaderElement("Date");
            headerBox.appendChild(dateheader);
            const openheader = newHeaderElement("Open");
            headerBox.appendChild(openheader);
            const closeheader = newHeaderElement("Close");
            headerBox.appendChild(closeheader);
            const lowheader = newHeaderElement("Low");
            headerBox.appendChild(lowheader);
            const highheader = newHeaderElement("High");
            headerBox.appendChild(highheader);
            const volumeheader = newHeaderElement("Volume");
            headerBox.appendChild(volumeheader);
            $('div.e').insertBefore(headerBox, eBox);

            stockButton.addEventListener("click", () => {

                hideDefaultBoxes();
                populateInfoBox();
                populateFinancialData();
                //build chart boxes
            })
        }
    }

    /*
    * Helper method for the Chart View to display Financial Information and the company logo
    */
    function populateFinancialData() {
        const hBox = $("#boxH");
        const financialHeader = elementMaker("h2");
        financialHeader.innerHTML = "<strong>Financial Information:</strong>";
        financialHeader.setAttribute("id", "financeHeader");
        hBox.appendChild(financialHeader);
        const currLogo = logoMaker(currentStock);
        currLogo.setAttribute("id", "financeLogo");
        hBox.appendChild(currLogo);
        if (currentStock.financials == null) {
            const message = "Financial Data Currently Unavailable.";
            hBox.textContent = message;
            $("#boxF").textContent = message;
        } else {
            populateFinancials(hBox);
            const chartData = buildChartData();
            populateBarChart(chartData);
            lineDatesData = lineDates();
            lineCloses = lineDataClose();
            lineVols = lineDataVol();
            console.log(lineDatesData)
            console.log(lineCloses)
            console.log(lineVols)
            populateLineChart(lineDatesData, lineCloses, lineVols);
        }
    }

    /*
    * Helper method to create date information for the Line Graph. I struggled to incorporate the actual dates into the chart, as they were String elements.
    * Due to time constraints, I opted to instead label each date a number between 1 and 61.
    */
    function lineDates() {
        const currArray = [];
        for (let i = 0; i < stocks.length; i++) {
            currArray.push(Number(i));
        }
        return currArray;
    }

    /*
    * Helper method for the Line Graph. 
    */
    function lineDataClose() {
        const currArray = [];
        for (let s of stocks) {
            let output = Number(s.close);
            currArray.push(output);
        }
        return currArray;
    }

    /*
    * Helper method for volume line in Line Graph. Due to the size of the values, I opted to divide by 10,000 to allow for a common scale.
    */
    function lineDataVol() {
        const volArray = [];
        stocks.forEach(d => volArray.push(d.volume / 10000));
        return volArray;
    }

    /*
    * Populates information into an array for the Bar Chart
    */
    function buildChartData() {

        const dataArray = [];
        for (let i = 0; i < 3; i++) {
            const annualArray = [];
            annualArray.push(currentStock.financials.revenue[i]);
            annualArray.push(currentStock.financials.earnings[i]);
            annualArray.push(currentStock.financials.assets[i]);
            annualArray.push(currentStock.financials.liabilities[i]);
            dataArray.unshift(annualArray);
        }
        return dataArray;
    }

    /*
    * Helper method to create the first Row of the Financial Information section of the Chart View.
    */
    function createFirstRow(h) {
        const years = financeHeaders("Year:");
        h.appendChild(years);
        currentStock.financials.years.forEach(y => {
            const ele = elementMaker("h3");
            ele.classList.add("headers")
            ele.textContent = y;
            h.appendChild(ele);
        })
    }

    /*
    * Helper method used to create headers for "Revenue", "Earnings", "Assets" and "Liabilities"
    */
    function financeHeaders(text) {
        const ele = elementMaker("h3");
        ele.classList.add("headers")
        ele.textContent = text;
        return ele;
    }

    /*
    * The following function populates the relevant financial statistics for each year for the user selected company.
    */
    function createAdditionalRows(h) {
        const rev = financeHeaders("Revenue");
        h.appendChild(rev);
        currentStock.financials.revenue.forEach(y => {
            const ele = newh4maker();
            ele.textContent = currency(y);
            h.appendChild(ele);
        })
        const earn = financeHeaders("Earnings");
        h.appendChild(earn);
        currentStock.financials.earnings.forEach(y => {
            const ele = newh4maker();
            ele.textContent = currency(y);
            h.appendChild(ele);
        })
        const assets = financeHeaders("Assets");
        h.appendChild(assets);
        currentStock.financials.assets.forEach(y => {
            const ele = newh4maker();
            ele.textContent = currency(y);
            h.appendChild(ele);
        })
        const liab = financeHeaders("Liabilities");
        h.appendChild(liab);
        currentStock.financials.liabilities.forEach(y => {
            const ele = newh4maker();
            ele.textContent = currency(y);
            h.appendChild(ele);
        })
    }

    function populateFinancials(h) {
        createFirstRow(h);
        createAdditionalRows(h);
    }

    /*
    * Function that creates the Company Info pane in the Chart View. Included here is the speach synthesis button and the close button to return to the default view.
    */
    function populateInfoBox() {
        const gBox = $("#boxG");
        const cNameSymbol = elementMaker("span");
        cNameSymbol.setAttribute("id", "chartName");
        cNameSymbol.innerHTML = `${currentStock.name} (${currentStock.symbol})`
        gBox.appendChild(cNameSymbol);
        const cDescription = elementMaker("p");
        cDescription.setAttribute("id", "chartDesc");
        cDescription.textContent = currentStock.description;
        gBox.appendChild(cDescription);
        const speakButton = elementMaker("button");
        speakButton.setAttribute("id", "speakButton");
        speakButton.classList.add("buttons")
        speakButton.textContent = "Read Description";
        gBox.appendChild(speakButton);
        speakButton.addEventListener('click',
            () => {
                const utterance = new SpeechSynthesisUtterance
                    (currentStock.description);
                speechSynthesis.speak(utterance);
            });
        const defaultButton = elementMaker("button");
        defaultButton.setAttribute("id", "defaultButton");
        defaultButton.textContent = "Close";
        defaultButton.classList.add("buttons")
        gBox.appendChild(defaultButton);
        defaultButton.addEventListener("click", () => {
            hideChartView();
            rebuildCharts();
        })
    }

    /*
    * After switching to the default view, this method allows for the charts to be rebuilt.
    */
    function rebuildCharts() {
        const fBox = $("#boxF");
        chartMaker(fBox, "barGraph");
        chartMaker(fBox, "candle");
        chartMaker(fBox, "line");
    }

    /*
    * Helper method to rebuild each chart type
    */
    function chartMaker(parentNode, id) {

        const div1 = elementMaker("div");
        const canvas1 = elementMaker("canvas");
        canvas1.setAttribute("id", id);
        canvas1.classList.add("chartView");
        div1.appendChild(canvas1);
        parentNode.appendChild(div1);
    }

    /*
    * Function to hide the charts (switch to default view).
    */
    function hideChartView() {
        const chartBoxes = $$(".chartView");
        chartBoxes.forEach(b => b.innerHTML = "");
        chartBoxes.forEach(b => b.style.display = "none");
        const defaultBoxes = $$(".defaultView");
        defaultBoxes.forEach(b => b.style.display = "block");
    }

    /*
    * Function to hide the default view (switch to chart view).
    */
    function hideDefaultBoxes() {
        const defaultBoxes = $$(".defaultView");
        defaultBoxes.forEach(b => b.style.display = "none");
        const chartBoxes = $$(".chartView");
        chartBoxes.forEach(b => b.style.display = "grid");
        $("#boxF").style.display = "grid";
    }

    /*
    * Helper method to create an H3 element
    */
    function newHeaderElement(name) {
        const ele = elementMaker(`h3`);
        ele.setAttribute('font-weight', 'bold');
        ele.setAttribute('id', `${name}header`);
        ele.textContent = `${name}`;
        return ele;
    }

    /*
    * Helper method to populate the aBox.
    */
    function buildCompanyDetails(c) {
        const aBox = $("div.a section");
        const label = logoMaker(c);
        aBox.appendChild(label);
        aBox.appendChild(nameMaker(c));
        aBox.appendChild(webMaker(c));
        aBox.appendChild(addMaker(c));
        aBox.appendChild(sectorMaker(c));
        aBox.appendChild(descMaker(c));
    }

    /*
    * Helper method to create the company Logo. 
    */
    function logoMaker(c) {
        const label = elementMaker('label');
        const logo = elementMaker('img');
        logo.setAttribute('src', `./logos/${c.symbol}.svg`);
        logo.setAttribute(`alt`, `${c.name}`);
        logo.setAttribute(`id`, `clogo`)
        logo.style.minHeight = `70px`;
        logo.style.maxHeight = `75px`;
        logo.style.maxWidth = `300px`;
        label.appendChild(logo);
        label.style.display = "block";
        label.style.paddingTop = "15px";
        return label;
    }

    /*
    * Helper method to populate the selected company's name and symbol information.
    */
    function nameMaker(c) {
        const h2 = elementMaker('h2');
        h2.innerHTML = `${c.name} (${c.symbol})`;
        h2.setAttribute(`id`, `cName`);
        h2.style.display = "block";
        return h2;
    }

    /*
    * Helper method populate the selected company's website information.
    */
    function webMaker(c) {
        const anchor = elementMaker('a');
        anchor.textContent = `${c.website}`;
        anchor.setAttribute('href', c.website);
        anchor.setAttribute(`id`, `cWeb`)
        anchor.style.display = "block";
        anchor.style.paddingTop = "5px";
        return anchor;
    }

    /*
    * Helper method to populate the selected company's adress information.
    */
    function addMaker(c) {
        const span = elementMaker(`span`);
        span.innerHTML = `<strong><u>Located in:</u></strong> ${c.address} <strong><u>Listed on:</u></strong> The ${c.exchange}`;
        span.setAttribute(`id`, `cAddress`);
        span.style.display = "block";
        span.style.paddingTop = "15px";
        return span;
    }

    /*
    * Populates the sector and subsector information for the selected company.
    */
    function sectorMaker(c) {
        const span = elementMaker(`span`);
        span.innerHTML = `<strong><u>Sector:</u></strong> ${c.sector} <strong><u>SubSector:</u></strong> ${c.subindustry} `;
        span.setAttribute(`id`, `cSector`);
        span.style.display = "block";
        span.style.paddingTop = "15px";
        return span;
    }

    /*
    * Helper method to organize the selected company's description and populate it.
    */
    function descMaker(c) {
        const span = elementMaker(`span`);
        if (c.description == null) {
            span.textContent = `Company description unavailable.`;
        } else {
            span.textContent = `${c.description}`;
        }
        span.setAttribute(`id`, `cSector`);
        span.style.display = "block";
        span.style.paddingTop = "15px";
        return span;
    }

    /*
    * The function below populates the line chart of volume and closing values for each date. Yes, it is a little long.
    * I struggled to find a way to populate it dynamically as the data needed to be a number, not a string, and therefore had to complete this section manually instead.
    */
    function populateLineChart(dates, closes, vols) {
        const ctx = document.querySelector('#line').getContext('2d');

        const data = {
            labels: dates,
            datasets: [{
                label: "Close ($)",
                data: [{
                    x: dates[0],
                    y: closes[0]
                },
                {
                    x: dates[1],
                    y: closes[1]
                },
                {
                    x: dates[2],
                    y: closes[2]
                },
                {
                    x: dates[3],
                    y: closes[3]
                },
                {
                    x: dates[4],
                    y: closes[4]
                }
                    ,
                {
                    x: dates[5],
                    y: closes[5]
                }
                    ,
                {
                    x: dates[6],
                    y: closes[6]
                },
                {
                    x: dates[7],
                    y: closes[7]
                },
                {
                    x: dates[8],
                    y: closes[8]
                },
                {
                    x: dates[9],
                    y: closes[9]
                },
                {
                    x: dates[10],
                    y: closes[10]
                },
                {
                    x: dates[11],
                    y: closes[11]
                },
                {
                    x: dates[12],
                    y: closes[12]
                },
                {
                    x: dates[13],
                    y: closes[13]
                },
                {
                    x: dates[14],
                    y: closes[14]
                },
                {
                    x: dates[15],
                    y: closes[15]
                },
                {
                    x: dates[16],
                    y: closes[16]
                }
                    ,
                {
                    x: dates[17],
                    y: closes[17]
                }
                    ,
                {
                    x: dates[18],
                    y: closes[18]
                },
                {
                    x: dates[19],
                    y: closes[19]
                }
                    ,
                {
                    x: dates[20],
                    y: closes[20]
                },
                {
                    x: dates[21],
                    y: closes[21]
                },
                {
                    x: dates[22],
                    y: closes[22]
                },
                {
                    x: dates[23],
                    y: closes[23]
                },
                {
                    x: dates[24],
                    y: closes[24]
                },
                {
                    x: dates[25],
                    y: closes[25]
                },
                {
                    x: dates[26],
                    y: closes[26]
                },
                {
                    x: dates[27],
                    y: closes[27]
                },
                {
                    x: dates[28],
                    y: closes[28]
                },
                {
                    x: dates[29],
                    y: closes[29]
                },
                {
                    x: dates[30],
                    y: closes[30]
                },
                {
                    x: dates[31],
                    y: closes[31]
                },
                {
                    x: dates[32],
                    y: closes[32]
                },
                {
                    x: dates[33],
                    y: closes[33]
                },
                {
                    x: dates[34],
                    y: closes[34]
                },
                {
                    x: dates[35],
                    y: closes[35]
                },
                {
                    x: dates[36],
                    y: closes[36]
                },
                {
                    x: dates[37],
                    y: closes[37]
                },
                {
                    x: dates[38],
                    y: closes[38]
                }
                    ,
                {
                    x: dates[39],
                    y: closes[39]
                },
                {
                    x: dates[40],
                    y: closes[40]
                },
                {
                    x: dates[41],
                    y: closes[41]
                },
                {
                    x: dates[42],
                    y: closes[42]
                },
                {
                    x: dates[43],
                    y: closes[43]
                },
                {
                    x: dates[44],
                    y: closes[44]
                },
                {
                    x: dates[45],
                    y: closes[45]
                },
                {
                    x: dates[46],
                    y: closes[46]
                },
                {
                    x: dates[47],
                    y: closes[47]
                },
                {
                    x: dates[48],
                    y: closes[48]
                },
                {
                    x: dates[49],
                    y: closes[49]
                }
                    ,
                {
                    x: dates[50],
                    y: closes[50]
                },
                {
                    x: dates[51],
                    y: closes[51]
                },
                {
                    x: dates[52],
                    y: closes[52]
                },
                {
                    x: dates[53],
                    y: closes[53]
                },
                {
                    x: dates[54],
                    y: closes[54]
                },
                {
                    x: dates[55],
                    y: closes[55]
                },
                {
                    x: dates[56],
                    y: closes[56]
                },
                {
                    x: dates[57],
                    y: closes[57]
                }
                    ,
                {
                    x: dates[58],
                    y: closes[58]
                },
                {
                    x: dates[59],
                    y: closes[59]
                },
                {
                    x: dates[60],
                    y: closes[60]
                }
                    ,
                {
                    x: dates[61],
                    y: closes[61]
                }
                ],
                borderColor: [
                    'rgba(255, 99, 132, 0.4)'
                ]
            },
            {
                label: "Volume (10,000s)",
                data: [{
                    x: dates[0],
                    y: vols[0]
                },
                {
                    x: dates[1],
                    y: vols[1]
                },
                {
                    x: dates[2],
                    y: vols[2]
                },
                {
                    x: dates[3],
                    y: vols[3]
                },
                {
                    x: dates[4],
                    y: vols[4]
                }
                    ,
                {
                    x: dates[5],
                    y: vols[5]
                }
                    ,
                {
                    x: dates[6],
                    y: vols[6]
                },
                {
                    x: dates[7],
                    y: vols[7]
                },
                {
                    x: dates[8],
                    y: vols[8]
                },
                {
                    x: dates[9],
                    y: vols[9]
                },
                {
                    x: dates[10],
                    y: vols[10]
                },
                {
                    x: dates[11],
                    y: vols[11]
                },
                {
                    x: dates[12],
                    y: vols[12]
                },
                {
                    x: dates[13],
                    y: vols[13]
                },
                {
                    x: dates[14],
                    y: vols[14]
                },
                {
                    x: dates[15],
                    y: vols[15]
                },
                {
                    x: dates[16],
                    y: vols[16]
                }
                    ,
                {
                    x: dates[17],
                    y: vols[17]
                }
                    ,
                {
                    x: dates[18],
                    y: vols[18]
                },
                {
                    x: dates[19],
                    y: vols[19]
                }
                    ,
                {
                    x: dates[20],
                    y: vols[20]
                },
                {
                    x: dates[21],
                    y: vols[21]
                },
                {
                    x: dates[22],
                    y: vols[22]
                },
                {
                    x: dates[23],
                    y: vols[23]
                },
                {
                    x: dates[24],
                    y: vols[24]
                },
                {
                    x: dates[25],
                    y: vols[25]
                },
                {
                    x: dates[26],
                    y: vols[26]
                },
                {
                    x: dates[27],
                    y: vols[27]
                },
                {
                    x: dates[28],
                    y: vols[28]
                },
                {
                    x: dates[29],
                    y: vols[29]
                },
                {
                    x: dates[30],
                    y: vols[30]
                },
                {
                    x: dates[31],
                    y: vols[31]
                },
                {
                    x: dates[32],
                    y: vols[32]
                },
                {
                    x: dates[33],
                    y: vols[33]
                },
                {
                    x: dates[34],
                    y: vols[34]
                },
                {
                    x: dates[35],
                    y: vols[35]
                },
                {
                    x: dates[36],
                    y: vols[36]
                },
                {
                    x: dates[37],
                    y: vols[37]
                },
                {
                    x: dates[38],
                    y: vols[38]
                }
                    ,
                {
                    x: dates[39],
                    y: vols[39]
                },
                {
                    x: dates[40],
                    y: vols[40]
                },
                {
                    x: dates[41],
                    y: vols[41]
                },
                {
                    x: dates[42],
                    y: vols[42]
                },
                {
                    x: dates[43],
                    y: vols[43]
                },
                {
                    x: dates[44],
                    y: vols[44]
                },
                {
                    x: dates[45],
                    y: vols[45]
                },
                {
                    x: dates[46],
                    y: vols[46]
                },
                {
                    x: dates[47],
                    y: vols[47]
                },
                {
                    x: dates[48],
                    y: vols[48]
                },
                {
                    x: dates[49],
                    y: vols[49]
                }
                    ,
                {
                    x: dates[50],
                    y: vols[50]
                },
                {
                    x: dates[51],
                    y: vols[51]
                },
                {
                    x: dates[52],
                    y: vols[52]
                },
                {
                    x: dates[53],
                    y: vols[53]
                },
                {
                    x: dates[54],
                    y: vols[54]
                },
                {
                    x: dates[55],
                    y: vols[55]
                },
                {
                    x: dates[56],
                    y: vols[56]
                },
                {
                    x: dates[57],
                    y: vols[57]
                }
                    ,
                {
                    x: dates[58],
                    y: vols[58]
                },
                {
                    x: dates[59],
                    y: vols[59]
                },
                {
                    x: dates[60],
                    y: vols[60]
                }
                    ,
                {
                    x: dates[61],
                    y: vols[61]
                }
                ],
                borderColor: [
                    'rgba(54, 162, 235, 0.4)'
                ]

            }
            ]
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {}
        })
    }
    /*
    * The function below populates the bar chart of for 2017, 2018 and 2019.
    */
    function populateBarChart(inputData) {
        const ctx = document.querySelector('#barGraph').getContext('2d');
        const data = {
            labels: ['2017', '2018', '2019'],
            datasets: [{
                label: "Revenue",
                data: [inputData[0][0], inputData[1][0], inputData[2][0]],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.4)',
                    'rgba(255, 99, 132, 0.4)',
                    'rgba(255, 99, 132, 0.4)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            },
            {
                label: "Earnings",
                data: [inputData[0][1], inputData[1][1], inputData[2][1]],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.4)',
                    'rgba(54, 162, 235, 0.4)',
                    'rgba(54, 162, 235, 0.4)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            },
            {
                label: "Assets",
                data: [inputData[0][2], inputData[1][2], inputData[2][2]],
                backgroundColor: [
                    'rgba(255, 206, 86, 0.4)',
                    'rgba(255, 206, 86, 0.4)',
                    'rgba(255, 206, 86, 0.4)'
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            },
            {
                label: "Liabilities",
                data: [inputData[0][3], inputData[1][3], inputData[2][3]],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(75, 192, 192, 0.2)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }
            ]
        }

        const chart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {}
        })
    }
    /*
    * This function creates the map based on the corporation's latitudinal and longitudinal data provided.
    */
    function populateMap(c) {
        const divD = document.querySelector("#map");
        divD.innerHTML = "";
        if (c.latitude == null) {
            const mapErrorMessage = elementMaker("H3");
            mapErrorMessage.textContent = "No map data available.";
            divD.appendChild(mapErrorMessage);
        } else {
            map = new google.maps.Map(divD, {
                center: { lat: c.latitude, lng: c.longitude },
                mapTypeId: 'satellite',
                zoom: 18
            });
        }
    }

    /*
    * After creating the map object, a map marker is generated.
    */
    function createMarker(map, latitude, longitude, company) {
        let imageLatLong = { lat: latitude, lng: longitude };
        let marker = new google.maps.Marker({
            position: imageLatLong,
            title: company,
            map: map
        });
        let infoWindow = new google.maps.InfoWindow({
            content: `${company}`
        });
        marker.addListener('mouseover', function () {
            infoWindow.open(map, marker);
        });
    }

});