// Explicit, billable check with synthetic context. No provider key in the browser.
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
if(!process.argv.includes('--run-live'))throw new Error('Pass --run-live to authorize a billable model request.');
const code=(await readFile(new URL('../../mobile/.android-dev/ai-beta-access.txt',import.meta.url),'utf8')).trim();
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
  await page.goto(process.env.BRAIN10_TEST_URL || 'http://127.0.0.1:4178/try/');
  await page.getByText('Dùng hồ sơ mẫu An',{exact:true}).click();
  await page.getByRole('button',{name:'Lịch trình',exact:true}).click();
  await page.getByRole('button',{name:'Thêm lịch cố định',exact:true}).click();
  await page.getByLabel('Tên lịch',{exact:true}).fill('Lịch học mẫu');
  await page.getByRole('button',{name:'Lưu lịch cố định',exact:true}).click();
  await page.getByRole('button',{name:'Nhịp học của bạn',exact:true}).click();
  await page.getByRole('combobox',{name:'Mỗi phiên',exact:true}).selectOption('30');
  await page.getByLabel('Quỹ học mỗi ngày (phút)',{exact:true}).fill('30');
  await page.getByRole('button',{name:'Lưu nhịp học',exact:true}).click();
  await page.getByRole('button',{name:'Lên kế hoạch cùng AI ↗',exact:true}).click();
  await page.getByLabel('Mã thử AI của nhóm',{exact:true}).fill(code);
  await page.getByLabel('Bạn muốn đạt điều gì?',{exact:true}).fill('Tôi kiểm tra DBMS trong 3 ngày nữa. Chỉ lập một phiên ôn JOIN 30 phút.');
  await page.getByLabel('Đề cương, phần còn yếu, cách học yêu thích',{exact:true}).fill('Đề cương: INNER JOIN và LEFT JOIN. Cần một ví dụ và một bài tự kiểm tra.');
  await page.getByRole('button',{name:'Tạo kế hoạch để xem trước',exact:true}).click();
  const confirm=page.getByRole('button',{name:'Xác nhận thêm vào lịch',exact:true});
  await confirm.waitFor({timeout:110000});
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).plan.length);
  if(before!==0)throw new Error('Draft was saved without confirmation.');
  await mkdir(new URL('../screenshots/',import.meta.url),{recursive:true});
  await page.screenshot({path:new URL('../screenshots/ai-live-preview-web.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
  await confirm.click();
  const plans=await page.evaluate(()=>JSON.parse(localStorage.getItem('brain10.web-demo.v1')).plan);
  if(!plans.length || plans.some(p=>p.source!=='ai'||!p.steps?.length||!p.objectives?.length))throw new Error('Missing structured AI sessions.');
  await page.screenshot({path:new URL('../screenshots/ai-live-confirmed-web.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
  console.log(JSON.stringify({ok:true,platform:'web',sessions:plans.length,confirmed:true,model:'gpt-5.4-mini'}));
}finally{await browser.close();}
