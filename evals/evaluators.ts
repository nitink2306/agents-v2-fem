import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import type {
  EvalTarget,
  SingleTurnResult,
  MultiTurnTarget,
  MultiTurnResult,
} from "./types.ts";

export function toolsSelected(
  output: SingleTurnResult | MultiTurnResult,
  target: EvalTarget | MultiTurnTarget,
): number {
  const expectedTools =
  "expectedTools" in target
  ? target.expectedTools
  : "expectedToolOrder" in target
  ? target.expectedToolOrder
  : undefined;
  
  if (!expectedTools?.length) return 1;
  
  const selected = new Set(
    "toolNames" in output ? output.toolNames : output.toolsUsed,
  );
  
  return expectedTools.every((t) => selected.has(t)) ? 1 : 0;
}

/**
 * Evaluator: Check if forbidden tools were avoided.
 * Returns 1 if NONE of the forbidden tools are in the output, 0 otherwise.
 * For negative prompts.
*/
export function toolsAvoided(
  output: SingleTurnResult | MultiTurnResult,
  target: EvalTarget | MultiTurnTarget,
): number {
  if (!target.forbiddenTools?.length) return 1;
  
  const selected = new Set(
    "toolNames" in output ? output.toolNames : output.toolsUsed,
  );
  
  return target.forbiddenTools.some((t) => selected.has(t)) ? 0 : 1;
}

/**
 * Evaluator: Precision/recall score for tool selection.
 * Returns a score between 0 and 1 based on correct selections.
 * For secondary prompts.
*/
export function toolSelectionScore(
  output: SingleTurnResult,
  target: EvalTarget,
): number {
  if (!target.expectedTools?.length) {
    return output.selectedAny ? 0.5 : 1;
  }
  
  const expected = new Set(target.expectedTools);
  const selected = new Set(output.toolNames);
  
  const hits = output.toolNames.filter((t) => expected.has(t)).length;
  const precision = selected.size > 0 ? hits / selected.size : 0;
  const recall = expected.size > 0 ? hits / expected.size : 0;
  
  // Simple F1-ish score
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function toolOrderCorrect(
  output: MultiTurnResult,
  target: MultiTurnTarget,
): number {
  if (!target.expectedToolOrder?.length) return 1;
  
  const actualOrder = output.toolCallOrder;
  
  // Check if expected tools appear in order (not necessarily consecutive)
  let expectedIdx = 0;
  for (const toolName of actualOrder) {
    if (toolName === target.expectedToolOrder[expectedIdx]) {
      expectedIdx++;
      if (expectedIdx === target.expectedToolOrder.length) break;
    }
  }
  
  return expectedIdx / target.expectedToolOrder.length;
}

// Structured output schema for the LLM judge
const judgeSchema = z.object({
  score: z
    .number()
    .min(1)
    .max(10)
    .describe("Score from 1 to 10, where 10 is the best/perfect score"),
  reason: z
    .string()
    .describe("Reason for the score, explaining the evaluation"),
});

export const llmJudge = async (
  output: MultiTurnResult,
  target: MultiTurnTarget,
) => {
  const result = await generateObject({
    // Use the LLM to evaluate the output against the target
    // generateObject is a function that takes a model, schema, and messages to generate structured output based on the provided schema. In this case, it uses the "gpt-5-mini" model to evaluate the output against the target and returns an object containing a score and reason for the evaluation. generateText just generates text, while generateObject ensures the output adheres to the specified schema.
    model: openai("gpt-5-mini"),
    schema: judgeSchema,
    schemaName: "evaluation",
    providerOptions: {
      openai: {
        reasoningEffort: "high",
      },
    },
    schemaDescription: "Evaluation of an AI agent response",
    messages: [
      {
        role: "system",
        content: `You are an evaluation judge. Score the agent's response on a scale of 1-10.

Scoring criteria:
- 10: Response fully addresses the task using tool results correctly
- 7-9: Response is mostly correct with minor issues
- 4-6: Response partially addresses the task
- 1-3: Response is mostly incorrect or irrelevant`,
      },
      {
        role: "user",
        content: `Task: ${target.originalTask}

Tools called: ${JSON.stringify(output.toolCallOrder)}
Tool results provided: ${JSON.stringify(target.mockToolResults)}

Agent's final response:
${output.text}

Evaluate if this response correctly uses the tool results to answer the task.`,
      },
    ],
  });
  return result.object.score / 10; // Normalize score to 0-1
};