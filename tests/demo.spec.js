import {test,expect} from '@playwright/test';

async function enter(page){
  await page.goto('/try/');
  await page.getByRole('button',{name:'Dùng hồ sơ mẫu An',exact:true}).click();
}
async function fixed(page,start='07:00',end='12:00'){
  await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await page.getByRole('button',{name:'Thêm lịch cố định',exact:true}).click();
  await page.getByLabel('Tên lịch',{exact:true}).fill('Đi học');
  await page.getByLabel('Bắt đầu',{exact:true}).fill(start);
  await page.getByLabel('Kết thúc',{exact:true}).fill(end);
  await page.getByRole('button',{name:'Lưu lịch cố định',exact:true}).click();
}

test('two tabs keep independent tasks even when one tab submits from stale storage',async({context,page})=>{
  await enter(page);
  const second=await context.newPage();
  await second.addInitScript(()=>window.addEventListener('storage',event=>event.stopImmediatePropagation(),true));
  await second.goto('/try/');
  for(const [tab,title] of [[page,'Nộp báo cáo A'],[second,'Nộp báo cáo B']]){
    await tab.getByRole('button',{name:'Thêm',exact:true}).click();
    await tab.getByLabel('Bạn muốn làm gì?',{exact:true}).fill(title);
  }
  await page.getByRole('button',{name:'Thêm vào danh sách',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).tasks.some(t=>t.title==='Nộp báo cáo A'))).toBe(true);
  await second.getByRole('button',{name:'Thêm vào danh sách',exact:true}).click();
  for(const tab of [page,second]){
    await expect(tab.getByRole('heading',{name:'Nộp báo cáo A'})).toBeVisible();
    await expect(tab.getByRole('heading',{name:'Nộp báo cáo B'})).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole('heading',{name:'Nộp báo cáo A'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Nộp báo cáo B'})).toBeVisible();
});

test('after midnight unfinished tasks remain visible and can be moved to today',async({page})=>{
  await page.clock.install({time:new Date('2026-11-16T23:58:00+07:00')});
  await enter(page);
  const task=page.getByRole('heading',{name:'Luyện nói tiếng Anh 15 phút'});
  await expect(task).toBeVisible();
  await page.clock.fastForward(3*60*1000);
  const overdue=page.getByRole('region',{name:'Chưa xong từ trước (2)'});
  await expect(overdue.getByRole('heading',{name:'Luyện nói tiếng Anh 15 phút'})).toBeVisible();
  await overdue.locator('.task-row').filter({has:task}).getByRole('button',{name:'Dời sang hôm nay'}).click();
  await expect(page.getByRole('region',{name:'Chưa xong từ trước (1)'}).getByText('Luyện nói tiếng Anh 15 phút')).toHaveCount(0);
  await expect(task).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region',{name:'Chưa xong từ trước (1)'})).toBeVisible();
  await expect(task).toBeVisible();
});

test('landing is preserved and links to the isolated demo; responsive layout',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Ít lướt vô thức');
  await expect(page.locator('#download')).toBeAttached();
  await page.locator('.hero-actions').getByRole('link',{name:'Trải nghiệm thử'}).click();
  await expect(page).toHaveURL(/\/try\/$/);
  await expect(page.getByRole('heading',{name:/Bắt đầu từ bạn/})).toBeVisible();
  await page.getByRole('button',{name:'Dùng hồ sơ mẫu An',exact:true}).click();
  for(const [width,height] of [[1440,1000],[390,844],[320,640],[844,390]]){
    await page.setViewportSize({width,height});
    await expect(page.getByRole('button',{name:'Nhóm',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    expect(await page.locator('.app-nav').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1)).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test('tasks persist, escaped text stays text, checkout drives the real demo chart',async({page})=>{
  await enter(page);
  await page.getByRole('button',{name:'Thêm',exact:true}).click();
  await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('<img src=x onerror=alert(1)> Ôn DBMS');
  await page.getByRole('button',{name:'Thêm vào danh sách',exact:true}).click();
  await expect(page.locator('.task-row')).toHaveCount(3);
  await expect(page.locator('.task-row img')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.task-row')).toHaveCount(3);
  await page.locator('.task-row').last().getByRole('button',{name:'Check-out',exact:true}).click();
  await page.getByRole('button',{name:'+ Ghi lại ý chính',exact:true}).click();
  await page.getByRole('button',{name:'Đánh dấu hoàn thành',exact:true}).click();
  await expect(page.getByText('1 / 3 việc đã hoàn thành',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Thống kê',exact:true}).click();
  await expect(page.locator('.stat-value')).toContainText('1 việc hoàn thành');
  await expect(page.getByRole('link',{name:'Mở trang tải Android',exact:true})).toHaveAttribute('href','../#download');
  await expect(page.getByText('Trình duyệt chỉ xem được dữ liệu Brain10 bạn lưu tại đây.',{exact:false})).toBeVisible();
});

test('fixed schedules gate sample planning, prevent overlaps and persist confirmation without AI',async({page,baseURL})=>{
  const external=[];page.on('request',r=>{if(new URL(r.url()).origin!==new URL(baseURL).origin)external.push(r.url());});
  await enter(page);
  await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await page.getByText('Thử lịch mẫu',{exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem kế hoạch học mẫu',exact:true})).toBeDisabled();
  await fixed(page);
  await page.getByText('Thử lịch mẫu',{exact:true}).click();
  await page.getByRole('button',{name:'Xem kế hoạch học mẫu',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('KHÔNG DÙNG AI');
  await page.getByRole('button',{name:'Xác nhận thêm vào lịch',exact:true}).click();
  await expect(page.getByText('Đã thêm các phiên mẫu vào lịch.',{exact:true})).toBeVisible();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')));
  expect(state.plan).toHaveLength(6);
  for(const p of state.plan){
    const week=(new Date(p.day+'T12:00:00').getDay()+6)%7+1;
    for(const c of state.commitments){if(c.weekdays.includes(week))expect(p.start>=c.end || p.start+p.duration<=c.start).toBeTruthy();}
  }
  await page.getByRole('button',{name:'Thêm lịch cố định',exact:true}).click();
  await page.getByLabel('Tên lịch',{exact:true}).fill('Trùng giờ');
  await page.getByRole('button',{name:'Lưu lịch cố định',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('trùng');
  await page.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await expect(page.locator('#screen .session')).toHaveCount(6);
  expect(external).toEqual([]);
});

test('focus is explicitly a timer, uses wall time across navigation/reload, records elapsed time',async({page})=>{
  await enter(page);
  await page.getByRole('button',{name:'Tập trung',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu phiên',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('khóa ứng dụng');
  await page.getByRole('button',{name:'Thử bộ đếm 30 phút',exact:true}).click();
  await expect(page.getByRole('button',{name:'Kết thúc phiên',exact:true})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Tập trung',exact:true}).click();
  await expect(page.getByRole('button',{name:'Kết thúc phiên',exact:true})).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(65000);
  await expect(page.getByRole('timer')).toContainText('28:');
  await page.getByRole('button',{name:'Kết thúc phiên',exact:true}).click();
  await page.getByRole('button',{name:'Ghi nhận và kết thúc',exact:true}).click();
  await expect(page.getByText('1 phút đã ghi nhận từ các phiên trong bản web.',{exact:true})).toBeVisible();
});

test('local group, check-in, unsupported invitation and data reset',async({page})=>{
  await enter(page);
  await page.getByRole('button',{name:'Nhóm',exact:true}).click();
  await page.getByRole('button',{name:'Tạo vòng tròn đầu tiên',exact:true}).click();
  await page.getByLabel('Tên vòng tròn',{exact:true}).fill('Cùng nhau qua môn');
  await page.getByLabel('Cam kết chung',{exact:true}).fill('Mỗi ngày một phiên học');
  await page.getByLabel('Tên bạn đồng hành (tùy chọn)',{exact:true}).fill('Bình\nChi');
  await page.getByRole('button',{name:'Tạo vòng tròn',exact:true}).click();
  await page.getByRole('button',{name:'Tôi đã giữ cam kết',exact:true}).click();
  await expect(page.getByRole('button',{name:'Đã giữ cam kết hôm nay',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Mời bạn đồng hành',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('hiện chưa có trên bản trải nghiệm thử');
  await page.getByRole('button',{name:'Đã hiểu',exact:true}).click();
  await page.getByRole('button',{name:'Hồ sơ và widget',exact:true}).click();
  await page.getByRole('button',{name:'Xóa dữ liệu trải nghiệm',exact:true}).click();
  await page.getByRole('button',{name:'Xóa dữ liệu và bắt đầu lại',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Bắt đầu từ bạn/})).toBeVisible();
});

test('activity validates rolling 24h and keeps the chosen photo and text',async({page})=>{
  await enter(page);
  await page.getByRole('button',{name:'Ghi hoạt động',exact:true}).click();
  await page.getByLabel('Bạn vừa làm gì?',{exact:true}).fill('Chạy bộ');
  await page.locator('#activity-photo').setInputFiles({name:'proof.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFZkAAAAASUVORK5CYII=','base64')});
  await expect(page.getByLabel('Bạn vừa làm gì?',{exact:true})).toHaveValue('Chạy bộ');
  await expect(page.getByAltText('Ảnh minh chứng đã chọn')).toBeVisible();
  const start=page.getByLabel('Bắt đầu',{exact:true}),original=await start.inputValue();
  await start.fill('2020-01-01T07:00');
  await page.getByRole('button',{name:'Lưu hoạt động',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('24 giờ');
  await start.fill(original);
  await page.getByRole('button',{name:'Lưu hoạt động',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Chạy bộ',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).activities.at(-1).photo)).toMatch(/^data:image\/jpeg;base64,/);
});
