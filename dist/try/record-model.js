const fail=message=>{throw new Error(message);};
const realDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export function taskChanges(entry,{title,duration,day,note=''}){
  title=String(title??'').trim();duration=Number(duration);
  if(!title||title.length>140)fail('Nhập tên công việc, tối đa 140 ký tự.');
  if(!Number.isInteger(duration)||duration<1||duration>480)fail('Thời lượng cần từ 1 đến 480 phút.');
  if(!realDay(day))fail('Chọn ngày thực hiện hợp lệ.');
  if(entry?.done&&day!==entry.day)fail('Việc đã hoàn thành giữ nguyên ngày thực hiện. Bạn vẫn có thể sửa tên và ghi chú.');
  if(String(note).length>1000)fail('Ghi chú cần tối đa 1000 ký tự.');
  return {title,duration,day,note:String(note).trim()};
}
export function activityChanges(entry,{title,start,end,note='',photo},now=Date.now()){
  title=String(title??'').trim();const from=Date.parse(start),until=Date.parse(end);
  if(!title||title.length>140)fail('Nhập tên hoạt động, tối đa 140 ký tự.');
  if(!Number.isFinite(from)||!Number.isFinite(until)||until<=from||until>now)fail('Giờ kết thúc cần sau giờ bắt đầu và không ở tương lai.');
  // The rolling window applies when adding, never to reading or correcting history.
  if(!entry&&from<now-86400000)fail('Hoạt động mới cần nằm trong 24 giờ vừa qua.');
  if(until-from>86400000)fail('Một hoạt động cần dài tối đa 24 giờ.');
  if(String(note).length>1000)fail('Ghi chú cần tối đa 1000 ký tự.');
  return {title,start:new Date(from).toISOString(),end:new Date(until).toISOString(),duration:Math.round((until-from)/60000),note:String(note).trim(),photo:photo??null};
}
export function activityHistory(activities,{search='',date=''}={}){
  const fold=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase();
  const query=fold(search.trim());
  const day=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  return activities.filter(a=>(!date||day(a.end)===date)&&(!query||fold(a.title+' '+(a.note??'')).includes(query))).sort((a,b)=>Date.parse(b.end)-Date.parse(a.end));
}
