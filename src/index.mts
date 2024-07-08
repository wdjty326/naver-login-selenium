import { PerformanceObserver, performance } from "perf_hooks";

import { Handler } from "aws-lambda";

// https://github.com/Sparticuz/chromium/releases 에서 배포중인 layer 를 직접 계층에 등록후 사용바람
// v122 아래버전으로 적용
import chromium from "@sparticuz/chromium";

import { chromium as playwright } from "playwright";
import type { Browser } from "playwright";

chromium.setGraphicsMode = false;
chromium.setHeadlessMode = true;

const nidParser = async () => {
	// 개발 환경에서 설정 가져오기
	if (process.env.NODE_ENV === "development") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}

	let browser: Browser | null = null;
	let NID_SES: string = "";

	if (!process.env.NID_ID || !process.env.NID_PW) return NID_SES;

	try {
		const executablePath = await chromium.executablePath();
		browser = await playwright.launch(process.env.NODE_ENV === "development" ?
			undefined :
			{
				executablePath,
				headless: chromium.headless as unknown as boolean,
				args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
			});

		const context = await browser.newContext();

		const page = await context.newPage();
		console.log("page...");
		await page.goto("https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fchzzk.naver.com%2F");

		let nidID = page.getByLabel("아이디");		
		if (!await nidID.isVisible()) nidID = page.getByLabel("ID");
		console.log("@visible ID");

		let nidPW = page.getByLabel("비밀번호");
		if (!await nidPW.isVisible()) nidPW = page.getByLabel(">Password");
		console.log("@visible PW");

		if (!await nidID.isVisible() || !await nidID.isVisible()) return NID_SES;

		await nidID.fill(process.env.NID_ID);
		page.waitForTimeout(200);

		await nidPW.fill(process.env.NID_PW);
		page.waitForTimeout(100);

		await page.keyboard.press("Enter");
		console.log("@login");

		await page.waitForURL("https://chzzk.naver.com/");
		const cookies = await context.cookies();
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
		if (browser !== null) {
			await 
			await browser.close();
		}
	}

	return NID_SES;
};

export const handler: Handler = async (event, context) => {
	const nidSession = await nidParser();

	return {
		nidSession
	};
};