
import {generateText, stepCountIs, tool, type ToolSet} from "ai";
import {openai} from "@ai-sdk/openai"
import { buildMessages } from "./utils.ts";

import {z} from "zod"


import type {
EvalData,
SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";


const TOOL_DEFINITIONS: any = {
  readFile: {
    description: "Reads the contents of a file at the specified path",
    parameters: z.object({
      path: z.string().describe('The path to the file').min(1, "Path is required")
    })
  },
  writeFile: {
    description: "Writes content to a file at the specified path",
    parameters: z.object({
      path: z.string().describe('The path to the file you want to write to').min(1, "Path is required"),
      content: z.string().describe('The content to write to the file').min(1, "Content is required")
    })
  },
  listFiles: {
    description: "Lists all files in the specified directory",
    parameters: z.object({
      path: z.string().describe('The path to the directory').min(1, "Path is required")
    })
  },
  deleteFile: {
    description: "Deletes the file at the specified path",
    parameters: z.object({
      path: z.string().describe('The path to the file').min(1, "Path is required")
    })
  },
  runCommand: {
    description: "Runs a command in the system shell and return the output",
    parameters: z.object({
      command: z.string().describe('The command to run').min(1, "Command is required")
    })
  }
}

export const singleTurnExecutorWithMocks = async (data: EvalData)=> {
  // Implementation goes here
  const messages = buildMessages(data)

  const tools: ToolSet = {};
  for (const toolName of data.tools) {
    const def = TOOL_DEFINITIONS[toolName]

    if (def) {
      tools[toolName] = tool({
        description: def.description,
        inputSchema: def.parameters,
      })
    }
  }

  const {toolCalls} = await generateText({
    model: openai(data.config?.model ?? "gpt-5-mini"),
    messages,
    tools,
    stopWhen: stepCountIs(1),
    temperature: data.config?.temperature ?? undefined,
  });

  const calls = toolCalls.map(tc => ({ toolName: tc.toolName, args: 'args' in tc ? tc.args : undefined }));

  const toolNames = toolCalls.map(tc => tc.toolName);

  return {
    toolCalls: calls,
    toolNames: toolNames,
    selectedAny: toolNames.length > 0
  }
};