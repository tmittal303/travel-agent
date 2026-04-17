import Anthropic from "@anthropic-ai/sdk";
import { schedulingTools } from "./tools";
import { tracker } from "../tracking/tracker";
import {
  getStaffAvailability,
  getShiftCoverage,
  assignStaffToShift,
  findSwapCandidates,
  getWeeklySummary,
  approveSwapRequest,
} from "./executors";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a smart scheduling assistant for Porter Airlines ground staff at Billy Bishop Toronto City Airport (YTZ).

You help station managers with:
- Viewing shift coverage and identifying gaps
- Auto-filling understaffed shifts by finding available qualified staff
- Processing shift swap requests from team members
- Providing weekly scheduling summaries and recommendations

TOOLS AVAILABLE:
- get_weekly_summary: Start here for general queries about the week
- get_shift_coverage: See what shifts need staff
- get_staff_availability: Check who is available and qualified
- assign_staff_to_shift: Assign a staff member (validates certs, hours, availability automatically)
- find_swap_candidates: Find who can cover a swap request
- approve_swap_request: Approve or reject a pending swap

BEHAVIOUR:
- For "fill gaps" or "auto-schedule" requests: call get_shift_coverage(understaffed_only=true), then get_staff_availability, then assign the best matches
- Always validate before assigning — the assign tool handles this but explain rejections clearly
- For swap requests: call find_swap_candidates first, recommend the best option, then approve if asked
- Be concise. Use names not IDs in your response.
- After taking actions, summarize what changed.

Respond in clear plain text. No markdown headers. Use short bullet points where helpful.`;

async function executeTool(name: string, input: any): Promise<any> {
  switch (name) {
    case "get_staff_availability": return getStaffAvailability(input);
    case "get_shift_coverage": return getShiftCoverage(input);
    case "assign_staff_to_shift": return assignStaffToShift(input);
    case "find_swap_candidates": return findSwapCandidates(input);
    case "get_weekly_summary": return getWeeklySummary(input);
    case "approve_swap_request": return approveSwapRequest(input);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

export interface ScheduleAgentResult {
  reply: string;
  steps: string[];
  actions: { type: string; detail: string }[];
}

export async function runScheduleAgent(
  userMessage: string,
  conversationHistory: Anthropic.MessageParam[] = []
): Promise<ScheduleAgentResult> {
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const steps: string[] = [];
  const actions: { type: string; detail: string }[] = [];
  let iteration = 0;
  const MAX_ITERATIONS = 8;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: schedulingTools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const reply = response.content
        .filter((b) => b.type === "text")
        .map((b: any) => b.text)
        .join("")
        .trim();
      return { reply, steps, actions };
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b) => b.type === "tool_use") as Anthropic.ToolUseBlock[];
      steps.push(`Called: ${toolUses.map((t) => t.name).join(", ")}`);

      const toolResults = await Promise.all(
        toolUses.map(async (toolUse) => {
          try {
            const result = await executeTool(toolUse.name, toolUse.input);

            // Track actions taken
            if (toolUse.name === "assign_staff_to_shift" && result.success) {
              actions.push({ type: "assignment", detail: result.message });
            }
            if (toolUse.name === "approve_swap_request" && result.success) {
              actions.push({ type: "swap", detail: result.message });
            }

            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            };
          } catch (err: any) {
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: err.message }),
              is_error: true,
            };
          }
        })
      );

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  }

  throw new Error("Scheduling agent exceeded max iterations");
}
