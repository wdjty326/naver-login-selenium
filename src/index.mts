import { Handler } from "aws-lambda";

// https://github.com/Sparticuz/chromium/releases 에서 배포중인 layer 를 직접 계층에 등록후 사용바람
// v122 아래버전으로 적용
import chromium from "@sparticuz/chromium";
import util from "util";

import { chromium as playwright } from "playwright";
import type { Browser } from "playwright";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

chromium.setGraphicsMode = false;
chromium.setHeadlessMode = true;

const s3 = new S3Client({ region: "ap-northeast-2" });

const nidCookieParser = async () => {
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

		// 테스트시에는 s3에 키를 올리지 않음
		if (process.env.NODE_ENV !== "development") {
			const command = new PutObjectCommand({
				Bucket: process.env.S3_BUCKET as string,
				Key: process.env.S3_KEYNAME as string,
				Body: NID_SES,
			});
			await s3.send(command);	
		}
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