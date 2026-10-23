import {test,expect} from '@playwright/test';

async function enter(page){
  await page.goto('/try/');
  await page.getByRole('button',{name:'Dùng hồ sơ mẫu An',exact:true}).click();
  await page.getByRole('button',{name:'Màn hình chính Widgets',exact:true}).click();
}

test('launcher can be linked directly; widgets require setup and retain new brand artwork',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/try/?view=launcher');
  await expect(page.locator('#launcher')).toBeVisible();
  await expect(page.getByRole('region',{name:'Widget Ghi nhanh 2 x 2',exact:true})).toBeVisible();
  await expect(page.locator('.launcher-app-icon image').first()).toHaveAttribute('href','/assets/brand-source.png');
  await page.getByRole('button',{name:'Thêm việc bằng văn bản từ widget',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Bắt đầu nhé/})).toBeVisible();
  await page.getByRole('button',{name:'Dùng hồ sơ mẫu An',exact:true}).click();
  await page.getByRole('button',{name:'Màn hình chính Widgets',exact:true}).click();
  await expect(page.locator('#launcher')).toContainText('0 / 2 việc đã hoàn thành');
  await page.getByRole('button',{name:'Thêm việc bằng văn bản từ widget',exact:true}).click();
  await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('Ôn bài từ widget');
  await page.getByRole('button',{name:'Thêm vào danh sách',exact:true}).click();
  await expect(page.locator('#launcher')).toContainText('0 / 3 việc đã hoàn thành');
  await page.reload();
  await expect(page.locator('#launcher')).toBeVisible();
  await expect(page.locator('#launcher')).toContainText('0 / 3 việc đã hoàn thành');
  await page.getByRole('button',{name:'Mở ứng dụng brain10',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Ôn bài từ widget',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('widget focus shares a live timer and checkout ends the linked session exactly once',async({page})=>{
  await enter(page);
  await page.getByRole('button',{name:'Bắt đầu tập trung 30 phút từ widget',exact:true}).click();
  await page.getByRole('button',{name:'Thử bộ đếm 30 phút',exact:true}).click();
  await page.getByRole('button',{name:'Màn hình chính Widgets',exact:true}).click();
  await expect(page.locator('.widget-entry')).toContainText('ĐANG TẬP TRUNG');
  await expect(page.locator('.widget-entry')).toContainText('Đọc chương 4 · DBMS');
  await page.clock.install();await page.clock.fastForward(65000);
  await expect(page.locator('#widget-countdown')).toContainText('28:');
  await page.getByRole('button',{name:'Check-out công việc trên widget',exact:true}).click();
  await page.getByRole('button',{name:'Bỏ qua phần nhìn lại',exact:true}).click();
  await expect(page.locator('#launcher')).toContainText('1 / 2 việc đã hoàn thành');
  await expect(page.locator('.widget-entry')).toContainText('Ôn kiểm thử phần mềm');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')));
  expect(state.focus).toBeNull();expect(state.sessions).toHaveLength(1);
  expect(state.sessions[0].seconds).toBeGreaterThanOrEqual(65);
  await page.getByRole('button',{name:'Ứng dụng',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bắt đầu phiên',exact:true})).toBeVisible();
});

test('completed widgets suggest tomorrow; voice is disclosed; widgets fit small and desktop widths',async({page})=>{
  await enter(page);
  for(let i=0;i<2;i++){
    await page.getByRole('button',{name:'Check-out công việc trên widget',exact:true}).click();
    await page.getByRole('button',{name:'Bỏ qua phần nhìn lại',exact:true}).click();
  }
  await expect(page.locator('.widget-entry')).toContainText('Bạn đã hoàn thành hôm nay');
  await page.getByRole('button',{name:'Thêm việc bằng văn bản từ widget',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Ngày thực hiện',exact:true})).toHaveValue('1');
  await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('Việc ngày mai');
  await page.getByRole('button',{name:'Thêm vào danh sách',exact:true}).click();
  await page.getByRole('button',{name:'Thêm việc bằng giọng nói từ widget',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('hiện chưa có trên bản trải nghiệm thử');
  await page.getByRole('button',{name:'Đã hiểu',exact:true}).click();
  for(const [width,height] of [[1440,1000],[390,844],[320,640],[844,390]]){
    await page.setViewportSize({width,height});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    for(const selector of ['.widget-flow','.widget-quick']){
      const box=await page.locator(selector).boundingBox();
      const parent=await page.locator('#device').boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(parent.x);
      expect(box.x+box.width).toBeLessThanOrEqual(parent.x+parent.width);
    }
    await page.locator('.widget-quick').scrollIntoViewIfNeeded();
    await expect(page.getByRole('button',{name:'Thêm việc bằng văn bản từ widget',exact:true})).toBeInViewport();
  }
});
