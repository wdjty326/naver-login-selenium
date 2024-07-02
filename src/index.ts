import { Handler } from "aws-lambda";

import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import dotenv from "dotenv";

// 환경 설정 가져오기
dotenv.config({ path: path.resolve(__dirname, "..", ".env" )})

puppeteer.use(StealthPlugin()); // 플러그인 추가

const nidParser = async () => {
	let NID_SES = null;
	const browser = await puppeteer.launch({
		headless: false,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-accelerated-2d-canvas',
			'--disable-gpu',
			'--disable-infobars',
			'--window-size=1920x1080',
		],
	});

	const page = await browser.newPage();
	await page.setViewport({ width: 1200, height: 800 });

	try {
		await page.goto("https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fchzzk.naver.com%2F");

		await page.type("input#id", process.env.NID_ID, {delay: 100});
		await page.type("input#pw", process.env.NID_PW, {delay: 100});
		await page.keyboard.press("Enter", { delay: 100 });
	
		await page.waitForNavigation();
		const cookies = await page.cookies();

		let NID_SES = null;
		for (const cookie of cookies) {
			if (cookie.name === "NID_SES") {
				NID_SES = cookie.value;
				break;
			}
		}

		if (NID_SES) {
			console.log("Found NID_SES: %s", NID_SES);
		} else {
			console.error("NID_SES not found.");
		}
	} finally {
		await page.close();
		await browser.close();	
	}

	return NID_SES;
};

export const handler: Handler = async (event, context) => {
	const nidSession = await nidParser();

	return {
		nidSession
	};
};