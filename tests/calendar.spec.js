import {test,expect} from '@playwright/test';
import {calendarFixture} from './fixtures/calendar.mjs';
async function enter(page){
  await page.clock.install({time:new Date('2026-10-24T10:00:00+07:00')});
  await page.addInitScript(value=>localStorage.setItem('brain10.web-demo.v1',JSON.stringify(value)),calendarFixture);
  await page.goto('/try/');await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
}
test('list badges count down, switch at time boundaries and retain expanded study content',async({page})=>{
  await enter(page);
  await expect(page.locator('[data-session-id=soon]')).toContainText('Còn 30 phút');
  await expect(page.locator('[data-session-id=over]')).toContainText('Quá hạn');
  await expect(page.locator('[data-session-id=over]')).toContainText('Chưa check-out');
  await expect(page.locator('[data-session-id=done] .session-status')).not.toContainText('Chưa check-out');
  await page.locator('[data-session-id=soon] summary').click();
  await page.clock.fastForward(31*60000);
  await expect(page.locator('[data-session-id=soon]')).toContainText('Đang diễn ra');
  await expect(page.locator('[data-session-id=live]')).toContainText('Quá hạn');
  await expect(page.locator('[data-session-id=soon] details')).toHaveAttribute('open','');
});
test('seven-day three-period board preserves multiple activities and opens details/check-out',async({page})=>{
  await enter(page);await page.getByRole('button',{name:'Bảng lịch',exact:true}).click();
  await expect(page.locator('.week-table thead th')).toHaveCount(8);
  await expect(page.locator('.week-table tbody tr')).toHaveCount(3);
  await expect(page.locator('[data-cell="2026-10-19:0"] .calendar-event')).toHaveCount(3);
  await expect(page.locator('.unplaced-tasks')).toContainText('Đọc ghi chú chưa đặt giờ');
  await page.locator('.calendar-event[data-id=soon]').click();
  await expect(page.getByRole('dialog')).toContainText('Hiểu nguyên tắc JOIN');
  await expect(page.getByRole('dialog')).toContainText('Giải ba câu truy vấn');
  await expect(page.getByRole('dialog')).toContainText('Ba truy vấn đã tự kiểm tra');
  await page.getByRole('button',{name:'Check-out công việc',exact:true}).click();
  await page.getByRole('button',{name:'Bỏ qua phần nhìn lại',exact:true}).click();
  await expect(page.locator('.calendar-event[data-id=soon]')).toHaveAttribute('data-state','done');
  await page.getByRole('button',{name:'Đầu việc',exact:true}).click();
  await expect(page.locator('[data-session-id=soon]')).toContainText('Đã hoàn thành');
});
test('multiweek navigation, fixed-block details, expanded board and compact phone layout',async({page})=>{
  await enter(page);await page.getByRole('button',{name:'Bảng lịch',exact:true}).click();
  await page.getByRole('combobox',{name:'Số tuần hiển thị'}).selectOption('4');
  await expect(page.locator('.week-table')).toHaveCount(4);
  await expect(page.locator('.calendar-event[data-id=long-goal]')).toHaveCount(1);
  await page.getByRole('button',{name:'Tuần sau',exact:true}).click();
  await expect(page.locator('.week-table').first()).toContainText('26/10');
  await page.getByRole('button',{name:'Về tuần này',exact:true}).click();
  await page.locator('.calendar-event[data-fixed=true]').first().click();
  await expect(page.getByRole('dialog')).toContainText('không phải một đầu việc cần check-out');
  await page.getByRole('button',{name:'Đóng chi tiết',exact:true}).click();
  for(const [width,height] of [[390,844],[320,640]]){
    await page.setViewportSize({width,height});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    const table=await page.locator('.week-table').first().boundingBox();
    expect(table.width).toBeLessThanOrEqual(width);
  }
  await page.getByRole('button',{name:'Xem rộng',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveClass('calendar-expanded');
  await expect(page.getByRole('dialog').locator('.week-table')).toHaveCount(4);
});
