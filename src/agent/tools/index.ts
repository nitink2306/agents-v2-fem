import { dateTime } from "./dateTime.ts";
import { deleteFile, listFiles, readFile, writeFile } from "./file.ts";
// import { runCommand } from "./shell.ts";
// import { executeCode } from "./codeExecution.ts";
import { webSearch } from "./webSearch.ts";

// All tools combined for the agent
export const tools = {
	readFile,
	writeFile,
	listFiles,
	deleteFile,
	dateTime,
	webSearch,
};

// Export individual tools for selective use in evals
export { deleteFile, listFiles, readFile, writeFile } from "./file.ts";
// export { runCommand } from "./shell.ts";
// export { executeCode } from "./codeExecution.ts";
export { webSearch } from "./webSearch.ts";

// Tool sets for evals
export const fileTools = {
	readFile,
	writeFile,
	listFiles,
	deleteFile,
};

// export const shellTools = {
//   runCommand,
// };
