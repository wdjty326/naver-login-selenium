import { Handler } from "aws-lambda";

// https://github.com/Sparticuz/chromium/releases 에서 배포중인 layer 를 직접 계층에 등록후 사용바람
// v122 아래버전으로 적용
import chromium from "@sparticuz/chromium";
import util from "util";

import { chromium as playwright } from "playwright";
import type { Browser } from "playwright";
import { getObject, putObject } from "./command.mjs";

chromium.setGraphicsMode = false;
chromium.setHeadlessMode = true;

/**
 * 사용할 계정정보를 가져옵니다.
 */
const nidAccount = async () => {
	if (!process.env.NID_ID || !process.env.NID_PW) return null;

	const nidIds = process.env.NID_ID.split(",");
	const nidPws = process.env.NID_PW.split(",");

	let nidId = nidIds[0];
	let nidPw = nidPws[0];

	try {
		const filterList: string[] = [];
		const data = await getObject(process.env.S3_ACC_KEYNAME as string);
		filterList.push(...data.split(","));

		if (filterList.length === nidIds.length) {
			filterList.length = 0;
		}

		for (const filterId of filterList) {
			const index = nidIds.indexOf(filterId);
			if (index !== -1) {
				nidIds.splice(index, 1);
				nidPws.splice(index, 1);
			}
		}

		nidId = nidIds[0];
		nidPw = nidPws[0];

		filterList.push(nidId);
		await putObject(process.env.S3_ACC_KEYNAME as string, filterList.join(","));
	} catch (e) {
		console.log(e);
	}

	return [nidId, nidPw];
};

const nidCookieParser = async () => {
	// 개발 환경에서 설정 가져오기
	if (process.env.NODE_ENV === "development") {
		const dotenv = await import("dotenv");
		dotenv.config();
	}

	let browser: Browser | null = null;
	let NID_SES: string = "";

	try {
		const account = await nidAccount();
		if (!account) return;

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

		await nidID.fill(account[0]);
		page.waitForTimeout(200);

		await nidPW.fill(account[1]);
		page.waitForTimeout(100);

		await page.keyboard.press("Enter");
		console.log("@login");

		await page.waitForURL("https://chzzk.naver.com/", { timeout: 5000 });
		const cookies = await context.cookies();
		const arr: string[] = [];
		for (const cookie of cookies) {
			arr.push(`${cookie.name}=${cookie.value}`);
		}
		NID_SES = arr.join(";");
		if (NID_SES) {
			console.log("Found Cookie: %s", NID_SES);
		}

		putObject(process.env.S3_KEYNAME as string, NID_SES);
	} finally {
		if (browser !== null) {
			await browser.close();
		}
	}

	return NID_SES;
};

export const handler: Handler = async (event, context, callback) => {
	console.info(util.inspect(event, { depth: null }));
	callback(null, await nidCookieParser());
};