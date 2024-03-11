const { By, until } = require('selenium-webdriver');
const webdriver = require('selenium-webdriver');
const userAgent = require('user-agents');
require('chromedriver');
const apiUrl = 'https://www.goethe.de/rest/examfinder/exams/institute/O%2010000610?category=E006&type=ER&countryIsoCode=&locationName=&count=100&start=1&langId=134&timezone=54&isODP=0&sortField=startDate&sortOrder=ASC&dataMode=0&langIsoCodes=de%2Cen%2Cvi';
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const { parse } = require('date-fns');
const currentDir = __dirname;
let drivers = [];
const DriverStatus = {
    READY: 'READY',
    BUSY: 'BUSY'
};
const countTab = 4;
let name = '';
sendMessage('Đang chạy')

find();

async function find() {
    for (let i = 0; i < countTab; i++) {
        openUrlAndReload();
    }
}

function sendMessage(message) {
    axios.get(`http://52.220.227.223:3001/send-message?message=${name}${message}`)
        .then(response => {
        })
        .catch(error => {
            console.error(message);
        });
}

async function doesElementExist(driver, xpath) {
    try {
        await driver.findElement(By.xpath(xpath));
        return true;
    } catch (error) {
        return false;
    }
}

async function setupWebDriver(isProxy) {
    let options = new chrome.Options();
    if (isProxy) {
        const baseDirectory = 'extension';
        const proxyRandom = await getRandomFilePath(baseDirectory);
        const extensionPath = `${currentDir}\\extension\\${proxyRandom}`;
        options.addArguments([`--load-extension=${extensionPath}`])
    }
    options.addArguments([
        '--window-size=1500,1500',
        '--disable-notifications',
        'force-device-scale-factor=0.3',
        'high-dpi-support=0.3',
        '--disable-cache',
        '--disk-cache-size=1',
        `--user-agent=${new userAgent({ deviceCategory: 'desktop' }).toString()}`
    ]);
    let driver = new webdriver.Builder()
        .withCapabilities(webdriver.Capabilities.chrome())
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    return driver;
}

async function performStep(driver, stepName, xpath, retryCount = 0, time = 2000) {
    const maxRetries = 10;
    try {
        await driver.wait(until.elementLocated(By.xpath(xpath)), time);
        const button = await driver.findElement(By.xpath(xpath));
        await button.click();
    } catch (error) {
        if (retryCount < maxRetries) {
            await performStep(driver, stepName, xpath, retryCount + 1, 2000);
        } else {
            throw new Error(`Buoc ${stepName} - Loi: khong the thuc hien sau ${maxRetries} lan thu.`);
        }
    }
}

async function waitForElement(driver, xpath, retryCount = 0, time = 2000, maxRetries = 10) {
    try {
        await driver.wait(until.elementLocated(By.xpath(xpath)), time);
    } catch (error) {
        if (retryCount < maxRetries) {
            await waitForElement(driver, xpath, retryCount + 1, time, maxRetries);
        } else {
            throw new Error(`Lỗi: Không thể chờ đợi phần tử sau ${maxRetries} lần thử.`);
        }
    }
}

async function clickShadowRootButton(driver, time) {
    try {
        const shadowRootButton = await driver.wait(async function () {
            const element = await driver.executeScript(`
                const shadowRoot = document.querySelector('#usercentrics-root').shadowRoot;
                if (!shadowRoot) {
                    throw new Error('Không tìm thấy shadowRoot.');
                }
                return shadowRoot.querySelector('button[role="button"][data-testid="uc-accept-all-button"]');
            `);
            return element;
        }, time);

        if (shadowRootButton) {
            await driver.executeScript('arguments[0].click();', shadowRootButton);
        } else {
            console.log('Không tìm thấy phần tử trong khoảng thời gian cho trước.');
        }
    } catch (error) {
        console.error('Đã xảy ra lỗi:', error.message);
    }
}


async function getTextFromCsLayerText(driver) {
    const csLayerTextElements = await driver.findElements(By.className('cs-layer__text'));
    const texts = [];

    for (const element of csLayerTextElements) {
        const text = await element.getText();
        texts.push(text);
    }

    return texts;
}

function randomComparator() {
    return Math.random() - 0.5;
}

async function fetchDataFromApi() {
    try {
        let randomDelay = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
        const response = await axios.get(apiUrl, { timeout: 5000 });
        const data = response.data;
        const recordsWithData = data.DATA.filter(record => record.buttonLink);
        if (recordsWithData.length > 0) {
            for (let i = 0; i < drivers.length; i++) {
                let driverObj = drivers[i];
                let driver = driverObj.driver;
                let status = driverObj.status;
                if (status === DriverStatus.READY) {
                    const randomIndex = Math.floor(Math.random() * recordsWithData.length);
                    const randomRecord = recordsWithData[randomIndex];
                    const buttonLink = createNewUrl(randomRecord);
                    const eventTimeSpan = randomRecord.eventTimeSpan || 'Không có thông tin về thời gian';
                    driverObj.status = DriverStatus.BUSY;
                    createAndManageSession(driver, buttonLink, randomRecord.startDate, eventTimeSpan);
                    drivers.splice(i, 1);
                }
            }
        }
        setTimeout(fetchDataFromApi, randomDelay);
    } catch (error) {
        setTimeout(fetchDataFromApi, randomDelay);
    }
}

fetchDataFromApi();

function createNewUrl(record) {
    if (record.hasOwnProperty("oid") && record.buttonLink.includes("prod")) {
        let langParam = record.buttonLink.includes('?lang=vi') ? 'lang=vi&' : '';
        let newUrl = `${record.buttonLink.split('?')[0]}?${langParam}oid=${record.oid}`;
        return record.buttonLink = newUrl;
    } else {
        return record.buttonLink;
    }
}

async function openUrlAndReload() {
    let driver
    try {
        driver = await setupWebDriver(false);
        await driver.get('https://www.goethe.de/ins/vn/vi/sta/han/prf/gzb1.cfm');
        await driver.wait(until.elementLocated(By.xpath('/html/body/div[1]/div[4]/div[1]/div[1]/article/div/div[4]')), 10000);
        await clickShadowRootButton(driver, 60000);
        driver.sleep(3000);
        drivers.push({ driver: driver, status: DriverStatus.READY });
    } catch (error) {
        if (driver) {
            console.log(error)
            driver.quit();
            driver = null;
            openUrlAndReload();
        }
    }
}

async function fetchJsonFromUrl() {
    try {
        const response = await axios.get(`http://52.220.227.223:3000/api/users`);
        return response.data;
    } catch (error) {
        throw new Error('Đã xảy ra lỗi khi tải JSON: ' + error.message);
    }
}

async function createAndManageSession(driver, url, dateString, eventTimeSpan) {
    const ModuleEnum = {
        reading: 'Đọc',
        writing: 'Viết',
        listening: 'Nghe',
        speaking: 'Nói',
    };

    try {
        let buttonId = "btn-" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        await driver.executeScript(`
                let virtualButton = document.createElement('button');
                virtualButton.id = "${buttonId}";
                virtualButton.textContent = "LỰA CHỌN CÁC MÔ ĐUN";
                virtualButton.classList.add("standard", "btnGruen", "icon-double-arrow-right");
                virtualButton.addEventListener("click", function () {
                    let url = "${url}";
                    window.open(url, "_self");
                });
                document.getElementById("cfheadline").appendChild(virtualButton);
            `);
        await driver.executeScript(`
            document.getElementById("${buttonId}").click();
        `);
        await driver.wait(until.elementLocated(By.xpath('/html/body/div[1]/main/div/div[5]/div[3]')), 10000);
        const usersRaw = await fetchJsonFromUrl();
        let checkboxes;
        checkboxes = await driver.findElements(By.css('input[type="checkbox"]:not([disabled])'), 10000);
        if (!checkboxes || checkboxes.length === 0) {
            driver.sleep(3000);
            checkboxes = await driver.findElements(By.css('input[type="checkbox"]:not([disabled])'), 10000);
        }
        const existsModule = [];

        const existsCheckbox = [];
        for (const checkbox of checkboxes) {
            const checkboxId = await checkbox.getAttribute('id');
            existsCheckbox.push(checkboxId.trim());
        }
        let propModule = "module";
        const users = usersRaw.sort(randomComparator);
        const foundRecord = users.find(record => {
            const date = parse(dateString, 'dd.MM.yyyy', new Date());
            const startDate = parse(record.startDate, 'dd/MM/yyyy', new Date());
            const endDate = parse(record.endDate, 'dd/MM/yyyy', new Date());
            const modules = record.module.split(',');
            const moduleExists = modules.every(module => existsCheckbox.includes(module));
            const backupModules = record.moduleBackup.split(',');
            const backupModuleExists = backupModules.every(module => existsCheckbox.includes(module));
            if (moduleExists && date >= startDate && date <= endDate) {
                propModule = "module";
                return true;
            } else if (backupModuleExists && date >= startDate && date <= endDate) {
                propModule = "moduleBackup";
                return true;
            } else {
                return false;
            }
        });
        if (foundRecord) {
            register(driver, checkboxes, foundRecord, propModule, ModuleEnum, existsModule, eventTimeSpan);
        } else {
            driver.quit();
            driver = null;
            openUrlAndReload();
        }
    } catch (error) {
        if (driver) {
            const currentPageTitle = await driver.getTitle();
            const errorTexts = await getTextFromCsLayerText(driver);
            const errorText = errorTexts.join(' - ');
            let errorMessage = `Đã xảy ra lỗi ở trang "${currentPageTitle}"`;
            if (errorText) {
                errorMessage += ` - ${errorText}`;
            }
            const err = error.message + ' ' + errorMessage;
            console.log(err)
            driver.quit();
            driver = null;
            openUrlAndReload();
        }
    }
}

async function register(driver, checkboxes, foundRecord, propModule, ModuleEnum, existsModule, dateString) {
    try {
        for (const checkbox of checkboxes) {
            const checkboxId = await checkbox.getAttribute('id');
            if (!foundRecord[propModule].split(',').includes(checkboxId.trim())) {
                const checkbox = await driver.findElement(By.id(` ${checkboxId.trim()} `));
                if (checkbox) {
                    await driver.executeScript("arguments[0].click();", checkbox);
                }
            } else {
                existsModule.push(ModuleEnum[checkboxId.trim()]);
            }
        }
        sendMessage(`Đang đăng ký tài khoản ${foundRecord.username} ngày ${dateString} module ${existsModule.join(', ')}`);
        await driver.sleep(1000);
        await performStep(driver, '1 - Tiep tuc', '/html/body/div[1]/main/div/div[6]/div/button[2]');
        await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div/div/div/p[2]');
        await performStep(driver, '2 - Dang ki cho toi', '/html/body/div[1]/main/div/div[5]/div/div/div/div/button[2]');
        await waitForElement(driver, '/html/body/div[2]/div[5]/div/div[1]/h3');
        const emailInput = await driver.findElement(By.xpath('/html/body/div[2]/div[5]/div/div[1]/div[2]/form/div[2]/input'));
        await emailInput.sendKeys(foundRecord.username);
        const passwordInput = await driver.findElement(By.xpath('/html/body/div[2]/div[5]/div/div[1]/div[2]/form/div[3]/input'));
        await passwordInput.sendKeys(foundRecord.password);
        await driver.sleep(1000);
        await performStep(driver, '3 - Dang nhap', '/html/body/div[2]/div[5]/div/div[1]/div[2]/form/input[4]');
        const elementExists = await doesElementExist(driver, '/html/body/div[1]/main/div/div[5]/div[1]/div[1]/h3');
        console.log(`DA DANG NHAP ${foundRecord.username}`)
        await driver.sleep(1000);
        await performStep(driver, '4 - Tiep tuc o ma giam gia', '/html/body/div[1]/main/div/div[6]/div/button[2]');
        if (elementExists) {
            await driver.sleep(2000);
            await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/form/div/div[3]/div');
            await driver.sleep(2000);
            await performStep(driver, '5 - Form hoc vien', '/html/body/div[1]/main/div/div[6]/div/button[2]');
        }
        await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div/div/div[1]/label');
        await driver.sleep(1000);
        await performStep(driver, '5 - Tiep tuc o buoc hoa don', '/html/body/div[1]/main/div/div[6]/div/button[2]');
        await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div[1]/div[3]/div/div');
        const doneBtn = await doesElementExist(driver, '/html/body/div[1]/main/div/div[6]/div/button[2]');
        if (doneBtn) {
            await driver.sleep(1000);
            await performStep(driver, '6 - Nhấn Done', '/html/body/div[1]/main/div/div[6]/div/button[2]');
            console.log(`${foundRecord.username} Đã nhấn hoàn thành`)
            await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div[1]/div[1]/p');
            await axios.get(`http://52.220.227.223:3000/api/users/update?id=${foundRecord.id}&isActive=0`);
            sendMessage(`ĐĂNG KÝ THÀNH CÔNG - EMAIL: ${foundRecord.username} - NGÀY: ${dateString} - MODULE: ${existsModule.join(', ')}&isDone=true`);
            console.log(`ĐĂNG KÝ THÀNH CÔNG - EMAIL: ${foundRecord.username} - NGÀY: ${dateString} - MODULE: ${existsModule.join(', ')}`);
            driver.quit();
            driver = null;
            openUrlAndReload();
        }
    } catch (error) {
        if (driver) {
            const currentPageTitle = await driver.getTitle();
            const errorTexts = await getTextFromCsLayerText(driver);
            const errorText = errorTexts.join(' - ');
            let errorMessage = `Đã xảy ra lỗi ở trang "${currentPageTitle}"`;
            if (errorText) {
                errorMessage += ` - ${errorText}`;
            }
            const err = error.message + ' ' + errorMessage;
            console.log(err)
            driver.quit();
            driver = null;
            openUrlAndReload();
        }
    }
}