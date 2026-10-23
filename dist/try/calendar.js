const DAY=86400000,MINUTE=60000;
export const periods=[{label:'Sáng',range:'00–12h'},{label:'Chiều',range:'12–18h'},{label:'Tối',range:'18–24h'}];
export const vietnamDay=now=>new Date(Number(now)+7*3600000).toISOString().slice(0,10);
export const addDays=(day,amount)=>new Date(Date.parse(day+'T12:00:00Z')+amount*DAY).toISOString().slice(0,10);
export function weekStart(day){const week=new Date(day+'T12:00:00Z').getUTCDay() || 7;return addDays(day,1-week);}
export function startTime(entry){return entry.startsAt?Date.parse(entry.startsAt):entry.start==null?NaN:Date.parse(`${entry.day}T00:00:00+07:00`)+entry.start*MINUTE;}
function intervalLabel(milliseconds){
  const minutes=Math.max(1,Math.ceil(milliseconds/MINUTE));
  if(minutes<60)return `${minutes} phút`;
  if(minutes<1440)return `${Math.floor(minutes/60)} giờ${minutes%60?' '+minutes%60+' phút':''}`;
  return `${Math.floor(minutes/1440)} ngày${Math.floor(minutes%1440/60)?' '+Math.floor(minutes%1440/60)+' giờ':''}`;
}
export function sessionStatus(entry,now=Date.now()){
  if(entry.done)return {key:'done',label:'Đã hoàn thành',relative:'',checkout:false};
  const start=startTime(entry),end=entry.endsAt?Date.parse(entry.endsAt):start+entry.duration*MINUTE;
  if(!Number.isFinite(start)||!Number.isFinite(end))return {key:'unplaced',label:'Chưa đặt giờ',relative:'',checkout:false};
  if(now<start)return {key:'upcoming',label:'Sắp tới',relative:`Còn ${intervalLabel(start-now)}`,checkout:false};
  if(now<end)return {key:'active',label:'Đang diễn ra',relative:`Còn ${intervalLabel(end-now)} kết thúc`,checkout:!entry.fixed};
  if(entry.fixed)return {key:'ended',label:'Đã kết thúc',relative:'',checkout:false};
  return {key:'overdue',label:'Quá hạn',relative:`Đã kết thúc ${intervalLabel(now-end)} trước`,checkout:true};
}
export function calendarWeeks(state,start,count=1){
  return Array.from({length:count},(_,index)=>{
    const first=addDays(start,index*7),days=Array.from({length:7},(_,d)=>addDays(first,d));
    const entries=state.plan.filter(p=>days.includes(p.day)).map(p=>({...p,fixed:false}));
    for(const day of days){
      const weekday=new Date(day+'T12:00:00Z').getUTCDay() || 7;
      for(const c of state.commitments.filter(c=>c.weekdays.includes(weekday))){
        entries.push({id:`fixed:${c.id}:${day}`,commitmentId:c.id,title:c.title,day,start:c.start,duration:c.end-c.start,fixed:true,source:'fixed',done:false});
      }
    }
    entries.sort((a,b)=>startTime(a)-startTime(b)||a.id.localeCompare(b.id));
    return {first,days,cells:periods.map((_,period)=>days.map(day=>entries.filter(p=>p.day===day&&(p.start<720?0:p.start<1080?1:2)===period)))};
  });
}
