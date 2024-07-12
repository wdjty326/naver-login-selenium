import fs from "fs"; // 개발은 `fs` 로 처리
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

const client = new S3Client({ region: "ap-northeast-2" });

if (process.env.NODE_ENV === "development") {
	if (!fs.existsSync(path.resolve("__test__")))
			fs.mkdirSync(path.resolve("__test__"));
}

export const putObject = async (Key: string, Body?: string) => {
	if (process.env.NODE_ENV === "development") {
		fs.writeFileSync(path.resolve("__test__", Key), Body || "", { encoding: "utf8" });
		return;
	}
	const command = new PutObjectCommand({
		Bucket: process.env.S3_BUCKET as string,
		Key,
		Body,
	});
	await client.send(command);
};

export const getObject = async (Key: string): Promise<string> => {
	if (process.env.NODE_ENV === "development") {
		if (!fs.existsSync(path.resolve("__test__", Key))) return "";
		return fs.readFileSync(path.resolve("__test__", Key), { encoding: "utf8" });
	}

	try {
		const command = new GetObjectCommand({
			Bucket: process.env.S3_BUCKET as string,
			Key,
		});
		const resp = await client.send(command);
		return resp.Body?.transformToString() || "";	
	} catch (e) {
		console.error(e);
	}
	return "";
};