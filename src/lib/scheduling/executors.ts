import { STAFF, SHIFTS, SWAP_REQUESTS, type StaffMember, type Shift } from "./data";

// In-memory state for demo (in production this would be a database)
const state = {
  staff: [...STAFF],
  shifts: SHIFTS.map(s => ({ ...s, assignedStaff: [...s.assignedStaff] })),
  swaps: [...SWAP_REQUESTS],
};

export function getStaffAvailability(input: { day?: string; role?: string }) {
  let staff = state.staff;

  if (input.role) {
    staff = staff.filter(s => s.role.toLowerCase() === input.role!.toLowerCase());
  }

  return staff.map(s => {
    const dayKey = input.day?.toLowerCase().replace(/\d{4}-\d{2}-\d{2}/, (d) => {
      const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      return days[new Date(d).getDay()];
    }) ?? undefined;

    const availableSlots = dayKey ? (s.availability[dayKey] ?? []) : Object.entries(s.availability)
      .filter(([, slots]) => slots.length > 0)
      .map(([day, slots]) => `${day}: ${slots.join(", ")}`);

    return {
      id: s.id,
      name: s.name,
      role: s.role,
      certifications: s.certifications,
      hoursThisWeek: s.hoursThisWeek,
      maxHours: s.maxHours,
      hoursRemaining: s.maxHours - s.hoursThisWeek,
      availability: availableSlots,
      preferences: s.preferences,
    };
  });
}

export function getShiftCoverage(input: { date?: string; understaffed_only?: boolean }) {
  let shifts = state.shifts;

  if (input.date) {
    shifts = shifts.filter(s => s.date === input.date);
  }

  const result = shifts.map(shift => {
    const assigned = shift.assignedStaff.map(id => {
      const s = state.staff.find(st => st.id === id);
      return s ? `${s.name} (${s.role})` : id;
    });
    const needed = Math.max(0, shift.minStaff - shift.assignedStaff.length);
    return {
      shiftId: shift.id,
      date: shift.date,
      time: `${shift.startTime}–${shift.endTime}`,
      role: shift.role,
      station: shift.station,
      requiredCerts: shift.requiredCerts,
      minStaff: shift.minStaff,
      assignedCount: shift.assignedStaff.length,
      staffNeeded: needed,
      assignedStaff: assigned,
      status: needed > 0 ? "UNDERSTAFFED" : "COVERED",
    };
  });

  return input.understaffed_only ? result.filter(s => s.status === "UNDERSTAFFED") : result;
}

export function assignStaffToShift(input: { staff_id: string; shift_id: string }) {
  const staff = state.staff.find(s => s.id === input.staff_id);
  const shift = state.shifts.find(s => s.id === input.shift_id);

  if (!staff) return { success: false, error: `Staff member ${input.staff_id} not found` };
  if (!shift) return { success: false, error: `Shift ${input.shift_id} not found` };

  // Check already assigned
  if (shift.assignedStaff.includes(input.staff_id)) {
    return { success: false, error: `${staff.name} is already assigned to this shift` };
  }

  // Check certifications
  const missingCerts = shift.requiredCerts.filter(c => !staff.certifications.includes(c));
  if (missingCerts.length > 0) {
    return { success: false, error: `${staff.name} is missing certifications: ${missingCerts.join(", ")}` };
  }

  // Check hours
  const shiftHours = (new Date(`2000-01-01T${shift.endTime}`).getTime() - new Date(`2000-01-01T${shift.startTime}`).getTime()) / 3600000;
  if (staff.hoursThisWeek + shiftHours > staff.maxHours) {
    return { success: false, error: `${staff.name} would exceed max hours (${staff.hoursThisWeek + shiftHours}/${staff.maxHours})` };
  }

  // Check availability
  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dayName = days[new Date(shift.date).getDay()];
  const daySlots = staff.availability[dayName] ?? [];
  const shiftSlot = `${shift.startTime}-${shift.endTime}`;
  const isAvailable = daySlots.some(slot => {
    const [slotStart, slotEnd] = slot.split("-");
    return slotStart <= shift.startTime && slotEnd >= shift.endTime;
  });

  if (!isAvailable) {
    return { success: false, error: `${staff.name} is not available on ${dayName} for ${shiftSlot}. Available: ${daySlots.join(", ") || "not available"}` };
  }

  // Assign
  shift.assignedStaff.push(input.staff_id);
  staff.hoursThisWeek += shiftHours;

  return {
    success: true,
    message: `${staff.name} successfully assigned to ${shift.role} on ${shift.date} ${shift.startTime}–${shift.endTime}`,
    updatedShift: {
      shiftId: shift.id,
      assignedCount: shift.assignedStaff.length,
      minStaff: shift.minStaff,
      status: shift.assignedStaff.length >= shift.minStaff ? "COVERED" : "UNDERSTAFFED",
    },
  };
}

export function findSwapCandidates(input: { shift_id: string; exclude_staff_id?: string }) {
  const shift = state.shifts.find(s => s.id === input.shift_id);
  if (!shift) return { error: `Shift ${input.shift_id} not found` };

  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dayName = days[new Date(shift.date).getDay()];
  const shiftHours = (new Date(`2000-01-01T${shift.endTime}`).getTime() - new Date(`2000-01-01T${shift.startTime}`).getTime()) / 3600000;

  const candidates = state.staff
    .filter(s => s.id !== input.exclude_staff_id)
    .filter(s => !shift.assignedStaff.includes(s.id))
    .map(s => {
      const issues: string[] = [];
      const missingCerts = shift.requiredCerts.filter(c => !s.certifications.includes(c));
      if (missingCerts.length > 0) issues.push(`Missing certs: ${missingCerts.join(", ")}`);

      const daySlots = s.availability[dayName] ?? [];
      const isAvailable = daySlots.some(slot => {
        const [slotStart, slotEnd] = slot.split("-");
        return slotStart <= shift.startTime && slotEnd >= shift.endTime;
      });
      if (!isAvailable) issues.push(`Not available ${dayName} ${shift.startTime}–${shift.endTime}`);
      if (s.hoursThisWeek + shiftHours > s.maxHours) issues.push(`Would exceed max hours`);

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        eligible: issues.length === 0,
        issues,
        hoursRemaining: s.maxHours - s.hoursThisWeek,
        preferences: s.preferences,
      };
    })
    .sort((a, b) => (a.eligible ? -1 : 1) - (b.eligible ? -1 : 1));

  return {
    shift: { id: shift.id, date: shift.date, time: `${shift.startTime}–${shift.endTime}`, role: shift.role },
    candidates,
    eligibleCount: candidates.filter(c => c.eligible).length,
  };
}

export function getWeeklySummary(input: { week_start?: string }) {
  const totalShifts = state.shifts.length;
  const covered = state.shifts.filter(s => s.assignedStaff.length >= s.minStaff).length;
  const understaffed = state.shifts.filter(s => s.assignedStaff.length < s.minStaff);
  const totalGaps = understaffed.reduce((sum, s) => sum + (s.minStaff - s.assignedStaff.length), 0);

  const staffSummary = state.staff.map(s => ({
    name: s.name,
    role: s.role,
    hoursScheduled: s.hoursThisWeek,
    maxHours: s.maxHours,
    utilizationPct: Math.round((s.hoursThisWeek / s.maxHours) * 100),
  }));

  const pendingSwaps = state.swaps.filter(s => s.status === "pending").length;

  return {
    weekOf: input.week_start ?? "Current week",
    totalShifts,
    coveredShifts: covered,
    understaffedShifts: understaffed.length,
    totalOpenSlots: totalGaps,
    pendingSwapRequests: pendingSwaps,
    understaffedDetails: understaffed.map(s => ({
      shiftId: s.id,
      date: s.date,
      time: `${s.startTime}–${s.endTime}`,
      role: s.role,
      need: s.minStaff - s.assignedStaff.length,
    })),
    staffUtilization: staffSummary,
    recommendation: totalGaps > 0
      ? `${totalGaps} open slot(s) need filling. Focus on ${understaffed[0]?.role} coverage on ${understaffed[0]?.date}.`
      : "All shifts fully covered this week.",
  };
}

export function approveSwapRequest(input: { swap_id: string; approved: boolean; new_staff_id?: string; reason?: string }) {
  const swap = state.swaps.find(s => s.id === input.swap_id);
  if (!swap) return { error: `Swap request ${input.swap_id} not found` };

  swap.status = input.approved ? "approved" : "rejected";

  if (input.approved && input.new_staff_id) {
    const shift = state.shifts.find(s => s.id === swap.shiftId);
    const requester = state.staff.find(s => s.id === swap.requesterId);
    const replacement = state.staff.find(s => s.id === input.new_staff_id);

    if (shift && requester && replacement) {
      shift.assignedStaff = shift.assignedStaff.filter(id => id !== swap.requesterId);
      shift.assignedStaff.push(input.new_staff_id);
      const shiftHours = (new Date(`2000-01-01T${shift.endTime}`).getTime() - new Date(`2000-01-01T${shift.startTime}`).getTime()) / 3600000;
      requester.hoursThisWeek -= shiftHours;
      replacement.hoursThisWeek += shiftHours;
    }
  }

  return {
    success: true,
    swapId: input.swap_id,
    status: swap.status,
    message: input.approved
      ? `Swap approved. ${input.new_staff_id ? `${state.staff.find(s => s.id === input.new_staff_id)?.name} will cover the shift.` : ""}`
      : `Swap rejected. ${input.reason ?? ""}`,
  };
}
