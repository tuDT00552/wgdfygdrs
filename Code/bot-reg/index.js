const { By, until } = require('selenium-webdriver');
const webdriver = require('selenium-webdriver');
const userAgent = require('user-agents');
require('chromedriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const countTab = 4;
let config;
sendMessage('Đang chạy')

async function find() {
    const c = await getConfig();
    config = c;
    for (let i = 0; i < countTab; i++) {
        openUrlAndReload(false, config);
    }
}

find();

async function getOne() {
    try {
        const response = await axios.get(`http://52.220.227.223:3000/api/get-one`);
        return response.data;
    } catch (error) {
        throw new Error('Đã xảy ra lỗi khi tải JSON: ' + error.message);
    }
}

async function getConfig() {
    try {
        const response = await axios.get(`http://52.220.227.223:3000/api/get-config`);
        return response.data;
    } catch (error) {
        throw new Error('Đã xảy ra lỗi khi tải JSON: ' + error.message);
    }
}

function sendMessage(message) {
    axios.get(`http://52.220.227.223:3001/send-message?message=${message}`)
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

async function setupWebDriver(isReload) {
    let options = new chrome.Options();
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
    const screenWidth = await driver.executeScript('return window.screen.width;');
    const screenHeight = await driver.executeScript('return window.screen.height;');
    const randomX = Math.floor(Math.random() * Math.min(screenWidth, 1280));
    const randomY = Math.floor(Math.random() * Math.min(screenHeight, 960));
    await driver.manage().window().setRect({ x: randomX, y: randomY });
    return driver;
}

async function performStep(driver, stepName, xpath, retryCount = 0, time = 2000) {
    const maxRetries = 20;
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

async function waitForElement(driver, xpath, retryCount = 0, time = 2000, maxRetries = 20) {
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

async function openUrlAndReload(isReload, config) {
    let driver;
    try {
        driver = await setupWebDriver(isReload);
        await driver.get('https://www.goethe.de/ins/vn/vi/sta/han/prf/gzb1.cfm');
        await driver.wait(until.elementLocated(By.xpath('/html/body/div[1]/div[4]/div[1]/div[1]/article/div/div[4]')), 10000);
        await clickShadowRootButton(driver, 60000);
        await driver.sleep(2000);
        await driver.executeScript(`examfinderDataCF_7629595.countPerPage = '${config ? config.count : 20}';`);
        await driver.executeScript(`
            const prFinder = document.querySelector('.pr-finder');
            if (prFinder) {
                prFinder.style.position = 'fixed';
                prFinder.style.top = 0;
                prFinder.style.bottom = 0;
                prFinder.style.left = 0;
                prFinder.style.right = 0;
                prFinder.style.zIndex = 999;
            }
        `);
        let enabledButton;
        while (!enabledButton) {
            await driver.executeScript(`getData_7629595(${config ? config.skip : 1})`);
            await driver.sleep(1000);
            enabledButton = await findEnabledButtonInTd(driver);
            if (enabledButton) {
                await createAndManageSession(driver, enabledButton);
            }
        }

    } catch (error) {
        if (driver) {
            driver.quit();
            driver = null;
            if (config) {
                setTimeout(() => {
                    openUrlAndReload();
                }, 25000);
            }
        }
    }
}

async function findEnabledButtonInTd(driver) {
    const selector = `.pr-buttons button:not([disabled])`;
    try {
        const enabledButton = await driver.findElement(By.css(selector));
        return enabledButton;
    } catch (error) {
        return null;
    }
}

async function createAndManageSession(driver, enabledButton) {
    const ModuleEnum = {
        reading: 'Đọc',
        writing: 'Viết',
        listening: 'Nghe',
        speaking: 'Nói',
    };

    try {
        await enabledButton.click();
        await driver.wait(until.elementLocated(By.xpath('/html/body/div[1]/main/div/div[5]/div[3]')), 10000);
        const checkboxes = await driver.findElements(By.css('input[type="checkbox"]:not([disabled])'));
        const existsModule = [];

        const existsCheckbox = [];
        for (const checkbox of checkboxes) {
            const checkboxId = await checkbox.getAttribute('id');
            existsCheckbox.push(checkboxId.trim());
        }

        let foundRecord = null;
        let foundRecord1 = 1;

        while (!foundRecord && foundRecord1 !== null) {
            let record = await getOne();
            if (record !== null && record.hasOwnProperty('id')) {
                let modules = record.module.split(',');
                let moduleExists = modules.every(module => existsCheckbox.includes(module));
                let backupModules = record.moduleBackup.split(',');
                let backupModuleExists = backupModules.every(module => existsCheckbox.includes(module));
                if (moduleExists) {
                    foundRecord = record;
                    await register(driver, checkboxes, record, "module", ModuleEnum, existsModule);
                } else if (backupModuleExists) {
                    foundRecord = record;
                    await register(driver, checkboxes, record, "moduleBackup", ModuleEnum, existsModule);
                }
            } else {
                foundRecord1 = null;
            }
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
            if (!err.includes('but due to very high demand') && !err.includes('429')
                && !err.includes('finish other started bookings')) {
                console.log(err);
            } else {
                driver.quit();
                driver = null;
                if (config) {
                    setTimeout(() => {
                        openUrlAndReload();
                    }, 25000);
                }
            }

        }
    }
}

async function register(driver, checkboxes, foundRecord, propModule, ModuleEnum, existsModule) {
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
    await driver.sleep(2000);
    console.log(`REGISTERINGGGGGGGGGGGGGGGGGGGG ${foundRecord.username} module ${existsModule.join(', ')}`)
    await performStep(driver, '1 - Tiep tuc', '/html/body/div[1]/main/div/div[6]/div/button[2]');
    await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div/div/div/p[2]');
    await performStep(driver, '2 - Dang ki cho toi', '/html/body/div[1]/main/div/div[5]/div/div/div/div/button[2]');
    await waitForElement(driver, '/html/body/div[2]/div[5]/div/div[1]/h3');
    const emailInput = await driver.findElement(By.xpath('/html/body/div[2]/div[5]/div/div[1]/div[2]/form/div[2]/input'));
    await emailInput.sendKeys(foundRecord.username);
    const passwordInput = await driver.findElement(By.xpath('/html/body/div[2]/div[5]/div/div[1]/div[2]/form/div[3]/input'));
    await passwordInput.sendKeys(foundRecord.password);
    await performStep(driver, '3 - Dang nhap', '/html/body/div[2]/div[5]/div/div[1]/div[2]/form/input[4]');
    const elementExists = await doesElementExist(driver, '/html/body/div[1]/main/div/div[5]/div[1]/div[1]/h3');
    sendMessage(`Login successful ${foundRecord.username} module ${existsModule.join(', ')}`);
    console.log(`LOGIN SUCCESSFULLLLLLLLLLLLLLLLLLLLLL ${foundRecord.username}`)
    await performStep(driver, '4 - Tiep tuc o ma giam gia', '/html/body/div[1]/main/div/div[6]/div/button[2]');
    if (elementExists) {
        await driver.sleep(1500);
        await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/form/div/div[3]/div');
        await driver.sleep(1500);
        await performStep(driver, '5 - Form hoc vien', '/html/body/div[1]/main/div/div[6]/div/button[2]');
    }
    await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div/div/div[1]/label');
    await performStep(driver, '5 - Tiep tuc o buoc hoa don', '/html/body/div[1]/main/div/div[6]/div/button[2]');
    await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div[1]/div[3]/div/div');
    const doneBtn = await doesElementExist(driver, '/html/body/div[1]/main/div/div[6]/div/button[2]');
    if (doneBtn) {
        await performStep(driver, '6 - Nhấn Done', '/html/body/div[1]/main/div/div[6]/div/button[2]');
        console.log(`${foundRecord.username} Đã nhấn hoàn thành`)
        await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div[1]/div[1]/p');
        await axios.get(`http://52.220.227.223:3000/api/users/update?id=${foundRecord.id}&isActive=0`);
        sendMessage(`ĐĂNG KÝ THÀNH CÔNG - EMAIL: ${foundRecord.username} - MODULE: ${existsModule.join(', ')}&isDone=true`);
        console.log(`ĐĂNG KÝ THÀNH CÔNG - EMAIL: ${foundRecord.username} - MODULE: ${existsModule.join(', ')}`);
    }
}