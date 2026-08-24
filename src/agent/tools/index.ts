import { dateTime } from "./dateTime.ts";
import { deleteFile, listFiles, readFile, writeFile } from "./file.ts";

// All tools combined for the agent
export const tools = {
	readFile,
	writeFile,
	listFiles,
	deleteFile,
	dateTime,
};

export { deleteFile, listFiles, readFile, writeFile } from "./file.ts";

export const fileTools = {
	readFile,
	writeFile,
	listFiles,
	deleteFile,
};
