const { By, until } = require('selenium-webdriver');
const webdriver = require('selenium-webdriver');
require('chromedriver');
const axios = require('axios');
const chrome = require('selenium-webdriver/chrome');
const currentDir = __dirname;

openUrlAndReload();

async function setupWebDriver(isProxy) {
    let options = new chrome.Options();
    if (isProxy) {
        const baseDirectory = 'extension';
        const proxyRandom = await getRandomFilePath(baseDirectory);
        const extensionPath = `${currentDir}\\extension\\${proxyRandom}`;
        options.addArguments([`--load-extension=${extensionPath}`])
    }
    let driver = new webdriver.Builder()
        .withCapabilities(webdriver.Capabilities.chrome())
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
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

async function getOne() {
    try {
        const response = await axios.get(`http://52.220.227.223:3000/api/get-one-test`);
        return response.data;
    } catch (error) {
        throw new Error('Đã xảy ra lỗi khi tải JSON: ' + error.message);
    }
}

async function openUrlAndReload() {
    let driver
    try {
        driver = await setupWebDriver(false);
        await driver.get('https://www.goethe.de/coe?lang=vi&oid=dd3ad6c98b17ed54080a0a6cf519318eed7ec7f4a89b01c8232224f419cf5d59');
        await clickShadowRootButton(driver, 10000);
        await driver.wait(until.elementLocated(By.xpath('/html/body/div[1]/main/div/div[5]/div[3]')), 10000);
        let user = await getOne();
        await performStep(driver, '1 - Tiep tuc', '/html/body/div[1]/main/div/div[6]/div/button[2]');
        await waitForElement(driver, '/html/body/div[1]/main/div/div[5]/div/div/div/p[2]');
        await performStep(driver, '2 - Dang ki cho toi', '/html/body/div[1]/main/div/div[5]/div/div/div/div/button[2]');
        await waitForElement(driver, '/html/body/div[2]/div[5]/div/div[1]/h3');
        const emailInput = await driver.findElement(By.xpath('/html/body/div[2]/div[5]/div/div[1]/div[2]/form/div[2]/input'));
        await emailInput.sendKeys(user.username);
        const passwordInput = await driver.findElement(By.xpath('/html/body/div[2]/div[5]/div/div[1]/div[2]/form/div[3]/input'));
        await passwordInput.sendKeys(user.password);
        await performStep(driver, '3 - Dang nhap', '/html/body/div[2]/div[5]/div/div[1]/div[2]/form/input[4]');
    } catch (error) {
      console.log(error)
    }
}