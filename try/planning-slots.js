const minute = 60000, day = 86400000, offset = 7 * 60 * minute;
export const dayKey = ms => new Date(ms + offset).toISOString().slice(0, 10);
const intersects = (s, e, a, b) => s < b && e > a;

export function buildSlots(context) {
  const {now, preferences: p, commitments, existingPlan} = context;
  const midnight = Date.parse(`${dayKey(now)}T00:00:00+07:00`);
  const slots = [];
  for (let d = 0; d < 7; d++) {
    const base = midnight + d * day;
    const weekday = new Date(base + offset).getUTCDay() || 7;
    let budget = p.dailyMinutes;
    const blocked = commitments.filter(c => c.weekdays.includes(weekday)).map(c => ({start: base + c.startMinute * minute, end: base + c.endMinute * minute}));
    for (const e of existingPlan) {
      blocked.push(e);
      if (e.kind !== 'break') {
        budget -= Math.max(0, Math.min(e.end, base + day) - Math.max(e.start, base)) / minute;
        // Preserve a recovery gap around an already accepted session.
        blocked.push({start: e.start - 10 * minute, end: e.end + 10 * minute});
      }
    }
    for (let t = p.startMinute; t + p.sessionMinutes <= p.endMinute && budget >= p.sessionMinutes;) {
      const start = base + t * minute, end = start + p.sessionMinutes * minute;
      if (start >= now + 5 * minute && !blocked.some(b => intersects(start, end, b.start, b.end))) {
        slots.push({id: `d${d}-m${t}`, date: dayKey(start), start: new Date(start).toISOString(), end: new Date(end).toISOString()});
        budget -= p.sessionMinutes;
        t += p.sessionMinutes + 10;
      } else { t += 5; }
    }
  }
  return slots;
}
