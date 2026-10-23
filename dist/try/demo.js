import {defaultPreferences,makePlanningRequest,convertDraft,validateAcceptance} from './planning.js';
import {reminderBoundary} from './wellbeing.js';
import {periods,vietnamDay,addDays,weekStart,startTime,sessionStatus,calendarWeeks} from './calendar.js';
// Private beta AI calls use a server-only provider key. No device permissions.
const KEY = 'brain10.web-demo.v1';
const paths = {
  home:'m3 10 9-7 9 7v10h-6v-7H9v7H3Z', calendar:'M4 5h16v16H4ZM4 10h16M8 3v4m8-4v4',
  focus:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8Z', chart:'M5 20V11m5 9V5m5 15v-8m5 8V8',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 .13a4 4 0 0 1 0 7.75',
  plus:'M12 5v14M5 12h14', clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  check:'m5 12 4 4L19 6', close:'m6 6 12 12M6 18 18 6', info:'M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8',
  spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM3 3v4M1 5h4',
  sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  play:'m9 5 10 7-10 7Z', stop:'M6 6h12v12H6Z', lock:'M6 10h12v11H6Zm2 0V6a4 4 0 0 1 8 0v4m-4 5v2',
  trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7', person:'M4 21v-2a8 8 0 0 1 16 0v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  arrow:'M5 12h14m-5-5 5 5-5 5', leaf:'M20 4C9 1 2 8 6 15s15 3 14-11ZM4 21 15 10',
  trend:'m3 17 6-6 4 4 8-9m-6 0h6v6', wifi:'M3 9a15 15 0 0 1 18 0M6 13a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0m-3 4h.01',
  battery:'M3 6h16v12H3Zm18 4v4M6 9h10v6H6Z'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function dateOffset(offset) { const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate()+offset); return date; }
const dayLabel = key => { const d = new Date(`${key}T12:00:00`); return `${d.getDate()}/${d.getMonth()+1}`; };
const timeText = minutes => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const minuteValue = value => { const [h,m] = value.split(':').map(Number); return h*60+m; };
const weekdays = ['T2','T3','T4','T5','T6','T7','CN'];
const weekdayIndex = date => (date.getDay()+6)%7+1;
const titles = ['Nhịp hôm nay','Thời gian của bạn','Khoảng tập trung','Nhìn lại một tuần','Vòng tròn của bạn'];
const tabs = ['Hôm nay','Lịch trình','Tập trung','Thống kê','Nhóm'];
const navIcons = ['home','calendar','focus','chart','users'];
function fresh() {
  return {version:1, ready:false, profile:{name:'An',birthday:'',goal:'Học tập / Thi cử'},
    tasks:[{id:uid(),title:'Đọc chương 4 · DBMS',duration:45,day:dateKey(),done:false,note:'Ghi lại 3 ý chính và trả lời câu hỏi.'},
      {id:uid(),title:'Ôn kiểm thử phần mềm',duration:30,day:dateKey(),done:false,note:''}],
    commitments:[],plan:[],activities:[],sessions:[],focus:null,focusNotice:false,circle:null};
}
let state = fresh(), storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved?.version === 1 && typeof saved.ready === 'boolean' && typeof saved.profile?.name === 'string' &&
      ['tasks','commitments','plan','activities','sessions'].every(k => Array.isArray(saved[k]))) state = saved;
} catch { storageAvailable = false; }
let tab = 0, selectedDay = 0, duration = 30, preview = [], timerNotice = null;
let phoneView = new URL(location.href).searchParams.get('view') === 'launcher' ? 'launcher' : 'app';
let launcherMinute = -1;
let reminderAudio=null;
let aiBusy=false,aiDraft=null,aiSessions=[],betaCode='';
let scheduleView='list',calendarStart=weekStart(vietnamDay(Date.now())),calendarSpan=1,lastScheduleMinute=-1;
const screen = document.getElementById('screen'), nav = document.getElementById('app-nav'), header = document.getElementById('app-header');
const launcher = document.getElementById('launcher');
const modal = document.getElementById('modal'), modalContent = document.getElementById('modal-content');
function save() { try { localStorage.setItem(KEY,JSON.stringify(state)); } catch { storageAvailable = false; toast('Trình duyệt chưa cho lưu dữ liệu. Bạn vẫn có thể thử trong phiên này.'); } }
function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(timerNotice); timerNotice = setTimeout(() => el.classList.remove('visible'),4500); }
function showModal(title, content) {
  modal.classList.remove('calendar-expanded');
  modalContent.innerHTML = `<div class="modal-top"><h2 id="modal-title">${esc(title)}</h2><button class="icon-button" data-action="close" aria-label="Đóng">${icon('close')}</button></div>${content}`;
  if (!modal.open) modal.showModal();
}
function unavailable(title, detail) {
  showModal(title,`<div class="modal-icon">${icon('info')}</div><p class="modal-copy">Tính năng này hiện chưa có trên bản trải nghiệm thử trên website.</p><p class="modal-copy">${esc(detail)}</p><button class="button full" data-action="close">Đã hiểu</button>`);
}
function openLimits() {
  showModal('Bạn có thể thử gì?',`<p class="modal-copy">Giao diện dựa trên app Android 0.6.2. Đây là không gian thử riêng trên trình duyệt.</p><ul class="limit-list"><li><strong>Có thể thao tác:</strong> thêm việc, check-out, ghi hoạt động, sửa lịch cố định, xem lịch theo đầu việc hoặc bảng nhiều tuần, xem và xác nhận kế hoạch mẫu, chạy bộ đếm, tạo nhóm mẫu.</li><li><strong>Widget mô phỏng:</strong> chọn Màn hình chính để thử Ghi nhanh 2×2 và Nhịp hôm nay 4×2. Widget dùng cùng dữ liệu và bộ đếm với giao diện app.</li><li><strong>Chưa có:</strong> screen time thật, khóa ứng dụng / Internet, chạy nền như Android, cài widget lên màn hình thiết bị thật, ảnh và giọng nói.</li><li><strong>Chưa kết nối:</strong> Đăng nhập, mời bạn và đồng bộ nhóm. AI thật dùng mã thử của nhóm và cần bạn chủ động gửi yêu cầu; lịch mẫu không gọi AI.</li></ul><p class="modal-copy">Màn hình chính là mô phỏng trong trang web, không phải hệ điều hành Android. Dữ liệu lưu ở trình duyệt này. Riêng khi bạn chọn tạo lịch AI, mục tiêu và ngữ cảnh lịch được gửi qua backend tới PoolAI; không gửi hồ sơ cá nhân hoặc screen time. Xóa dữ liệu trong Hồ sơ để bắt đầu lại. Hosting có thể ghi log truy cập kỹ thuật.</p><button class="button full" data-action="close">Bắt đầu khám phá</button>`);
}
function render(resetScroll = false) {
  const previousScroll = screen.scrollTop;
  const outside = phoneView === 'launcher';
  document.getElementById('device').classList.toggle('launcher-mode',outside);
  launcher.hidden = !outside; screen.hidden = outside;
  document.querySelector('[data-action="app-view"]').setAttribute('aria-pressed',String(!outside));
  document.querySelector('[data-action="launcher-view"]').setAttribute('aria-pressed',String(outside));
  if (outside) {
    header.hidden = true; nav.hidden = true; renderLauncher(); return;
  }
  if (!state.ready) {
    header.hidden = true; nav.hidden = true; renderWelcome();
  } else {
    header.hidden = false; nav.hidden = false;
    header.innerHTML = `<button class="avatar" data-action="profile" aria-label="Hồ sơ và widget">${esc(state.profile.name.trim().slice(0,1).toUpperCase() || 'A')}</button><div class="app-title">${brandArt('word')}<small>${titles[tab]}</small></div><button class="icon-button" data-action="limits" aria-label="Thông tin bản trải nghiệm">${icon('info')}</button>`;
    nav.innerHTML = tabs.map((label,i) => `<button data-action="tab" data-tab="${i}" ${tab===i?'aria-current="page"':''}><span class="nav-icon">${icon(navIcons[i])}</span>${label}</button>`).join('');
    [renderHome,renderSchedule,renderFocus,renderStats,renderGroups][tab]();
  }
  screen.scrollTop = resetScroll ? 0 : previousScroll;
}
function brandArt(kind='icon') {
  const viewBox=kind==='word'?'543 298 658 167':'196 241 287 288';
  return `<svg class="${kind==='word'?'app-wordmark':'brand-icon'}" viewBox="${viewBox}" role="img" aria-label="brain10"><image href="/assets/brand-source.png" width="1376" height="768"/></svg>`;
}
function switchPhone(view) {
  phoneView=view; modal.close();
  const url=new URL(location.href);
  if(view==='launcher')url.searchParams.set('view','launcher');else url.searchParams.delete('view');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
  render(true);
}
function widgetState() {
  const now=new Date(), minute=now.getHours()*60+now.getMinutes();
  const entries=workOn(dateKey()), pending=entries.filter(t=>!t.done);
  const activePlan=pending.find(t=>t.kind==='plan' && t.start<=minute && t.start+t.duration>minute);
  const linked=state.focus ? pending.find(t=>t.id===state.focus.taskId) : null;
  const current=state.focus ? linked : activePlan || pending[0];
  const future=pending.filter(t=>t.id!==current?.id && t.start!=null && t.start>minute).sort((a,b)=>a.start-b.start);
  const next=future[0] || pending.find(t=>t.id!==current?.id);
  const done=entries.filter(t=>t.done).length, finished=!!entries.length && done===entries.length;
  return {entries,current,next,done,finished,activePlan,manual:!!state.focus};
}
function renderLauncher() {
  const w=widgetState(), focus=state.focus;
  const taskTitle=focus ? w.current?.title || 'Khoảng tập trung' : w.current?.title || (w.finished?'Bạn đã hoàn thành hôm nay':'Chọn một việc quan trọng');
  const subtitle=state.ready ? `${w.done} / ${w.entries.length} việc đã hoàn thành` : 'Mở Brain10 để bắt đầu';
  const status=focus?'ĐANG TẬP TRUNG':w.activePlan?'ĐANG ĐẾN GIỜ':w.finished?'ĐÃ HOÀN THÀNH':'HÔM NAY';
  const clock=focus ? focusClock()+' còn lại' : w.activePlan ? `${Math.max(1,w.activePlan.start+w.activePlan.duration-new Date().getHours()*60-new Date().getMinutes())}p còn lại` : w.current?.start!=null ? timeText(w.current.start) : '';
  const next=w.next ? `Tiếp: ${w.next.start!=null?timeText(w.next.start)+' · ':''}${w.next.title}` : w.finished ? 'Sẵn sàng cho ngày mai? Thêm một việc.' : 'Thêm việc cho ngày của bạn';
  const now=new Date();launcherMinute=Math.floor(now.getTime()/60000);
  launcher.innerHTML=`<div class="launcher-status"><time id="launcher-status-time">${now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time><span class="row" aria-hidden="true">${icon('wifi')}${icon('battery')}</span></div><div class="launcher-clock"><time id="launcher-time">${now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time><p>${esc(now.toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'}))}</p><small>Một ngày có chủ đích.</small></div>${!state.ready?'<button class="launcher-setup" data-action="app-view">Chưa thiết lập hồ sơ. Mở Brain10 để bắt đầu →</button>':''}<div class="launcher-grid"><section class="home-widget widget-flow" aria-label="Widget Nhịp hôm nay 4 x 2"><header class="widget-flow-header"><span class="widget-trend">${icon('trend')}</span><div class="flex"><h2>Nhịp hôm nay</h2><p>${subtitle}</p></div><button class="widget-add" data-action="widget-add" aria-label="Thêm việc từ widget Nhịp hôm nay">+ Thêm</button></header><div class="widget-current"><button class="widget-check ${w.finished?'is-done':''}" data-action="widget-checkout" ${!w.current?'disabled':''} aria-label="Check-out công việc trên widget"><span class="checkbox-ring">${w.finished?icon('check'):''}</span></button><button class="widget-entry" data-action="widget-open"><span class="widget-state"><i class="status-dot"></i>${status}${clock?' · <span id="widget-countdown">'+clock+'</span>':''}</span><strong>${esc(taskTitle)}</strong></button><button class="widget-arrow" data-action="widget-open" aria-label="Mở công việc trong ứng dụng">${icon('arrow')}</button></div><button class="widget-next" data-action="widget-next">${icon('clock')}<span>${esc(next)}</span>${icon('arrow')}</button></section><section class="home-widget widget-quick" aria-label="Widget Ghi nhanh 2 x 2"><header class="widget-quick-header"><button class="widget-back" data-action="app-view" aria-label="Mở Brain10 từ widget">${icon('arrow')}</button><h2>Ghi nhanh</h2><i class="status-dot"></i></header><button class="widget-prompt" data-action="widget-add" aria-label="Thêm việc bằng văn bản từ widget">Nhắc tôi học<br>chương 4…</button><div class="widget-shortcuts"><button class="widget-focus" data-action="widget-focus" aria-label="${focus?'Trở lại phiên tập trung':'Bắt đầu tập trung 30 phút từ widget'}">${icon('clock')}<span>${focus?'Trở lại<br>phiên':'30p<br>Focus'}</span></button><button class="mic-button" data-action="voice" aria-label="Thêm việc bằng giọng nói từ widget">${icon('mic')}</button></div></section><button class="launcher-shortcut" data-action="app-view" aria-label="Mở ứng dụng brain10"><span class="launcher-app-icon">${brandArt()}</span><strong>brain10</strong><small>Mở ứng dụng</small></button></div><div class="launcher-dots" aria-hidden="true"><i></i><i></i><i></i></div><button class="launcher-dock" data-action="app-view"><span class="launcher-app-icon">${brandArt()}</span><span class="flex"><strong>Trở lại nhịp của bạn</strong><small>Mở Brain10 · bản trải nghiệm</small></span>${icon('arrow')}</button>`;
}
function widgetReady() {
  if(state.ready)return true;
  switchPhone('app');toast('Hãy dùng hồ sơ mẫu hoặc nhập hồ sơ để thử widget.');return false;
}
function widgetAdd() {
  if(!widgetReady())return;
  const today=workOn(dateKey());selectedDay=today.length && today.every(t=>t.done)?1:0;
  addTask();
}
function renderWelcome() {
  screen.innerHTML = `<form id="welcome-form" class="welcome"><div class="step"><span class="tag">● · Bước 1 / 2</span></div><h1>Bắt đầu nhé.<br><span>Mình gọi bạn là gì?</span></h1><p>Không cần mật khẩu để bắt đầu. Tạo một nhịp tập trung của riêng bạn.</p><div class="hero-avatar">${icon('person')}</div><label class="field">Họ tên hoặc biệt danh<input name="name" maxlength="60" placeholder="VD: An" value="${state.profile.name==='An'?'':esc(state.profile.name)}" required autocomplete="off"></label><label class="field">Sinh nhật<input name="birthday" type="date" max="${dateKey()}" value="${esc(state.profile.birthday)}" required></label><span class="field-hint">Bản web lưu trên trình duyệt. Bạn có thể dùng hồ sơ mẫu bên dưới để không nhập thông tin cá nhân.</span><label class="field">Mục tiêu chính<select name="goal"><option>Học tập / Thi cử</option><option>Tập trung làm việc</option><option>Xây dựng thói quen</option></select></label><div class="bottom"><button class="button full" type="submit">Bắt đầu với chế độ khách ${icon('arrow')}</button><button class="text-button full" style="width:100%;text-align:center;margin-top:9px" type="button" data-action="sample-profile">Dùng hồ sơ mẫu An</button><p>${icon('lock')} Chỉ lưu trên trình duyệt này.</p><button type="button" class="text-button" data-action="login" style="width:100%">Đã có tài khoản? Đăng nhập</button></div></form>`;
}
function workOn(day) { return [...state.tasks,...state.plan].filter(t => t.day===day); }
function taskRow(task) {
  const planned = task.kind==='plan', start = task.start!=null ? timeText(task.start) : 'Linh hoạt';
  return `<article class="task-row ${task.done?'completed':''}"><button class="check-button ${task.done?'done':''}" data-action="checkout" data-id="${esc(task.id)}" aria-label="${task.done?'Xem kết quả':'Hoàn thành'} ${esc(task.title)}">${task.done?icon('check'):''}</button><div class="flex"><div class="row between"><span class="tag">${task.done?'Đã hoàn thành':planned?(task.source==='ai'?'Phiên học AI':'Phiên học mẫu'):'Việc của bạn'}</span><span class="task-time">${start}</span></div><h3>${esc(task.title)}</h3>${task.note?`<p>${esc(task.note)}</p>`:''}<div class="task-bottom"><span class="row" style="gap:3px">${icon('clock')} ${task.duration} phút</span>${!task.done?`<button class="mini-button" data-action="checkout" data-id="${esc(task.id)}">${icon('check')} Check-out</button>`:''}</div></div></article>`;
}
function renderHome() {
  const day = dateKey(dateOffset(selectedDay)), entries = workOn(day), done = entries.filter(t=>t.done).length;
  const percentage = entries.length ? Math.round(done/entries.length*100) : 0;
  const name = state.profile.name.trim().split(/\s+/).at(-1) || 'bạn';
  const greeting = new Date().getHours()<12?'Chào buổi sáng':new Date().getHours()<18?'Chào buổi chiều':'Chào buổi tối';
  screen.innerHTML = `<div class="screen-body grow"><h1 class="screen-title">${greeting}, ${esc(name)}</h1><p class="screen-subtitle">${!entries.length?'Một ngày có chủ đích. Bắt đầu bằng một việc nhỏ.':done===entries.length?'Bạn đã hoàn thành những điều quan trọng. Nghỉ một chút nhé.':`Còn ${entries.length-done} việc cần làm. Cứ từng bước, theo nhịp của bạn.`}</p><div class="card row"><div class="ring" style="--progress:${percentage}%"><span>${percentage}%</span></div><div class="flex"><strong class="small">Nhịp ngày</strong><p class="tiny muted">${done} / ${entries.length} việc đã hoàn thành</p></div><button class="round-add" data-action="activity" aria-label="Ghi hoạt động">${icon('plus')}</button></div><div class="section-row"><h2>${selectedDay?'Việc ngày mai':'Việc hôm nay'}</h2><time>${dayLabel(day)}</time><button class="text-add" data-action="add-task">${icon('plus')} Thêm</button></div><div class="chips"><button class="chip ${!selectedDay?'selected':''}" data-action="day" data-day="0">Hôm nay</button><button class="chip ${selectedDay?'selected':''}" data-action="day" data-day="1">Ngày mai</button></div>${entries.length?`<div class="card task-list">${entries.map(taskRow).join('')}</div>`:`<div class="card empty">${icon('sun')}<h3>Chừa chỗ cho điều quan trọng.</h3><p>Chọn 2–3 việc bạn muốn hoàn thành.<br>Lịch đã xác nhận cũng sẽ có mặt ở đây.</p><button class="text-button" data-action="add-task">Thêm việc đầu tiên</button></div>`}${state.activities.length?`<div class="section-row"><h2>Những điều đã làm</h2></div>${state.activities.slice().reverse().map(a=>`<div class="card"><span class="tag">Tự ghi nhận · Chỉ mình tôi</span><h3 class="small" style="margin:9px 0 4px">${esc(a.title)}</h3><p class="tiny muted">${dayLabel(dateKey(new Date(a.end)))} · ${a.duration} phút</p></div>`).join('')}`:''}</div><div class="quick-add"><button data-action="add-task">${icon('spark')} Ghi nhanh điều cần làm…</button><button class="mic-button" data-action="voice" aria-label="Thêm bằng giọng nói">${icon('mic')}</button></div>`;
}
function addTask() {
  showModal('Việc bạn muốn làm',`<form id="task-form"><label class="field">Bạn muốn làm gì?<input name="title" maxlength="140" placeholder="VD: Đọc chương 4 · DBMS" required autofocus></label><div class="field-grid"><label class="field">Thời lượng (phút)<input name="duration" type="number" min="1" max="480" value="30" required></label><label class="field">Ngày thực hiện<select name="day"><option value="0" ${!selectedDay?'selected':''}>Hôm nay</option><option value="1" ${selectedDay?'selected':''}>Ngày mai</option></select></label></div><label class="field">Ghi chú (tùy chọn)<textarea name="note" maxlength="300" placeholder="Một bước cụ thể để bắt đầu…"></textarea></label><button class="button full">Thêm vào danh sách</button></form>`);
}
function checkout(id) {
  const task = [...state.tasks,...state.plan].find(t=>t.id===id); if (!task) return;
  if (task.done) {
    showModal('Một việc đã hoàn thành',`<span class="tag">${esc(task.title)}</span><p class="modal-copy" style="margin-top:15px">${esc(task.reflection || 'Bạn đã bỏ qua phần nhìn lại.')}</p><p class="tiny muted">Quyền xem đã chọn: ${esc(task.audience || 'Chỉ mình tôi')}. Bản web không gửi nội dung cho người khác.</p><button class="button full" data-action="close" style="margin-top:18px">Tiếp tục nhịp ngày</button>`); return;
  }
  modalContent.innerHTML = `<form id="checkout-form" class="checkout"><input type="hidden" name="id" value="${esc(id)}"><button type="button" class="icon-button close-checkout" data-action="close" aria-label="Đóng">${icon('close')}</button><div class="modal-icon">${icon('check')}</div><span class="tag">${esc(task.title)} · ${task.duration} phút</span><h2 id="modal-title">Bạn đã làm được gì?</h2><p class="modal-copy">Một câu ngắn để ghi nhận bước tiến,<br>trước khi khép lại công việc.</p><label class="field"><span class="hidden">Nhìn lại công việc</span><textarea name="reflection" maxlength="160" placeholder="VD: Đọc chương 4 và tóm tắt các ý chính…"></textarea></label><div class="counter"><span id="char-count">0</span>/160</div><div class="suggestions"><button type="button" data-action="suggest" data-text="Đọc xong chương">+ Đọc xong chương</button><button type="button" data-action="suggest" data-text="Ghi lại ý chính">+ Ghi lại ý chính</button><button type="button" data-action="suggest" data-text="Giải xong bài tập">+ Giải xong bài tập</button></div><label class="field">Quyền xem<select name="audience"><option>Chỉ mình tôi</option><option>Toàn bộ nhóm · mô phỏng</option><option>Chọn người · mô phỏng</option></select></label><div id="audience-note" class="field-hint" hidden>Chia sẻ thực chưa có trên bản web. Lựa chọn này chỉ được lưu để trải nghiệm giao diện.</div><button class="button full" style="margin-top:15px">Đánh dấu hoàn thành ${icon('check')}</button><button type="button" class="skip" data-action="skip-reflection">Bỏ qua phần nhìn lại</button></form>`;
  if (!modal.open) modal.showModal();
}
function completeTask(form, skip = false) {
  const task = [...state.tasks,...state.plan].find(t=>t.id===form.elements.namedItem('id').value); if (!task || task.done) return;
  if(state.focus?.taskId===task.id)recordFocus(false);
  task.done = true; task.completedAt = new Date().toISOString(); task.reflection = skip?'':form.elements.reflection.value.trim();
  task.audience = skip?'Chỉ mình tôi':form.elements.audience.value;
  save(); modal.close(); render(); toast('Đã ghi nhận. Một bước nhỏ, một việc trọn vẹn.');
}
function statusMarkup(entry){
  const status=sessionStatus(entry);
  return `<span class="schedule-tag" data-state="${status.key}">${status.label}</span>${status.checkout?'<span class="schedule-tag unchecked">Chưa check-out</span>':''}${status.relative?`<span class="schedule-relative">${status.relative}</span>`:''}`;
}
function statusRow(entry){return `<div class="session-status" data-entry-id="${esc(entry.fixed?entry.commitmentId:entry.id)}" data-day="${esc(entry.day)}" data-fixed="${!!entry.fixed}">${statusMarkup(entry)}</div>`;}
function scheduleCard(p){
  return `<article class="card session" data-session-id="${esc(p.id)}"><div class="row between"><span class="tag">${dayLabel(p.day)} · ${timeText(p.start)}–${timeText(p.start+p.duration)}</span><span class="task-time">${p.source==='ai'?'Lịch AI':'Lịch mẫu'}</span></div>${statusRow(p)}<h3>${esc(p.title)}</h3><p>${esc(p.note || p.subject || '')}</p><details><summary class="text-button">Nội dung buổi ôn</summary><ul>${(p.objectives || []).map(o=>`<li>${esc(o)}</li>`).join('')}</ul><ol class="tiny muted">${(p.steps || []).map(step=>`<li>${esc(step)}</li>`).join('')}</ol>${p.expectedOutput?`<p>${esc(p.expectedOutput)}</p>`:''}</details><div class="row between"><button class="button ${p.done?'secondary':''}" data-action="checkout" data-id="${esc(p.id)}">${p.done?'Đã hoàn thành':'Check-out'}</button><button class="text-button" data-action="delete-plan" data-id="${esc(p.id)}">Bỏ khỏi lịch</button></div></article>`;
}
function calendarEntry(id,day,fixed=false){
  if(!fixed)return state.plan.find(p=>p.id===id) || state.tasks.find(p=>p.id===id);
  const c=state.commitments.find(c=>c.id===id);
  return c?{id:`fixed:${c.id}:${day}`,commitmentId:c.id,title:c.title,day,start:c.start,duration:c.end-c.start,fixed:true}:null;
}
function calendarEvent(p){
  const status=sessionStatus(p),label=p.subject || p.title;
  return `<button class="calendar-event" data-action="session-detail" data-id="${esc(p.fixed?p.commitmentId:p.id)}" data-day="${p.day}" data-fixed="${!!p.fixed}" data-state="${status.key}" aria-label="${esc(`${p.title}, ${dayLabel(p.day)} ${timeText(p.start)}, ${status.label}`)}" title="${esc(p.title)}"><span class="event-top"><time>${timeText(p.start)}</time><i aria-hidden="true"></i></span><strong>${esc(label)}</strong>${p.subject && p.subject!==p.title?`<span class="event-name">${esc(p.title)}</span>`:''}${p.fixed?'<span class="event-fixed">Cố định</span>':''}</button>`;
}
function calendarBoard(){
  const weeks=calendarWeeks(state,calendarStart,calendarSpan),today=vietnamDay(Date.now());
  const last=addDays(calendarStart,calendarSpan*7-1);
  const unplaced=state.tasks.filter(t=>t.day>=calendarStart && t.day<=last);
  return `<div class="calendar-navigation"><button class="icon-button" data-action="calendar-prev" aria-label="Tuần trước">‹</button><div><strong>${dayLabel(calendarStart)} – ${dayLabel(last)}<span class="calendar-year"> / ${last.slice(0,4)}</span></strong><button class="text-button" data-action="calendar-today">Về tuần này</button></div><button class="icon-button" data-action="calendar-next" aria-label="Tuần sau">›</button></div><div class="calendar-options"><label>Số tuần <select data-calendar-span aria-label="Số tuần hiển thị">${[1,2,4].map(n=>`<option value="${n}" ${calendarSpan===n?'selected':''}>${n} tuần</option>`).join('')}</select></label><button class="text-button" data-action="calendar-expand">${icon('focus')} Xem rộng</button></div><p class="calendar-hint">Giờ Việt Nam · Chạm vào một buổi để xem chi tiết.</p><div class="calendar-scroll">${weeks.map((week,i)=>`<table class="week-table" aria-label="Lịch tuần ${dayLabel(week.first)}"><caption>${calendarSpan>1?`Tuần ${i+1} · `:''}${dayLabel(week.first)} – ${dayLabel(week.days[6])}</caption><colgroup><col class="period-column">${week.days.map(()=>'<col>').join('')}</colgroup><thead><tr><th scope="col">Buổi</th>${week.days.map((day,d)=>`<th scope="col" data-calendar-day="${day}" class="${day===today?'is-today':''}"><span>${weekdays[d]}</span><time>${dayLabel(day)}</time></th>`).join('')}</tr></thead><tbody>${periods.map((period,r)=>`<tr><th scope="row"><strong>${period.label}</strong><small>${period.range}</small></th>${week.days.map((day,d)=>`<td data-cell="${day}:${r}" aria-label="${period.label}, ${weekdays[d]}, ${dayLabel(day)}">${week.cells[r][d].map(calendarEvent).join('') || '<span class="calendar-empty" aria-hidden="true">·</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</div><div class="calendar-legend"><span><i data-state="upcoming"></i>Sắp tới</span><span><i data-state="active"></i>Đang diễn ra</span><span><i data-state="overdue"></i>Quá hạn</span><span><i data-state="done"></i>Hoàn thành</span></div>${unplaced.length?`<section class="unplaced-tasks"><h3>Việc chưa đặt giờ <span>${unplaced.length}</span></h3><p class="tiny muted">Những việc này chưa có giờ bắt đầu, nên chưa xếp vào buổi.</p>${unplaced.map(t=>`<button data-action="session-detail" data-id="${esc(t.id)}" class="unplaced-task"><span>${dayLabel(t.day)}</span><strong>${esc(t.title)}</strong>${t.done?icon('check'):icon('arrow')}</button>`).join('')}</section>`:''}<p class="calendar-hint">Lịch cố định lặp theo cấu hình hiện tại. Bảng có thể xem nhiều tuần; AI hiện lập lịch trong 7 ngày tới.</p>`;
}
function renderSchedule() {
  const commitments=state.commitments.map(c=>`<div class="fixed-item row"><button class="flex" style="text-align:left;padding:0" data-action="edit-fixed" data-id="${esc(c.id)}"><strong>${esc(c.title)}</strong><small>${c.weekdays.map(n=>weekdays[n-1]).join(', ')} · ${timeText(c.start)}–${timeText(c.end)}</small></button><button class="delete-button" data-action="delete-fixed" data-id="${esc(c.id)}" aria-label="Xóa lịch ${esc(c.title)}">${icon('trash')}</button></div>`).join('');
  const plan=[...state.plan].sort((a,b)=>startTime(a)-startTime(b));
  screen.innerHTML=`<div class="screen-body"><h1 class="screen-title">Thời gian, theo cách của bạn.</h1><p class="screen-subtitle">Giữ chỗ cho lịch cố định. Dành phần còn lại cho mục tiêu.</p><div class="card tint"><span class="tag">01 · LỊCH CỐ ĐỊNH</span><h2 style="font-size:21px;margin:13px 0 8px">Những khung giờ không thể đổi</h2><p class="small muted">Lịch đi học, đi làm và thời gian riêng lặp lại mỗi tuần. Bạn có thể sửa bất cứ lúc nào.</p>${commitments}<button class="button secondary" style="margin-top:14px" data-action="add-fixed">${icon('plus')} Thêm lịch cố định</button></div><button class="button full" data-action="sample-plan" ${!state.commitments.length?'disabled':''}>${icon('spark')} Xem kế hoạch học mẫu</button><p class="tiny ${state.commitments.length?'muted':'blue'}" style="margin:10px 0">${state.commitments.length?'Mẫu DBMS · CNPM · KTLT, được xếp vào khung trống. Không gọi AI.':'Nhập lịch đi học / đi làm ở bước 01 trước khi xem kế hoạch mẫu.'}</p><button class="button secondary full" data-action="study-preferences" style="margin:6px 0 10px">Nhịp học của bạn</button><button class="button full" data-action="ai">Lên kế hoạch cùng AI ↗</button><div class="section-row"><h2>Lịch trình của bạn</h2></div><div class="schedule-view-switch" role="group" aria-label="Cách xem lịch"><button data-action="schedule-list" aria-pressed="${scheduleView==='list'}">${icon('check')} Đầu việc</button><button data-action="schedule-calendar" aria-pressed="${scheduleView==='calendar'}">${icon('calendar')} Bảng lịch</button></div>${scheduleView==='calendar'?`<section class="calendar-panel" aria-label="Bảng lịch theo tuần">${calendarBoard()}</section>`:plan.length?plan.map(scheduleCard).join(''):`<div class="card empty">${icon('calendar')}<h3>Chưa có phiên học nào.</h3><p>Nhập lịch cố định, rồi thử xem kế hoạch mẫu.</p></div>`}</div>`;
}
function openSession(id,day,fixed){
  const p=calendarEntry(id,day,fixed);if(!p)return;
  showModal('Chi tiết hoạt động',`<span class="tag">${p.fixed?'Lịch cố định':p.source==='ai'?'Lịch AI':p.kind==='plan'?'Phiên học':'Việc của bạn'}</span><h3 class="session-detail-title">${esc(p.title)}</h3><p class="modal-copy">${dayLabel(p.day)}${p.start!=null?` · ${timeText(p.start)}–${timeText(p.start+p.duration)}`:' · Chưa đặt giờ'}</p>${statusRow(p)}${p.subject?`<p class="small blue">${esc(p.subject)}</p>`:''}${p.note?`<p class="modal-copy">${esc(p.note)}</p>`:''}${p.objectives?.length?`<h3 class="detail-heading">Mục tiêu buổi học</h3><ul class="limit-list">${p.objectives.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}${p.steps?.length?`<h3 class="detail-heading">Các bước thực hiện</h3><ol class="limit-list">${p.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}${p.expectedOutput?`<div class="notice"><strong>Đầu ra cần đạt</strong><p>${esc(p.expectedOutput)}</p></div>`:''}${p.fixed?'<p class="notice">Khung giờ lặp lại, không phải một đầu việc cần check-out. Giờ đã qua hiển thị “Đã kết thúc”.</p>':''}${p.reflection?`<h3 class="detail-heading">Nhìn lại</h3><p class="modal-copy">${esc(p.reflection)}</p>`:''}<div class="stack" style="margin-top:18px">${p.fixed?`<button class="button full" data-action="edit-fixed" data-id="${esc(p.commitmentId)}">Chỉnh lịch cố định</button>`:`<button class="button full" data-action="checkout" data-id="${esc(p.id)}">${p.done?'Xem check-out':'Check-out công việc'}</button>`}<button class="button secondary full" data-action="close">Đóng chi tiết</button></div>`);
}
function expandCalendar(){
  showModal('Bảng lịch của bạn',calendarBoard());modal.classList.add('calendar-expanded');
}
function changeCalendar(){
  const expanded=modal.open && modal.classList.contains('calendar-expanded');render();if(expanded)expandCalendar();
}
function refreshScheduleStatuses(){
  document.querySelectorAll('.session-status').forEach(el=>{const p=calendarEntry(el.dataset.entryId,el.dataset.day,el.dataset.fixed==='true');if(p)el.innerHTML=statusMarkup(p);});
  document.querySelectorAll('.calendar-event').forEach(el=>{const p=calendarEntry(el.dataset.id,el.dataset.day,el.dataset.fixed==='true');if(p){const status=sessionStatus(p);el.dataset.state=status.key;el.setAttribute('aria-label',`${p.title}, ${dayLabel(p.day)} ${timeText(p.start)}, ${status.label}`);}});
  document.querySelectorAll('[data-calendar-day]').forEach(el=>el.classList.toggle('is-today',el.dataset.calendarDay===vietnamDay(Date.now())));
}
function fixedEditor(id) {
  const existing = state.commitments.find(c=>c.id===id);
  showModal(existing?'Sửa lịch cố định':'Thêm lịch cố định',`<form id="fixed-form"><input type="hidden" name="id" value="${esc(existing?.id || '')}"><label class="field">Tên lịch<input name="title" value="${esc(existing?.title || '')}" placeholder="VD: Đi học ở trường" maxlength="100" required></label><p class="small">Lặp lại vào</p><div class="weekdays">${weekdays.map((label,i)=>`<label class="weekday"><input type="checkbox" name="weekdays" value="${i+1}" ${(existing?.weekdays || [1,2,3,4,5]).includes(i+1)?'checked':''}><span>${label}</span></label>`).join('')}</div><div class="field-grid"><label class="field">Bắt đầu<input name="start" type="time" value="${timeText(existing?.start ?? 7*60)}" required></label><label class="field">Kết thúc<input name="end" type="time" value="${timeText(existing?.end ?? 12*60)}" required></label></div><p id="form-error" class="form-error" role="alert"></p><p class="field-hint" style="margin-bottom:14px">Lịch đã xác nhận sẽ giữ nguyên khi sửa giờ cố định. Nếu có xung đột, bản thử sẽ yêu cầu bạn xử lý trước.</p><button class="button full">Lưu lịch cố định</button></form>`);
}
// Deterministic sample only: six authored sessions, no model or server requests.
function samplePlan() {
  if (!state.commitments.length) return;
  const lessons = [
    ['DBMS · Truy vấn lồng','Ôn SELECT và truy vấn con.', ['Phân biệt truy vấn tương quan và không tương quan.','Giải 3 câu truy vấn trên giấy.']],
    ['CNPM · Kiểm thử phần mềm','Củng cố các kỹ thuật thiết kế ca kiểm thử.', ['Ôn phân vùng tương đương, giá trị biên.','Viết 5 test case cho màn đăng nhập.']],
    ['KTLT · Con trỏ và mảng','Nhắc lại kiến thức và tự viết ví dụ.', ['Vẽ sơ đồ bộ nhớ.','Giải 2 bài tập con trỏ.']],
    ['DBMS · Tự kiểm tra','Làm bài ngắn và xem lại lỗi.', ['Tự làm 5 câu không nhìn tài liệu.','Tóm tắt lỗi sai và cách sửa.']],
    ['CNPM · Ôn tập tổng hợp','Hệ thống lại nội dung đã học.', ['Vẽ sơ đồ vòng đời phát triển.','Giải một đề tự luyện.']],
    ['KTLT · Luyện bài tập','Luyện giải bài trước khi kiểm tra.', ['Tự viết và chạy 2 chương trình.','Ghi lại lỗi thường gặp.']]
  ];
  preview = []; let index = 0;
  for (let offset=1; offset<=3; offset++) {
    const date = dateOffset(offset), day = dateKey(date), week = weekdayIndex(date);
    const blocked = [...state.commitments.filter(c=>c.weekdays.includes(week)).map(c=>[c.start,c.end]),
      ...state.plan.filter(p=>p.day===day).map(p=>[p.start,p.start+p.duration])];
    let dailyCount = 0;
    for (let start=8*60; start+45<=22*60 && index<lessons.length && dailyCount<2; start+=15) {
      if (blocked.some(([a,b])=>start<b && start+45>a)) continue;
      const [title,note,objectives] = lessons[index++];
      preview.push({id:uid(),kind:'plan',title,note,objectives,day,start,duration:45,done:false});
      blocked.push([start,start+60]); dailyCount++;
    }
  }
  showModal('Xem trước kế hoạch mẫu',`<span class="tag">MẪU CÓ SẴN · KHÔNG DÙNG AI</span><p class="modal-copy" style="margin-top:12px">Kịch bản ôn DBMS, CNPM và KTLT trong 3 ngày tới. Giờ học được xếp thử vào khung 08:00–22:00, tránh lịch cố định và phiên học đã xác nhận. Nội dung không cá nhân hóa theo môn học thực tế.</p>${preview.length?preview.map(p=>`<div class="card session"><span class="tag">${dayLabel(p.day)} · ${timeText(p.start)}–${timeText(p.start+45)}</span><h3>${esc(p.title)}</h3><p>${esc(p.note)}</p></div>`).join(''):'<p class="modal-copy">Không còn khung trống phù hợp. Bạn có thể điều chỉnh lịch cố định hoặc bỏ bớt các phiên mẫu trước.</p>'}${preview.length?'<button class="button full" data-action="confirm-plan">Xác nhận thêm vào lịch</button>':'<button class="button full" data-action="close">Đã hiểu</button>'}`);
}
function editStudyPreferences(){
  const p=state.studyPreferences || defaultPreferences;
  showModal('Nhịp học của bạn',`<form id="study-form"><div class="field-grid"><label class="field">Có thể học từ<input type="time" name="start" value="${timeText(p.startMinute)}" required></label><label class="field">Kết thúc trước<input type="time" name="end" value="${timeText(p.endMinute)}" required></label></div><label class="field">Mỗi phiên<select name="session">${[25,30,45,60,90].map(n=>`<option value="${n}" ${p.sessionMinutes===n?'selected':''}>${n} phút</option>`).join('')}</select></label><label class="field">Quỹ học mỗi ngày (phút)<input type="number" name="daily" min="25" max="480" value="${p.dailyMinutes}" required></label><p class="tiny muted">Lịch AI hỗ trợ 7 ngày tới, múi giờ Việt Nam. Lịch đã xác nhận vẫn được giữ nguyên.</p><p id="form-error" class="form-error" role="alert"></p><button class="button full">Lưu nhịp học</button></form>`);
}
function openAI(){
  if(!state.commitments.length){showModal('Nhập lịch cố định trước',`<p class="modal-copy">Lưu lịch đi học / đi làm trước khi gọi AI. Bước này giúp tránh trùng giờ và không tốn lượt để hỏi lại thời khóa biểu.</p><button class="button full" data-action="add-fixed">Thêm lịch cố định</button>`);return;}
  if(aiBusy){toast('AI đang tạo kế hoạch. Hãy chờ kết quả trước khi gửi tiếp.');return;}
  if(aiDraft){renderAIDraft();return;}
  const p=state.studyPreferences || defaultPreferences;
  showModal('Kế hoạch học cùng AI',`<form id="ai-form"><span class="tag">AI THẬT · XEM TRƯỚC RỒI XÁC NHẬN</span><p class="modal-copy" style="margin-top:12px">${state.commitments.length} lịch cố định · khung ${timeText(p.startMinute)}–${timeText(p.endMinute)} · ${p.dailyMinutes} phút/ngày. Múi giờ Việt Nam.</p><label class="field">Mã thử AI của nhóm<input type="password" name="code" value="${esc(betaCode)}" autocomplete="off" maxlength="80" required placeholder="Không nhập key PoolAI"></label><span class="field-hint">Mã riêng do nhóm cung cấp, không phải API key. Chỉ giữ trong bộ nhớ tab này.</span><label class="field">Bạn muốn đạt điều gì?<textarea name="request" maxlength="4000" required placeholder="VD: DBMS kiểm tra sau 3 ngày, cần ôn JOIN…">${esc(state.profile.lastAIRequest || '')}</textarea></label><button type="button" class="text-button" data-action="ai-example">Dùng ví dụ DBMS · CNPM · KTLT</button><label class="field">Đề cương, phần còn yếu, cách học yêu thích<textarea name="learningContext" maxlength="6000" placeholder="Cung cấp phạm vi học để AI không phải đoán…">${esc(state.profile.learningContext || '')}</textarea></label><div class="notice">Khi tạo kế hoạch, mục tiêu, ngữ cảnh học, nhịp học và lịch được gửi qua backend tới PoolAI (${esc('gpt-5.4-mini')}). Không gửi họ tên, sinh nhật, nhật ký, ảnh hay screen time. Yêu cầu này có sử dụng credit AI.</div><p id="ai-error" class="form-error" role="alert"></p><button class="button full" id="ai-submit">${icon('spark')} Tạo kế hoạch để xem trước</button></form>`);
}
async function generateAI(data){
  if(aiBusy || !state.commitments.length)return;
  betaCode=String(data.get('code')).trim();
  const request=String(data.get('request')).trim(),learningContext=String(data.get('learningContext')).trim();
  if(!request || !betaCode)return;
  const button=document.getElementById('ai-submit');
  aiBusy=true;button.disabled=true;button.textContent='Đang sắp xếp kế hoạch…';
  state.profile.lastAIRequest=request;state.profile.learningContext=learningContext;save();
  try{
    const response=await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${betaCode}`},body:JSON.stringify(makePlanningRequest(state,request,learningContext)),signal:AbortSignal.timeout(105000)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error || 'Chưa tạo được lịch. Hãy thử lại.');
    aiSessions=convertDraft(result);aiDraft=result;
    if(modal.open && document.getElementById('ai-form'))renderAIDraft();else toast('Lịch AI đã sẵn sàng. Mở mục AI để xem kết quả.');
  }catch(error){
    const message=error.name==='TimeoutError'?'AI phản hồi quá lâu. Hãy thử lại.':error.message || 'Không kết nối được dịch vụ AI.';
    const field=document.getElementById('ai-error');if(field)field.textContent=message;else toast(message);
  }finally{
    aiBusy=false;
    if(document.getElementById('ai-submit')){button.disabled=false;button.textContent='Tạo kế hoạch để xem trước';}
  }
}
function renderAIDraft(){
  showModal('Lịch AI đề xuất',`<span class="tag">${esc(aiDraft.model || 'gpt-5.4-mini')} · CHƯA LƯU</span><h3 class="small" style="margin:15px 0">${esc(aiDraft.summary)}</h3>${aiDraft.questions.map(q=>`<p class="notice"><strong>Cần bổ sung:</strong> ${esc(q)}</p>`).join('')}${aiDraft.assumptions.map(a=>`<p class="tiny muted" style="margin-bottom:8px">Giả định: ${esc(a)}</p>`).join('')}${aiSessions.map(p=>`<article class="card session"><span class="tag">${dayLabel(p.day)} · ${timeText(p.start)}–${timeText(p.start+p.duration)}</span><h3>${esc(p.title)}</h3><p>${esc(p.subject)}</p><ul>${p.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ul><details><summary class="text-button">Các bước học & đầu ra</summary><ol class="tiny muted">${p.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p>${esc(p.expectedOutput)}</p></details><button class="text-button" data-action="remove-ai-session" data-id="${p.id}">Bỏ phiên này</button></article>`).join('')}<p class="field-hint" style="margin:12px 0">Đối chiếu nội dung với đề cương. Chỉ thêm vào lịch sau khi bạn xác nhận; khung giờ sẽ được kiểm tra lại.</p>${aiSessions.length?'<button class="button full" data-action="accept-ai">Xác nhận thêm vào lịch</button>':''}<button class="text-button" data-action="edit-ai" style="width:100%;margin-top:8px">Chỉnh mục tiêu / bổ sung thông tin</button>`);
}
function renderFocus() {
  const active = !!state.focus;
  screen.innerHTML = `<div class="screen-body"><h1 class="screen-title">Trở về với một việc.</h1><p class="screen-subtitle">Dành một khoảng thời gian cho điều bạn đã chọn.</p><div class="notice"><div class="row">${icon('lock')}<strong>Bộ đếm thử · không khóa thiết bị</strong></div><p style="margin-top:7px">Chặn ứng dụng, chặn Internet và bảo vệ chạy nền hiện chưa có trên bản web.</p><button class="text-button" data-action="protection">Tìm hiểu quyền trên Android ↗</button></div><div class="timer-panel"><div class="timer-label">MỘT KHOẢNG DÀNH RIÊNG CHO BẠN</div><div class="timer-ring" id="focus-clock" role="timer" aria-label="Thời gian tập trung còn lại">${focusClock()}</div><button class="button" data-action="${active?'stop-focus':'start-focus'}">${icon(active?'stop':'play')} ${active?'Kết thúc phiên':'Bắt đầu phiên'}</button><p>Thả lỏng vai. Bắt đầu từ một việc.<br>Bạn vẫn có thể sử dụng thiết bị bình thường.</p></div>${wellbeingCard()}${!active?`<div class="card"><h2 style="font-size:17px">Khoảng tập trung của bạn</h2><label class="field">Thời lượng (phút)<input id="focus-duration" type="number" min="1" max="480" value="${duration}" required></label><div class="chips">${[25,30,60,90].map(n=>`<button class="chip ${duration===n?'selected':''}" data-action="duration" data-minutes="${n}">${n} phút</button>`).join('')}</div><p class="tiny muted">Tối đa 8 giờ. Bộ đếm dựa vào giờ kết thúc; tab đóng sẽ không phát thông báo.</p></div>`:''}<p class="tiny muted">${Math.floor(state.sessions.reduce((sum,s)=>sum+s.seconds,0)/60)} phút đã ghi nhận từ các phiên trong bản web.</p></div>`;
}
function prepareReminderAudio(){
  try {
    const Audio=window.AudioContext || window.webkitAudioContext;
    if(!Audio)return;
    reminderAudio ||= new Audio();
    return reminderAudio.resume().catch(()=>{});
  }catch{}
}
function reminderSound(){
  try {
    if(reminderAudio?.state!=='running')return false;
    const at=reminderAudio.currentTime;
    for(const [offset,pitch] of [[0,660],[.28,880]]){
      const tone=reminderAudio.createOscillator(),gain=reminderAudio.createGain();
      tone.frequency.value=pitch;gain.gain.setValueAtTime(0,at+offset);
      gain.gain.linearRampToValueAtTime(.08,at+offset+.02);gain.gain.exponentialRampToValueAtTime(.001,at+offset+.24);
      tone.connect(gain);gain.connect(reminderAudio.destination);tone.start(at+offset);tone.stop(at+offset+.26);
    }
    return true;
  }catch{return false;}
}
function hideWellbeing(){const el=document.getElementById('wellbeing-alert');el.hidden=true;el.innerHTML='';}
function checkWellbeing(){
  if(state.wellbeingReminders===false)return;
  const boundary=reminderBoundary(state.focus);if(!boundary)return;
  state.focus.reminderBoundary=boundary;save();
  const sounded=reminderSound(),el=document.getElementById('wellbeing-alert');
  el.innerHTML=`<div class="reminder-heading">${icon('leaf')}<strong>Đã tập trung ${boundary*40} phút</strong></div><p>Uống một ít nước, đứng dậy và thả lỏng vai trong 1–2 phút.</p><small>Bộ đếm vẫn chạy. ${sounded?'Âm báo đã phát; âm lượng phụ thuộc thiết bị.':'Âm thanh chưa sẵn sàng; nhấn Thử âm báo để bật tiếng.'}</small><div class="reminder-actions"><button class="button" data-action="dismiss-wellbeing">Đã nhớ · cảm ơn</button><button class="text-button" data-action="test-reminder-sound">Thử âm báo</button></div>`;
  el.hidden=false;
}
function wellbeingCard(){return `<section class="card wellbeing-card"><label class="wellbeing-setting">${icon('leaf')}<span><strong>Nghỉ nhẹ & uống nước</strong><small>Nhắc sau mỗi 40 phút trong phiên dài.</small></span><input type="checkbox" id="wellbeing-enabled" aria-label="Nhắc nghỉ nhẹ và uống nước" ${state.wellbeingReminders!==false?'checked':''}></label><p>Dành 1–2 phút vận động nhẹ. Bộ đếm vẫn tiếp tục. Bản web nhắc khi trang còn mở; không bảo đảm khi đóng tab hoặc thiết bị ngủ.</p><button class="text-button" data-action="test-reminder-sound">Thử âm báo</button><p class="tiny muted">Trình duyệt có thể yêu cầu bật tiếng lại sau khi tải lại trang. Âm lượng phụ thuộc cài đặt thiết bị.</p></section>`;}
function focusClock() {
  const seconds = state.focus ? Math.max(0,Math.ceil((state.focus.end-Date.now())/1000)) : duration*60;
  return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function startFocus(taskId = null) {
  if (state.focus) return;
  const input = document.getElementById('focus-duration');
  if (input && !input.reportValidity()) return;
  duration = Number(input?.value || duration);
  if (!Number.isInteger(duration) || duration<1 || duration>480) { toast('Chọn thời lượng từ 1 đến 480 phút.'); return; }
  if (!state.focusNotice) {
    showModal('Trước khi bắt đầu',`<div class="modal-icon">${icon('lock')}</div><p class="modal-copy">Bản trải nghiệm web chỉ chạy bộ đếm. Tính năng khóa ứng dụng, chặn Internet và theo dõi app ở nền hiện chưa có trên bản trải nghiệm thử trên website.</p><p class="modal-copy">Bản web không yêu cầu quyền Android. Trên APK, các quyền được giải thích và xin riêng trước khi bật bảo vệ.</p><button class="button full" data-action="confirm-focus" data-task-id="${typeof taskId==='string'?esc(taskId):''}">Thử bộ đếm ${duration} phút</button>`); return;
  }
  if(state.wellbeingReminders!==false)prepareReminderAudio();
  hideWellbeing();
  state.focus = {start:Date.now(),reminderBoundary:0,end:Date.now()+duration*60000,taskId:typeof taskId==='string'?taskId:null}; save(); render();
}
function recordFocus(early) {
  if (!state.focus) return;
  const seconds = Math.max(0,Math.floor((Math.min(Date.now(),state.focus.end)-state.focus.start)/1000));
  hideWellbeing();
  state.sessions.push({seconds,day:dateKey(new Date(state.focus.start)),early}); state.focus = null;
}
function finishFocus(early) {
  if(!state.focus)return;
  recordFocus(early);
  save(); render(); toast(early?'Đã ghi nhận thời gian tập trung thực tế.':'Phiên tập trung đã kết thúc. Nghỉ một chút nhé.');
}
function renderStats() {
  const dates = Array.from({length:7},(_,i)=>dateKey(dateOffset(i-6)));
  // Use local day boundaries, including visitors outside Vietnam.
  const counts = dates.map(day=>[...state.tasks,...state.plan].filter(t=>t.done && t.completedAt && dateKey(new Date(t.completedAt))===day).length);
  const done = counts.reduce((a,b)=>a+b,0), max = Math.max(1,...counts);
  screen.innerHTML = `<div class="screen-body"><h1 class="screen-title">Nhìn lại một tuần.</h1><p class="screen-subtitle">Hiểu thời gian của mình, bắt đầu từ những bước nhỏ.</p><div class="card"><span class="tag">DỮ LIỆU BẠN VỪA THỬ</span><div class="stat-value">${done} <span class="small muted">việc hoàn thành</span></div><p class="tiny muted">7 ngày gần nhất · chỉ trong bản web</p><div class="chart" role="img" aria-label="${esc(dates.map((d,i)=>dayLabel(d)+': '+counts[i]+' việc').join('; '))}">${counts.map((count,i)=>`<div class="bar-item"><span>${count}</span><div class="bar ${i===6?'current':''}" style="height:${Math.max(3,count/max*85)}px"></div><span>${weekdays[weekdayIndex(new Date(dates[i]+'T12:00:00'))-1]}</span></div>`).join('')}</div></div><div class="card"><div class="row">${icon('chart')}<h2 style="font-size:16px">Thời gian sử dụng ứng dụng</h2></div><p class="small muted" style="margin:12px 0">Trình duyệt không đọc được screen time của YouTube hay các ứng dụng khác trên điện thoại.</p><button class="button secondary full" data-action="screen-time">Kết nối thống kê sử dụng</button></div><div class="card"><h2 style="font-size:16px">Những khoảng dành cho bạn</h2><div class="metric-row"><div><strong>${Math.floor(state.sessions.reduce((s,x)=>s+x.seconds,0)/60)}p</strong><small>Tập trung đã ghi nhận</small></div><div><strong>${state.activities.length}</strong><small>Hoạt động tự ghi</small></div></div><p class="tiny muted">Các con số phản ánh thao tác tại đây, không lấy từ app Android và không phải screen time.</p></div></div>`;
}
function renderGroups() {
  const circle = state.circle;
  screen.innerHTML = `<div class="screen-body"><h1 class="screen-title">Giữ nhịp, cùng nhau.</h1><p class="screen-subtitle">Một vòng tròn nhỏ. Những cam kết của riêng mỗi người.</p>${circle?`<div class="card"><div class="row between"><span class="tag">NHÓM MẪU · LƯU CỤC BỘ</span>${icon('users')}</div><h2 style="font-size:24px;margin:15px 0 8px">${esc(circle.name)}</h2><p class="small muted">${esc(circle.goal)}</p><div class="goal-progress"><span style="width:${circle.checkin===dateKey()?100:0}%"></span></div><p class="tiny blue">${circle.checkin===dateKey()?'Bạn đã check-in hôm nay':'Một bước nhỏ để giữ lời với chính mình.'}</p><div class="metric-row"><div><strong>${circle.members.length+1}</strong><small>Thành viên mẫu</small></div><div><strong>${circle.checkin===dateKey()?'1/1':'0/1'}</strong><small>Check-in của bạn</small></div><div><strong>Riêng tư</strong><small>Không có bảng tin</small></div></div><button class="button full" data-action="checkin" ${circle.checkin===dateKey()?'disabled':''}>${circle.checkin===dateKey()?'Đã giữ cam kết hôm nay':'Tôi đã giữ cam kết'}</button><button class="text-button" data-action="rest" style="width:100%;margin-top:8px">Hôm nay tôi cần nghỉ</button></div><div class="section-row"><h2>Những người đồng hành</h2><span class="tag">Mẫu giao diện</span></div><div class="card">${[state.profile.name,...circle.members].map((name,i)=>`<div class="row member"><div class="avatar">${esc(name.slice(0,1).toUpperCase())}</div><div class="flex"><strong>${esc(name)} ${i===0?'· Bạn':''}</strong><p>${i===0?(circle.checkin===dateKey()?'Đã check-in trong bản web':'Chưa check-in hôm nay'):'Thành viên mẫu · chưa kết nối'}</p></div>${icon(i===0?'check':'person')}</div>`).join('')}</div><button class="button secondary full" data-action="invite">Mời bạn đồng hành</button>`:`<div class="card empty">${icon('users')}<h3>Kỷ luật có thể bắt đầu cùng nhau.</h3><p>Tạo một vòng tròn mẫu để thử trải nghiệm.<br>Không gửi lời mời hay chia sẻ dữ liệu.</p><button class="button" data-action="create-circle">${icon('plus')} Tạo vòng tròn đầu tiên</button></div>`}<div class="notice">Nhóm thật, chuỗi nhiều ngày và đồng bộ chưa có trên bản web. Không có dữ liệu hoạt động trực tuyến của người khác.</div></div>`;
}
function activityEditor() {
  const end = new Date(), start = new Date(end.getTime()-30*60000);
  const localInput = d=>`${dateKey(d)}T${timeText(d.getHours()*60+d.getMinutes())}`;
  showModal('Một việc ngoài màn hình',`<form id="activity-form"><label class="field">Bạn vừa làm gì?<input name="title" placeholder="VD: Một vòng chạy ngoài trời" maxlength="140" required></label><label class="field">Bắt đầu<input name="start" type="datetime-local" value="${localInput(start)}" required></label><label class="field">Kết thúc<input name="end" type="datetime-local" value="${localInput(end)}" required></label><p class="field-hint">Toàn bộ khoảng thời gian phải nằm trong 24 giờ vừa qua. Bản thử lưu riêng tư trên trình duyệt.</p><button type="button" class="text-button" data-action="photo">${icon('plus')} Thêm ảnh minh chứng</button><p id="form-error" class="form-error" role="alert"></p><button class="button full">Lưu hoạt động</button></form>`);
}
function profile() {
  showModal('Hồ sơ của bạn',`<div class="row"><div class="avatar">${esc(state.profile.name.slice(0,1).toUpperCase())}</div><div><strong>${esc(state.profile.name)}</strong><p class="tiny muted">Chế độ khách · bản trải nghiệm web</p></div></div><p class="modal-copy" style="margin-top:16px">${esc(state.profile.goal)}. Dữ liệu chỉ nằm trong trình duyệt này, không liên kết tài khoản Android.</p><div class="stack"><button class="button secondary full" data-action="welcome">Sửa hồ sơ / thử màn chào</button><button class="button secondary full" data-action="widgets">Thêm widget màn hình chính</button><button class="button secondary full" data-action="login">Đăng nhập & lưu tiến trình</button><a class="button full" href="/#download">Khám phá bản Android</a><button class="text-button" data-action="reset">Xóa dữ liệu trải nghiệm</button></div><p class="field-hint" style="margin-top:10px">${storageAvailable?'Đang lưu cục bộ trên trình duyệt.':'Trình duyệt có thể không cho lưu lâu dài.'} Bạn có thể xóa bất cứ lúc nào.</p>`);
}
const actions = {
  limits:openLimits, close:()=>modal.close(), profile,
  'app-view':()=>switchPhone('app'), 'launcher-view':()=>switchPhone('launcher'),
  'widget-add':widgetAdd,
  'widget-open':()=>{if(widgetReady()){tab=state.focus?2:0;selectedDay=0;switchPhone('app');}},
  'widget-next':()=>{if(!widgetReady())return;if(widgetState().next){tab=0;selectedDay=0;switchPhone('app');}else widgetAdd();},
  'widget-checkout':()=>{if(widgetReady()){const task=widgetState().current;if(task)checkout(task.id);}},
  'widget-focus':()=>{if(!widgetReady())return;const task=widgetState().current;tab=2;duration=30;switchPhone('app');if(!state.focus)startFocus(task?.id);},
  tab:el=>{tab=Number(el.dataset.tab); render(true);}, day:el=>{selectedDay=Number(el.dataset.day);render();},
  welcome:()=>{state.ready=false;switchPhone('app');},
  'sample-profile':()=>{state.profile={name:'An',birthday:'',goal:'Học tập / Thi cử'};state.ready=true;save();render(true);toast('Bạn đang dùng hồ sơ và công việc mẫu.');},
  'add-task':addTask, checkout:el=>checkout(el.dataset.id), activity:activityEditor,
  voice:()=>unavailable('Thêm bằng giọng nói','Bạn có thể thêm việc bằng văn bản ở nút Ghi nhanh. Bản web không bật microphone.'),
  photo:()=>{const form=document.getElementById('activity-form');if(form){let note=form.querySelector('[data-photo-notice]');if(!note){note=document.createElement('p');note.className='notice';note.dataset.photoNotice='';form.querySelector('[data-action="photo"]').after(note);}note.textContent='Tính năng thêm ảnh hiện chưa có trên bản trải nghiệm thử trên website. Bạn vẫn có thể lưu tên và thời gian hoạt động.';}},
  login:()=>unavailable('Lưu tiến trình & đăng nhập','Đăng nhập Google, Facebook, số điện thoại và đồng bộ tài khoản chưa được kết nối. Hãy tiếp tục với chế độ khách.'),
  widgets:()=>switchPhone('launcher'),
  ai:openAI,
  'screen-time':()=>unavailable('Screen time trên Android','Đọc thời gian sử dụng ứng dụng cần Usage Access trên Android. Website không yêu cầu quyền này và không thể lấy lịch sử sử dụng app của thiết bị.'),
  protection:()=>unavailable('Bảo vệ tập trung trên Android','APK xin Accessibility để phát hiện ứng dụng cần hạn chế, VPN cục bộ để chặn mạng trong phiên và thông báo nếu bạn cho phép. Bản web không có các quyền đó, không đọc nội dung tin nhắn. Chỉ thông tin lập lịch bạn chủ động gửi mới tới API.'),
  invite:()=>unavailable('Mời bạn đồng hành','Mời thành viên, chia sẻ thực và đồng bộ nhóm chưa được triển khai. Những tên bạn thêm vào đây chỉ là dữ liệu mẫu trên trình duyệt.'),
  'add-fixed':()=>fixedEditor(), 'edit-fixed':el=>fixedEditor(el.dataset.id),
  'delete-fixed':el=>{state.commitments=state.commitments.filter(c=>c.id!==el.dataset.id);save();render();toast('Đã bỏ lịch cố định.');},
  'delete-plan':el=>{modal.close();state.plan=state.plan.filter(p=>p.id!==el.dataset.id);save();render();},
  'sample-plan':samplePlan,
  'schedule-list':()=>{scheduleView='list';render();},
  'schedule-calendar':()=>{scheduleView='calendar';render();},
  'calendar-prev':()=>{calendarStart=addDays(calendarStart,-7);changeCalendar();},
  'calendar-next':()=>{calendarStart=addDays(calendarStart,7);changeCalendar();},
  'calendar-today':()=>{calendarStart=weekStart(vietnamDay(Date.now()));changeCalendar();},
  'calendar-expand':expandCalendar,
  'session-detail':el=>openSession(el.dataset.id,el.dataset.day,el.dataset.fixed==='true'),
  'ai-example':()=>{const field=document.querySelector('#ai-form [name="request"]');if(field)field.value='Tôi kiểm tra DBMS trong 3 ngày nữa, CNPM trong 4 ngày nữa, KTLT trong 5 ngày nữa. Hãy lập lịch ôn và nội dung từng buổi.';},
  'study-preferences':editStudyPreferences,
  'edit-ai':()=>{aiDraft=null;openAI();},
  'remove-ai-session':el=>{aiSessions=aiSessions.filter(p=>p.id!==el.dataset.id);renderAIDraft();},
  'accept-ai':()=>{
    const invalid=validateAcceptance(aiSessions,state);if(invalid){toast(invalid);return;}
    state.plan.push(...aiSessions);aiSessions=[];aiDraft=null;save();modal.close();tab=1;switchPhone('app');toast('Đã thêm lịch AI sau khi bạn xác nhận.');
  },
  'confirm-plan':()=>{state.plan.push(...preview);preview=[];save();modal.close();render();toast('Đã thêm các phiên mẫu vào lịch.');},
  'dismiss-wellbeing':hideWellbeing,
  'test-reminder-sound':async()=>{await prepareReminderAudio();toast(reminderSound()?'Đã phát âm báo mẫu. Kiểm tra âm lượng thiết bị.':'Trình duyệt chưa cho phát tiếng. Kiểm tra quyền âm thanh của trang.');},
  duration:el=>{duration=Number(el.dataset.minutes);render();}, 'start-focus':startFocus,
  'confirm-focus':el=>{state.focusNotice=true;modal.close();startFocus(el.dataset.taskId || null);},
  'stop-focus':()=>showModal('Kết thúc phiên?',`<p class="modal-copy">Bản web sẽ ghi nhận thời gian bạn đã tập trung thực tế. Công việc của bạn chưa được đánh dấu hoàn thành.</p><button class="button full" data-action="confirm-stop">Ghi nhận và kết thúc</button><button class="text-button" data-action="close" style="width:100%;margin-top:10px">Tiếp tục tập trung</button>`),
  'confirm-stop':()=>{modal.close();finishFocus(true);},
  suggest:el=>{const field=modal.querySelector('textarea');field.value=(field.value?field.value+'; ':'')+el.dataset.text;field.value=field.value.slice(0,160);document.getElementById('char-count').textContent=field.value.length;},
  'skip-reflection':()=>completeTask(document.getElementById('checkout-form'),true),
  'create-circle':()=>showModal('Tạo vòng tròn mẫu',`<form id="circle-form"><label class="field">Tên vòng tròn<input name="name" placeholder="VD: Cùng nhau qua môn" maxlength="70" required></label><label class="field">Cam kết chung<input name="goal" placeholder="VD: Mỗi ngày một phiên học" maxlength="160" required></label><label class="field">Tên bạn đồng hành (tùy chọn)<textarea name="members" placeholder="Mỗi dòng một người, tối đa 10 tên" maxlength="600"></textarea></label><p class="field-hint" style="margin-bottom:13px">Chỉ nhập tên mẫu, không gửi lời mời. Mọi thao tác đều diễn ra cục bộ.</p><button class="button full">Tạo vòng tròn mẫu</button></form>`),
  checkin:()=>{if(state.circle){state.circle.checkin=dateKey();save();render();toast('Đã ghi nhận cam kết của bạn trong bản thử.');}},
  rest:()=>{if(state.circle){state.circle.checkin=null;save();render();toast('Đã chọn nghỉ hôm nay. Bạn có thể trở lại khi sẵn sàng.');}},
  reset:()=>showModal('Bắt đầu lại bản thử?',`<p class="modal-copy">Xóa hồ sơ, công việc, lịch và nhóm trải nghiệm trên trình duyệt này. Dữ liệu trong APK không bị ảnh hưởng.</p><button class="button danger full" data-action="confirm-reset">Xóa dữ liệu và bắt đầu lại</button>`),
  'confirm-reset':()=>{hideWellbeing();state=fresh();tab=0;selectedDay=0;preview=[];duration=30;save();switchPhone('app');}
};
document.addEventListener('click', event=>{
  const button = event.target.closest('[data-action]'); if(!button || button.disabled) return;
  actions[button.dataset.action]?.(button);
});
document.addEventListener('input',event=>{
  if(event.target.name==='reflection' && document.getElementById('char-count'))document.getElementById('char-count').textContent=event.target.value.length;
  if(event.target.id==='focus-duration'){
    const value=Number(event.target.value); if(Number.isInteger(value)&&value>=1&&value<=480){duration=value;document.getElementById('focus-clock').textContent=focusClock();}
  }
});
document.addEventListener('change',event=>{
  if(event.target.id==='wellbeing-enabled'){state.wellbeingReminders=event.target.checked;save();if(state.wellbeingReminders)prepareReminderAudio();else hideWellbeing();}
  if(event.target.hasAttribute('data-calendar-span')){calendarSpan=Number(event.target.value);changeCalendar();}
  if(event.target.name==='audience')document.getElementById('audience-note').hidden=event.target.selectedIndex===0;
});
document.addEventListener('submit',event=>{
  const form=event.target,formId=form.getAttribute('id');if(!formId?.endsWith('-form'))return;event.preventDefault();
  const data=new FormData(form), title=String(data.get('title') || '').trim();
  const error=message=>{document.getElementById('form-error').textContent=message;};
  switch(formId){
    case 'ai-form':generateAI(data);break;
    case 'study-form':{
      const start=minuteValue(String(data.get('start'))),end=minuteValue(String(data.get('end'))),session=Number(data.get('session')),daily=Number(data.get('daily'));
      if(start>=end || end-start<session || daily<session || daily>480){error('Khung giờ và quỹ học cần đủ cho ít nhất một phiên, tối đa 480 phút/ngày.');return;}
      state.studyPreferences={startMinute:start,endMinute:end,sessionMinutes:session,dailyMinutes:daily};save();modal.close();render();toast('Đã lưu nhịp học.');break;
    }
    case 'welcome-form': {
      const name=String(data.get('name')).trim(), birthday=String(data.get('birthday'));
      if(!name || birthday>dateKey())return;
      state.profile={name,birthday,goal:String(data.get('goal'))};state.ready=true;save();render(true);break;
    }
    case 'task-form': {
      if(!title)return;
      state.tasks.push({id:uid(),title,duration:Number(data.get('duration')),day:dateKey(dateOffset(Number(data.get('day')))),done:false,note:String(data.get('note')).trim()});
      save();modal.close();render();toast('Đã thêm việc vào nhịp ngày.');break;
    }
    case 'checkout-form':completeTask(form);break;
    case 'fixed-form': {
      const days=data.getAll('weekdays').map(Number),start=minuteValue(String(data.get('start'))),end=minuteValue(String(data.get('end'))),id=String(data.get('id')) || uid();
      if(!title || !days.length || start>=end){error('Nhập tên lịch, chọn ít nhất một ngày và giờ kết thúc sau giờ bắt đầu.');return;}
      const conflict=state.commitments.some(c=>c.id!==id && c.weekdays.some(d=>days.includes(d)) && start<c.end && end>c.start);
      const plannedConflict=state.plan.some(p=>days.includes(weekdayIndex(new Date(p.day+'T12:00:00'))) && start<p.start+p.duration && end>p.start);
      if(conflict || plannedConflict){error('Khung giờ trùng với lịch đã có. Hãy đổi giờ hoặc bỏ phiên học xung đột trước.');return;}
      state.commitments=state.commitments.filter(c=>c.id!==id);state.commitments.push({id,title,weekdays:days,start,end});
      save();modal.close();render();toast('Đã lưu lịch cố định.');break;
    }
    case 'activity-form': {
      const start=new Date(String(data.get('start'))),end=new Date(String(data.get('end'))),now=Date.now();
      if(!title || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start>=end || end.getTime()>now || start.getTime()<now-24*60*60000){error('Toàn bộ hoạt động cần nằm trong 24 giờ vừa qua; giờ kết thúc phải sau giờ bắt đầu.');return;}
      state.activities.push({id:uid(),title,start:start.toISOString(),end:end.toISOString(),duration:Math.round((end-start)/60000)});save();modal.close();render();toast('Đã ghi nhận hoạt động, chỉ mình bạn xem.');break;
    }
    case 'circle-form': {
      const name=String(data.get('name')).trim(),goal=String(data.get('goal')).trim();if(!name || !goal)return;
      state.circle={name,goal,members:String(data.get('members')).split('\n').map(s=>s.trim().slice(0,60)).filter(Boolean).slice(0,10),checkin:null};save();modal.close();render();break;
    }
  }
});
modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom)modal.close();});
setInterval(()=>{
  const minute=Math.floor(Date.now()/60000);
  if(minute!==lastScheduleMinute){lastScheduleMinute=minute;refreshScheduleStatuses();}
  if(phoneView==='launcher') {
    if(launcherMinute!==Math.floor(Date.now()/60000))renderLauncher();
    const widgetClock=document.getElementById('widget-countdown');if(widgetClock && state.focus)widgetClock.textContent=focusClock()+' còn lại';
  }
  if(!state.focus)return;
  if(Date.now()>=state.focus.end){finishFocus(false);return;}
  checkWellbeing();
  const clock=document.getElementById('focus-clock');if(clock)clock.textContent=focusClock();
},1000);
render();
