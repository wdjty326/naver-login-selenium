import { Builder, Browser, By } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import * as chromeLauncher from "chrome-launcher";
import CDP from "chrome-remote-interface";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chromeServiceBuilder = new chrome.ServiceBuilder(path.resolve(__dirname, "..", "drivers", "chromedriver"));

export const run = async () => {
	// Chrome을 수동으로 시작
	const launcher = await chromeLauncher.launch({
		chromeFlags: ["--disable-blink-features=AutomationControlled"]
	});

	// Chrome DevTools 프로토콜에 연결
	const client = await CDP({ port: launcher.port });

	// DevTools 세션을 통해 속성 변경
	const { Network, Page, Runtime } = client;
	await Promise.all([Network.enable(), Page.enable()]);

	await Runtime.evaluate({
		expression: `
				Object.defineProperty(navigator, 'webdriver', {
						get: () => undefined
				});
				Object.defineProperty(navigator, 'languages', {
						get: () => ['en-US', 'en']
				});
				Object.defineProperty(navigator, 'plugins', {
						get: () => [1, 2, 3, 4, 5]
				});
		`
	});

	const options = new chrome.Options();
	options.addArguments(`--remote-debugging-port=${launcher.port}`);

	let driver = await new Builder()
		.forBrowser(Browser.CHROME)
		.setChromeOptions(options)
		.setChromeService(chromeServiceBuilder)
		.build();

	try {
		await driver.get("https://nid.naver.com/nidlogin.login");
		await driver.getSession();
		// 로그인정보 입력 후, 로그인 버튼 클릭
		await driver.findElement(By.id("id")).click();
		await driver.findElement(By.id("id")).sendKeys(process.env.USERNAME);

		await driver.findElement(By.id("pw")).click();
		await driver.findElement(By.id("pw")).sendKeys(process.env.PASSWORD);
		await driver.findElement(By.id('keep')).click();
		await driver.findElement(By.id('log.login')).click();
		// const cookies = await driver.manage().getCookies();
		// console.log(cookies);
	} finally {
		await driver.quit();
		await client.close();
		await launcher.kill();
	}
};
run();