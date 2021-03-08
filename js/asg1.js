/*
* COMP3512 Assignment 1
* W2021
* Salim Manji
*/

var map;
function initMap() {
}

document.addEventListener("DOMContentLoaded", function () {
    /*
    * Helper methods to create or target elements quickly.
    */
    const elementMaker = element => document.createElement(`${element}`);
    const $ = element => document.querySelector(`${element}`);
    const $$ = element => document.querySelectorAll(`${element}`);

    /*
     * Global variables.
    */
    const companiesAPI = 'https://www.randyconnolly.com/funwebdev/3rd/api/stocks/companies.php';
    const stockAPI = 'https://www.randyconnolly.com/funwebdev/3rd/api/stocks/history.php';
    let companies = [];
    let stocks = [];
    let candleDataMin = [];
    let candleDataMax = [];
    let candleDataAvg = [];
    let filterableStockData;
    let currentStock;
    const searchBox = $('.search');
    const companyList = $('#companyList');
    const eBox = $("div.e section");
    const dBox = $("div.d section");
    const loader1 = document.querySelector(`#loader1`);
    const loader2 = document.querySelector(`#loader2`);
    $$(".lds-ring").forEach((l) => l.style.display = "none");

    /*
    * Event listener for references.
    */
    $("#creditLabel").addEventListener("mouseover", () => {
        const referenceDetails = elementMaker("div");
        referenceDetails.setAttribute("id", "headerDiv")
        referenceDetails.innerHTML = `<strong>Author:</strong> Salim Manji <strong>References:</strong> <a href="https://pages.github.com/" >https://pages.github.com/</a>, <a href="https://dyclassroom.com/chartjs/how-to-create-a-bar-graph-using-chartjs">https://dyclassroom.com/chartjs/how-to-create-a-bar-graph-using-chartjs</a>, <a href="https://www.chartjs.org/docs/latest/">https://www.chartjs.org/docs/latest/</a>, <a href="https://developer.mozilla.org/en-US/">https://developer.mozilla.org/en-US/</a> (numerous pages including speech synthesis, number formatting, scroll bar/overflow-y, array sorting, etc.), <a href="https://www.w3schools.com/">https://www.w3schools.com/</a>(numerous pages including selectors, events, style properties, etc.), <a href="https://www.codeinwp.com/blog/google-maps-javascript-api/">https://www.codeinwp.com/blog/google-maps-javascript-api/</a>, <a href="https://developers.google.com/maps/documentation/javascript/overview">https://developers.google.com/maps/documentation/javascript/overview</a>, <a href="https://www.color-hex.com/">https://www.color-hex.com/</a>`
        $("#header").appendChild(referenceDetails);
        setTimeout(function () {
            referenceDetails.innerHTML = "";
        }, 5000)
    }, false);

    /*
    * The first fetch based on the user's selection of a company in the list of comanies. The fetched information is stored in the browser after being fetched once.
    * Once the data has been retrieved, the information boxes are created and populated.
    */
    if (localStorage.getItem("companies") === null) {
        loader1.style.display = "block";
        fetch(companiesAPI)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error("First fetch failed");
                }
            })
            .then(data => {
                loader1.style.display = "none";
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
    * @param data is the data to be sorted.
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
    * The two event listeners below provide visual feedback for the user that they can mouseover a company in the list to act as visual feedback.
    */
    $("#companyList").addEventListener("mouseover", (e) => {
        if (e.target.nodeName == "LI") {
            e.target.style.color = 'red';
            e.target.style.textDecoration = "underline"
        }
    });

    $("#companyList").addEventListener("mouseout", (e) => {
        if (e.target.nodeName == "LI") {
            e.target.style.color = 'black';
            e.target.style.textDecoration = "none"
        }
    });

    /*
    * The functions below handles the population of data for a specific company.
    * @param c is the company information to use to populate each div.
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
    * @param s is the single stock from which to populate the financial values for.
    */
    function populateStockData(s) {
        loader2.style.display = "block";
        const specificData = `${stockAPI}?symbol=${s}`;
        fetch(specificData)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error("Second fetch failed");
                }
            })
            .then(data => {
                loader2.style.display = "none";
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

    
    /*
     * While sorting the lists to populate average/min/max open/close/low/high/volume information, I decided to also populate arrays required for creating the candlestick chart.
     * This method calls each subsequent helper method to populate min and max data for the selected company.
    */
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
        candleDataMax.push(Number(filterableStockData[0].open));
        let curr = open();
        dBox.appendChild(curr);

        sortSmallest("close");
        candleDataMax.push(Number(filterableStockData[0].close));
        curr = close();
        dBox.appendChild(curr);

        sortSmallest("low");
        candleDataMax.push(Number(filterableStockData[0].low));
        curr = low();
        dBox.appendChild(curr);

        sortSmallest("high");
        candleDataMax.push(Number(filterableStockData[0].high));
        curr = high();
        dBox.appendChild(curr);

        sortSmallest("volume");
        curr = vol();
        dBox.appendChild(curr);
    }

    /*
    * Sort functions from smallest to largest using the specified property.
    */
    function sortLargest(prop) {
        filterableStockData = stocks.sort((a, b) => {
            return a[prop] - b[prop];
        });
    }

    /*
    * Sort functions from largest to smallest using the specified property.
    */
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
        candleDataMin.push(Number(filterableStockData[0].open));
        let curr = open();
        dBox.appendChild(curr);

        sortLargest("close");
        candleDataMin.push(Number(filterableStockData[0].close));
        curr = close();
        dBox.appendChild(curr);

        sortLargest("low");
        candleDataMin.push(Number(filterableStockData[0].low));
        curr = low();
        dBox.appendChild(curr);

        sortLargest("high");
        candleDataMin.push(Number(filterableStockData[0].high));
        curr = high();
        dBox.appendChild(curr);

        sortLargest("volume")
        curr = vol();
        dBox.appendChild(curr);
    }

    /*
    * The methods below filter the stock data by the requested property, and pulls the smallest value for each.
    */
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
        const avgopen = newh4maker(avgFinder("open"));
        dBox.appendChild(avgopen);
        const avgclose = newh4maker(avgFinder("close"));
        dBox.appendChild(avgclose);
        const avglow = newh4maker(avgFinder("low"));
        dBox.appendChild(avglow);
        const avghigh = newh4maker(avgFinder("high"));
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
        candleDataAvg.push(average);
        return average;
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
    * @param num is the number to format.
    * @return formatted number.
    */
    const currency = function (num) {
        return new Intl.NumberFormat('en-us', {
            style: 'currency',
            currency: 'USD'
        }).format(num);
    };

    /*
    * Similar to the above helper method, this method formats the stock volume fields with commas.
    * @param d is the volume data to format
    * @return formatted volume
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
    * Helper method to format numbers.
    * @param num is the number to format.
    * @return number is the formatted number.
    */
    function numMaker(num) {
        const number = new Intl.NumberFormat('en-us', {
            style: 'decimal',
            maximumFractionDigits: 0
        }).format(num);
        return number;
    }

    /*
    * Helper method to create an H4 element for each value for the relevant stock data.
    * @param d is the data to populate as the H4 element's text content.
    * @return ele is the populated element, ready to be appended into the page.
    */
    function newh4maker(d) {
        const ele = elementMaker('h4');
        ele.textContent = currency(d);
        return ele;
    }

    /*
    * Helper method to create a new Date element. 
    * @param d is the date to populate
    * @return ele is the built element, ready to be populated on the page.
    */
    function newdatemaker(d) {
        const ele = elementMaker('h4');
        ele.textContent = d;
        return ele;
    }

    /*
    * Function to create stock header, add relevant data and attach event listeners to the headers for sorting.
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
            populateLineChart(lineDatesData, lineCloses, lineVols);
            populateCandleChart();
        }
    }

    /*
    * Helper method to create date information for the Line Graph. I struggled to incorporate the actual dates into the chart, as they were String elements.
    * Due to time constraints, I opted to instead label each date a number between 1 and 61.
    * @return currArray is the array of "dates"
    */
    function lineDates() {
        const currArray = [];
        for (let i = 0; i < stocks.length; i++) {
            currArray.push(numMaker(i));
        }
        return currArray;
    }

    /*
    * Helper method for the Line Graph. 
    * @return currArray is the array of close values for the user selected stock.
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
    * @return volArray is the array of volume values for the user selected stocks (divided by 10,000 due to their size relative to the closing price).
    */
    function lineDataVol() {
        const volArray = [];
        stocks.forEach(d => volArray.push(d.volume / 10000));
        return volArray;
    }

    /*
    * Populates information into an array for the Bar Chart
    * @return dataArray is the complete data array to build the bar chart with.
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
    * @param h is the parent element (hBox) to append to.
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
    * @param text is  the text to set the element to.
    * @return ele is the populated element, ready to be inserted into the page.
    */
    function financeHeaders(text) {
        const ele = elementMaker("h3");
        ele.classList.add("headers")
        ele.textContent = text;
        return ele;
    }

    /*
    * The following function populates the relevant financial statistics for each year for the user selected company.
    * @param h is the parent element hBox.
    */
    function createAdditionalRows(h) {
        const rev = financeHeaders("Revenue:");
        h.appendChild(rev);
        currentStock.financials.revenue.forEach(y => {
            const ele = newh4maker();
            ele.textContent = currency(y);
            h.appendChild(ele);
        })
        const earn = financeHeaders("Earnings:");
        h.appendChild(earn);
        currentStock.financials.earnings.forEach(y => {
            const ele = newh4maker();
            ele.textContent = currency(y);
            h.appendChild(ele);
        })
        const assets = financeHeaders("Assets:");
        h.appendChild(assets);
        currentStock.financials.assets.forEach(y => {
            const ele = newh4maker();
            ele.textContent = currency(y);
            h.appendChild(ele);
        })
        const liab = financeHeaders("Liabilities:");
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
    * Function that creates the Company Info pane in the Chart View. Included here is the speech synthesis button and the close button to return to the default view.
    */
    function populateInfoBox() {
        const gBox = $("#boxG");
        const cNameSymbol = elementMaker("span");
        cNameSymbol.setAttribute("id", "chartName");
        cNameSymbol.innerHTML = `<strong><u>${currentStock.name} (${currentStock.symbol}</u></strong>)`
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
    * After switching to the default view, this method allows for the charts to be (re)built.
    */
    function rebuildCharts() {
        const fBox = $("#boxF");
        chartMaker(fBox, "barGraph");
        chartMaker(fBox, "candle");
        chartMaker(fBox, "line");
    }

    /*
    * Helper method to rebuild each chart type
    * @param parentNode is the parent node to append the child to.
    * @param id is the id attribute that will be assigned to the element.
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
    * @param name is the header name.
    * @return ele is the completed element, ready to be populated into the page.
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
    * @param c is the user selected company.
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
    * @param c is the company the user has selected.
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
    * @param c is the company to use, selected by the user.
    * @return h2 is the completed h2 element that can be mounted into the page.
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
    * @param c is the company the user has selected.
    * @return anchor is the completed anchor tag to be mounted into the page.
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
    * @param c is the company selected by the user.
    * @return span is the completed span element to be mounted into the page.
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
    * @param c is the user selected company.
    * @return span is the completed span element to be mounted.
    */
    function sectorMaker(c) {
        const span = elementMaker(`span`);
        span.innerHTML = `<strong><u>Sector:</u></strong> ${c.sector} <strong><u>SubSector:</u></strong> ${c.subindustry}`;
        span.setAttribute(`id`, `cSector`);
        span.style.display = "block";
        span.style.paddingTop = "15px";
        return span;
    }

    /*
    * Helper method to organize the selected company's description and populate it.
    * @param c is the current company selected by the user.
    * @return span is the completed span element to be mounted into the page.
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
    * @param dates is the array of "date values".
    * @param closes is the array of close values.
    * @param vols is the array of volume values.
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
                label: "Volume (in 10,000 shares)",
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
            options: {
                title: {
                    display: true,
                    text: 'Daily Stock Volumes and Closing Prices'
                }
            }
        })
    }

    /*
    * This function populates the candlestick chart using arrays created earlier.
    */
    function populateCandleChart() {
        const ctx = document.querySelector('#candle').getContext('2d');

        const data = {
            labels: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
            datasets: [{
                label: "Open",
                data: [{
                    x: 10,
                    y: candleDataMax[0]
                },
                {
                    x: 10,
                    y: candleDataMin[0]
                }],
                borderColor: [
                    'rgba(54, 162, 235, 1)'
                ]
            },
            {
                label: "Avg Open",
                data: [{
                    x: 5,
                    y: candleDataAvg[0]
                },
                {
                    x: 15,
                    y: candleDataAvg[0]
                }],
                backgroundColor: [
                    'rgba(0,0,0,0)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 0.4)'
                ]
            },
            {
                label: "Close",
                data: [{
                    x: 25,
                    y: candleDataMax[1]
                },
                {
                    x: 25,
                    y: candleDataMin[1]
                }],
                borderColor: [
                    'rgba(255, 99, 132, 1)'
                ]
            },
            {
                label: "Avg Close",
                data: [{
                    x: 20,
                    y: candleDataAvg[1]
                },
                {
                    x: 30,
                    y: candleDataAvg[1]
                }],
                backgroundColor: [
                    'rgba(0,0,0,0)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 0.4)'
                ]
            },
            {
                label: "Low",
                data: [{
                    x: 40,
                    y: candleDataMax[2]
                },
                {
                    x: 40,
                    y: candleDataMin[2]
                }],
                borderColor: [
                    'rgba(255, 206, 86, 1)'
                ]
            },
            {
                label: "Avg Low",
                data: [{
                    x: 35,
                    y: candleDataAvg[2]
                },
                {
                    x: 45,
                    y: candleDataAvg[2]
                }],
                backgroundColor: [
                    'rgba(0,0,0,0)'
                ],
                borderColor: [
                    'rgba(255, 206, 86, 0.4)'
                ]
            },

            {
                label: "High",
                data: [{
                    x: 55,
                    y: candleDataMax[3]
                },
                {
                    x: 55,
                    y: candleDataMin[3]
                }],
                borderColor: [
                    'rgba(75, 192, 192, 1)'
                ]
            },
            {
                label: "Avg High",
                data: [{
                    x: 50,
                    y: candleDataAvg[3]
                },
                {
                    x: 60,
                    y: candleDataAvg[3]
                }],
                backgroundColor: [
                    'rgba(0,0,0,0)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 0.4)'
                ]
            }]
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                title: {
                    display: true,
                    text: 'Candle Stick Data'
                }
            }
        })
    }

    /*
    * The function below populates the bar chart data for 2017, 2018 and 2019.
    * @param inputData is the array of data to use to build the bar chart.
    */
    function populateBarChart(inputData) {
        const ctx = document.querySelector('#barGraph').getContext('2d');
        const data = {
            labels: ['2017', '2018', '2019'],
            datasets: [{
                label: "Revenue",
                data: [inputData[0][0], inputData[1][0], inputData[2][0]],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
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
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
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
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(255, 206, 86, 0.6)'
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
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(75, 192, 192, 0.6)'
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
            options: {
                title: {
                    display: true,
                    text: 'Company Balance Sheet Data'
                }
            }
        })
    }
    /*
    * This function creates the map based on the corporation's latitudinal and longitudinal data provided.
    * @param c is the company to populate the map.
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
    * @param map is the map to populate.
    * @param latitude is the selected company's latitude.
    * @param longitude is the selected company's longitude.
    * @param company is the name of the company selected by the user.
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