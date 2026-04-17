import Anthropic from "@anthropic-ai/sdk";

export const travelTools: Anthropic.Tool[] = [
  {
    name: "parse_intent",
    description:
      "Extract structured travel parameters from freeform user input. Always call this first.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: {
          type: "string",
          description: "Departure city e.g. Toronto, Ontario",
        },
        depart_date: {
          type: "string",
          description: "Departure date YYYY-MM-DD",
        },
        return_date: {
          type: "string",
          description: "Return date YYYY-MM-DD",
        },
        max_hours: {
          type: "number",
          description: "Maximum drive time in hours the user is willing to travel",
        },
        budget_cad: {
          type: "number",
          description: "Maximum total trip budget in CAD, or null if unspecified",
        },
        vibe: {
          type: "string",
          description: "Trip vibe e.g. nature, romantic, family, adventure, relaxation",
        },
        candidate_destinations: {
          type: "array",
          items: { type: "string" },
          description:
            "5-8 candidate destination city names that match the intent, for drive time lookup",
        },
      },
      required: ["origin", "depart_date", "return_date", "candidate_destinations"],
    },
  },
  {
    name: "get_drive_times",
    description:
      "Get real driving durations from an origin to multiple destinations using Google Routes API. Returns hours for each destination.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Origin city name" },
        destinations: {
          type: "array",
          items: { type: "string" },
          description: "List of destination city names",
        },
        departure_time: {
          type: "string",
          description: "ISO 8601 departure datetime e.g. 2025-04-18T17:00:00Z",
        },
      },
      required: ["origin", "destinations", "departure_time"],
    },
  },
  {
    name: "search_flights",
    description:
      "Search real flight prices using Kiwi Tequila API. Use only for destinations where drive time > 2.5 hours or user prefers flying.",
    input_schema: {
      type: "object" as const,
      properties: {
        fly_from: {
          type: "string",
          description: "Origin IATA airport code e.g. YYZ",
        },
        fly_to: {
          type: "string",
          description: "Destination IATA airport code e.g. YOW",
        },
        destination_name: {
          type: "string",
          description: "Human-readable destination name for display",
        },
        date_from: {
          type: "string",
          description: "Outbound date YYYY-MM-DD",
        },
        date_to: {
          type: "string",
          description: "Return date YYYY-MM-DD",
        },
        max_price: {
          type: "number",
          description: "Maximum round-trip price in CAD",
        },
      },
      required: ["fly_from", "fly_to", "destination_name", "date_from", "date_to"],
    },
  },
  {
    name: "search_hotels",
    description:
      "Get hotel availability and lowest nightly rate for a destination using Amadeus API.",
    input_schema: {
      type: "object" as const,
      properties: {
        city_code: {
          type: "string",
          description: "Amadeus IATA city code e.g. YTO for Toronto, YOW for Ottawa",
        },
        destination_name: {
          type: "string",
          description: "Human-readable destination name",
        },
        check_in: { type: "string", description: "Check-in date YYYY-MM-DD" },
        check_out: { type: "string", description: "Check-out date YYYY-MM-DD" },
        max_rate: {
          type: "number",
          description: "Maximum nightly rate in CAD",
        },
      },
      required: ["city_code", "destination_name", "check_in", "check_out"],
    },
  },
];
