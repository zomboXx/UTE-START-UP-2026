import {test,expect} from '@playwright/test';

test('AI flow requires fixed schedules, sends only planning context, previews before persisting',async({page})=>{
  let payload;
  await page.route('**/api/plans',async route=>{
    payload=route.request().postDataJSON();
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    const day=tomorrow.toISOString().slice(0,10),exam=new Date(tomorrow);exam.setDate(exam.getDate()+2);
    await route.fulfill({json:{schemaVersion:1,status:'draft',model:'gpt-5.4-mini',summary:'Ôn tập DBMS theo lịch riêng',questions:[],assumptions:['Dựa trên đề cương bạn nhập'],sessions:[{title:'Luyện INNER JOIN',subject:'DBMS',start:`${day}T18:00:00+07:00`,end:`${day}T18:45:00+07:00`,examDate:exam.toISOString().slice(0,10),objectives:['Viết JOIN đúng'],steps:['Ôn ví dụ','Giải 3 câu'],expectedOutput:'Ba truy vấn đúng'}]}});
  });
  await page.goto('/try/');await page.getByText('Dùng hồ sơ mẫu An',{exact:true}).click();
  await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await page.getByRole('button',{name:'Lên kế hoạch cùng AI ↗',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Lưu lịch đi học');
  expect(payload).toBeUndefined();
  await page.getByRole('dialog').getByRole('button',{name:'Thêm lịch cố định',exact:true}).click();
  await page.getByLabel('Tên lịch',{exact:true}).fill('Đi học');
  await page.getByRole('button',{name:'Lưu lịch cố định',exact:true}).click();
  await page.getByRole('button',{name:'Lên kế hoạch cùng AI ↗',exact:true}).click();
  await page.getByLabel('Mã thử AI của nhóm',{exact:true}).fill('test-code-not-a-provider-key');
  await page.getByLabel('Bạn muốn đạt điều gì?',{exact:true}).fill('DBMS sau 3 ngày');
  await page.getByLabel('Đề cương, phần còn yếu, cách học yêu thích',{exact:true}).fill('INNER JOIN, LEFT JOIN');
  await page.getByRole('button',{name:'Tạo kế hoạch để xem trước',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Luyện INNER JOIN');
  expect(payload.learningContext).toBe('INNER JOIN, LEFT JOIN');expect(payload.profile).toBeUndefined();expect(payload.birthday).toBeUndefined();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).plan.length)).toBe(0);
  await page.getByRole('button',{name:'Xác nhận thêm vào lịch',exact:true}).click();
  await expect(page.locator('#screen .session')).toContainText('Luyện INNER JOIN');
  await expect(page.locator('#screen .session')).toContainText('Lịch AI');
  await page.reload();await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await expect(page.locator('#screen .session')).toContainText('Luyện INNER JOIN');
});
