import { tools } from "./tools/index.ts";
export type Toolname = keyof typeof tools;

export const executeTool = async (
	name: string,
	args: Record<string, unknown>,
) => {
	const tool = tools[name as Toolname];

	if (!tool) {
		return "Unknown tool. this does not exist";
	}

	const execute = tool.execute;

	if (!execute) {
		return `This is not a registered tool`;
	}

	// The tool is chosen dynamically; its schema validates the corresponding input.
	const result = await execute(args as never, {
		toolCallId: "",
		messages: [],
		context: {},
	});

	return String(result);
};
