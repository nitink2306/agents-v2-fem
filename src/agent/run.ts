import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import {getTracer, Laminar} from "@lmnr-ai/lmnr"
import { tools } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";

import type { AgentCallbacks } from "../types.ts";

const MODEL_NAME = "gpt-5-mini";

Laminar.initialize({
    projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<any> {
  // Filter and check if we need to compact the conversation history before starting
  const { text } = await generateText({
    model: openai(MODEL_NAME),
    prompt: userMessage,
    system: SYSTEM_PROMPT,
    tools,
    experimental_telemetry: {
        isEnabled: true,
        tracer: getTracer()
    },
  });

  await Laminar.flush();

  console.log(text);
}

// runAgent("What is the current time and date?")

