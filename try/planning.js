export const defaultPreferences={startMinute:1080,endMinute:1320,sessionMinutes:45,dailyMinutes:120};
const vnParts=value=>{
  const d=new Date(Date.parse(value)+7*3600000);
  return {day:d.toISOString().slice(0,10),minute:d.getUTCHours()*60+d.getUTCMinutes()};
};
export function makePlanningRequest(state,request,learningContext){
  return {request,learningContext,timezone:'Asia/Ho_Chi_Minh',preferences:state.studyPreferences || defaultPreferences,
    commitments:state.commitments.map(c=>({title:c.title,weekdays:c.weekdays,startMinute:c.start,endMinute:c.end})),
    existingPlan:state.plan.map(p=>{
      const start=p.startsAt || `${p.day}T${String(Math.floor(p.start/60)).padStart(2,'0')}:${String(p.start%60).padStart(2,'0')}:00+07:00`;
      return {start,end:p.endsAt || new Date(Date.parse(start)+p.duration*60000).toISOString(),kind:'focus'};
    })};
}
export function convertDraft(draft){
  if(draft?.schemaVersion!==1 || !['draft','needs_clarification'].includes(draft.status) || !Array.isArray(draft.sessions) ||
      !Array.isArray(draft.questions) || !Array.isArray(draft.assumptions) || draft.sessions.length>40)throw new Error('Kết quả chưa đúng định dạng lịch.');
  return draft.sessions.map(p=>{
    if(typeof p.title!=='string' || typeof p.subject!=='string' || !Array.isArray(p.objectives) || !Array.isArray(p.steps) || typeof p.expectedOutput!=='string' || !Number.isFinite(Date.parse(p.start)) || !Number.isFinite(Date.parse(p.end)))throw new Error('Phiên học chưa đủ thông tin.');
    const {day,minute}=vnParts(p.start);
    return {id:crypto.randomUUID(),kind:'plan',source:'ai',title:p.title,note:p.subject,subject:p.subject,examDate:p.examDate,
      objectives:p.objectives,steps:p.steps,expectedOutput:p.expectedOutput,day,start:minute,duration:(Date.parse(p.end)-Date.parse(p.start))/60000,
      startsAt:p.start,endsAt:p.end,done:false};
  });
}
export function validateAcceptance(sessions,state,now=Date.now()){
  if(!sessions.length)return 'Chưa có phiên học để thêm.';
  const preferences=state.studyPreferences || defaultPreferences;
  const existing=makePlanningRequest(state,'','').existingPlan;
  const occupied=existing.map(p=>[Date.parse(p.start),Date.parse(p.end)]),daily={};
  for(const p of state.plan)daily[p.day]=(daily[p.day] || 0)+p.duration;
  for(const p of sessions){
    const s=Date.parse(p.startsAt),e=Date.parse(p.endsAt);
    if(!Number.isFinite(s)||!Number.isFinite(e)||s<=now||e<=s||e-s>90*60000)return 'Lịch có thời gian không hợp lệ hoặc đã qua. Hãy tạo lại gợi ý.';
    const start=vnParts(p.startsAt),end=vnParts(p.endsAt);
    if(start.day!==end.day || start.minute<preferences.startMinute || end.minute>preferences.endMinute)return 'Phiên học nằm ngoài nhịp học hiện tại.';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.examDate) || start.day>=p.examDate)return 'Phiên ôn cần diễn ra trước ngày kiểm tra.';
    const week=new Date(`${start.day}T12:00:00Z`).getUTCDay() || 7;
    if(state.commitments.some(c=>c.weekdays.includes(week)&&start.minute<c.end&&end.minute>c.start))return 'Lịch cố định vừa thay đổi và bị trùng. Hãy tạo lại gợi ý.';
    if(occupied.some(([a,b])=>s<b&&e>a))return 'Phiên học trùng với lịch đã có. Hãy tạo lại gợi ý.';
    occupied.push([s,e]);daily[start.day]=(daily[start.day] || 0)+(e-s)/60000;
    if(daily[start.day]>preferences.dailyMinutes)return 'Vượt quỹ học mỗi ngày. Hãy tạo lại gợi ý.';
  }
  return null;
}
