import "dotenv/config";
import {generateText, type ModelMessage} from "ai";
import {openai} from "@ai-sdk/openai";
import {tools} from './tools/index'
import { executeTool } from "./executeTools";
import { SYSTEM_PROMPT } from "./system/prompt";
import type { AgentCallbacks } from "../types";
const MODEL_NAME = "gpt-5-mini"

export const runAgent = async (userMessage: string,conversationHistory: ModelMessage[], callbacks?: AgentCallbacks) => {
  const {text, toolCalls} = await generateText({
    model: openai(MODEL_NAME),
    prompt: userMessage,
    system: SYSTEM_PROMPT,
    tools,
  })

  console.log(text, toolCalls);

  toolCalls.forEach(( async tc => {
    console.log(await executeTool(tc.toolName,tc.input))
  }))
};

runAgent("What is the current time and date?")