import {test,expect} from '@playwright/test';

test('AI errors move into view on a small phone and preserve the entered goal',async({page})=>{
  await page.setViewportSize({width:320,height:640});
  await page.route('**/api/plans',route=>route.fulfill({status:401,json:{error:'Dịch vụ AI đang bận. Vui lòng thử lại sau.'}}));
  await page.goto('/try/');
  await page.getByText('Dùng hồ sơ mẫu An',{exact:true}).click();
  await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await page.getByRole('button',{name:'Lên kế hoạch cùng AI ↗',exact:true}).click();
  const goal=page.getByLabel('Bạn muốn đạt điều gì?',{exact:true});
  await goal.fill('Học nhảy cho buổi văn nghệ ngày 20/11');
  await page.getByRole('button',{name:'Tạo kế hoạch để xem trước',exact:true}).click();
  await expect(page.locator('#ai-error')).toContainText('Dịch vụ AI đang bận');
  await expect(page.locator('#ai-error')).toBeInViewport();
  await expect(goal).toHaveValue('Học nhảy cho buổi văn nghệ ngày 20/11');
  await expect(page.locator('#ai-submit')).toBeEnabled();
});

test('AI flow allows no fixed schedule, sends only planning context, previews before persisting',async({page})=>{
  let payload;
  await page.route('**/api/plans',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{quota:{limit:5,used:0,remaining:5,period:'2026-11'}}});
    payload=route.request().postDataJSON();
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    const day=tomorrow.toISOString().slice(0,10),exam=new Date(tomorrow);exam.setDate(exam.getDate()+2);
    await route.fulfill({json:{schemaVersion:1,status:'draft',model:'gpt-5.4-mini',summary:'Ôn tập DBMS theo lịch riêng',questions:[],assumptions:['Dựa trên đề cương bạn nhập'],sessions:[{title:'Luyện INNER JOIN',subject:'DBMS',start:`${day}T18:00:00+07:00`,end:`${day}T18:45:00+07:00`,examDate:exam.toISOString().slice(0,10),objectives:['Viết JOIN đúng'],steps:['Ôn ví dụ','Giải 3 câu'],expectedOutput:'Ba truy vấn đúng'}]}});
  });
  await page.goto('/try/');await page.getByText('Dùng hồ sơ mẫu An',{exact:true}).click();
  await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await page.getByRole('button',{name:'Lên kế hoạch cùng AI ↗',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Bạn muốn đạt điều gì?');
  expect(payload).toBeUndefined();
  await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('button',{name:'Thêm lịch cố định',exact:true}).click();
  await page.getByLabel('Tên lịch',{exact:true}).fill('Đi học');
  await page.getByRole('button',{name:'Lưu lịch cố định',exact:true}).click();
  await page.getByRole('button',{name:'Lên kế hoạch cùng AI ↗',exact:true}).click();
  await page.getByLabel('Bạn muốn đạt điều gì?',{exact:true}).fill('DBMS sau 3 ngày');
  await page.getByLabel('Bạn đã biết gì, muốn tập thêm gì? (tùy chọn)',{exact:true}).fill('INNER JOIN, LEFT JOIN');
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

test('an AI gateway outage still lets the user schedule and save a free study slot',async({page})=>{
  const calls=[];
  await page.route('**/api/plans',async route=>{
    calls.push(route.request().method());
    await route.fulfill({status:502,json:{error:'Gateway AI chưa xử lý được yêu cầu (HTTP 503).'}});
  });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00+07:00'));
  await page.goto('/try/');
  const button=name=>page.getByRole('button',{name,exact:true});
  const field=name=>page.getByLabel(name,{exact:true});
  await page.getByText('Dùng hồ sơ mẫu An',{exact:true}).click();
  await button('Lịch trình').click();
  await button('Thêm lịch cố định').click();
  await field('Tên lịch').fill('Lớp buổi tối');
  await field('Bắt đầu').fill('18:00');
  await field('Kết thúc').fill('20:00');
  await button('Lưu lịch cố định').click();
  await button('Lên kế hoạch cùng AI ↗').click();
  await field('Bạn muốn đạt điều gì?').fill('Ôn SQL JOIN');
  await button('Tạo kế hoạch để xem trước').click();
  await expect(page.locator('#ai-error')).toContainText('AI qua mạng đang tạm gián đoạn');
  await button('Xếp lịch theo giờ rảnh').click();
  await expect(field('Nội dung cần ôn')).toHaveValue('Ôn SQL JOIN');
  await field('Ngày kiểm tra').fill('2026-11-17');
  await button('Xem trước lịch ôn').click();
  await expect(page.getByRole('dialog')).toContainText('20:00–20:45');
  const getPlan=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).plan);
  expect(await getPlan()).toHaveLength(0);
  await button('Xác nhận thêm vào lịch').click();
  await page.reload();
  const [session]=await getPlan();
  expect(session).toMatchObject({source:'automatic',day:'2026-11-16',title:'Ôn SQL JOIN',start:1200,duration:45});
  expect(calls.filter(method=>method==='POST')).toEqual(['POST']);
});

test('off-topic AI requests explain the scope and return to editing without saving',async({page})=>{
  await page.route('**/api/plans',route=>route.fulfill({json:{schemaVersion:1,status:'needs_clarification',reason:'out_of_scope',
    summary:'Brain10 chỉ hỗ trợ lập lịch học và ôn tập.',questions:[],assumptions:[],exams:[],sessions:[]}}));
  await page.goto('/try/');
  const button=name=>page.getByRole('button',{name,exact:true});
  await page.getByText('Dùng hồ sơ mẫu An',{exact:true}).click();
  await button('Lịch trình').click();
  await button('Thêm lịch cố định').click();
  await page.getByLabel('Tên lịch',{exact:true}).fill('Lớp tối');
  await button('Lưu lịch cố định').click();
  await button('Lên kế hoạch cùng AI ↗').click();
  const goal=page.getByRole('textbox',{name:'Bạn muốn đạt điều gì?',exact:true});
  await goal.fill('Trận tiếp theo của ĐTQG Việt Nam là khi nào?');
  await button('Tạo kế hoạch để xem trước').click();
  await expect(page.getByRole('heading',{name:'Yêu cầu ngoài phạm vi'})).toBeVisible();
  await expect(button('Xác nhận thêm vào lịch')).toHaveCount(0);
  await button('Chỉnh mục tiêu học').click();
  await expect(goal).toHaveValue('Trận tiếp theo của ĐTQG Việt Nam là khi nào?');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).plan)).toEqual([]);
});
