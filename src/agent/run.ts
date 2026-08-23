import { openai } from "@ai-sdk/openai";
import { Laminar } from "@lmnr-ai/lmnr";
import { type ModelMessage, streamText } from "ai";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { executeTool } from "./executeTools.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import { tools } from "./tools/index.ts";

const MODEL_NAME = "gpt-5-mini";

Laminar.initialize({
	projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

export async function runAgent(
	userMessage: string,
	conversationHistory: ModelMessage[],
	callbacks: AgentCallbacks,
): Promise<ModelMessage[]> {
	const workingHistory = filterCompatibleMessages(conversationHistory);
	const messages: ModelMessage[] = [
		...workingHistory, // conversation so far fitered to only include compatible messages
		{ role: "user", content: userMessage },
	];

	let fullResponse = "";
	while (true) {
		const result = streamText({
			model: openai(MODEL_NAME),
			instructions: SYSTEM_PROMPT,
			messages,
			tools,
			experimental_telemetry: {
				isEnabled: true,
				// tracer: getTracer(),
			},
		});

		const toolCalls: ToolCallInfo[] = [];
		let currentText = "";
		let streamError: Error | null = null;

		try {
			for await (const chunk of result.fullStream) {
				if (chunk.type === "text-delta") {
					currentText += chunk.text;
					callbacks.onToken(chunk.text);
				}

				if (chunk.type === "tool-call") {
					const input = "input" in chunk ? chunk.input : {};
					toolCalls.push({
						toolCallId: chunk.toolCallId,
						toolName: chunk.toolName,
						args: input as Record<string, unknown>,
					});
					callbacks.onToolCallStart(chunk.toolName, input);
				}
			}
		} catch (e) {
			streamError = e as Error;

			if (
				!currentText &&
				!streamError.message.includes("No output generated ")
			) {
				throw streamError;
			}
		}

		fullResponse += currentText;

		if (streamError && !currentText) {
			fullResponse = "Sorry about that.";
			callbacks.onToken(fullResponse);
			break;
		}

		const finishReason = await result.finishReason;

		if (finishReason !== "tool-calls" || toolCalls.length === 0) {
			const responseMessages = await result.response;
			messages.push(...responseMessages.messages);
			break;
		}

		const responseMessages = await result.response;
		messages.push(...responseMessages.messages);

		for (const tc of toolCalls) {
			const result = await executeTool(tc.toolName, tc.args);

			callbacks.onToolCallEnd(tc.toolName, result);

			// Add the tool's output to the conversation history
			messages.push({
				role: "tool",
				content: [
					{
						type: "tool-result",
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						output: { type: "text", value: result },
					},
				],
			});
		}
	}
	callbacks.onComplete(fullResponse);
	return messages;
}
