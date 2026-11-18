import {weekSummary,circleStreak} from './parity-model.js?v=0.6.7';
import {defaultPreferences,makePlanningRequest,makeAutomaticDraft,convertDraft,validateAcceptance} from './planning.js?v=4';
import {reminderBoundary} from './wellbeing.js';
import {periods,vietnamDay,addDays,weekStart,startTime,sessionStatus,calendarWeeks} from './calendar.js';
import {githubPagesPlanningUrl} from './planning-endpoint.js';
import {readDemoState,mergeDemoState,sameState} from './demo-state.js?v=0.6.7';
// Private beta AI calls use a server-only provider key. No device permissions.
const planningUrl = location.hostname === 'zomboxx.github.io' ? githubPagesPlanningUrl : '/api/plans';
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
  return {version:1,ready:false,profile:{name:'',birthday:'',goal:'Học tập & kỳ thi'},tasks:[],commitments:[],plan:[],activities:[],sessions:[],focus:null,focusNotice:false,circle:null,circles:[],checkins:[]};
}
let state = fresh(), storageAvailable = true;
try {
  state = readDemoState(localStorage.getItem(KEY)) ?? state;
} catch { storageAvailable = false; }
let welcomeStep=state.profile.name && state.profile.birthday ? 1 : 0, selectedCircle=0, statsStart=weekStart(dateKey());
let activityPhoto=null, photoBusy=false, photoRequest=0;
let baseline = structuredClone(state), dirty = false, writing = null;
let tab = 0, selectedDay = 0, duration = 30, preview = [], timerNotice = null;
let displayedDay = dateKey();
let phoneView = new URL(location.href).searchParams.get('view') === 'launcher' ? 'launcher' : 'app';
let launcherMinute = -1;
let reminderAudio=null;
let aiBusy=false,aiDraft=null,aiSessions=[],betaCode='',aiTargetDate='';
let aiController;
let deviceWorker,deviceAbort;
let scheduleView='list',calendarStart=weekStart(vietnamDay(Date.now())),calendarSpan=1,lastScheduleMinute=-1;
const screen = document.getElementById('screen'), nav = document.getElementById('app-nav'), header = document.getElementById('app-header');
const launcher = document.getElementById('launcher');
const modal = document.getElementById('modal'), modalContent = document.getElementById('modal-content');
modal.addEventListener('close',()=>{deviceAbort?.abort();aiController?.abort();speech?.abort();});
function adoptState(latest) {
  const changed = !sameState(state, latest);
  const reset = state.generation !== latest.generation;
  if (state.focus?.start !== latest.focus?.start || latest.wellbeingReminders === false) hideWellbeing();
  baseline = structuredClone(latest);
  state = latest;
  if (reset) modal.close();
  if (changed && (reset || !screen.querySelector('#welcome-form:focus-within'))) render();
}
function save() {
  dirty = true;
  if (writing) return writing;
  const commit = () => {
    const latest = readDemoState(localStorage.getItem(KEY)) ?? baseline;
    const resetInAnotherTab = state.generation === baseline.generation && latest.generation !== baseline.generation;
    const merged = mergeDemoState(baseline, state, latest);
    localStorage.setItem(KEY, JSON.stringify(merged));
    storageAvailable = true;
    dirty = false;
    adoptState(merged);
    if (resetInAnotherTab) toast('Dữ liệu đã được đặt lại ở tab khác. Hãy thử lại trên hồ sơ mới.');
    return !resetInAnotherTab;
  };
  const unavailable = () => {
    storageAvailable = false;
    toast('Trình duyệt chưa cho lưu dữ liệu. Bạn vẫn có thể thử trong phiên này.');
    return false;
  };
  if (navigator.locks) {
    writing = navigator.locks.request(KEY, commit).catch(unavailable).finally(() => { writing = null; });
    return writing;
  } else {
    try { return commit(); } catch { return unavailable(); }
  }
}
window.addEventListener('storage', event => {
  if (event.key !== KEY || dirty) return;
  try {
    const latest = readDemoState(localStorage.getItem(KEY));
    if (latest) adoptState(latest);
  } catch { /* Preserve the current view if browser storage cannot be read. */ }
});
function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(timerNotice); timerNotice = setTimeout(() => el.classList.remove('visible'),4500); }
function showModal(title, content) {
  modal.classList.remove('calendar-expanded');
  modalContent.innerHTML = `<div class="modal-top"><h2 id="modal-title">${esc(title)}</h2><button class="icon-button" data-action="close" aria-label="Đóng">${icon('close')}</button></div>${content}`;
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
}
function showFormError(field, message) {
  if (!field?.isConnected) { toast(message); return; }
  field.textContent = message;
  field.tabIndex = -1;
  field.focus({preventScroll:true});
  field.scrollIntoView({block:'center',behavior:'smooth'});
}
function unavailable(title, detail) {
  showModal(title,`<div class="modal-icon">${icon('info')}</div><p class="modal-copy">Tính năng này hiện chưa có trên bản trải nghiệm thử trên website.</p><p class="modal-copy">${esc(detail)}</p><button class="button full" data-action="close">Đã hiểu</button>`);
}
function openLimits() {
  showModal('Bạn có thể thử gì?',`<p class="modal-copy">Giao diện cho trải nghiệm Brain10 trên trình duyệt. Đây là không gian thử riêng trên trình duyệt.</p><ul class="limit-list"><li><strong>Có thể thao tác:</strong> thêm việc, check-out, ghi hoạt động, sửa lịch cố định, xem lịch theo đầu việc hoặc bảng nhiều tuần, xem và xác nhận kế hoạch mẫu, chạy bộ đếm, tạo nhiều nhóm, check-in và giữ chuỗi ngày cục bộ, đính kèm ảnh hoạt động.</li><li><strong>Widget mô phỏng:</strong> chọn Màn hình chính để thử Ghi nhanh 2×2 và Nhịp hôm nay 4×2. Widget dùng cùng dữ liệu và bộ đếm với giao diện app.</li><li><strong>Chưa có:</strong> screen time thật, khóa ứng dụng / Internet, chạy nền như Android, cài widget lên màn hình thiết bị thật, theo dõi ứng dụng khác và nhắc khi trang đã đóng.</li><li><strong>Chưa kết nối:</strong> Đăng nhập, mời bạn và đồng bộ nhóm. AI thật dùng mã thử của nhóm và cần bạn chủ động gửi yêu cầu; lịch mẫu không gọi AI.</li></ul><p class="modal-copy">Màn hình chính là mô phỏng trong trang web, không phải hệ điều hành Android. Dữ liệu lưu ở trình duyệt này. Riêng khi bạn chọn tạo lịch AI, mục tiêu và ngữ cảnh lịch được gửi qua backend tới PoolAI; không gửi hồ sơ cá nhân hoặc screen time. Xóa dữ liệu trong Hồ sơ để bắt đầu lại. Hosting có thể ghi log truy cập kỹ thuật.</p><button class="button full" data-action="close">Bắt đầu khám phá</button>`);
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
    header.innerHTML = `<button class="avatar" data-action="profile" aria-label="Hồ sơ và widget">${esc(state.profile.name.trim().slice(0,1).toUpperCase() || 'A')}</button><div class="app-title"><strong>brain10</strong><small>${titles[tab]}</small></div><button class="icon-button" data-action="limits" aria-label="Thông tin bản trải nghiệm">${icon('info')}</button>`;
    nav.innerHTML = tabs.map((label,i) => `<button data-action="tab" data-tab="${i}" ${tab===i?'aria-current="page"':''}><span class="nav-icon">${icon(navIcons[i])}</span>${label}</button>`).join('');
    [renderHome,renderSchedule,renderFocus,renderStats,renderGroups][tab]();
  }
  screen.scrollTop = resetScroll ? 0 : previousScroll;
}
function brandArt(kind='icon') {
  const viewBox=kind==='word'?'543 298 658 167':'196 241 287 288';
  return `<svg class="${kind==='word'?'app-wordmark':'brand-icon'}" viewBox="${viewBox}" role="img" aria-label="brain10"><image href="/UTE-START-UP-2026/assets/brand-source.png" width="1376" height="768"/></svg>`;
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
  return {entries,current,next,done,finished,activePlan,overdue:overdueWork().length,manual:!!state.focus};
}
function renderLauncher() {
  const w=widgetState(), focus=state.focus;
  const taskTitle=focus ? w.current?.title || 'Khoảng tập trung' : w.current?.title || (w.finished?'Bạn đã hoàn thành hôm nay':'Chọn một việc quan trọng');
  const subtitle=state.ready ? `${w.done} / ${w.entries.length} việc đã hoàn thành` : 'Mở Brain10 để bắt đầu';
  const status=focus?'ĐANG TẬP TRUNG':w.activePlan?'ĐANG ĐẾN GIỜ':w.finished?'ĐÃ HOÀN THÀNH':'HÔM NAY';
  const clock=focus ? focusClock()+' còn lại' : w.activePlan ? `${Math.max(1,w.activePlan.start+w.activePlan.duration-new Date().getHours()*60-new Date().getMinutes())}p còn lại` : w.current?.start!=null ? timeText(w.current.start) : '';
  const next=w.next ? `Tiếp: ${w.next.start!=null?timeText(w.next.start)+' · ':''}${w.next.title}` :
    w.overdue ? `Xem ${w.overdue} việc chưa xong từ trước` : w.finished ? 'Sẵn sàng cho ngày mai? Thêm một việc.' : 'Thêm việc cho ngày của bạn';
  const now=new Date();launcherMinute=Math.floor(now.getTime()/60000);
  launcher.innerHTML=`<div class="launcher-status"><time id="launcher-status-time">${now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time><span class="row" aria-hidden="true">${icon('wifi')}${icon('battery')}</span></div><div class="launcher-clock"><time id="launcher-time">${now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time><p>${esc(now.toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'}))}</p><small>Một ngày có chủ đích.</small></div>${!state.ready?'<button class="launcher-setup" data-action="app-view">Chưa thiết lập hồ sơ. Mở Brain10 để bắt đầu →</button>':''}<div class="launcher-grid"><section class="home-widget widget-flow" aria-label="Widget Nhịp hôm nay 4 x 2"><header class="widget-flow-header"><span class="widget-trend">${icon('trend')}</span><div class="flex"><h2>Nhịp hôm nay</h2><p>${subtitle}</p></div><button class="widget-add" data-action="widget-add" aria-label="Thêm việc từ widget Nhịp hôm nay">+ Thêm</button></header><div class="widget-current"><button class="widget-check ${w.finished?'is-done':''}" data-action="widget-checkout" ${!w.current?'disabled':''} aria-label="Check-out công việc trên widget"><span class="checkbox-ring">${w.finished?icon('check'):''}</span></button><button class="widget-entry" data-action="widget-open"><span class="widget-state"><i class="status-dot"></i>${status}${clock?' · <span id="widget-countdown">'+clock+'</span>':''}</span><strong>${esc(taskTitle)}</strong></button><button class="widget-arrow" data-action="widget-open" aria-label="Mở công việc trong ứng dụng">${icon('arrow')}</button></div><button class="widget-next" data-action="widget-next">${icon('clock')}<span>${esc(next)}</span>${icon('arrow')}</button></section><section class="home-widget widget-quick" aria-label="Widget Ghi nhanh 2 x 2"><header class="widget-quick-header"><button class="widget-back" data-action="app-view" aria-label="Mở Brain10 từ widget">${icon('arrow')}</button><h2>Ghi nhanh</h2><i class="status-dot"></i></header><button class="widget-prompt" data-action="widget-add" aria-label="Thêm việc bằng văn bản từ widget">Nhắc tôi đọc<br>10 trang sách…</button><div class="widget-shortcuts"><button class="widget-focus" data-action="widget-focus" aria-label="${focus?'Trở lại phiên tập trung':'Bắt đầu tập trung 30 phút từ widget'}">${icon('clock')}<span>${focus?'Trở lại<br>phiên':'30p<br>Focus'}</span></button><button class="mic-button" data-action="voice" aria-label="Thêm việc bằng giọng nói từ widget">${icon('mic')}</button></div></section><button class="launcher-shortcut" data-action="app-view" aria-label="Mở ứng dụng brain10"><span class="launcher-app-icon">${brandArt()}</span><strong>brain10</strong><small>Mở ứng dụng</small></button></div><div class="launcher-dots" aria-hidden="true"><i></i><i></i><i></i></div><button class="launcher-dock" data-action="app-view"><span class="launcher-app-icon">${brandArt()}</span><span class="flex"><strong>Trở lại nhịp của bạn</strong><small>Mở Brain10 · bản trải nghiệm</small></span>${icon('arrow')}</button>`;
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
  const goals=['Học tập & kỳ thi','Làm việc sâu','Xây thói quen'];
  screen.innerHTML=welcomeStep===0 ? `<form id="welcome-form" class="welcome mobile-welcome"><div class="row between"><strong class="blue welcome-brand">brain10</strong><span class="tag">Bước 1 / 2</span></div><div class="welcome-symbol">${icon('person')}</div><h1>Bắt đầu từ bạn.</h1><h2 class="blue">Một nhịp ngày của riêng mình.</h2><p>Không cần tài khoản để bắt đầu. Cho Brain10 biết bạn là ai và điều bạn muốn dành thời gian.</p><label class="field">Họ và tên<input name="name" maxlength="100" value="${esc(state.profile.name)}" required autocomplete="name"></label><label class="field">Ngày sinh<input name="birthday" type="date" max="${dateKey()}" value="${esc(state.profile.birthday)}" required></label><label class="field">Bạn muốn tập trung vào điều gì?<select name="goal">${goals.map(goal=>`<option ${state.profile.goal===goal?'selected':''}>${goal}</option>`).join('')}</select></label><p class="field-hint">Lưu trong trình duyệt này. Họ tên và ngày sinh không được gửi sang AI.</p><button class="button full">Tiếp tục ${icon('arrow')}</button><button class="text-button full" type="button" data-action="sample-profile">Dùng hồ sơ mẫu An</button></form>` : `<div class="welcome mobile-welcome"><div class="row between"><strong class="blue welcome-brand">brain10</strong><span class="tag">Bước 2 / 2</span></div><div class="welcome-symbol">${icon('lock')}</div><h1>Chọn cách bắt đầu.</h1><h2 class="blue">Tiến bộ, theo cách của bạn.</h2><p>Bạn có thể dùng ngay trên trình duyệt này, rồi liên kết tài khoản khi dịch vụ sẵn sàng.</p><section class="card tint"><span class="tag">${icon('spark')} BẮT ĐẦU NGAY</span><h2>Một thiết bị. Một nhịp riêng.</h2><p>Công việc, lịch và những lần tiến bộ được giữ trên trình duyệt này. Chưa đồng bộ giữa các thiết bị.</p><button class="button full" data-action="guest-start">Dùng không đăng nhập</button></section><p class="account-divider">HOẶC LIÊN KẾT TÀI KHOẢN</p>${accountChoices()}<button class="text-button full" data-action="edit-profile">Sửa thông tin cá nhân</button></div>`;
}
function workOn(day) { return [...state.tasks,...state.plan].filter(t => t.day===day); }
function overdueWork(today = dateKey()) {
  return [...state.tasks,...state.plan.filter(task => task.kind !== 'break')]
    .filter(task => !task.done && task.day && task.day < today)
    .sort((a,b) => b.day.localeCompare(a.day));
}
function taskRow(task, {overdue = false} = {}) {
  const planned = task.kind==='plan';
  const start = overdue ? dayLabel(task.day) : task.start!=null ? timeText(task.start) : 'Linh hoạt';
  const move = overdue && state.tasks.includes(task)
    ? `<button class="text-button" data-action="move-task-today" data-id="${esc(task.id)}">Dời sang hôm nay</button>` : '';
  return `<article class="task-row ${task.done?'completed':''}"><button class="check-button ${task.done?'done':''}" data-action="checkout" data-id="${esc(task.id)}" aria-label="${task.done?'Xem kết quả':'Hoàn thành'} ${esc(task.title)}">${task.done?icon('check'):''}</button><div class="flex"><div class="row between"><span class="tag">${task.done?'Đã hoàn thành':planned?(task.source==='ai'?'Phiên học AI':'Phiên học mẫu'):'Việc của bạn'}</span><span class="task-time">${start}</span></div><h3>${esc(task.title)}</h3>${task.note?`<p>${esc(task.note)}</p>`:''}<div class="task-bottom"><span class="row" style="gap:3px">${icon('clock')} ${task.duration} phút</span>${!task.done?`<button class="mini-button" data-action="checkout" data-id="${esc(task.id)}">${icon('check')} Check-out</button>`:''}</div>${move}</div></article>`;
}

function providerLogo(provider) {
  if(provider==='Google')return '<svg class="provider-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.9 3.1-4.5 3.1-7.6Z"/><path fill="#34A853" d="M12 22c2.8 0 5.1-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1.9-3.5.9a6 6 0 0 1-5.7-4.2H2.8v2.7A10.4 10.4 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.6a6.3 6.3 0 0 1 0-3.2V7.7H2.8a10 10 0 0 0 0 8.6Z"/><path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10.4 10.4 0 0 0-9.2 5.7l3.5 2.7A6 6 0 0 1 12 6.2Z"/></svg>';
  if(provider==='Facebook')return '<svg class="provider-logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path fill="white" d="M13.5 21v-8h2.7l.4-3h-3.1V8c0-.9.3-1.5 1.6-1.5h1.6V3.8a20 20 0 0 0-2.4-.1c-2.4 0-4 1.5-4 4.1V10H7.6v3h2.7v8Z"/></svg>';
  return '<svg class="provider-logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4c0 2-2 3-4 2C9 19 5 15 3 7c-1-2 0-4 2-4Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
}
function accountChoices(){return `<div class="stack account-options">${['Google','Facebook','Số điện thoại'].map(provider=>`<button class="button secondary full" data-action="connect-account" data-provider="${provider}">${providerLogo(provider)}${provider}</button>`).join('')}</div>`;}
function accountInfo(provider){showModal(`Liên kết ${provider}`,`<p class="modal-copy">Đăng nhập ${esc(provider)} sẽ mở khi dịch vụ tài khoản sẵn sàng. Hiện bạn có thể dùng chế độ khách và lưu dữ liệu tại đây.</p><button class="button full" data-action="${state.ready?'close':'guest-start'}">${state.ready?'Tiếp tục dùng Brain10':'Dùng không đăng nhập'}</button>`);}
async function startGuest(){state.ready=true;await save();modal.close();render(true);}
function statsDay(date){
  const day=weekSummary(state,statsStart).find(item=>item.date===date);if(!day || day.future)return;
  const clock=value=>new Date(value).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  showModal(`${dayLabel(date)}/${date.slice(0,4)}`,`<span class="tag">Hoạt động đã lưu trong trình duyệt</span><div class="metric-row"><div><strong>${day.tasks.length}</strong><small>Việc hoàn thành</small></div><div><strong>${Math.floor(day.focusSeconds/60)} phút</strong><small>Tập trung</small></div></div><h3>Việc đã hoàn thành</h3>${day.tasks.length?day.tasks.map(item=>`<button class="day-entry" data-action="checkout" data-id="${esc(item.id)}">${icon('check')}<span>${esc(item.title)}<small>${esc(item.reflection || 'Đã hoàn thành')}</small></span>${icon('arrow')}</button>`).join(''):'<p class="modal-copy">Chưa có việc hoàn thành trong ngày này.</p>'}<h3>Hoạt động bạn đã ghi</h3>${day.activities.length?day.activities.map(item=>`<article class="day-entry"><div>${icon('leaf')}</div><div><strong>${esc(item.title)}</strong><small>${clock(item.start)}–${clock(item.end)} · ${item.duration} phút</small>${item.photo?`<img class="activity-photo" alt="Ảnh minh chứng hoạt động" src="${esc(item.photo)}">`:''}</div></article>`).join(''):'<p class="modal-copy">Chưa có hoạt động tự ghi.</p>'}<h3>Các phiên tập trung</h3>${day.sessions.length?day.sessions.map(item=>`<p class="notice">${item.start?clock(item.start)+' · ':''}${Math.floor(item.seconds/60)} phút${item.early?' · Kết thúc sớm':''}</p>`).join(''):'<p class="modal-copy">Chưa có phiên đã kết thúc.</p>'}`);
}
function currentCircle(){return state.circles[selectedCircle] || state.circles[0];}
async function markCheckin(rest){const circle=currentCircle();if(!circle)return;const date=dateKey(),id=`${circle.id}:${date}`;state.checkins=state.checkins.filter(item=>item.id!==id);state.checkins.push({id,circleId:circle.id,date,rest,at:new Date().toISOString()});const saved=await save();render();if(saved)toast(rest?'Đã ghi nhận ngày nghỉ. Bạn có thể trở lại khi sẵn sàng.':'Đã ghi nhận cam kết hôm nay.');}
async function showPlans(){
  showModal('Gói Brain10','<p class="modal-copy" role="status">Đang đọc giá công bố…</p><div data-plan-catalog></div>');
  const target=modal.querySelector('[data-plan-catalog]');
  try{const response=await fetch(new URL('../plans.json',import.meta.url));if(!response.ok)throw Error();const plans=await response.json();if(!Array.isArray(plans)||!target.isConnected)return;target.previousElementSibling.textContent='Giá đồng bộ từ website Brain10';target.innerHTML=plans.map(plan=>`<section class="card"><span class="tag">${esc(plan.audience || 'Miễn phí')}</span><h3>${esc(plan.name)}</h3><strong class="plan-price">${plan.monthlyAmount===0?'Miễn phí':`${esc(plan.pricePrefix || '')} ${Number(plan.monthlyAmount).toLocaleString('vi-VN')} đ${esc(plan.priceUnit || '/tháng')}`}</strong><p class="modal-copy">${esc(plan.description)}</p><ul class="limit-list">${plan.features.map(feature=>`<li>${esc(feature)}</li>`).join('')}</ul>${plan.monthlyAmount?'<p class="notice">Đăng ký và thanh toán trong app sẽ mở sau.</p>':'<button class="button full" data-action="close">Tiếp tục với Starter</button>'}</section>`).join('');}catch{if(target.isConnected)target.previousElementSibling.textContent='Chưa tải được giá. Hãy thử lại khi có mạng.';}
}

function renderHome() {
  const day = dateKey(dateOffset(selectedDay)), entries = workOn(day), done = entries.filter(t=>t.done).length;
  const percentage = entries.length ? Math.round(done/entries.length*100) : 0;
  const name = state.profile.name.trim().split(/\s+/).at(-1) || 'bạn';
  const greeting = new Date().getHours()<12?'Chào buổi sáng':new Date().getHours()<18?'Chào buổi chiều':'Chào buổi tối';
  screen.innerHTML = `<div class="screen-body grow"><h1 class="screen-title">${greeting}, ${esc(name)}</h1><p class="screen-subtitle">${!entries.length?'Một ngày có chủ đích. Bắt đầu bằng một việc nhỏ.':done===entries.length?'Bạn đã hoàn thành những điều quan trọng. Nghỉ một chút nhé.':`Còn ${entries.length-done} việc cần làm. Cứ từng bước, theo nhịp của bạn.`}</p><div class="card row"><div class="ring" style="--progress:${percentage}%"><span>${percentage}%</span></div><div class="flex"><strong class="small">Nhịp ngày</strong><p class="tiny muted">${done} / ${entries.length} việc đã hoàn thành</p></div><button class="round-add" data-action="activity" aria-label="Ghi hoạt động">${icon('plus')}</button></div><div class="section-row"><h2>${selectedDay?'Việc ngày mai':'Việc hôm nay'}</h2><time>${dayLabel(day)}</time><button class="text-add" data-action="add-task">${icon('plus')} Thêm</button></div><div class="chips"><button class="chip ${!selectedDay?'selected':''}" data-action="day" data-day="0">Hôm nay</button><button class="chip ${selectedDay?'selected':''}" data-action="day" data-day="1">Ngày mai</button></div>${entries.length?`<div class="card task-list">${entries.map(taskRow).join('')}</div>`:`<div class="card empty">${icon('sun')}<h3>Chừa chỗ cho điều quan trọng.</h3><p>Chọn 2–3 việc bạn muốn hoàn thành.<br>Lịch đã xác nhận cũng sẽ có mặt ở đây.</p><button class="text-button" data-action="add-task">Thêm việc đầu tiên</button></div>`}${state.activities.length?`<div class="section-row"><h2>Những điều đã làm</h2></div>${state.activities.slice().reverse().map(a=>`<div class="card"><span class="tag">Tự ghi nhận · Chỉ mình tôi</span><h3 class="small" style="margin:9px 0 4px">${esc(a.title)}</h3><p class="tiny muted">${dayLabel(dateKey(new Date(a.end)))} · ${a.duration} phút</p></div>`).join('')}`:''}</div><div class="quick-add"><button data-action="add-task">${icon('spark')} Ghi nhanh điều cần làm…</button><button class="mic-button" data-action="voice" aria-label="Thêm bằng giọng nói">${icon('mic')}</button></div>`;
  const overdue = selectedDay === 0 ? overdueWork(day) : [];
  if (overdue.length) {
    screen.querySelector('.task-list, .empty').insertAdjacentHTML('afterend',
      `<section aria-labelledby="overdue-heading"><div class="section-row"><h2 id="overdue-heading">Chưa xong từ trước (${overdue.length})</h2></div><div class="card task-list">${overdue.map(task=>taskRow(task,{overdue:true})).join('')}</div></section>`);
  }
}

let speech;
function voiceInput(){
  const supported=!!(window.SpeechRecognition || window.webkitSpeechRecognition);
  showModal('Ghi nhanh bằng giọng nói',`<p class="modal-copy">${supported?'Bấm Bắt đầu nói để cho phép microphone. Dịch vụ nhận giọng nói của trình duyệt có thể xử lý âm thanh trực tuyến.':'Trình duyệt này chưa hỗ trợ nhận giọng nói. Bạn có thể gõ nội dung ngay bên dưới.'}</p><label class="field">Nội dung công việc<textarea id="voice-text" maxlength="140" placeholder="Ví dụ, đọc 10 trang sách"></textarea></label><p id="voice-status" role="status" class="field-hint"></p>${supported?'<button class="button secondary full" data-action="start-speech">Bắt đầu nói</button>':''}<button class="button full" style="margin-top:12px" data-action="use-voice-text">Tiếp tục thêm việc</button>`);
}
function startSpeech(){
  const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;if(!Recognition)return;
  speech?.abort();speech=new Recognition();speech.lang='vi-VN';speech.interimResults=true;
  const field=document.getElementById('voice-text'),status=document.getElementById('voice-status');
  speech.onresult=event=>{if(field.isConnected)field.value=Array.from(event.results).map(item=>item[0].transcript).join(' ').slice(0,140);};
  speech.onerror=()=>{if(status.isConnected)status.textContent='Chưa nhận được giọng nói. Kiểm tra quyền microphone hoặc gõ nội dung để tiếp tục.';};
  speech.onend=()=>{if(status.isConnected && status.textContent==='Đang nghe…')status.textContent='Đã dừng nghe. Kiểm tra nội dung trước khi thêm việc.';};
  try{status.textContent='Đang nghe…';speech.start();}catch{status.textContent='Chưa mở được microphone. Bạn có thể gõ nội dung để tiếp tục.';}
}
function audienceLabel(value){return ({private:'Chỉ mình tôi',group:'Toàn bộ nhóm',selected:'Chọn người'})[value] || value || 'Chỉ mình tôi';}
function recipientChoices(){const members=[...new Map(state.circles.flatMap(circle=>circle.members).map(member=>[member.id,member])).values()];return members.length?members.map(member=>`<label class="recipient-choice"><input type="checkbox" name="recipients" value="${esc(member.id)}">${esc(member.name)}</label>`).join(''):'<p class="field-hint">Thêm bạn đồng hành trong tab Nhóm để chọn người xem.</p>';}

function addTask() {
  showModal('Việc bạn muốn làm',`<form id="task-form"><label class="field">Bạn muốn làm gì?<input name="title" maxlength="140" placeholder="VD: Đọc 10 trang sách" required autofocus></label><div class="field-grid"><label class="field">Thời lượng (phút)<input name="duration" type="number" min="1" max="480" value="30" required></label><label class="field">Ngày thực hiện<select name="day"><option value="0" ${!selectedDay?'selected':''}>Hôm nay</option><option value="1" ${selectedDay?'selected':''}>Ngày mai</option></select></label></div><label class="field">Ghi chú (tùy chọn)<textarea name="note" maxlength="300" placeholder="Một bước cụ thể để bắt đầu…"></textarea></label><button class="button full">Thêm vào danh sách</button></form>`);
}
function checkout(id) {
  const task = [...state.tasks,...state.plan].find(t=>t.id===id); if (!task) return;
  if (task.done) {
    showModal('Một việc đã hoàn thành',`<span class="tag">${esc(task.title)}</span><p class="modal-copy" style="margin-top:15px">${esc(task.reflection || 'Bạn đã bỏ qua phần nhìn lại.')}</p><p class="tiny muted">Quyền xem đã chọn: ${esc(audienceLabel(task.audience))}. Bản web không gửi nội dung cho người khác.</p><button class="button full" data-action="close" style="margin-top:18px">Tiếp tục nhịp ngày</button>`); return;
  }
  modalContent.innerHTML = `<form id="checkout-form" class="checkout"><input type="hidden" name="id" value="${esc(id)}"><button type="button" class="icon-button close-checkout" data-action="close" aria-label="Đóng">${icon('close')}</button><div class="modal-icon">${icon('check')}</div><span class="tag">${esc(task.title)} · ${task.duration} phút</span><h2 id="modal-title">Bạn đã làm được gì?</h2><p class="modal-copy">Một câu ngắn để ghi nhận bước tiến,<br>trước khi khép lại công việc.</p><label class="field"><span class="hidden">Nhìn lại công việc</span><textarea name="reflection" maxlength="160" placeholder="Ví dụ, đã đọc 10 trang sách và ghi lại 3 ý chính."></textarea></label><div class="counter"><span id="char-count">0</span>/160</div><div class="suggestions"><button type="button" data-action="suggest" data-text="Đọc xong chương">+ Đọc xong chương</button><button type="button" data-action="suggest" data-text="Ghi lại ý chính">+ Ghi lại ý chính</button><button type="button" data-action="suggest" data-text="Giải xong bài tập">+ Giải xong bài tập</button></div><label class="field">Quyền xem<select name="audience"><option value="private">Chỉ mình tôi</option><option value="group">Toàn bộ nhóm</option><option value="selected">Chọn người</option></select></label><div id="audience-note" class="field-hint" hidden>Lựa chọn được lưu trên trình duyệt này; chưa gửi nội dung tới người khác.<div id="recipient-choices" hidden>${recipientChoices()}</div></div><p id="form-error" class="form-error" role="alert"></p><button class="button full" style="margin-top:15px">Đánh dấu hoàn thành ${icon('check')}</button><button type="button" class="skip" data-action="skip-reflection">Bỏ qua phần nhìn lại</button></form>`;
  if (!modal.open) modal.showModal();
}
async function completeTask(form, skip = false) {
  const task = [...state.tasks,...state.plan].find(t=>t.id===form.elements.namedItem('id').value); if (!task || task.done) return;
  if(!skip && form.elements.audience.value==='selected' && !new FormData(form).getAll('recipients').length){showFormError(form.querySelector('#form-error'),'Chọn ít nhất một người xem hoặc chọn Chỉ mình tôi.');return;}
  if(state.focus?.taskId===task.id)recordFocus(false);
  task.done = true; task.completedAt = new Date().toISOString(); task.reflection = skip?'':form.elements.reflection.value.trim();
  task.audience = skip?'private':form.elements.audience.value;
  task.recipients=task.audience==='selected'?new FormData(form).getAll('recipients'):[];
  const saved = await save();
  modal.close(); render();
  if (saved) toast('Đã ghi nhận. Một bước nhỏ, một việc trọn vẹn.');
}
function statusMarkup(entry){
  const status=sessionStatus(entry);
  return `<span class="schedule-tag" data-state="${status.key}">${status.label}</span>${status.checkout?'<span class="schedule-tag unchecked">Chưa check-out</span>':''}${status.relative?`<span class="schedule-relative">${status.relative}</span>`:''}`;
}
function statusRow(entry){return `<div class="session-status" data-entry-id="${esc(entry.fixed?entry.commitmentId:entry.id)}" data-day="${esc(entry.day)}" data-fixed="${!!entry.fixed}">${statusMarkup(entry)}</div>`;}
function planSourceLabel(source){
  switch(source){
    case 'ai':return 'Lịch AI';
    case 'device-ai':return 'Lịch AI trên thiết bị';
    case 'automatic':return 'Lịch theo giờ rảnh';
    default:return 'Lịch mẫu';
  }
}
function scheduleCard(p){
  return `<article class="card session" data-session-id="${esc(p.id)}"><div class="row between"><span class="tag">${dayLabel(p.day)} · ${timeText(p.start)}–${timeText(p.start+p.duration)}</span><span class="task-time">${planSourceLabel(p.source)}</span></div>${statusRow(p)}<h3>${esc(p.title)}</h3><p>${esc(p.note || p.subject || '')}</p><details><summary class="text-button">Nội dung buổi ôn</summary><ul>${(p.objectives || []).map(o=>`<li>${esc(o)}</li>`).join('')}</ul><ol class="tiny muted">${(p.steps || []).map(step=>`<li>${esc(step)}</li>`).join('')}</ol>${p.expectedOutput?`<p>${esc(p.expectedOutput)}</p>`:''}</details><div class="row between"><button class="button ${p.done?'secondary':''}" data-action="checkout" data-id="${esc(p.id)}">${p.done?'Đã hoàn thành':'Check-out'}</button><button class="text-button" data-action="delete-plan" data-id="${esc(p.id)}">Bỏ khỏi lịch</button></div></article>`;
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
function calendarDayPhase(day,today=vietnamDay(Date.now())){return day<today?'past':day===today?'today':'future';}
function calendarBoard(){
  const weeks=calendarWeeks(state,calendarStart,calendarSpan),today=vietnamDay(Date.now());
  const last=addDays(calendarStart,calendarSpan*7-1);
  const unplaced=state.tasks.filter(t=>t.day>=calendarStart && t.day<=last);
  return `<div class="calendar-navigation"><button class="icon-button" data-action="calendar-prev" aria-label="Tuần trước">‹</button><div><strong>${dayLabel(calendarStart)} – ${dayLabel(last)}<span class="calendar-year"> / ${last.slice(0,4)}</span></strong><button class="text-button" data-action="calendar-today">Về tuần này</button></div><button class="icon-button" data-action="calendar-next" aria-label="Tuần sau">›</button></div><div class="calendar-options"><label>Số tuần <select data-calendar-span aria-label="Số tuần hiển thị">${[1,2,4].map(n=>`<option value="${n}" ${calendarSpan===n?'selected':''}>${n} tuần</option>`).join('')}</select></label><button class="text-button" data-action="calendar-expand">${icon('focus')} Xem rộng</button></div><p class="calendar-hint">Giờ Việt Nam · Chạm vào một buổi để xem chi tiết.</p><div class="calendar-day-legend" aria-label="Màu nền theo ngày"><span><i data-phase="past"></i>Ngày đã qua</span><span><i data-phase="today"></i>Hôm nay</span><span><i data-phase="future"></i>Ngày sắp tới</span></div><div class="calendar-scroll">${weeks.map((week,i)=>`<table class="week-table" aria-label="Lịch tuần ${dayLabel(week.first)}"><caption>${calendarSpan>1?`Tuần ${i+1} · `:''}${dayLabel(week.first)} – ${dayLabel(week.days[6])}</caption><colgroup><col class="period-column">${week.days.map(()=>'<col>').join('')}</colgroup><thead><tr><th scope="col">Buổi</th>${week.days.map((day,d)=>`<th scope="col" data-calendar-day="${day}" data-day-phase="${calendarDayPhase(day,today)}" ${day===today?'aria-current="date"':''} class="${day===today?'is-today':''}"><span>${weekdays[d]}</span><time>${dayLabel(day)}</time></th>`).join('')}</tr></thead><tbody>${periods.map((period,r)=>`<tr><th scope="row"><strong>${period.label}</strong><small>${period.range}</small></th>${week.days.map((day,d)=>`<td data-calendar-day="${day}" data-day-phase="${calendarDayPhase(day,today)}" data-cell="${day}:${r}" aria-label="${period.label}, ${weekdays[d]}, ${dayLabel(day)}">${week.cells[r][d].map(calendarEvent).join('') || '<span class="calendar-empty" aria-hidden="true">·</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</div><div class="calendar-legend"><span><i data-state="upcoming"></i>Sắp tới</span><span><i data-state="active"></i>Đang diễn ra</span><span><i data-state="overdue"></i>Quá hạn</span><span><i data-state="done"></i>Hoàn thành</span></div>${unplaced.length?`<section class="unplaced-tasks"><h3>Việc chưa đặt giờ <span>${unplaced.length}</span></h3><p class="tiny muted">Những việc này chưa có giờ bắt đầu, nên chưa xếp vào buổi.</p>${unplaced.map(t=>`<button data-action="session-detail" data-id="${esc(t.id)}" class="unplaced-task"><span>${dayLabel(t.day)}</span><strong>${esc(t.title)}</strong>${t.done?icon('check'):icon('arrow')}</button>`).join('')}</section>`:''}<p class="calendar-hint">Lịch cố định lặp theo cấu hình hiện tại. Bảng có thể xem nhiều tuần; AI hiện lập lịch trong 7 ngày tới.</p>`;
}
function renderSchedule() {
  const commitments=state.commitments.map(c=>`<div class="fixed-item row"><button class="flex" style="text-align:left;padding:0" data-action="edit-fixed" data-id="${esc(c.id)}"><strong>${esc(c.title)}</strong><small>${c.weekdays.map(n=>weekdays[n-1]).join(', ')} · ${timeText(c.start)}–${timeText(c.end)}</small></button><button class="delete-button" data-action="delete-fixed" data-id="${esc(c.id)}" aria-label="Xóa lịch ${esc(c.title)}">${icon('trash')}</button></div>`).join('');
  const plan=[...state.plan].sort((a,b)=>startTime(a)-startTime(b));
  screen.innerHTML=`<div class="screen-body"><h1 class="screen-title">Thời gian, theo cách của bạn.</h1><p class="screen-subtitle">Giữ chỗ cho lịch bận. Dành phần còn lại cho điều quan trọng.</p><div class="card tint"><span class="tag">01 · LỊCH CỐ ĐỊNH</span><h2 style="font-size:21px;margin:13px 0 8px">Những khung giờ không thể đổi</h2><p class="small muted">Lịch đi học, đi làm và thời gian riêng lặp lại mỗi tuần. Bạn có thể sửa bất cứ lúc nào.</p>${commitments}<button class="button secondary" style="margin-top:14px" data-action="add-fixed">${icon('plus')} Thêm lịch cố định</button></div><details class="schedule-extras"><summary class="text-button">Thử lịch mẫu</summary><button class="button secondary full" data-action="sample-plan" ${!state.commitments.length?'disabled':''}>${icon('spark')} Xem kế hoạch học mẫu</button><p class="tiny ${state.commitments.length?'muted':'blue'}" style="margin:10px 0">${state.commitments.length?'Mẫu luyện tiếng Anh giao tiếp, được xếp vào khung trống.':'Nhập lịch đi học / đi làm ở bước 01 trước khi xem kế hoạch mẫu.'}</p></details><button class="button secondary full" data-action="study-preferences" style="margin:6px 0 10px">Nhịp học của bạn</button><button class="button full" data-action="ai">Lên kế hoạch cùng AI ↗</button><div class="section-row"><h2>Lịch trình của bạn</h2></div><div class="schedule-view-switch" role="group" aria-label="Cách xem lịch"><button data-action="schedule-list" aria-pressed="${scheduleView==='list'}">${icon('check')} Đầu việc</button><button data-action="schedule-calendar" aria-pressed="${scheduleView==='calendar'}">${icon('calendar')} Bảng lịch</button></div>${scheduleView==='calendar'?`<section class="calendar-panel" aria-label="Bảng lịch theo tuần">${calendarBoard()}</section>`:plan.length?plan.map(scheduleCard).join(''):`<div class="card empty">${icon('calendar')}<h3>Chưa có phiên học nào.</h3><p>Thêm lịch bận và chọn Lên kế hoạch cùng AI để bắt đầu.</p></div>`}</div>`;
}
function openSession(id,day,fixed){
  const p=calendarEntry(id,day,fixed);if(!p)return;
  showModal('Chi tiết hoạt động',`<span class="tag">${p.fixed?'Lịch cố định':p.kind==='plan'?planSourceLabel(p.source):'Việc của bạn'}</span><h3 class="session-detail-title">${esc(p.title)}</h3><p class="modal-copy">${dayLabel(p.day)}${p.start!=null?` · ${timeText(p.start)}–${timeText(p.start+p.duration)}`:' · Chưa đặt giờ'}</p>${statusRow(p)}${p.subject?`<p class="small blue">${esc(p.subject)}</p>`:''}${p.note?`<p class="modal-copy">${esc(p.note)}</p>`:''}${p.objectives?.length?`<h3 class="detail-heading">Mục tiêu buổi học</h3><ul class="limit-list">${p.objectives.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}${p.steps?.length?`<h3 class="detail-heading">Các bước thực hiện</h3><ol class="limit-list">${p.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}${p.expectedOutput?`<div class="notice"><strong>Đầu ra cần đạt</strong><p>${esc(p.expectedOutput)}</p></div>`:''}${p.fixed?'<p class="notice">Khung giờ lặp lại, không phải một đầu việc cần check-out. Giờ đã qua hiển thị “Đã kết thúc”.</p>':''}${p.reflection?`<h3 class="detail-heading">Nhìn lại</h3><p class="modal-copy">${esc(p.reflection)}</p>`:''}<div class="stack" style="margin-top:18px">${p.fixed?`<button class="button full" data-action="edit-fixed" data-id="${esc(p.commitmentId)}">Chỉnh lịch cố định</button>`:`<button class="button full" data-action="checkout" data-id="${esc(p.id)}">${p.done?'Xem check-out':'Check-out công việc'}</button>`}<button class="button secondary full" data-action="close">Đóng chi tiết</button></div>`);
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
  const today=vietnamDay(Date.now());
  document.querySelectorAll('[data-calendar-day]').forEach(el=>{const phase=calendarDayPhase(el.dataset.calendarDay,today);el.dataset.dayPhase=phase;el.classList.toggle('is-today',phase==='today');if(el.tagName==='TH'){if(phase==='today')el.setAttribute('aria-current','date');else el.removeAttribute('aria-current');}});
}
function fixedEditor(id) {
  const existing = state.commitments.find(c=>c.id===id);
  showModal(existing?'Sửa lịch cố định':'Thêm lịch cố định',`<form id="fixed-form"><input type="hidden" name="id" value="${esc(existing?.id || '')}"><label class="field">Tên lịch<input name="title" value="${esc(existing?.title || '')}" placeholder="VD: Đi học ở trường" maxlength="100" required></label><p class="small">Lặp lại vào</p><div class="weekdays">${weekdays.map((label,i)=>`<label class="weekday"><input type="checkbox" name="weekdays" value="${i+1}" ${(existing?.weekdays || [1,2,3,4,5]).includes(i+1)?'checked':''}><span>${label}</span></label>`).join('')}</div><div class="field-grid"><label class="field">Bắt đầu<input name="start" type="time" value="${timeText(existing?.start ?? 7*60)}" required></label><label class="field">Kết thúc<input name="end" type="time" value="${timeText(existing?.end ?? 12*60)}" required></label></div><p id="form-error" class="form-error" role="alert"></p><p class="field-hint" style="margin-bottom:14px">Lịch đã xác nhận sẽ giữ nguyên khi sửa giờ cố định. Nếu có xung đột, bản thử sẽ yêu cầu bạn xử lý trước.</p><button class="button full">Lưu lịch cố định</button></form>`);
}
// Deterministic sample only: six authored sessions, no model or server requests.
function samplePlan() {
  if (!state.commitments.length) return;
  const lessons = [
    ['Tiếng Anh · Hỏi đường','Tập hỏi đường khi đi du lịch.', ['Học 5 câu hỏi đường thường dùng.','Tự nói một hội thoại ngắn.']],
    ['Tiếng Anh · Gọi món','Tập gọi món trong quán ăn.', ['Đọc tên 5 món ăn yêu thích bằng tiếng Anh.','Luyện hội thoại với người phục vụ.']],
    ['Tiếng Anh · Giới thiệu bản thân','Tự giới thiệu trong một phút.', ['Viết 5 câu về bản thân.','Đọc thành tiếng và nghe lại.']],
    ['Tiếng Anh · Ôn hỏi đường','Thực hành tình huống mới.', ['Tự hỏi đường tới nhà ga.','Ghi lại câu chưa nói trôi chảy.']],
    ['Tiếng Anh · Ôn gọi món','Tập gọi món và hỏi giá.', ['Đóng vai khách và người phục vụ.','Luyện nói lại câu còn vướng.']],
    ['Tiếng Anh · Hội thoại du lịch','Kết hợp các câu đã học.', ['Tự nói một hội thoại ba phút.','Ghi lại 3 câu muốn luyện tiếp.']]
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
  showModal('Xem trước kế hoạch mẫu',`<span class="tag">MẪU CÓ SẴN · KHÔNG DÙNG AI</span><p class="modal-copy" style="margin-top:12px">Ví dụ luyện tiếng Anh giao tiếp khi đi du lịch trong 3 ngày tới. Giờ học được xếp thử vào khung 08:00–22:00, tránh lịch cố định và phiên học đã xác nhận. Nội dung không cá nhân hóa theo môn học thực tế.</p>${preview.length?preview.map(p=>`<div class="card session"><span class="tag">${dayLabel(p.day)} · ${timeText(p.start)}–${timeText(p.start+45)}</span><h3>${esc(p.title)}</h3><p>${esc(p.note)}</p></div>`).join(''):'<p class="modal-copy">Không còn khung trống phù hợp. Bạn có thể điều chỉnh lịch cố định hoặc bỏ bớt các phiên mẫu trước.</p>'}${preview.length?'<button class="button full" data-action="confirm-plan">Xác nhận thêm vào lịch</button>':'<button class="button full" data-action="close">Đã hiểu</button>'}`);
}
function editStudyPreferences(){
  const p=state.studyPreferences || defaultPreferences;
  showModal('Nhịp học của bạn',`<form id="study-form"><div class="field-grid"><label class="field">Có thể học từ<input type="time" name="start" value="${timeText(p.startMinute)}" required></label><label class="field">Kết thúc trước<input type="time" name="end" value="${timeText(p.endMinute)}" required></label></div><label class="field">Mỗi phiên<select name="session">${[25,30,45,60,90].map(n=>`<option value="${n}" ${p.sessionMinutes===n?'selected':''}>${n} phút</option>`).join('')}</select></label><label class="field">Quỹ học mỗi ngày (phút)<input type="number" name="daily" min="25" max="480" value="${p.dailyMinutes}" required></label><p class="tiny muted">Lịch AI hỗ trợ 7 ngày tới, múi giờ Việt Nam. Lịch đã xác nhận vẫn được giữ nguyên.</p><p id="form-error" class="form-error" role="alert"></p><button class="button full">Lưu nhịp học</button></form>`);
}
function openAI(){
  if(!planningUrl){showModal('Kế hoạch học và luyện tập','<p class="modal-copy">AI chưa mở trên bản web. Bạn có thể thử lập lịch mẫu trong mục Lịch trình.</p>');return;}
  if(aiBusy){toast('AI đang tạo kế hoạch. Hãy chờ kết quả trước khi gửi tiếp.');return;}
  if(aiDraft){renderAIDraft();return;}
  const p=state.studyPreferences || defaultPreferences;
  showModal('Kế hoạch học và luyện tập',`<form id="ai-form"><p id="ai-error" class="form-error" role="alert" tabindex="-1"></p><div id="ai-progress" class="notice" hidden><p role="status"></p><button type="button" class="text-button" data-action="cancel-ai">Hủy yêu cầu</button></div><span class="tag">AI THẬT · XEM TRƯỚC RỒI XÁC NHẬN</span><p class="modal-copy" style="margin-top:12px">${state.commitments.length} lịch cố định · khung ${timeText(p.startMinute)}–${timeText(p.endMinute)} · ${p.dailyMinutes} phút/ngày. Múi giờ Việt Nam.</p><details class="browser-ai-option"><summary class="text-button">AI chạy trong trình duyệt</summary><p class="field-hint">Tùy chọn riêng trên web, cần tải model khoảng 512 MB lần đầu.</p><button type="button" class="button secondary full" data-action="device-ai">Dùng AI trên thiết bị</button></details><label class="field">Mã thử AI của nhóm<input type="password" name="code" value="${esc(betaCode)}" autocomplete="off" maxlength="80" required placeholder="Mã dùng thử do nhóm Brain10 cung cấp"></label><span class="field-hint">Mã dùng thử do nhóm Brain10 cung cấp. Chỉ giữ trong bộ nhớ tab này.</span><label class="field">Bạn muốn đạt điều gì?<textarea name="request" maxlength="4000" required placeholder="Ví dụ, luyện nói tiếng Anh để tự tin khi đi du lịch.">${esc(state.profile.lastAIRequest || '')}</textarea></label><button type="button" class="text-button" data-action="ai-example">Dùng ví dụ học tiếng Anh</button><label class="field">Hạn hoàn thành (tùy chọn)<input type="date" name="targetDate" min="${dateKey(dateOffset(1))}" value="${esc(aiTargetDate)}"></label><p class="field-hint">Có thể ghi ngày trong mục tiêu hoặc chọn ở trên. Nếu chưa có hạn, Brain10 lên kế hoạch cho 7 ngày tới.</p><label class="field">Bạn đã biết gì, muốn tập thêm gì? (tùy chọn)<textarea name="learningContext" maxlength="6000" placeholder="Ví dụ, tôi biết từ vựng cơ bản nhưng còn ngại nói.">${esc(state.profile.learningContext || '')}</textarea></label><div class="notice">Khi tạo kế hoạch, mục tiêu, ngữ cảnh học, nhịp học và lịch được gửi qua backend tới PoolAI. Không gửi họ tên, sinh nhật, nhật ký, ảnh hay screen time. Yêu cầu này có sử dụng credit AI.</div><button class="button full" id="ai-submit">${icon('spark')} Tạo kế hoạch để xem trước</button><button type="button" class="text-button" data-action="automatic-plan">Xếp lịch theo giờ rảnh</button></form>`);
}
function openAutomaticPlan(){
  if(aiBusy){toast('Đợi yêu cầu AI hiện tại kết thúc.');return;}
  const currentGoal=document.querySelector('#ai-form [name="request"]')?.value.trim();
  const title=currentGoal || state.profile.lastAIRequest || '';
  showModal('Xếp lịch theo giờ rảnh',`<form id="automatic-plan-form"><p class="modal-copy">Brain10 chọn tối đa ba buổi ôn trước ngày kiểm tra, dựa trên lịch cố định và nhịp học của bạn.</p><label class="field">Nội dung cần ôn<input name="title" value="${esc(title.slice(0,160))}" maxlength="160" required></label><label class="field">Ngày kiểm tra<input type="date" name="examDate" required></label><p id="form-error" class="form-error" role="alert"></p><button class="button full">Xem trước lịch ôn</button></form>`);
}
function openDeviceAI(prefill={}){
  if(aiBusy){toast('Đợi yêu cầu AI hiện tại kết thúc.');return;}
  const currentGoal=document.querySelector('#ai-form [name="request"]')?.value.trim();
  const currentContext=document.querySelector('#ai-form [name="learningContext"]')?.value.trim();
  const title=prefill.title ?? currentGoal ?? state.profile.lastAIRequest ?? '';
  const context=prefill.context ?? currentContext ?? state.profile.learningContext ?? '';
  showModal('AI trên thiết bị',`<form id="device-ai-form"><p class="modal-copy">AI đọc nội dung bạn nhập và soạn một buổi ôn ngay trong trình duyệt. Lần đầu tải khoảng 512 MB. Dữ liệu học của bạn ở trên thiết bị.</p><label class="field">Nội dung cần ôn<input name="title" value="${esc(title.slice(0,160))}" maxlength="160" required></label><label class="field">Đề cương hoặc phần còn yếu<textarea name="context" maxlength="1000">${esc(context.slice(0,1000))}</textarea></label><label class="field">Ngày kiểm tra<input type="date" name="examDate" value="${esc(prefill.examDate || '')}" required></label><p id="form-error" class="form-error" role="alert"></p><p id="device-ai-progress" class="field-hint" role="status"></p><button class="button full" id="device-ai-submit">Tạo buổi ôn bằng AI</button></form>`);
}
async function generateDeviceAI(data){
  if(aiBusy)return;
  const title=String(data.get('title') || '').trim();
  const context=String(data.get('context') || '').trim();
  const examDate=String(data.get('examDate') || '');
  const errorField=document.getElementById('form-error');
  if(!title){errorField.textContent='Nhập nội dung cần ôn.';return;}
  let draft;
  try{draft=makeAutomaticDraft(state,title,examDate);}catch(error){errorField.textContent=error.message;return;}
  const [session]=draft.sessions;
  const minutes=(Date.parse(session.end)-Date.parse(session.start))/60000;
  const submit=document.getElementById('device-ai-submit');
  const progress=document.getElementById('device-ai-progress');
  const controller=new AbortController();
  deviceAbort=controller;
  aiBusy=true;submit.disabled=true;errorField.textContent='';
  progress.textContent='Đang chuẩn bị model AI…';
  try{
    const worker=deviceWorker ??= new Worker(new URL('./device-ai-worker.js',import.meta.url),{type:'module'});
    const text=await new Promise((resolve,reject)=>{
      worker.onmessage=({data:reply})=>{
        switch(reply.type){
          case 'download':progress.textContent=`Đang tải model AI (${reply.percent}%)…`;break;
          case 'generating':progress.textContent='AI đang soạn nội dung buổi ôn…';break;
          case 'result':resolve(reply.text);break;
          case 'error':reject(new Error('Model AI chưa chạy được.'));break;
        }
      };
      worker.onerror=()=>reject(new Error('Không khởi động được AI trên thiết bị.'));
      controller.signal.addEventListener('abort',()=>reject(controller.signal.reason),{once:true});
      worker.postMessage({topic:title,context,minutes});
    });
    const steps=text.split('\n').map(line=>line.trim()).filter(line=>line && !line.startsWith('```'));
    if(!steps.length)throw new Error('AI chưa tạo được nội dung.');
    const result={...draft,source:'device-ai',deviceInput:{title,context,examDate},model:'Qwen2.5-0.5B-Instruct',summary:'AI trên thiết bị đã soạn nội dung, Brain10 đã chọn khung giờ rảnh.',sessions:[{...session,objectives:[title],steps,expectedOutput:''}]};
    aiSessions=convertDraft(result);aiDraft=result;
    renderAIDraft();
  }catch(error){
    deviceWorker?.terminate();deviceWorker=null;
    if(error.name!=='AbortError')errorField.textContent='AI trên thiết bị chưa chạy được. Kiểm tra kết nối để tải model và thử lại.';
  }finally{
    if(deviceWorker){deviceWorker.onmessage=null;deviceWorker.onerror=null;}
    deviceAbort=null;aiBusy=false;submit.disabled=false;progress.textContent='';
  }
}
async function generateAI(data){
  if(aiBusy)return;
  betaCode=String(data.get('code')).trim();
  const request=String(data.get('request')).trim(),learningContext=String(data.get('learningContext')).trim();
  if(!request || !betaCode)return;
  aiTargetDate=String(data.get('targetDate') || '');
  const button=document.getElementById('ai-submit');
  const controller=new AbortController();
  aiController=controller;
  const form=document.getElementById('ai-form');
  const status=document.getElementById('ai-progress');
  document.activeElement?.blur();
  for(const field of form.querySelectorAll('input,textarea'))field.readOnly=true;
  aiBusy=true;button.disabled=true;button.textContent='Đang tạo kế hoạch…';
  document.getElementById('ai-error').textContent='';
  const started=Date.now();
  status.hidden=false;
  const updateProgress=()=>{
    const seconds=Math.floor((Date.now()-started)/1000);
    status.querySelector('[role="status"]').textContent=`Đang tạo kế hoạch · ${seconds} giây. ${seconds<30?'AI đang đọc mục tiêu và xếp các buổi theo lịch của bạn.':'Dịch vụ đang phản hồi chậm. Bạn có thể hủy và thử lại sau.'}`;
  };
  updateProgress();status.scrollIntoView({block:'start'});
  const ticker=setInterval(updateProgress,1000);
  const timeout=setTimeout(()=>controller.abort(new DOMException('timeout','TimeoutError')),105000);
  state.profile.lastAIRequest=request;state.profile.learningContext=learningContext;save();
  try{
    const response=await fetch(planningUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${betaCode}`},body:JSON.stringify(makePlanningRequest(state,request,learningContext,aiTargetDate)),signal:controller.signal});
    const result=await response.json().catch(error=>{
      if(response.status===502 || response.status===503)return {};
      throw error;
    });
    if(response.status===503 || (response.status===502 && (!result.error || /HTTP 5\d\d/.test(result.error))))throw new Error('AI qua mạng đang tạm gián đoạn. Chọn Dùng AI trên thiết bị để tiếp tục.');
    if(!response.ok)throw new Error(result.error || 'Chưa tạo được lịch. Hãy thử lại.');
    aiSessions=convertDraft(result);aiDraft=result;
    if(modal.open && document.getElementById('ai-form'))renderAIDraft();else toast('Lịch AI đã sẵn sàng. Mở mục AI để xem kết quả.');
  }catch(error){
    if(error.name==='AbortError')return;
    const message=error.name==='TimeoutError'?'Dịch vụ phản hồi quá lâu. Hãy thử lại sau ít phút. Nội dung đã nhập vẫn được giữ tại đây.':error.message || 'Không kết nối được dịch vụ AI.';
    showFormError(document.getElementById('ai-error'),message);
  }finally{
    clearInterval(ticker);clearTimeout(timeout);
    if(aiController===controller)aiController=null;
    aiBusy=false;
    for(const field of form.querySelectorAll('input,textarea'))field.readOnly=false;
    status.hidden=true;
    if(document.getElementById('ai-submit')){button.disabled=false;button.textContent='Tạo kế hoạch để xem trước';}
  }
}
function renderAIDraft(){
  if(aiDraft.status==='needs_clarification'){
    const outside=aiDraft.reason==='out_of_scope';
    const questions=aiDraft.questions.map(question=>`<p class="notice">${esc(question)}</p>`).join('');
    showModal(outside?'Yêu cầu ngoài phạm vi':'Bổ sung mục tiêu học',`<p class="modal-copy">${esc(aiDraft.summary)}</p>${questions}<button class="button full" data-action="edit-ai">Chỉnh mục tiêu học</button>`);
    return;
  }
  const automatic=aiDraft.source==='automatic';
  const device=aiDraft.source==='device-ai';
  const title=device?'Lịch AI trên thiết bị':automatic?'Lịch theo giờ rảnh':'Lịch AI đề xuất';
  showModal(title,`<span class="tag">${automatic?'XẾP LỊCH TỰ ĐỘNG':esc(aiDraft.model || 'PoolAI')} · CHƯA LƯU</span><h3 class="small" style="margin:15px 0">${esc(aiDraft.summary)}</h3>${aiDraft.questions.map(q=>`<p class="notice"><strong>Cần bổ sung:</strong> ${esc(q)}</p>`).join('')}${aiDraft.assumptions.map(a=>`<p class="tiny muted" style="margin-bottom:8px">Giả định: ${esc(a)}</p>`).join('')}${aiSessions.map(p=>`<article class="card session"><span class="tag">${dayLabel(p.day)} · ${timeText(p.start)}–${timeText(p.start+p.duration)}</span><h3>${esc(p.title)}</h3><p>${esc(p.subject)}</p><ul>${p.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ul><details${device?' open':''}><summary class="text-button">Các bước học & đầu ra</summary><ol class="tiny muted">${p.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p>${esc(p.expectedOutput)}</p></details><button class="text-button" data-action="remove-ai-session" data-id="${p.id}">Bỏ phiên này</button></article>`).join('')}<p class="field-hint" style="margin:12px 0">Đối chiếu nội dung với đề cương. Chỉ thêm vào lịch sau khi bạn xác nhận; khung giờ sẽ được kiểm tra lại.</p>${aiSessions.length?'<button class="button full" data-action="accept-ai">Xác nhận thêm vào lịch</button>':''}${automatic?'':'<button class="text-button" data-action="edit-ai" style="width:100%;margin-top:8px">Chỉnh mục tiêu / bổ sung thông tin</button>'}`);
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
async function checkWellbeing(){
  if(state.wellbeingReminders===false)return;
  const boundary=reminderBoundary(state.focus);if(!boundary)return;
  const startedAt = state.focus.start;
  state.focus.reminderBoundary=boundary;
  await save();
  if (state.focus?.start !== startedAt || state.wellbeingReminders === false) return;
  const sounded=reminderSound(),el=document.getElementById('wellbeing-alert');
  el.innerHTML=`<div class="reminder-heading">${icon('leaf')}<strong>Đã tập trung ${boundary*40} phút</strong></div><p>Uống một ít nước, đứng dậy và thả lỏng vai trong 1–2 phút.</p><small>Bộ đếm vẫn chạy. ${sounded?'Âm báo đã phát; âm lượng phụ thuộc thiết bị.':'Âm thanh chưa sẵn sàng; nhấn Thử âm báo để bật tiếng.'}</small><div class="reminder-actions"><button class="button" data-action="dismiss-wellbeing">Đã nhớ · cảm ơn</button><button class="text-button" data-action="test-reminder-sound">Thử âm báo</button></div>`;
  el.hidden=false;
}
function wellbeingCard(){return `<section class="card wellbeing-card"><label class="wellbeing-setting">${icon('leaf')}<span><strong>Nghỉ nhẹ & uống nước</strong><small>Nhắc sau mỗi 40 phút trong phiên dài.</small></span><input type="checkbox" id="wellbeing-enabled" aria-label="Nhắc nghỉ nhẹ và uống nước" ${state.wellbeingReminders!==false?'checked':''}></label><p>Dành 1–2 phút vận động nhẹ. Bộ đếm vẫn tiếp tục. Bản web nhắc khi trang còn mở; không bảo đảm khi đóng tab hoặc thiết bị ngủ.</p><button class="text-button" data-action="test-reminder-sound">Thử âm báo</button><p class="tiny muted">Trình duyệt có thể yêu cầu bật tiếng lại sau khi tải lại trang. Âm lượng phụ thuộc cài đặt thiết bị.</p></section>`;}
function focusClock() {
  const seconds = state.focus ? Math.max(0,Math.ceil((state.focus.end-Date.now())/1000)) : duration*60;
  return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
async function startFocus(taskId = null) {
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
  state.focus = {start:Date.now(),reminderBoundary:0,end:Date.now()+duration*60000,taskId:typeof taskId==='string'?taskId:null};
  await save(); render();
}
function recordFocus(early) {
  if (!state.focus) return;
  const seconds = Math.max(0,Math.floor((Math.min(Date.now(),state.focus.end)-state.focus.start)/1000));
  hideWellbeing();
  state.sessions.push({id:`focus:${state.focus.start}`,seconds,start:new Date(state.focus.start).toISOString(),end:new Date(Math.min(Date.now(),state.focus.end)).toISOString(),day:dateKey(new Date(state.focus.start)),early}); state.focus = null;
}
async function finishFocus(early) {
  if(!state.focus)return;
  recordFocus(early);
  const saved = await save();
  render();
  if (saved) toast(early?'Đã ghi nhận thời gian tập trung thực tế.':'Phiên tập trung đã kết thúc. Nghỉ một chút nhé.');
}
function renderStats() {
  const days=weekSummary(state,statsStart),done=days.reduce((sum,day)=>sum+day.tasks.length,0),max=Math.max(1,...days.map(day=>day.tasks.length)),current=weekStart(dateKey()),last=days.at(-1).date;
  screen.innerHTML=`<div class="screen-body"><h1 class="screen-title">Thời gian của bạn</h1><p class="screen-subtitle">Chọn một tuần. Chạm vào từng ngày để nhìn lại việc hoàn thành và hoạt động.</p><div class="calendar-navigation stats-navigation"><button class="icon-button" data-action="stats-prev" aria-label="Tuần thống kê trước">‹</button><div><strong>${dayLabel(statsStart)} – ${dayLabel(last)}/${last.slice(0,4)}</strong>${statsStart!==current?'<button class="text-button" data-action="stats-today">Về tuần này</button>':''}</div><button class="icon-button" data-action="stats-next" aria-label="Tuần thống kê sau" ${statsStart>=current?'disabled':''}>›</button></div><section class="card"><span class="tag">CÔNG VIỆC TRONG TUẦN</span><div class="stat-value">${done} <span class="small muted">việc hoàn thành</span></div><div class="chart" aria-label="Việc hoàn thành theo ngày">${days.map(day=>`<button class="bar-item" data-action="stats-day" data-day="${day.date}" aria-label="Xem ngày ${dayLabel(day.date)}: ${day.tasks.length} việc" ${day.future?'disabled':''}><span>${day.future?'—':day.tasks.length}</span><div class="bar ${day.date===dateKey()?'current':''}" style="height:${Math.max(3,day.tasks.length/max*85)}px"></div><span>${day.date.slice(-2)}</span></button>`).join('')}</div><p class="tiny muted">Chạm một cột để xem ngày đó. Dữ liệu từ các thao tác bạn lưu trên trình duyệt này.</p></section><section class="card"><h2>Những khoảng dành cho bạn</h2><div class="metric-row"><div><strong>${Math.floor(days.reduce((sum,day)=>sum+day.focusSeconds,0)/60)}p</strong><small>Tập trung đã ghi nhận</small></div><div><strong>${days.reduce((sum,day)=>sum+day.activities.length,0)}</strong><small>Hoạt động tự ghi</small></div></div></section><section class="card platform-card"><div class="row">${icon('chart')}<h2>Thời gian sử dụng ứng dụng</h2></div><p class="small muted">Thống kê TikTok, YouTube và các app khác cần quyền sử dụng trên Android. Trình duyệt chỉ xem được dữ liệu Brain10 bạn lưu tại đây.</p><a class="button secondary full" href="../#download">Mở trang tải Android</a></section></div>`;
}
function renderGroups() {
  const circle=currentCircle(),today=dateKey(),checked=circle?state.checkins.find(item=>item.circleId===circle.id && item.date===today):null;
  const done=workOn(today).filter(item=>item.done).length,total=workOn(today).length;
  const shared=[...state.tasks,...state.plan].filter(item=>item.done && (item.audience==='Toàn bộ nhóm · mô phỏng' || item.audience==='group' || item.audience==='Toàn bộ nhóm' || item.audience==='selected' && (item.recipients || []).some(id=>circle?.members.some(member=>member.id===id))));
  screen.innerHTML=`<div class="screen-body"><div class="row between"><div><h1 class="screen-title">Cùng nhau giữ nhịp.</h1><p class="screen-subtitle">Một cam kết nhỏ. Những người bạn đồng hành.</p></div><button class="icon-button" data-action="create-circle" aria-label="Tạo nhóm">${icon('plus')}</button></div>${state.circles.length>1?`<div class="chips">${state.circles.map((item,index)=>`<button class="chip ${item.id===circle.id?'selected':''}" data-action="select-circle" data-index="${index}">${esc(item.name)}</button>`).join('')}</div>`:''}${circle?`<section class="card"><span class="tag">CAM KẾT CHUNG</span><h2>${esc(circle.name)}</h2><p class="modal-copy">${esc(circle.goal)}</p><div class="goal-progress"><span style="width:${total?done/total*100:0}%"></span></div><div class="metric-row"><div><strong>${done}/${total}</strong><small>Việc hôm nay</small></div><div><strong>${circleStreak(state.checkins,circle.id,today)}</strong><small>Ngày giữ nhịp</small></div><div><strong>${circle.members.length+1}</strong><small>Người đồng hành</small></div></div><p class="tiny blue">${checked?(checked.rest?'Hôm nay bạn chọn nghỉ.':'Bạn đã check-in hôm nay'):'Một bước nhỏ để giữ lời với chính mình.'}</p><button class="button full" data-action="checkin" ${checked&&!checked.rest?'disabled':''}>${checked&&!checked.rest?'Đã giữ cam kết hôm nay':'Tôi đã giữ cam kết'}</button><button class="text-button full" data-action="rest">Hôm nay tôi cần nghỉ</button></section><div class="section-row"><h2>Những người đồng hành</h2></div><section class="card">${[{name:state.profile.name},...circle.members].map((member,index)=>`<div class="row member"><div class="avatar">${esc(member.name.slice(0,1).toUpperCase())}</div><div><strong>${esc(member.name)}${index===0?' · Bạn':''}</strong><p>${index===0?(checked?(checked.rest?'Đang nghỉ hôm nay':'Đã check-in'):'Chưa check-in hôm nay'):'Tên bạn lưu trên thiết bị này'}</p></div></div>`).join('')}</section>${shared.length?`<div class="section-row"><h2>Những bước tiến đã ghi</h2></div><section class="card">${shared.map(item=>`<button class="day-entry" data-action="checkout" data-id="${esc(item.id)}">${icon('check')}<span>${esc(item.title)}<small>${esc(item.reflection || 'Đã hoàn thành')}</small></span></button>`).join('')}</section>`:''}<button class="button secondary full" data-action="invite">Mời bạn đồng hành</button>`:`<section class="card empty"><div class="welcome-symbol">${icon('users')}</div><h2>Những điều lớn bắt đầu<br>từ một vòng tròn nhỏ.</h2><p>Chọn một mục tiêu chung, thêm bạn đồng hành và nhìn lại cam kết của mình mỗi ngày.</p><button class="button full" data-action="create-circle">${icon('plus')} Tạo vòng tròn đầu tiên</button></section>`}<p class="notice">Nhóm và check-in lưu trên trình duyệt này. Mời thành viên và đồng bộ trực tuyến đang được phát triển, giống chế độ cục bộ trên Android.</p></div>`;
}
function activityEditor() {
  photoRequest++;activityPhoto=null;photoBusy=false;
  const end=new Date(),start=new Date(+end-30*60000),localInput=date=>`${dateKey(date)}T${timeText(date.getHours()*60+date.getMinutes())}`;
  showModal('Một việc ngoài màn hình',`<form id="activity-form"><label class="field">Bạn vừa làm gì?<input name="title" placeholder="Ví dụ, chạy bộ 30 phút" maxlength="140" required></label><label class="field">Bắt đầu<input name="start" type="datetime-local" value="${localInput(start)}" required></label><label class="field">Kết thúc<input name="end" type="datetime-local" value="${localInput(end)}" required></label><p class="field-hint">Toàn bộ khoảng thời gian phải nằm trong 24 giờ vừa qua. Lưu riêng tư trong trình duyệt.</p><input class="hidden" type="file" accept="image/jpeg,image/png,image/webp" id="activity-photo"><button type="button" class="text-button" data-action="photo">${icon('plus')} Thêm ảnh minh chứng</button><div id="activity-photo-preview"></div><p id="form-error" class="form-error" role="alert"></p><button class="button full" id="save-activity">Lưu hoạt động</button></form>`);
}
async function attachActivityPhoto(file){
  const form=document.getElementById('activity-form');if(!form||!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){showFormError(form.querySelector('#form-error'),'Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.');return;}
  const request=++photoRequest;photoBusy=true;form.querySelector('#save-activity').disabled=true;
  const url=URL.createObjectURL(file);
  try{const image=new Image();image.src=url;await image.decode();const ratio=Math.min(1,1000/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const photo=canvas.toDataURL('image/jpeg',.75);if(photo.length>800000)throw Error();if(!form.isConnected || request!==photoRequest)return;activityPhoto=photo;form.querySelector('#activity-photo-preview').innerHTML=`<img class="activity-photo" src="${photo}" alt="Ảnh minh chứng đã chọn"><button type="button" class="text-button" data-action="remove-photo">Bỏ ảnh</button>`;form.querySelector('#form-error').textContent='';}catch{if(form.isConnected)showFormError(form.querySelector('#form-error'),'Chưa đọc được ảnh này. Hãy chọn ảnh khác hoặc ảnh nhỏ hơn.');}finally{URL.revokeObjectURL(url);if(request===photoRequest){photoBusy=false;if(form.isConnected)form.querySelector('#save-activity').disabled=false;}}
}
function profile() {
  showModal('Hồ sơ của bạn',`<div class="row"><div class="avatar">${esc(state.profile.name.slice(0,1).toUpperCase())}</div><div><strong>${esc(state.profile.name)}</strong><p class="tiny muted">Ngày sinh: ${esc(state.profile.birthday || 'Chưa nhập')}</p></div></div><p class="modal-copy">${esc(state.profile.goal)}. Đang dùng không đăng nhập, dữ liệu trên trình duyệt này.</p><div class="stack"><button class="button secondary full" data-action="plans">${icon('spark')} Gói Brain10</button><button class="button secondary full" data-action="edit-profile">Sửa thông tin cá nhân</button><button class="button secondary full" data-action="widgets">Xem widget Android mô phỏng</button><button class="button secondary full" data-action="login">Liên kết tài khoản</button><a class="button full" href="../#download">Khám phá bản Android</a><button class="text-button" data-action="reset">Xóa dữ liệu trải nghiệm</button></div><p class="field-hint">Brain10 web · cùng luồng sản phẩm Android 0.6.7. ${storageAvailable?'Đang lưu cục bộ.':'Trình duyệt chưa cho lưu lâu dài.'} Dữ liệu web và APK chưa đồng bộ.</p>`);
}
const actions = {
  limits:openLimits, close:()=>modal.close(), profile, plans:showPlans,
  'guest-start':startGuest, 'connect-account':el=>accountInfo(el.dataset.provider),
  'edit-profile':()=>{welcomeStep=0;state.ready=false;modal.close();switchPhone('app');},
  'stats-prev':()=>{statsStart=addDays(statsStart,-7);render();},
  'stats-next':()=>{if(statsStart<weekStart(dateKey())){statsStart=addDays(statsStart,7);render();}},
  'stats-today':()=>{statsStart=weekStart(dateKey());render();},
  'stats-day':el=>statsDay(el.dataset.day),
  'select-circle':el=>{selectedCircle=Number(el.dataset.index);render();},
  'remove-photo':()=>{photoRequest++;photoBusy=false;document.getElementById('save-activity').disabled=false;activityPhoto=null;document.getElementById('activity-photo').value='';document.getElementById('activity-photo-preview').innerHTML='';},
  'app-view':()=>switchPhone('app'), 'launcher-view':()=>switchPhone('launcher'),
  'widget-add':widgetAdd,
  'widget-open':()=>{if(widgetReady()){tab=state.focus?2:0;selectedDay=0;switchPhone('app');}},
  'widget-next':()=>{if(!widgetReady())return;const w=widgetState();if(w.next||w.overdue){tab=0;selectedDay=0;switchPhone('app');}else widgetAdd();},
  'widget-checkout':()=>{if(widgetReady()){const task=widgetState().current;if(task)checkout(task.id);}},
  'widget-focus':()=>{if(!widgetReady())return;const task=widgetState().current;tab=2;duration=30;switchPhone('app');if(!state.focus)startFocus(task?.id);},
  tab:el=>{tab=Number(el.dataset.tab); render(true);}, day:el=>{selectedDay=Number(el.dataset.day);render();},
  welcome:()=>{welcomeStep=0;state.ready=false;switchPhone('app');},
  'sample-profile':async()=>{if(!state.tasks.length && !state.plan.length)state.tasks=[{id:uid(),title:'Đọc 10 trang sách',duration:45,day:dateKey(),done:false,note:'Ghi lại 3 ý chính.'},{id:uid(),title:'Luyện nói tiếng Anh 15 phút',duration:15,day:dateKey(),done:false,note:''}];state.profile={name:'An',birthday:'',goal:'Học tập / Thi cử'};state.ready=true;const saved=await save();render(true);if(saved)toast('Bạn đang dùng hồ sơ và công việc mẫu.');},
  'add-task':addTask, checkout:el=>checkout(el.dataset.id), activity:activityEditor,
  'move-task-today':async el=>{
    const task=state.tasks.find(item=>item.id===el.dataset.id), today=dateKey();
    if (!task || task.done || !task.day || task.day>=today) return;
    task.day=today;
    const saved = await save();
    render();
    if (saved) toast('Đã dời công việc sang hôm nay.');
  },
  voice:voiceInput, 'start-speech':startSpeech, 'use-voice-text':()=>{const text=document.getElementById('voice-text').value.trim();speech?.abort();addTask();modal.querySelector('[name=title]').value=text;},
  photo:()=>document.getElementById('activity-photo')?.click(),
  login:()=>showModal('Liên kết tài khoản',`<p class="modal-copy">Chọn phương thức liên kết. Dịch vụ đăng nhập và đồng bộ sẽ mở sau.</p>${accountChoices()}`),
  widgets:()=>switchPhone('launcher'),
  ai:openAI, 'automatic-plan':openAutomaticPlan, 'device-ai':()=>openDeviceAI(),
  'screen-time':()=>unavailable('Screen time trên Android','Đọc thời gian sử dụng ứng dụng cần Usage Access trên Android. Website không yêu cầu quyền này và không thể lấy lịch sử sử dụng app của thiết bị.'),
  protection:()=>unavailable('Bảo vệ tập trung trên Android','APK xin Accessibility để phát hiện ứng dụng cần hạn chế, VPN cục bộ để chặn mạng trong phiên và thông báo nếu bạn cho phép. Bản web không có các quyền đó, không đọc nội dung tin nhắn. Chỉ thông tin lập lịch bạn chủ động gửi mới tới API.'),
  invite:()=>unavailable('Mời bạn đồng hành','Mời thành viên, chia sẻ thực và đồng bộ nhóm chưa được triển khai. Tên bạn đồng hành và cam kết hiện lưu trong trình duyệt này, chưa đồng bộ sang thiết bị khác.'),
  'add-fixed':()=>fixedEditor(), 'edit-fixed':el=>fixedEditor(el.dataset.id),
  'delete-fixed':async el=>{state.commitments=state.commitments.filter(c=>c.id!==el.dataset.id);const saved=await save();render();if(saved)toast('Đã bỏ lịch cố định.');},
  'delete-plan':async el=>{state.plan=state.plan.filter(p=>p.id!==el.dataset.id);await save();modal.close();render();},
  'sample-plan':samplePlan,
  'schedule-list':()=>{scheduleView='list';render();},
  'schedule-calendar':()=>{scheduleView='calendar';render();},
  'calendar-prev':()=>{calendarStart=addDays(calendarStart,-7);changeCalendar();},
  'calendar-next':()=>{calendarStart=addDays(calendarStart,7);changeCalendar();},
  'calendar-today':()=>{calendarStart=weekStart(vietnamDay(Date.now()));changeCalendar();},
  'calendar-expand':expandCalendar,
  'session-detail':el=>openSession(el.dataset.id,el.dataset.day,el.dataset.fixed==='true'),
  'ai-example':()=>{const field=document.querySelector('#ai-form [name="request"]');if(field)field.value='Tôi muốn học 20 câu tiếng Anh để hỏi đường và gọi món khi đi du lịch.';},
  'cancel-ai':()=>{aiController?.abort();},
  'study-preferences':editStudyPreferences,
  'edit-ai':()=>{
    const deviceInput=aiDraft?.deviceInput;
    aiDraft=null;
    if(deviceInput)openDeviceAI(deviceInput);else openAI();
  },
  'remove-ai-session':el=>{aiSessions=aiSessions.filter(p=>p.id!==el.dataset.id);renderAIDraft();},
  'accept-ai':async()=>{
    const invalid=validateAcceptance(aiSessions,state);if(invalid){toast(invalid);return;}
    state.plan.push(...aiSessions);aiSessions=[];aiDraft=null;
    const saved=await save();modal.close();tab=1;switchPhone('app');if(saved)toast('Đã thêm lịch ôn.');
  },
  'confirm-plan':async()=>{state.plan.push(...preview);preview=[];const saved=await save();modal.close();render();if(saved)toast('Đã thêm các phiên mẫu vào lịch.');},
  'dismiss-wellbeing':hideWellbeing,
  'test-reminder-sound':async()=>{await prepareReminderAudio();toast(reminderSound()?'Đã phát âm báo mẫu. Kiểm tra âm lượng thiết bị.':'Trình duyệt chưa cho phát tiếng. Kiểm tra quyền âm thanh của trang.');},
  duration:el=>{duration=Number(el.dataset.minutes);render();}, 'start-focus':startFocus,
  'confirm-focus':el=>{state.focusNotice=true;modal.close();startFocus(el.dataset.taskId || null);},
  'stop-focus':()=>showModal('Kết thúc phiên?',`<p class="modal-copy">Bản web sẽ ghi nhận thời gian bạn đã tập trung thực tế. Công việc của bạn chưa được đánh dấu hoàn thành.</p><button class="button full" data-action="confirm-stop">Ghi nhận và kết thúc</button><button class="text-button" data-action="close" style="width:100%;margin-top:10px">Tiếp tục tập trung</button>`),
  'confirm-stop':()=>{modal.close();finishFocus(true);},
  suggest:el=>{const field=modal.querySelector('textarea');field.value=(field.value?field.value+'; ':'')+el.dataset.text;field.value=field.value.slice(0,160);document.getElementById('char-count').textContent=field.value.length;},
  'skip-reflection':()=>completeTask(document.getElementById('checkout-form'),true),
  'create-circle':()=>showModal('Tạo vòng tròn',`<form id="circle-form"><label class="field">Tên vòng tròn<input name="name" placeholder="Ví dụ, Cùng đọc mỗi ngày" maxlength="70" required></label><label class="field">Cam kết chung<input name="goal" placeholder="Ví dụ, đọc 10 trang mỗi ngày" maxlength="160" required></label><label class="field">Tên bạn đồng hành (tùy chọn)<textarea name="members" placeholder="Mỗi dòng một người, tối đa 10 tên" maxlength="600"></textarea></label><p class="field-hint" style="margin-bottom:13px">Tên bạn đồng hành lưu cùng nhóm trên thiết bị này. Chưa gửi lời mời trực tuyến.</p><button class="button full">Tạo vòng tròn</button></form>`),
  checkin:()=>markCheckin(false),
  rest:()=>markCheckin(true),
  reset:()=>showModal('Bắt đầu lại bản thử?',`<p class="modal-copy">Xóa hồ sơ, công việc, lịch và nhóm trải nghiệm trên trình duyệt này. Dữ liệu trong APK không bị ảnh hưởng.</p><button class="button danger full" data-action="confirm-reset">Xóa dữ liệu và bắt đầu lại</button>`),
  'confirm-reset':async()=>{hideWellbeing();state={...fresh(),generation:uid()};tab=0;selectedDay=0;selectedCircle=0;welcomeStep=0;statsStart=weekStart(dateKey());preview=[];duration=30;await save();switchPhone('app');}
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
document.addEventListener('change',async event=>{
  if(event.target.id==='activity-photo')await attachActivityPhoto(event.target.files[0]);
  if(event.target.id==='wellbeing-enabled'){
    const control=event.target;
    state.wellbeingReminders=control.checked;
    control.disabled=true;
    if(state.wellbeingReminders)prepareReminderAudio();else hideWellbeing();
    await save();
    control.disabled=false;
  }
  if(event.target.hasAttribute('data-calendar-span')){calendarSpan=Number(event.target.value);changeCalendar();}
  if(event.target.name==='audience'){document.getElementById('audience-note').hidden=event.target.value==='private';document.getElementById('recipient-choices').hidden=event.target.value!=='selected';}
});
document.addEventListener('submit',async event=>{
  const form=event.target,formId=form.getAttribute('id');if(!formId?.endsWith('-form'))return;event.preventDefault();
  const data=new FormData(form), title=String(data.get('title') || '').trim();
  const error=message=>showFormError(document.getElementById('form-error'),message);
  switch(formId){
    case 'ai-form':generateAI(data);break;
    case 'device-ai-form':generateDeviceAI(data);break;
    case 'automatic-plan-form':{
      if(!title){error('Nhập nội dung cần ôn.');break;}
      try{
        const draft=makeAutomaticDraft(state,title,data.get('examDate'));
        aiSessions=convertDraft(draft);aiDraft=draft;
        renderAIDraft();
      }catch(failure){error(failure.message);}
      break;
    }
    case 'study-form':{
      const start=minuteValue(String(data.get('start'))),end=minuteValue(String(data.get('end'))),session=Number(data.get('session')),daily=Number(data.get('daily'));
      if(start>=end || end-start<session || daily<session || daily>480){error('Khung giờ và quỹ học cần đủ cho ít nhất một phiên, tối đa 480 phút/ngày.');return;}
      state.studyPreferences={startMinute:start,endMinute:end,sessionMinutes:session,dailyMinutes:daily};
      const saved=await save();modal.close();render();if(saved)toast('Đã lưu nhịp học.');break;
    }
    case 'welcome-form': {
      const name=String(data.get('name')).trim(), birthday=String(data.get('birthday'));
      if(!name || birthday>dateKey())return;
      state.profile={...state.profile,name,birthday,goal:String(data.get('goal'))};welcomeStep=1;await save();render(true);break;
    }
    case 'task-form': {
      if(!title)return;
      state.tasks.push({id:uid(),title,duration:Number(data.get('duration')),day:dateKey(dateOffset(Number(data.get('day')))),done:false,note:String(data.get('note')).trim()});
      form.querySelector('button[type="submit"], button:not([type])').disabled=true;
      const saved=await save();modal.close();render();if(saved)toast('Đã thêm việc vào nhịp ngày.');break;
    }
    case 'checkout-form':completeTask(form);break;
    case 'fixed-form': {
      const days=data.getAll('weekdays').map(Number),start=minuteValue(String(data.get('start'))),end=minuteValue(String(data.get('end'))),id=String(data.get('id')) || uid();
      if(!title || !days.length || start>=end){error('Nhập tên lịch, chọn ít nhất một ngày và giờ kết thúc sau giờ bắt đầu.');return;}
      const conflict=state.commitments.some(c=>c.id!==id && c.weekdays.some(d=>days.includes(d)) && start<c.end && end>c.start);
      const plannedConflict=state.plan.some(p=>days.includes(weekdayIndex(new Date(p.day+'T12:00:00'))) && start<p.start+p.duration && end>p.start);
      if(conflict || plannedConflict){error('Khung giờ trùng với lịch đã có. Hãy đổi giờ hoặc bỏ phiên học xung đột trước.');return;}
      state.commitments=state.commitments.filter(c=>c.id!==id);state.commitments.push({id,title,weekdays:days,start,end});
      const saved=await save();modal.close();render();if(saved)toast('Đã lưu lịch cố định.');break;
    }
    case 'activity-form': {
      const start=new Date(String(data.get('start'))),end=new Date(String(data.get('end'))),now=Date.now();
      if(!title || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start>=end || end.getTime()>now || start.getTime()<now-24*60*60000){error('Toàn bộ hoạt động cần nằm trong 24 giờ vừa qua; giờ kết thúc phải sau giờ bắt đầu.');return;}
      if(photoBusy){error('Chờ ảnh xử lý xong rồi lưu nhé.');return;}
      const activity={id:uid(),title,start:start.toISOString(),end:end.toISOString(),duration:Math.round((end-start)/60000),...(activityPhoto?{photo:activityPhoto}:{})};
      state.activities.push(activity);const saved=await save();if(!saved){state.activities=state.activities.filter(item=>item.id!==activity.id);error('Chưa lưu được hoạt động. Trình duyệt có thể đã hết dung lượng; thử bỏ ảnh hoặc giải phóng bộ nhớ.');return;}modal.close();render();toast('Đã ghi nhận hoạt động, chỉ mình bạn xem.');break;
    }
    case 'circle-form': {
      const name=String(data.get('name')).trim(),goal=String(data.get('goal')).trim();if(!name || !goal)return;
      state.circles.push({id:uid(),name,goal,members:String(data.get('members')).split('\n').map(s=>s.trim().slice(0,60)).filter(Boolean).slice(0,10).map(name=>({id:uid(),name}))});selectedCircle=state.circles.length-1;await save();modal.close();render();break;
    }
  }
});
modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom)modal.close();});
setInterval(()=>{
  const today=dateKey();
  if (today!==displayedDay) {
    displayedDay=today;
    if (state.ready && phoneView==='app' && tab===0) render();
  }
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
