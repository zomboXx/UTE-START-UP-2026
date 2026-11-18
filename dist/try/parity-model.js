// Shared product behavior, using only records the visitor saved in this browser.
export const dayKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const localDay = key => { const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d); };
export function weekSummary(state, start, now=Date.now()) {
  return Array.from({length:7},(_,index)=>{
    const from=localDay(start); from.setDate(from.getDate()+index);
    const until=new Date(from); until.setDate(until.getDate()+1);
    const date=dayKey(from), tasks=[...state.tasks,...state.plan].filter(item=>item.done && item.completedAt && dayKey(new Date(item.completedAt))===date);
    const activities=state.activities.filter(item=>dayKey(new Date(item.end))===date);
    const sessions=state.sessions.flatMap(item=>{
      if (!item.start || !item.end) return item.day===date ? [{...item,seconds:Math.max(0,item.seconds || 0)}] : [];
      const seconds=Math.max(0,(Math.min(Date.parse(item.end),+until,now)-Math.max(Date.parse(item.start),+from))/1000);
      return seconds>0 ? [{...item,seconds:Math.floor(seconds)}] : [];
    });
    return {date,future:+from>now,tasks,activities,sessions,focusSeconds:sessions.reduce((sum,item)=>sum+item.seconds,0)};
  });
}
export function circleStreak(checkins, circleId, today) {
  const dates=new Set(checkins.filter(item=>item.circleId===circleId && !item.rest).map(item=>item.date));
  const cursor=localDay(today);
  if(!dates.has(today))cursor.setDate(cursor.getDate()-1);
  let streak=0;
  while(dates.has(dayKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}
  return streak;
}
export function upgradeCircles(state) {
  const legacy=state.circle;
  state.circles=Array.isArray(state.circles) ? state.circles : legacy ? [{...legacy,id:legacy.id || 'legacy-circle'}] : [];
  state.circles=state.circles.map(circle=>({...circle,members:(circle.members || []).map((member,index)=>typeof member==='string' ? {id:`${circle.id}:member:${index}`,name:member} : member)}));
  state.checkins=Array.isArray(state.checkins) ? state.checkins : legacy?.checkin ? [{id:`${state.circles[0].id}:${legacy.checkin}`,circleId:state.circles[0].id,date:legacy.checkin,rest:false}] : [];
  return state;
}
