import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const base=process.env.BRAIN10_TEST_URL || 'http://127.0.0.1:4197';
page.on('response',response=>{if(response.url().startsWith(base) && response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
await mkdir('screenshots',{recursive:true});
async function capture(name){await page.screenshot({path:`screenshots/parity-${name}.png`,fullPage:true,animations:'disabled'});}
try{
  await page.clock.setFixedTime(new Date('2026-11-18T12:00:00+07:00'));
  await page.goto(`${base}/try/`);await capture('welcome-390');
  await page.getByLabel('Họ và tên',{exact:true}).fill('An');await page.getByLabel('Ngày sinh',{exact:true}).fill('2003-01-01');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Google',exact:true}).waitFor();await capture('accounts-390');
  await page.getByRole('button',{name:'Dùng không đăng nhập',exact:true}).click();await page.locator('#app-nav').waitFor({state:'visible'});await capture('home-390');
  await page.getByRole('button',{name:'Tập trung',exact:true}).click();await capture('focus-390');
  await page.evaluate(()=>{const key='brain10.web-demo.v1',state=JSON.parse(localStorage.getItem(key));state.tasks=[{id:'read',title:'Đọc 10 trang sách',duration:20,day:'2026-11-16',done:true,completedAt:'2026-11-16T20:00:00+07:00',reflection:'Đã ghi lại 3 ý chính.'},{id:'speak',title:'Luyện nói tiếng Anh',duration:15,day:'2026-11-17',done:true,completedAt:'2026-11-17T19:00:00+07:00'}];state.sessions=[{id:'focus',day:'2026-11-17',seconds:1800,start:'2026-11-17T19:00:00+07:00',end:'2026-11-17T19:30:00+07:00'}];localStorage.setItem(key,JSON.stringify(state));});
  await page.reload();await page.getByRole('button',{name:'Thống kê',exact:true}).click();await capture('stats-390');
  await page.getByRole('button',{name:'Xem ngày 17/11: 1 việc',exact:true}).click();await capture('day-390');await page.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('button',{name:'Nhóm',exact:true}).click();await page.getByRole('button',{name:'Tạo nhóm',exact:true}).click();
  await page.getByLabel('Tên vòng tròn',{exact:true}).fill('Đọc cùng nhau');await page.getByLabel('Cam kết chung',{exact:true}).fill('Mỗi ngày 10 trang sách');await page.getByLabel('Tên bạn đồng hành (tùy chọn)',{exact:true}).fill('Bình\nChi');await page.getByRole('button',{name:'Tạo vòng tròn',exact:true}).click();await page.getByRole('button',{name:'Tôi đã giữ cam kết',exact:true}).click();await capture('groups-390');
  await page.getByRole('button',{name:'Hồ sơ và widget',exact:true}).click();await page.getByRole('button',{name:'Gói Brain10',exact:true}).click();await page.locator('[data-plan-catalog]').getByText(/39.000/).waitFor();await capture('plans-390');await page.getByRole('button',{name:'Đóng',exact:true}).click();
  for(const [width,height] of [[320,640],[1440,1000]]){await page.setViewportSize({width,height});await capture(`groups-${width}`);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Horizontal overflow at ${width}`);}
  await writeFile('screenshots/parity-qa.json',JSON.stringify({errors,viewports:[320,390,1440],data:'synthetic local QA records'},null,2));
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Visual captures complete; no page errors or horizontal overflow.');
}finally{await browser.close();}
