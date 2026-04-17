export interface StaffMember {
  id: string;
  name: string;
  role: "Gate Agent" | "Ramp Agent" | "Customer Service" | "Supervisor";
  station: string;
  certifications: string[];
  availability: Record<string, string[]>; // day -> ["07:00-15:00", "15:00-23:00"]
  hoursThisWeek: number;
  maxHours: number;
  preferences: string[];
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  station: string;
  requiredCerts: string[];
  minStaff: number;
  assignedStaff: string[];
}

export interface SwapRequest {
  id: string;
  requesterId: string;
  shiftId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

// Mock staff pool — Porter Airlines Billy Bishop station
export const STAFF: StaffMember[] = [
  {
    id: "s001", name: "Sarah Chen", role: "Gate Agent", station: "YTZ",
    certifications: ["Gate Operations", "Boarding", "SIDA"],
    availability: {
      monday: ["07:00-15:00", "15:00-23:00"],
      tuesday: ["07:00-15:00"],
      wednesday: ["07:00-15:00", "15:00-23:00"],
      thursday: ["15:00-23:00"],
      friday: ["07:00-15:00", "15:00-23:00"],
      saturday: ["07:00-15:00"],
      sunday: [],
    },
    hoursThisWeek: 24, maxHours: 40,
    preferences: ["morning shifts", "no late Sunday"],
  },
  {
    id: "s002", name: "Marcus Williams", role: "Ramp Agent", station: "YTZ",
    certifications: ["Ramp Safety", "Pushback", "SIDA", "Deicing"],
    availability: {
      monday: ["15:00-23:00"],
      tuesday: ["07:00-15:00", "15:00-23:00"],
      wednesday: ["15:00-23:00"],
      thursday: ["07:00-15:00", "15:00-23:00"],
      friday: ["15:00-23:00"],
      saturday: ["07:00-15:00", "15:00-23:00"],
      sunday: ["07:00-15:00"],
    },
    hoursThisWeek: 32, maxHours: 40,
    preferences: ["afternoon shifts"],
  },
  {
    id: "s003", name: "Priya Patel", role: "Customer Service", station: "YTZ",
    certifications: ["Gate Operations", "Boarding", "Check-in", "SIDA"],
    availability: {
      monday: ["07:00-15:00", "15:00-23:00"],
      tuesday: ["07:00-15:00", "15:00-23:00"],
      wednesday: [],
      thursday: ["07:00-15:00", "15:00-23:00"],
      friday: ["07:00-15:00"],
      saturday: ["15:00-23:00"],
      sunday: ["07:00-15:00", "15:00-23:00"],
    },
    hoursThisWeek: 16, maxHours: 40,
    preferences: ["flexible", "prefers check-in desk"],
  },
  {
    id: "s004", name: "James O'Brien", role: "Supervisor", station: "YTZ",
    certifications: ["Gate Operations", "Ramp Safety", "Pushback", "SIDA", "Deicing", "Supervisor"],
    availability: {
      monday: ["07:00-15:00", "15:00-23:00"],
      tuesday: ["07:00-15:00", "15:00-23:00"],
      wednesday: ["07:00-15:00", "15:00-23:00"],
      thursday: ["07:00-15:00", "15:00-23:00"],
      friday: ["07:00-15:00", "15:00-23:00"],
      saturday: [],
      sunday: [],
    },
    hoursThisWeek: 38, maxHours: 40,
    preferences: ["weekdays only"],
  },
  {
    id: "s005", name: "Aisha Kamara", role: "Gate Agent", station: "YTZ",
    certifications: ["Gate Operations", "Boarding", "SIDA"],
    availability: {
      monday: [],
      tuesday: ["15:00-23:00"],
      wednesday: ["07:00-15:00", "15:00-23:00"],
      thursday: ["15:00-23:00"],
      friday: ["07:00-15:00", "15:00-23:00"],
      saturday: ["07:00-15:00", "15:00-23:00"],
      sunday: ["07:00-15:00", "15:00-23:00"],
    },
    hoursThisWeek: 8, maxHours: 32,
    preferences: ["weekends", "part-time"],
  },
  {
    id: "s006", name: "Tom Nguyen", role: "Ramp Agent", station: "YTZ",
    certifications: ["Ramp Safety", "SIDA"],
    availability: {
      monday: ["07:00-15:00"],
      tuesday: ["07:00-15:00"],
      wednesday: ["07:00-15:00"],
      thursday: ["07:00-15:00"],
      friday: ["07:00-15:00"],
      saturday: [],
      sunday: [],
    },
    hoursThisWeek: 20, maxHours: 40,
    preferences: ["morning only", "no weekends"],
  },
];

// Shifts needing coverage this week
export const SHIFTS: Shift[] = [
  { id: "sh001", date: "2025-04-18", startTime: "07:00", endTime: "15:00", role: "Gate Agent", station: "YTZ", requiredCerts: ["Gate Operations", "SIDA"], minStaff: 2, assignedStaff: ["s001"] },
  { id: "sh002", date: "2025-04-18", startTime: "15:00", endTime: "23:00", role: "Gate Agent", station: "YTZ", requiredCerts: ["Gate Operations", "SIDA"], minStaff: 2, assignedStaff: ["s005"] },
  { id: "sh003", date: "2025-04-18", startTime: "07:00", endTime: "15:00", role: "Ramp Agent", station: "YTZ", requiredCerts: ["Ramp Safety", "SIDA"], minStaff: 2, assignedStaff: ["s006"] },
  { id: "sh004", date: "2025-04-18", startTime: "15:00", endTime: "23:00", role: "Ramp Agent", station: "YTZ", requiredCerts: ["Ramp Safety", "SIDA"], minStaff: 2, assignedStaff: [] },
  { id: "sh005", date: "2025-04-19", startTime: "07:00", endTime: "15:00", role: "Gate Agent", station: "YTZ", requiredCerts: ["Gate Operations", "SIDA"], minStaff: 2, assignedStaff: [] },
  { id: "sh006", date: "2025-04-19", startTime: "15:00", endTime: "23:00", role: "Supervisor", station: "YTZ", requiredCerts: ["Supervisor", "SIDA"], minStaff: 1, assignedStaff: [] },
  { id: "sh007", date: "2025-04-20", startTime: "07:00", endTime: "15:00", role: "Customer Service", station: "YTZ", requiredCerts: ["Check-in", "SIDA"], minStaff: 2, assignedStaff: ["s003"] },
  { id: "sh008", date: "2025-04-21", startTime: "07:00", endTime: "15:00", role: "Gate Agent", station: "YTZ", requiredCerts: ["Gate Operations", "SIDA"], minStaff: 2, assignedStaff: ["s001", "s005"] },
];

export const SWAP_REQUESTS: SwapRequest[] = [
  { id: "sw001", requesterId: "s001", shiftId: "sh001", reason: "Doctor appointment", status: "pending", createdAt: "2025-04-16T09:00:00Z" },
];
