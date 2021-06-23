const puppeteer = require('puppeteer');
const converter = require('json-2-csv');
const fs        = require('fs');

const url   = 'https://www.tokopedia.com/p/handphone-tablet/handphone';
const total = 5;

async function startBrowser(){
    let browser;
    try {
        console.log("Opening the browser......");
        browser = await puppeteer.launch({
            headless: false,
            args: ["--disable-setuid-sandbox"],
                    'ignoreHTTPSErrors': true
        });
    } catch (err) {
        console.log("Could not create a browser instance => : ", err);
    }
    return browser;
}

async function getLink(currentUrl, browser) {
    let page = (await browser.pages())[0];
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

    console.log(`Navigating to ${currentUrl}...`);
    await page.goto(currentUrl, {waitUntil: 'networkidle0'});
    await page.waitForSelector('[data-testid="lstCL2ProductList"]');
    await page.$('[data-testid="lstCL2ProductList"]');

    return await page.$$eval('.css-bk6tzz > a', links => {
        links = links.map(el => el.getAttribute('href'))
        return links
    })
}

async function scraper(browser){
    let collectionDetail = [];
    let datas = await getLink(url, browser);
    let count = 0;

    // Loop through each of those links, open a new page and get the relevant data from them
    let pagePromise = (link) => new Promise(async(resolve, rejection) => {
        let newPage = await browser.newPage();
        await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
        await newPage.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });
        await newPage.goto(link, {waitUntil: 'networkidle0'});

        // query product detail
        let product_name = await newPage.$eval('[data-testid="lblPDPDetailProductName"]', el => el.innerText);
        let description  = await newPage.$eval('[data-testid="lblPDPDescriptionProduk"]', el => el.innerText);
        let price        = await newPage.$eval('[data-testid="lblPDPDetailProductPrice"]', el => el.innerText);
        let image        = await newPage.$eval('[data-testid="PDPImageMain"] > .css-dn74lq > .css-19i5z4j > img', el => el.src);
        let rating       = await newPage.$eval('[data-testid="lblPDPDetailProductRatingNumber"]', el => el.innerText);
        let merchant     = await newPage.$eval('[data-testid="llbPDPFooterShopName"] > h2', el => el.innerText);

        collectionDetail.push({
            product_name,
            description,
            price,
            image,
            rating,
            merchant
        })

        resolve(collectionDetail)
        await newPage.close();
    });

    currentData = 0;
    currentPage = 1;

    while (datas) {
        currentData++;

        if (currentData == datas.length) {
            currentPage++
            datas = await getLink(`${url}?page=${currentPage}`, browser);
            currentData = 0;
        }

        if (!datas[currentData].includes('https://ta.tokopedia.com/')) {
            await pagePromise(datas[currentData]);
            count++;
        }

        if (count == total) break;
    }
    
    return collectionDetail;
}

async function scrapeAll(browserInstance){
    let browser;
    try{
        browser = await startBrowser();
        
        // Call the scraper for different set of data to be scraped
        let scrapedData = await scraper(browser);

        await browser.close();

        converter.json2csv(scrapedData, (err, csv) => {
            if (err) {
                throw err;
            }
            
            console.log(scrapedData);

            fs.writeFileSync('tokped-api.csv', csv);

            console.log("The data has been scraped and saved successfully! View it at './tokped-api.csv'");
        });

    }
    catch(err){
        console.log("Could not resolve the browser instance => ", err);
    }
}

scrapeAll()