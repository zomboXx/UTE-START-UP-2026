import {test,expect} from '@playwright/test';
const KEY='brain10.web-demo.v1';
const button=(page,name)=>page.getByRole('button',{name,exact:true});
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function start(page){await page.goto('/try/');await page.getByText('Dùng hồ sơ mẫu An',{exact:true}).click();await expect(page.locator('#screen .task-row')).toHaveCount(2);}

test('manual task edits, tomorrow move, completed metadata and delete undo survive reload',async({page})=>{
 await start(page);const first=(await state(page)).tasks[0];
 await button(page,'Tùy chọn việc '+first.title).click();await button(page,'Sửa công việc').click();
 await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('Đọc 20 trang sách');
 await page.getByLabel('Thời lượng (phút)',{exact:true}).fill('60');
 await page.getByRole('textbox',{name:'Ghi chú (tùy chọn)',exact:true}).fill('Ghi lại ba ý chính.');
 await button(page,'Lưu thay đổi').click();await expect(page.getByRole('dialog')).not.toBeVisible();
 await button(page,'Tùy chọn việc Đọc 20 trang sách').click();await button(page,'Dời sang ngày mai').click();await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.reload();await button(page,'Ngày mai').click();await expect(page.locator('.task-row')).toContainText('Đọc 20 trang sách');
 const moved=(await state(page)).tasks.find(t=>t.id===first.id);expect(moved.duration).toBe(60);expect(moved.note).toBe('Ghi lại ba ý chính.');
 await page.locator('.task-row').getByRole('button',{name:'Check-out',exact:true}).click();await button(page,'Đánh dấu hoàn thành').click();await expect(page.getByRole('dialog')).not.toBeVisible();
 const done=(await state(page)).tasks.find(t=>t.id===first.id);
 await button(page,'Tùy chọn việc Đọc 20 trang sách').click();await button(page,'Sửa công việc').click();
 await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('Đã đọc sách');await button(page,'Lưu thay đổi').click();await expect(page.getByRole('dialog')).not.toBeVisible();
 const edited=(await state(page)).tasks.find(t=>t.id===first.id);expect(edited.completedAt).toBe(done.completedAt);expect(edited.done).toBe(true);
 await button(page,'Tùy chọn việc Đã đọc sách').click();await button(page,'Xóa công việc').click();await button(page,'Xóa công việc').click();
 await expect(button(page,'Hoàn tác')).toBeVisible();await button(page,'Hoàn tác').click();await expect(page.locator('#toast')).toContainText('Đã khôi phục');
 await page.reload();expect((await state(page)).tasks.find(t=>t.id===first.id)).toEqual(edited);
});

test('history exposes all records, searches old notes, preserves timestamps and removes a saved photo',async({page})=>{
 await page.setViewportSize({width:320,height:700});await start(page);
 const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
 const historical={id:'old',title:'Đọc sách ở thư viện',note:'Ghi chú cũ',start:'2026-10-01T08:00:45.123Z',end:'2026-10-01T09:00:50.456Z',duration:60,photo,audience:'selected',recipients:['member'],custom:'keep'};
 await page.evaluate(({key,historical})=>{const s=JSON.parse(localStorage.getItem(key));s.activities=[historical,...[1,2].map(i=>({id:'recent-'+i,title:'Chạy bộ '+i,start:new Date(Date.now()-(i+1)*3600000).toISOString(),end:new Date(Date.now()-i*3600000).toISOString(),duration:60}))];localStorage.setItem(key,JSON.stringify(s));},{key:KEY,historical});
 await page.reload();await expect(page.locator('#screen .activity-record')).toHaveCount(2);
 await button(page,'Xem tất cả (3)').click();await expect(page.locator('#history-count')).toHaveText('3 / 3 hoạt động');
 await page.getByLabel('Tìm hoạt động',{exact:true}).fill('thu vien');await expect(page.locator('#history-list .activity-record')).toHaveCount(1);
 await page.locator('#history-list').getByRole('button',{name:'Sửa',exact:true}).click();
 await page.getByLabel('Bạn vừa làm gì?',{exact:true}).fill('Đọc và ghi chú');await page.getByRole('textbox',{name:'Ghi chú hoạt động (tùy chọn)',exact:true}).fill('Ghi chú mới');
 await button(page,'Bỏ ảnh').click();await button(page,'Lưu thay đổi').click();
 await expect(page.locator('#activity-history')).toBeVisible();await button(page,'Xem mọi ngày').click();
 await page.getByLabel('Tìm hoạt động',{exact:true}).fill('ghi chu moi');await expect(page.locator('#history-list .activity-record')).toHaveCount(1);
 const edited=(await state(page)).activities.find(a=>a.id==='old');expect(edited.start).toBe(historical.start);expect(edited.end).toBe(historical.end);expect(edited.photo).toBeNull();expect(edited.recipients).toEqual(['member']);expect(edited.custom).toBe('keep');
 await page.screenshot({path:'../../output/task-journal-preview-20261119/web-history.png'});
 await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();await button(page,'Thống kê').click();await page.getByRole('button',{name:'Xem tất cả hoạt động (3)',exact:true}).click();
 await page.getByLabel('Lọc theo ngày',{exact:true}).fill('2026-10-01');await expect(page.locator('#history-count')).toHaveText('1 / 3 hoạt động');
 await page.locator('#history-list').getByRole('button',{name:'Xóa',exact:true}).click();await button(page,'Xóa hoạt động').click();await expect(button(page,'Hoàn tác')).toBeVisible();
 await button(page,'Hoàn tác').click();await expect(page.locator('#toast')).toContainText('Đã khôi phục');await page.reload();expect((await state(page)).activities).toHaveLength(3);
});

test('failed edits keep original data and a record deleted in another tab is not recreated',async({page,context})=>{
 await start(page);const original=(await state(page)).tasks[0];
 await button(page,original.title).click();await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('Chưa lưu được');
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
 await button(page,'Lưu thay đổi').click();await expect(page.locator('#form-error')).toContainText('Nội dung cũ vẫn được giữ');
 expect((await state(page)).tasks.find(t=>t.id===original.id)).toEqual(original);
 await page.reload();await button(page,original.title).click();
 const other=await context.newPage();await other.goto('/try/');
 await other.evaluate(({key,id})=>{const s=JSON.parse(localStorage.getItem(key));s.tasks=s.tasks.filter(t=>t.id!==id);localStorage.setItem(key,JSON.stringify(s));},{key:KEY,id:original.id});
 await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('Không được hồi sinh');await button(page,'Lưu thay đổi').click();
 await expect(page.locator('#form-error')).toContainText('đã bị xóa');expect((await state(page)).tasks.some(t=>t.id===original.id)).toBe(false);
});

test('a task moved to another date can be found again and new tasks use that chosen date',async({page})=>{
 await page.setViewportSize({width:320,height:700});await start(page);
 const target=new Date(Date.now()+10*86400000).toISOString().slice(0,10);
 await button(page,'Đọc 10 trang sách').click();await page.getByLabel('Ngày thực hiện',{exact:true}).fill(target);
 await button(page,'Lưu thay đổi').click();await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.locator('#screen .task-row')).toContainText('Đọc 10 trang sách');
 await page.reload();await page.getByLabel('Chọn ngày công việc',{exact:true}).fill(target);
 await expect(page.locator('#screen .task-row')).toContainText('Đọc 10 trang sách');
 await button(page,'Thêm').click();await page.getByLabel('Bạn muốn làm gì?',{exact:true}).fill('Việc cho ngày đã chọn');
 await button(page,'Thêm vào danh sách').click();await expect(page.getByRole('dialog')).not.toBeVisible();
 expect((await state(page)).tasks.find(t=>t.title==='Việc cho ngày đã chọn').day).toBe(target);
});
