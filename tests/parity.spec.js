import {test,expect} from '@playwright/test';
const enter=async page=>{await page.goto('/try/');await page.getByRole('button',{name:'Dùng hồ sơ mẫu An',exact:true}).click();await expect(page.locator('#app-nav').getByRole('button',{name:'Hôm nay',exact:true})).toBeVisible();};
test('personal onboarding matches Android, starts empty, and uses provider logos without misleading statuses',async({page})=>{
  await page.goto('/try/');
  await page.getByLabel('Họ và tên',{exact:true}).fill('Người mới');
  await page.getByLabel('Ngày sinh',{exact:true}).fill('2003-01-01');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Chọn cách bắt đầu.'})).toBeVisible();
  for(const name of ['Google','Facebook','Số điện thoại']){
    const button=page.getByRole('button',{name,exact:true});await expect(button.locator('svg')).toHaveCount(1);await expect(button).not.toContainText('chưa kết nối');
  }
  await page.getByRole('button',{name:'Dùng không đăng nhập',exact:true}).click();
  await expect(page.locator('#app-nav').getByRole('button',{name:'Hôm nay',exact:true})).toBeVisible();
  await expect(page.locator('.task-row')).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).tasks)).toEqual([]);
  await page.reload();await expect(page.getByRole('button',{name:'Nhóm',exact:true})).toBeVisible();
});
test('weekly statistics navigate historical weeks and drill into actual records',async({page})=>{
  await page.clock.install({time:new Date('2026-11-18T12:00:00+07:00')});
  await enter(page);
  await page.evaluate(()=>{const key='brain10.web-demo.v1',state=JSON.parse(localStorage.getItem(key));state.tasks.push({id:'past',title:'Đọc sách tuần trước',done:true,day:'2026-11-10',completedAt:'2026-11-10T08:00:00+07:00',reflection:'Đã đọc 10 trang'});localStorage.setItem(key,JSON.stringify(state));});
  await page.reload();await page.getByRole('button',{name:'Thống kê',exact:true}).click();
  await page.getByRole('button',{name:'Tuần thống kê trước',exact:true}).click();
  await expect(page.locator('.stat-value')).toContainText('1 việc hoàn thành');
  await page.getByRole('button',{name:'Xem ngày 10/11: 1 việc',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Đọc sách tuần trước');
  await page.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('button',{name:'Về tuần này',exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem ngày 19/11: 0 việc',exact:true})).toBeDisabled();
});
test('multiple circles keep separate daily check-ins and preserve streaks across reload',async({page})=>{
  await page.clock.install({time:new Date('2026-11-18T12:00:00+07:00')});await enter(page);
  await page.getByRole('button',{name:'Nhóm',exact:true}).click();
  for(const name of ['Đọc mỗi ngày','Tập luyện']){
    await page.getByRole('button',{name:'Tạo nhóm',exact:true}).click();
    await page.getByLabel('Tên vòng tròn',{exact:true}).fill(name);await page.getByLabel('Cam kết chung',{exact:true}).fill('Dành 15 phút mỗi ngày');
    await page.getByRole('button',{name:'Tạo vòng tròn',exact:true}).click();
  }
  await page.getByRole('button',{name:'Tôi đã giữ cam kết',exact:true}).click();
  await page.getByRole('button',{name:'Đọc mỗi ngày',exact:true}).click();await expect(page.getByRole('button',{name:'Tôi đã giữ cam kết',exact:true})).toBeEnabled();
  await page.reload();await page.getByRole('button',{name:'Nhóm',exact:true}).click();await page.getByRole('button',{name:'Tập luyện',exact:true}).click();
  await expect(page.getByRole('button',{name:'Đã giữ cam kết hôm nay',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Hôm nay tôi cần nghỉ',exact:true}).click();await expect(page.getByText('Hôm nay bạn chọn nghỉ.',{exact:true})).toBeVisible();
});
test('profile uses the same public VND catalog and discloses unavailable checkout',async({page})=>{
  await enter(page);await page.getByRole('button',{name:'Hồ sơ và widget',exact:true}).click();await page.getByRole('button',{name:'Gói Brain10',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('39.000 đ/tháng');await expect(page.getByRole('dialog')).toContainText('29.000 đ/ người dùng / tháng');
  await expect(page.getByRole('dialog')).toContainText('Đăng ký và thanh toán trong app sẽ mở sau.');
});
test('selected recipients require a choice and local group history follows that choice',async({page})=>{
  await enter(page);await page.getByRole('button',{name:'Nhóm',exact:true}).click();
  await page.getByRole('button',{name:'Tạo nhóm',exact:true}).click();
  await page.getByLabel('Tên vòng tròn',{exact:true}).fill('Cùng đọc');await page.getByLabel('Cam kết chung',{exact:true}).fill('10 trang mỗi ngày');
  await page.getByLabel('Tên bạn đồng hành (tùy chọn)',{exact:true}).fill('Bình');await page.getByRole('button',{name:'Tạo vòng tròn',exact:true}).click();
  await page.getByRole('button',{name:'Hôm nay',exact:true}).first().click();await page.getByRole('button',{name:'Check-out',exact:true}).first().click();
  await page.getByRole('combobox',{name:'Quyền xem',exact:true}).selectOption('selected');await page.getByRole('button',{name:'Đánh dấu hoàn thành',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Chọn ít nhất một người');
  await page.getByLabel('Bình',{exact:true}).check();await page.getByRole('button',{name:'Đánh dấu hoàn thành',exact:true}).click();
  await page.getByRole('button',{name:'Nhóm',exact:true}).click();await expect(page.getByRole('heading',{name:'Những bước tiến đã ghi',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).tasks[0].recipients.length)).toBe(1);
});
test('voice entry offers text input when the browser has no speech API',async({page})=>{
  await page.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
  await enter(page);await page.locator('#screen [data-action="voice"]').click();
  await expect(page.getByRole('dialog')).toContainText('Trình duyệt này chưa hỗ trợ nhận giọng nói');
  await page.getByLabel('Nội dung công việc',{exact:true}).fill('Đọc sách sau bữa tối');
  await page.getByRole('button',{name:'Tiếp tục thêm việc',exact:true}).click();
  await expect(page.getByLabel('Bạn muốn làm gì?',{exact:true})).toHaveValue('Đọc sách sau bữa tối');
  await page.getByRole('button',{name:'Thêm vào danh sách',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Đọc sách sau bữa tối',exact:true})).toBeVisible();
});
