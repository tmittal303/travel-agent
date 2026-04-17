import Anthropic from "@anthropic-ai/sdk";

export const schedulingTools: Anthropic.Tool[] = [
  {
    name: "get_staff_availability",
    description: "Get all staff members, their roles, certifications, current hours, and availability for a given day or week.",
    input_schema: {
      type: "object" as const,
      properties: {
        day: { type: "string", description: "Day of week e.g. 'friday' or date 'YYYY-MM-DD'. Leave empty for all staff." },
        role: { type: "string", description: "Filter by role: Gate Agent, Ramp Agent, Customer Service, Supervisor" },
      },
      required: [],
    },
  },
  {
    name: "get_shift_coverage",
    description: "Get all shifts and their current coverage status — who is assigned, how many more staff are needed, and which shifts are understaffed.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "YYYY-MM-DD. Leave empty for all upcoming shifts." },
        understaffed_only: { type: "boolean", description: "If true, only return shifts that need more staff." },
      },
      required: [],
    },
  },
  {
    name: "assign_staff_to_shift",
    description: "Assign a staff member to a shift. Validates certifications, availability, and max hours before assigning.",
    input_schema: {
      type: "object" as const,
      properties: {
        staff_id: { type: "string", description: "Staff member ID e.g. s001" },
        shift_id: { type: "string", description: "Shift ID e.g. sh001" },
      },
      required: ["staff_id", "shift_id"],
    },
  },
  {
    name: "find_swap_candidates",
    description: "Given a shift swap request, find eligible staff who can cover that shift based on availability, certifications, and hours.",
    input_schema: {
      type: "object" as const,
      properties: {
        shift_id: { type: "string", description: "The shift ID that needs coverage" },
        exclude_staff_id: { type: "string", description: "Staff member to exclude (the one requesting the swap)" },
      },
      required: ["shift_id"],
    },
  },
  {
    name: "get_weekly_summary",
    description: "Get a summary of the week's schedule: total shifts, coverage gaps, staff hours, and any conflicts.",
    input_schema: {
      type: "object" as const,
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD of the Monday starting the week" },
      },
      required: [],
    },
  },
  {
    name: "approve_swap_request",
    description: "Approve or reject a pending shift swap request.",
    input_schema: {
      type: "object" as const,
      properties: {
        swap_id: { type: "string", description: "Swap request ID e.g. sw001" },
        approved: { type: "boolean" },
        new_staff_id: { type: "string", description: "Staff member who will cover the shift if approved" },
        reason: { type: "string", description: "Reason for approval or rejection" },
      },
      required: ["swap_id", "approved"],
    },
  },
];
