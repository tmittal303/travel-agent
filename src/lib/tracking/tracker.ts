// ─── Pricing (USD per million tokens) ────────────────────────────────────────
const PRICING = {
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-6":   { input: 15.0, output: 75.0 },
  "claude-haiku-4-5":  { input: 0.8,  output: 4.0  },
};

export type AgentType = "travel" | "scheduling";

export interface ApiCall {
  id: string;
  timestamp: string;
  agent: AgentType;
  model: string;
  userQuery: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  toolCallCount: number;
  toolsUsed: string[];
  iterations: number;
  success: boolean;
  error?: string;
}

export interface UsageSummary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  byAgent: Record<AgentType, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  }>;
  byDay: Record<string, { calls: number; tokens: number; costUsd: number }>;
  recentCalls: ApiCall[];
  avgTokensPerCall: number;
  avgCostPerCall: number;
  mostUsedTools: { tool: string; count: number }[];
}

class TokenTracker {
  private calls: ApiCall[] = [];
  private callCounter = 0;

  log(call: Omit<ApiCall, "id" | "costUsd">): ApiCall {
    const pricing = PRICING[call.model as keyof typeof PRICING] ?? PRICING["claude-sonnet-4-5"];
    const costUsd = (call.inputTokens / 1_000_000) * pricing.input
                  + (call.outputTokens / 1_000_000) * pricing.output;

    const entry: ApiCall = {
      ...call,
      id: `call_${++this.callCounter}_${Date.now()}`,
      costUsd: parseFloat(costUsd.toFixed(6)),
    };

    this.calls.push(entry);
    if (this.calls.length > 500) this.calls = this.calls.slice(-500);
    return entry;
  }

  getSummary(): UsageSummary {
    const byAgent: UsageSummary["byAgent"] = {
      travel: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 },
      scheduling: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 },
    };
    const byDay: Record<string, { calls: number; tokens: number; costUsd: number }> = {};
    const toolCounts: Record<string, number> = {};

    for (const call of this.calls) {
      byAgent[call.agent].calls++;
      byAgent[call.agent].inputTokens += call.inputTokens;
      byAgent[call.agent].outputTokens += call.outputTokens;
      byAgent[call.agent].totalTokens += call.totalTokens;
      byAgent[call.agent].costUsd += call.costUsd;

      const day = call.timestamp.split("T")[0];
      if (!byDay[day]) byDay[day] = { calls: 0, tokens: 0, costUsd: 0 };
      byDay[day].calls++;
      byDay[day].tokens += call.totalTokens;
      byDay[day].costUsd += call.costUsd;

      for (const tool of call.toolsUsed) {
        toolCounts[tool] = (toolCounts[tool] ?? 0) + 1;
      }
    }

    for (const agent of Object.keys(byAgent) as AgentType[]) {
      byAgent[agent].costUsd = parseFloat(byAgent[agent].costUsd.toFixed(6));
    }

    const totalCalls = this.calls.length;
    const totalInputTokens = this.calls.reduce((s, c) => s + c.inputTokens, 0);
    const totalOutputTokens = this.calls.reduce((s, c) => s + c.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCostUsd = parseFloat(this.calls.reduce((s, c) => s + c.costUsd, 0).toFixed(6));

    const mostUsedTools = Object.entries(toolCounts)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCalls, totalInputTokens, totalOutputTokens, totalTokens, totalCostUsd,
      byAgent, byDay,
      recentCalls: [...this.calls].reverse().slice(0, 50),
      avgTokensPerCall: totalCalls ? Math.round(totalTokens / totalCalls) : 0,
      avgCostPerCall: totalCalls ? parseFloat((totalCostUsd / totalCalls).toFixed(6)) : 0,
      mostUsedTools,
    };
  }

  getCalls() { return [...this.calls].reverse(); }
  clear() { this.calls = []; this.callCounter = 0; }
}

// Use globalThis so the singleton survives Next.js hot reload
// and is shared across all route modules in the same process
const globalForTracker = globalThis as unknown as { __tracker: TokenTracker };
if (!globalForTracker.__tracker) {
  globalForTracker.__tracker = new TokenTracker();
}
export const tracker = globalForTracker.__tracker;