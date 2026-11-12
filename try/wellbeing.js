export const REMINDER_INTERVAL=40*60000;
// Latest interval only: waking a throttled tab never replays a backlog of sounds.
export function reminderBoundary(focus,now=Date.now()){
  if(!focus || !Number.isFinite(focus.start) || !Number.isFinite(focus.end) || now<focus.start || now>=focus.end)return 0;
  const boundary=Math.floor((now-focus.start)/REMINDER_INTERVAL);
  return boundary>Number(focus.reminderBoundary || 0)?boundary:0;
}
