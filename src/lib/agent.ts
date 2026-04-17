import { travelTools } from "./tools/definitions";
import { getDriveTimes, searchFlights, searchHotels } from "./tools/executors";
import { tracker } from "./tracking/tracker";
import { anthropic } from "./anthropic";

const SYSTEM_PROMPT = `You are a last-minute travel deal agent for Canadian travellers departing from Toronto.

STRICT OUTPUT RULE: Your FINAL response MUST be a raw JSON array and NOTHING else. No explanation, no markdown, no code fences, no preamble, no postamble. Start with [ and end with ]. Any text outside the array will break the app.

Your steps:
1. Call parse_intent FIRST. Include 6-8 realistic Ontario/Quebec/nearby US candidate destinations.
2. Call get_drive_times for ALL candidates in one call.
3. Call search_hotels for the top 5-6 driveable destinations in parallel.
4. When all tool results are in: build the JSON array and output it.

IMPORTANT: Always include all destinations that have drive time data, even if hotel search returned mock/fallback data. Use the hotel data you have — mock data is fine for prototyping.

Each object in the array must match this exact shape:
{
  "city": "Kingston",
  "province": "ON",
  "distanceHours": 2.5,
  "transport": "drive",
  "roundTripPrice": 0,
  "hotelPricePerNight": 149,
  "hotelName": "Holiday Inn Kingston",
  "availability": "high",
  "highlight": "Historic waterfront, great restaurants",
  "departureTime": "Fri 5pm",
  "returnTime": "Sun 6pm",
  "bookingUrl": "https://www.booking.com/searchresults.html?ss=Kingston+Ontario"
}

Rules for each field:
- transport: use "fly" if you called search_flights for that destination, "drive" otherwise
- roundTripPrice: use the flight price from search_flights result, or 0 for drive trips
- bookingUrl: https://www.booking.com/searchresults.html?ss=CITYNAME+Province
- distanceHours: use the exact value from get_drive_times result

Return 4-6 deals sorted by best fit to the user's intent.

FINAL REMINDER: Output ONLY the JSON array. Nothing before [. Nothing after ].`;

// Dispatch a tool call to the right executor
async function executeTool(name: string, input: any): Promise<any> {
  switch (name) {
    case "parse_intent":
      return input; // Claude already structured it

    case "get_drive_times":
      return await getDriveTimes(input);

    case "search_flights":
      return await searchFlights(input);

    case "search_hotels":
      return await searchHotels(input);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export interface Deal {
  city: string;
  province: string;
  distanceHours: number;
  transport: "drive" | "fly" | "bus" | "train";
  roundTripPrice: number;
  hotelPricePerNight: number;
  hotelName: string;
  availability: "high" | "low" | "sold out";
  highlight: string;
  departureTime: string;
  returnTime: string;
  bookingUrl: string;
}

export interface AgentResult {
  deals: Deal[];
  parsedIntent: {
    origin: string;
    depart_date: string;
    return_date: string;
    max_hours?: number;
    budget_cad?: number;
    vibe?: string;
  };
  steps: string[]; // log of what the agent did, for transparency
}

export async function runTravelAgent(userQuery: string): Promise<AgentResult> {
  console.log("[agent] runTravelAgent started");
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userQuery },
  ];

  const steps: string[] = [];
  let parsedIntent: any = {};
  let iteration = 0;
  const MAX_ITERATIONS = 6;
  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const allToolsUsed: string[] = [];

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: travelTools,
      messages,
    });
    totalInputTokens += response.usage?.input_tokens ?? 0;
    totalOutputTokens += response.usage?.output_tokens ?? 0;

    // Claude finished — parse the final JSON response
    if (response.stop_reason === "end_turn") {
      const raw = response.content
        .filter((b) => b.type === "text")
        .map((b: any) => b.text)
        .join("");

      // Strip markdown code fences if Claude wrapped the JSON
      const text = raw
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      steps.push(`Raw response (first 200 chars): ${text.slice(0, 200)}`);

      const jsonStart = text.indexOf("[");
      const jsonEnd = text.lastIndexOf("]");

      if (jsonStart === -1) {
        // Claude returned text but no array — ask it again explicitly
        steps.push("No JSON array found, retrying with explicit instruction...");
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: "Your response must be a raw JSON array only. Output the deals array now, starting with [ and ending with ]. No other text.",
        });
        continue;
      }

      const deals: Deal[] = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      steps.push(`Returned ${deals.length} deals`);

      console.log("[agent] about to log to tracker, tokens:", totalInputTokens, totalOutputTokens);
      tracker.log({
        timestamp: new Date().toISOString(),
        agent: "travel",
        model: "claude-sonnet-4-5",
        userQuery: messages[0].content as string,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        durationMs: Date.now() - startTime,
        toolCallCount: allToolsUsed.length,
        toolsUsed: [...new Set(allToolsUsed)],
        iterations: iteration,
        success: true,
      });
      console.log("[agent] tracker.log done");

      return { deals, parsedIntent, steps };
    }

    // Claude wants to call tools
    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b) => b.type === "tool_use") as Anthropic.ToolUseBlock[];

      const toolNames = toolUses.map((t) => t.name);
      steps.push(`Tool calls: ${toolNames.join(", ")}`);
      allToolsUsed.push(...toolNames);

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolUses.map(async (toolUse) => {
          try {
            const result = await executeTool(toolUse.name, toolUse.input);

            // Capture parsed intent for the response
            if (toolUse.name === "parse_intent") {
              parsedIntent = result;
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

      // Append assistant turn + tool results, then loop
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  }

  throw new Error("Agent exceeded max iterations without finishing");
}