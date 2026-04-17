"use client";
import { useState, useRef, useEffect } from "react";
import type { Deal, AgentResult } from "@/lib/agent";

// ─── Theme ────────────────────────────────────────────────────────────────────
const NAVY = "#1B2A4A";
const NAVY_DARK = "#111D33";
const NAVY_LIGHT = "#243660";
const GOLD = "#0077C8";
const GREY_BG = "#F4F6F9";
const WHITE = "#ffffff";
const TEXT_MUTED = "#6B7A99";

// ─── Travel tab data ──────────────────────────────────────────────────────────
const CHIPS = [
  { label: "Nature getaway", q: "Weekend nature getaway under 2 hours from Toronto, budget under $150" },
  { label: "Family weekend", q: "Family-friendly weekend trip under 3 hours from Toronto" },
  { label: "Budget solo", q: "Cheap solo trip under $200 leaving Friday from Toronto" },
  { label: "Wine country", q: "Wine country weekend trip near Toronto" },
];

const TRANSPORT_LABEL: Record<string, string> = { drive: "Drive", fly: "Fly", bus: "Bus", train: "Train" };
const TRANSPORT_ICON: Record<string, string> = { drive: "🚗", fly: "✈", bus: "🚌", train: "🚆" };

// ─── Schedule quick prompts ───────────────────────────────────────────────────
const SCHEDULE_PROMPTS = [
  { label: "Weekly summary", q: "Give me a summary of this week's schedule and any coverage gaps" },
  { label: "Fill all gaps", q: "Automatically fill all understaffed shifts this week" },
  { label: "Swap requests", q: "Show me all pending shift swap requests and recommend approvals" },
  { label: "Friday coverage", q: "Who is working Friday and are all shifts covered?" },
  { label: "Staff hours", q: "Show me each staff member's hours this week" },
];

// ─── Root component ───────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState<"travel" | "schedule" | "usage">("travel");

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: GREY_BG, minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ background: NAVY, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
          <span style={{ color: WHITE, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", fontStyle: "italic" }}><span style={{ color: "#C9A84C", fontSize: 14, marginLeft: 2 }}></span></span>
          <div style={{ display: "flex", gap: "0" }}>
            {([
              { id: "travel", label: "Weekend Deals" },
              { id: "schedule", label: "Team Scheduling" },
              { id: "usage", label: "API Usage" },
            ] as const).map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ color: activeTab === tab.id ? WHITE : "rgba(255,255,255,0.65)", fontSize: 14, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", fontWeight: activeTab === tab.id ? 600 : 400, borderBottom: activeTab === tab.id ? `2px solid ${GOLD}` : "2px solid transparent", padding: "0 16px", height: 60, transition: "all 0.15s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {activeTab === "travel" ? <TravelTab /> : activeTab === "schedule" ? <ScheduleTab /> : <UsageTab />}


      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.8);opacity:.5}40%{transform:scale(1.2);opacity:1}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Travel Tab ───────────────────────────────────────────────────────────────
function TravelTab() {
  const [query, setQuery] = useState("I want to go somewhere this weekend, under 2 hours from Toronto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  function getWeekendDates() {
    const now = new Date();
    const day = now.getDay();
    const daysUntilFri = (5 - day + 7) % 7 || 7;
    const fri = new Date(now); fri.setDate(now.getDate() + daysUntilFri);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return { fri: fmt(fri), sun: fmt(sun), today: fmt(now) };
  }

  async function search(q?: string) {
    const finalQuery = q ?? query;
    if (!finalQuery.trim()) return;
    setLoading(true); setError(null); setResult(null); setSteps([]);
    const { fri, sun, today } = getWeekendDates();
    const qWithDate = `${finalQuery}\n\n[Context: Today is ${today}. The upcoming weekend is Friday ${fri} to Sunday ${sun}. Always use these exact dates.]`;
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: qWithDate }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResult(data); setSteps(data.steps || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const pi = result?.parsedIntent;

  return (
    <>
      <div style={{ background: NAVY, padding: "3rem 2rem 3.5rem", textAlign: "center" }}>
        <p style={{ color: GOLD, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Last-minute weekend travel</p>
        <h1 style={{ color: WHITE, fontSize: "2.4rem", fontWeight: 700, margin: "0 0 8px", lineHeight: 1.15 }}>
          Where will you go <span style={{ color: GOLD, fontStyle: "italic" }}>this weekend?</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, margin: "0 0 2rem" }}>Tell us what you're looking for — we'll find the best options from Toronto</p>
        <div style={{ maxWidth: 680, margin: "0 auto", background: WHITE, borderRadius: 8, padding: "6px 6px 6px 18px", display: "flex", gap: 8, alignItems: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="e.g. Nature getaway under 2 hours from Toronto this weekend"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: NAVY, background: "transparent", fontFamily: "inherit" }} />
          <button onClick={() => search()} disabled={loading}
            style={{ padding: "11px 24px", background: loading ? "#aaa" : NAVY, color: WHITE, border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {CHIPS.map((c) => (
            <button key={c.label} onClick={() => { setQuery(c.q); search(c.q); }}
              style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)", fontSize: 12, color: "rgba(255,255,255,0.85)", cursor: "pointer", background: "rgba(255,255,255,0.08)", fontFamily: "inherit" }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "4rem 0", color: TEXT_MUTED, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: NAVY, animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
            </div>
            Searching for the best weekend options…
          </div>
        )}
        {error && <div style={{ padding: "1rem 1.25rem", background: "#fff0f0", border: "1px solid #fcc", borderRadius: 8, color: "#a33", fontSize: 13, marginBottom: "1.5rem" }}>{error}</div>}
        {pi && !loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1.5rem" }}>
            {[["📍", pi.origin], ["📅", pi.depart_date && `${pi.depart_date} → ${pi.return_date}`], ["⏱", pi.max_hours && `Max ${pi.max_hours}h`], ["💰", pi.budget_cad && `$${pi.budget_cad} CAD`], ["✨", pi.vibe]]
              .filter(([, v]) => v)
              .map(([icon, val]) => (
                <span key={String(icon)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 4, background: WHITE, border: `1px solid rgba(15,32,68,0.15)`, color: NAVY, fontSize: 12, fontWeight: 500 }}>
                  {icon} {val}
                </span>
              ))}
          </div>
        )}
        {steps.length > 0 && !loading && (
          <details style={{ marginBottom: "1.5rem", fontSize: 12, color: TEXT_MUTED }}>
            <summary style={{ cursor: "pointer", color: NAVY, fontWeight: 500 }}>Agent steps ({steps.length})</summary>
            <ol style={{ paddingLeft: "1.25rem", marginTop: 8, lineHeight: 2 }}>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </details>
        )}
        {result && result.deals.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: NAVY, margin: 0 }}>Weekend options from Toronto</h2>
              <span style={{ fontSize: 13, color: TEXT_MUTED }}>{result.deals.length} destinations found</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {result.deals.map((deal) => <DealCard key={deal.city} deal={deal} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const avail = deal.availability === "high" ? { bg: "#e8f5ee", fg: "#1a6b3a", label: "Available" }
    : deal.availability === "low" ? { bg: "#fef3dc", fg: "#7a4f0a", label: "Selling fast" }
    : { bg: "#fde8e8", fg: "#8b2020", label: "Sold out" };
  const isfly = deal.transport === "fly";
  return (
    <div style={{ background: WHITE, borderRadius: 8, overflow: "hidden", border: `1px solid rgba(15,32,68,0.1)`, display: "flex", flexDirection: "column" }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(15,32,68,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
      <div style={{ background: NAVY, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {TRANSPORT_ICON[deal.transport] ?? "🚗"} {TRANSPORT_LABEL[deal.transport] ?? "Drive"} · {deal.distanceHours}h
        </span>
        <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, fontWeight: 600, background: avail.bg, color: avail.fg }}>{avail.label}</span>
      </div>
      <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: NAVY, lineHeight: 1.15 }}>{deal.city}</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{deal.province}, Canada</div>
        </div>
        <div style={{ borderTop: `1px solid rgba(15,32,68,0.08)`, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {isfly && deal.roundTripPrice > 0 && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, color: NAVY }}>${deal.roundTripPrice}</span>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>CAD round trip</span>
            </div>
          )}
          {deal.hotelPricePerNight > 0 && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontSize: isfly ? "1rem" : "1.35rem", fontWeight: 700, color: NAVY }}>${deal.hotelPricePerNight}</span>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>/ night</span>
            </div>
          )}
          {deal.hotelName && <div style={{ fontSize: 12, color: TEXT_MUTED }}>{deal.hotelName}</div>}
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED }}>{deal.departureTime} → {deal.returnTime}</div>
        <div style={{ fontSize: 12, color: NAVY, lineHeight: 1.5, borderLeft: `3px solid ${GOLD}`, paddingLeft: 9, fontStyle: "italic" }}>{deal.highlight}</div>
      </div>
      {deal.bookingUrl && (
        <div style={{ padding: "0 1.1rem 1rem" }}>
          <a href={deal.bookingUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", width: "100%", padding: "10px 0", background: NAVY, color: WHITE, borderRadius: 6, fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
            Book {deal.city} →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: { type: string; detail: string }[];
  steps?: string[];
}

function ScheduleTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your scheduling assistant for YTZ station. I can help you view shift coverage, auto-fill gaps, process swap requests, and more. What would you like to do?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(msg?: string) {
    const text = msg ?? input;
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Build history for API (exclude the welcome message)
    const history = messages.slice(1).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent failed");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply,
        actions: data.actions,
        steps: data.steps,
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally { setLoading(false); }
  }

  return (
    <>
      {/* Schedule hero */}
      <div style={{ background: NAVY, padding: "2.5rem 2rem", textAlign: "center" }}>
        <p style={{ color: GOLD, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>YTZ Station · Billy Bishop Toronto</p>
        <h1 style={{ color: WHITE, fontSize: "2rem", fontWeight: 700, margin: "0 0 8px" }}>
          Team <span style={{ color: GOLD, fontStyle: "italic" }}>Scheduling</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>AI-powered shift management · No more Excel spreadsheets</p>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

          {/* Chat panel */}
          <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Messages */}
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12, minHeight: 420, maxHeight: 520, overflowY: "auto" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ animation: "fadeIn 0.25s ease", display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
                  <div style={{
                    maxWidth: "85%", padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: msg.role === "user" ? NAVY : "#f4f6fa",
                    color: msg.role === "user" ? WHITE : NAVY,
                    fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "85%" }}>
                      {msg.actions.map((a, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#e8f5ee", borderRadius: 6, fontSize: 12, color: "#1a6b3a" }}>
                          ✓ {a.detail}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.steps && msg.steps.length > 0 && (
                    <details style={{ fontSize: 11, color: TEXT_MUTED, maxWidth: "85%" }}>
                      <summary style={{ cursor: "pointer" }}>Agent steps ({msg.steps.length})</summary>
                      <ol style={{ paddingLeft: "1rem", lineHeight: 1.8, marginTop: 4 }}>{msg.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
                    </details>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 5, padding: "8px 0" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: NAVY, opacity: 0.4, animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: `1px solid rgba(15,32,68,0.1)`, padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about shifts, coverage, swaps…"
                style={{ flex: 1, border: `1px solid rgba(15,32,68,0.15)`, borderRadius: 6, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: NAVY }} />
              <button onClick={() => send()} disabled={loading || !input.trim()}
                style={{ padding: "9px 18px", background: loading || !input.trim() ? "#ccc" : NAVY, color: WHITE, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                Send
              </button>
            </div>
          </div>

          {/* Sidebar: quick prompts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, overflow: "hidden" }}>
              <div style={{ background: NAVY, padding: "10px 14px" }}>
                <span style={{ color: WHITE, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Quick actions</span>
              </div>
              <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: 6 }}>
                {SCHEDULE_PROMPTS.map((p) => (
                  <button key={p.label} onClick={() => send(p.q)}
                    style={{ width: "100%", padding: "9px 12px", background: "#f4f6fa", border: `1px solid rgba(15,32,68,0.1)`, borderRadius: 6, fontSize: 13, color: NAVY, cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontWeight: 500 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, overflow: "hidden" }}>
              <div style={{ background: NAVY, padding: "10px 14px" }}>
                <span style={{ color: WHITE, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Station info</span>
              </div>
              <div style={{ padding: "0.75rem", fontSize: 13, color: NAVY, display: "flex", flexDirection: "column", gap: 6 }}>
                {[["Station", "YTZ · Billy Bishop"], ["Staff", "6 team members"], ["Shifts this week", "8 scheduled"], ["Pending swaps", "1 request"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid rgba(15,32,68,0.06)` }}>
                    <span style={{ color: TEXT_MUTED }}>{k}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Usage Tab ────────────────────────────────────────────────────────────────
interface UsageSummary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  avgTokensPerCall: number;
  avgCostPerCall: number;
  byAgent: Record<string, { calls: number; inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number }>;
  byDay: Record<string, { calls: number; tokens: number; costUsd: number }>;
  mostUsedTools: { tool: string; count: number }[];
  recentCalls: {
    id: string; timestamp: string; agent: string; model: string;
    userQuery: string; inputTokens: number; outputTokens: number;
    totalTokens: number; costUsd: number; durationMs: number;
    toolCallCount: number; toolsUsed: string[]; iterations: number; success: boolean;
  }[];
}

function UsageTab() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/usage");
      setData(await res.json());
    } finally { setLoading(false); }
  }

  async function clearData() {
    if (!confirm("Clear all usage data?")) return;
    setClearing(true);
    await fetch("/api/usage", { method: "DELETE" });
    await load();
    setClearing(false);
  }

  useEffect(() => { load(); }, []);

  const fmtTokens = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
  const fmtCost = (n: number) => n < 0.001 ? `<$0.001` : `$${n.toFixed(4)}`;
  const fmtMs = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}s` : `${n}ms`;
  const agentColor = (a: string) => a === "travel" ? { bg: "#e8f0fe", fg: "#1a56a0" } : { bg: "#e8f5ee", fg: "#1a6b3a" };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "6rem 0", color: TEXT_MUTED }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: NAVY, animation: `bounce 1.2s ease-in-out ${i*0.15}s infinite` }} />)}
      </div>
      Loading usage data…
    </div>
  );

  const noData = !data || data.totalCalls === 0;

  return (
    <>
      <div style={{ background: NAVY, padding: "2.5rem 2rem", textAlign: "center" }}>
        <p style={{ color: GOLD, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Observability</p>
        <h1 style={{ color: WHITE, fontSize: "2rem", fontWeight: 700, margin: "0 0 8px" }}>
          API <span style={{ color: GOLD, fontStyle: "italic" }}>Usage & Tokens</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>Track token consumption and cost across all agents in real time</p>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: 13, color: TEXT_MUTED }}>
            {noData ? "No API calls recorded yet. Make a search or schedule query to see data." : `${data.totalCalls} call${data.totalCalls !== 1 ? "s" : ""} recorded`}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={load} style={{ padding: "7px 14px", background: WHITE, border: `1px solid rgba(15,32,68,0.2)`, borderRadius: 6, fontSize: 13, color: NAVY, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>↻ Refresh</button>
            {!noData && <button onClick={clearData} disabled={clearing} style={{ padding: "7px 14px", background: "#fde8e8", border: "1px solid #fcc", borderRadius: 6, fontSize: 13, color: "#8b2020", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>{clearing ? "Clearing…" : "Clear all"}</button>}
          </div>
        </div>

        {noData ? (
          <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, padding: "4rem", textAlign: "center", color: TEXT_MUTED }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 8 }}>No usage data yet</div>
            <div style={{ fontSize: 14 }}>Make a search in the Weekend Deals tab or ask the scheduling assistant a question — token usage will appear here automatically.</div>
          </div>
        ) : (
          <>
            {/* Summary metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
              {[
                { label: "Total API calls", value: String(data!.totalCalls) },
                { label: "Total tokens", value: fmtTokens(data!.totalTokens) },
                { label: "Input tokens", value: fmtTokens(data!.totalInputTokens) },
                { label: "Output tokens", value: fmtTokens(data!.totalOutputTokens) },
                { label: "Total cost (USD)", value: fmtCost(data!.totalCostUsd) },
                { label: "Avg tokens/call", value: fmtTokens(data!.avgTokensPerCall) },
                { label: "Avg cost/call", value: fmtCost(data!.avgCostPerCall) },
              ].map((m) => (
                <div key={m.label} style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, padding: "1rem" }}>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: NAVY }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.5rem" }}>

              {/* By agent */}
              <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, overflow: "hidden" }}>
                <div style={{ background: NAVY, padding: "10px 14px" }}>
                  <span style={{ color: WHITE, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Usage by agent</span>
                </div>
                <div style={{ padding: "1rem" }}>
                  {Object.entries(data!.byAgent).map(([agent, stats]) => {
                    if (stats.calls === 0) return null;
                    const c = agentColor(agent);
                    return (
                      <div key={agent} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid rgba(15,32,68,0.06)` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.fg, textTransform: "capitalize" }}>{agent}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmtCost(stats.costUsd)}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                          {[["Calls", stats.calls], ["Tokens", fmtTokens(stats.totalTokens)], ["Cost", fmtCost(stats.costUsd)]].map(([k, v]) => (
                            <div key={String(k)} style={{ fontSize: 12 }}>
                              <span style={{ color: TEXT_MUTED }}>{k}: </span>
                              <span style={{ color: NAVY, fontWeight: 500 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        {/* Simple token bar */}
                        <div style={{ marginTop: 8, height: 4, background: "#f0f2f5", borderRadius: 2 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: c.fg, width: `${Math.min(100, (stats.totalTokens / data!.totalTokens) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Most used tools */}
              <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, overflow: "hidden" }}>
                <div style={{ background: NAVY, padding: "10px 14px" }}>
                  <span style={{ color: WHITE, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Most used tools</span>
                </div>
                <div style={{ padding: "1rem" }}>
                  {data!.mostUsedTools.length === 0
                    ? <div style={{ fontSize: 13, color: TEXT_MUTED }}>No tool calls yet</div>
                    : data!.mostUsedTools.map((t, i) => {
                      const maxCount = data!.mostUsedTools[0].count;
                      return (
                        <div key={t.tool} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: NAVY, fontWeight: 500 }}>{t.tool}</span>
                            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{t.count}×</span>
                          </div>
                          <div style={{ height: 4, background: "#f0f2f5", borderRadius: 2 }}>
                            <div style={{ height: "100%", borderRadius: 2, background: GOLD, width: `${(t.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Usage by day */}
            {Object.keys(data!.byDay).length > 0 && (
              <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, overflow: "hidden", marginBottom: "1.5rem" }}>
                <div style={{ background: NAVY, padding: "10px 14px" }}>
                  <span style={{ color: WHITE, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Usage by day</span>
                </div>
                <div style={{ padding: "1rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid rgba(15,32,68,0.1)` }}>
                        {["Date", "Calls", "Tokens", "Cost (USD)"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: TEXT_MUTED, fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data!.byDay).sort(([a],[b]) => b.localeCompare(a)).map(([day, stats]) => (
                        <tr key={day} style={{ borderBottom: `1px solid rgba(15,32,68,0.05)` }}>
                          <td style={{ padding: "8px 8px", color: NAVY, fontWeight: 500 }}>{day}</td>
                          <td style={{ padding: "8px 8px", color: NAVY }}>{stats.calls}</td>
                          <td style={{ padding: "8px 8px", color: NAVY }}>{fmtTokens(stats.tokens)}</td>
                          <td style={{ padding: "8px 8px", color: NAVY }}>{fmtCost(stats.costUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent calls log */}
            <div style={{ background: WHITE, borderRadius: 8, border: `1px solid rgba(15,32,68,0.1)`, overflow: "hidden" }}>
              <div style={{ background: NAVY, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: WHITE, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Recent calls</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Click to expand</span>
              </div>
              <div>
                {data!.recentCalls.map((call) => {
                  const c = agentColor(call.agent);
                  const isOpen = expanded === call.id;
                  return (
                    <div key={call.id} style={{ borderBottom: `1px solid rgba(15,32,68,0.06)` }}>
                      <div onClick={() => setExpanded(isOpen ? null : call.id)}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "grid", gridTemplateColumns: "100px 80px 1fr 80px 70px 70px 60px", gap: 8, alignItems: "center", fontSize: 12 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f8f9fb")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ color: TEXT_MUTED }}>{new Date(call.timestamp).toLocaleTimeString()}</span>
                        <span style={{ padding: "2px 7px", borderRadius: 4, background: c.bg, color: c.fg, fontWeight: 600, textTransform: "capitalize", textAlign: "center" }}>{call.agent}</span>
                        <span style={{ color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{call.userQuery.slice(0, 80)}</span>
                        <span style={{ color: NAVY, textAlign: "right" }}>{fmtTokens(call.totalTokens)}</span>
                        <span style={{ color: NAVY, textAlign: "right" }}>{fmtCost(call.costUsd)}</span>
                        <span style={{ color: TEXT_MUTED, textAlign: "right" }}>{fmtMs(call.durationMs)}</span>
                        <span style={{ color: call.success ? "#1a6b3a" : "#8b2020", textAlign: "center" }}>{call.success ? "✓" : "✗"}</span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "0 14px 12px", background: "#f8f9fb", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {[
                              ["Model", call.model],
                              ["Input tokens", call.inputTokens.toLocaleString()],
                              ["Output tokens", call.outputTokens.toLocaleString()],
                              ["Total tokens", call.totalTokens.toLocaleString()],
                              ["Cost", `$${call.costUsd.toFixed(6)}`],
                            ].map(([k, v]) => (
                              <div key={String(k)}><span style={{ color: TEXT_MUTED }}>{k}: </span><span style={{ color: NAVY, fontWeight: 500 }}>{v}</span></div>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {[
                              ["Duration", fmtMs(call.durationMs)],
                              ["Iterations", call.iterations],
                              ["Tool calls", call.toolCallCount],
                              ["Tools used", call.toolsUsed.join(", ") || "none"],
                            ].map(([k, v]) => (
                              <div key={String(k)}><span style={{ color: TEXT_MUTED }}>{k}: </span><span style={{ color: NAVY, fontWeight: 500 }}>{v}</span></div>
                            ))}
                            <div><span style={{ color: TEXT_MUTED }}>Query: </span><span style={{ color: NAVY }}>{call.userQuery.slice(0, 150)}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}