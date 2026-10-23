import {test,expect} from '@playwright/test';
async function enter(page){
  await page.clock.install({time:new Date('2026-10-24T10:00:00+07:00')});
  await page.addInitScript(()=>{
    window.chimes=0;
    window.AudioContext=class {
      state='running';currentTime=0;destination={};resume(){return Promise.resolve();}
      createOscillator(){return {frequency:{value:0},connect(){},start(){window.chimes++;},stop(){}};}
      createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
    };
  });
  await page.goto('/try/');await page.getByRole('button',{name:'Dùng hồ sơ mẫu An',exact:true}).click();
  await page.getByRole('button',{name:'Tập trung',exact:true}).click();
  await page.locator('#focus-duration').fill('120');
  await page.getByRole('button',{name:'Bắt đầu phiên',exact:true}).click();
  await page.getByRole('button',{name:'Thử bộ đếm 120 phút',exact:true}).click();
}
test('40/80 minute banners and one chime per interval persist across tab changes and reload',async({page})=>{
  await enter(page);
  await page.clock.fastForward(40*60000-1000);
  await expect(page.locator('#wellbeing-alert')).toBeHidden();
  await page.clock.fastForward(1000);
  await expect(page.locator('#wellbeing-alert')).toContainText('Đã tập trung 40 phút');
  await expect(page.locator('#wellbeing-alert')).toContainText('Uống một ít nước');
  expect(await page.evaluate(()=>window.chimes)).toBe(2);
  await page.getByRole('button',{name:'Đã nhớ · cảm ơn',exact:true}).click();
  await page.clock.fastForward(60000);
  expect(await page.evaluate(()=>window.chimes)).toBe(2);
  await page.reload();await page.clock.fastForward(1000);
  await expect(page.locator('#wellbeing-alert')).toBeHidden();
  await page.clock.fastForward(39*60000);
  await expect(page.locator('#wellbeing-alert')).toContainText('Đã tập trung 80 phút');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).focus.reminderBoundary)).toBe(2);
  await page.clock.fastForward(40*60000);
  await expect(page.locator('#wellbeing-alert')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).focus)).toBeNull();
});
test('disabling reminders persists and ending early clears an already shown banner',async({page})=>{
  await enter(page);
  await page.getByLabel('Nhắc nghỉ nhẹ và uống nước',{exact:true}).uncheck();
  await page.reload();await page.getByRole('button',{name:'Tập trung',exact:true}).click();
  await expect(page.getByLabel('Nhắc nghỉ nhẹ và uống nước',{exact:true})).not.toBeChecked();
  await page.clock.fastForward(41*60000);
  await expect(page.locator('#wellbeing-alert')).toBeHidden();
  await page.getByLabel('Nhắc nghỉ nhẹ và uống nước',{exact:true}).check();
  await page.clock.fastForward(1000);
  await expect(page.locator('#wellbeing-alert')).toBeVisible();
  await page.getByRole('button',{name:'Đã nhớ · cảm ơn',exact:true}).click();
  await page.getByRole('button',{name:'Kết thúc phiên',exact:true}).click();
  await page.getByRole('button',{name:'Ghi nhận và kết thúc',exact:true}).click();
  await page.clock.fastForward(40*60000);
  await expect(page.locator('#wellbeing-alert')).toBeHidden();
});
test('blocked audio is disclosed, late wakeups coalesce and the banner fits a small phone',async({page})=>{
  await enter(page);
  await page.evaluate(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  await page.reload();
  await page.evaluate(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  await page.clock.fastForward(85*60000);
  await expect(page.locator('#wellbeing-alert')).toContainText('Đã tập trung 80 phút');
  await expect(page.locator('#wellbeing-alert')).toContainText('Âm thanh chưa sẵn sàng');
  await page.setViewportSize({width:320,height:640});
  const banner=await page.locator('#wellbeing-alert').boundingBox();
  expect(banner.x).toBeGreaterThanOrEqual(0);expect(banner.x+banner.width).toBeLessThanOrEqual(320);
  await page.locator('#wellbeing-alert').getByRole('button',{name:'Thử âm báo',exact:true}).click();
  await expect(page.getByRole('status').last()).toContainText('Trình duyệt chưa cho phát tiếng');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).focus.reminderBoundary)).toBe(2);
});
