import {createHmac,timingSafeEqual} from 'node:crypto';
import {normalizeRequest,buildSlots,callModel} from '../server/planner.mjs';

// Private beta admission credential; never the PoolAI provider key.
// It rotates automatically with the provider key. Only its owner distributes it.
export function betaAccessCode(key) {
  return createHmac('sha256',key).update('brain10-private-ai-beta-v1').digest('base64url').slice(0,28);
}
export function createPlanHandler({model=callModel,now=()=>Date.now(),key=()=>process.env.POOL_API_KEY}={}) {
  let busy=false;
  const calls=[];
  return async function handler(req,res) {
    const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
    const configured=!!key();
    if(req.method==='GET')return send(200,{configured,accessRequired:true,model:process.env.POOL_MODEL || 'gpt-5.4-mini'});
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'Chỉ hỗ trợ tạo kế hoạch bằng POST.'});}
    if(!configured)return send(503,{error:'AI chưa được cấu hình trên máy chủ. Nhóm cần thêm POOL_API_KEY trên Vercel.'});
    const origin=req.headers.origin;
    if(origin && !['https://brain10-ute-startup2026.vercel.app','http://127.0.0.1:4176','http://127.0.0.1:4178','http://127.0.0.1:4174','http://localhost:4176','http://localhost:4178'].includes(origin))return send(403,{error:'Không nhận yêu cầu từ website này.'});
    const supplied=String(req.headers.authorization || '').replace(/^Bearer /,'');
    const expected=betaAccessCode(key());
    if(!/^[A-Za-z0-9_-]{28}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return send(401,{error:'Nhập mã thử AI của nhóm. Đây không phải key PoolAI.'});
    let context;
    try {
      let body=req.body;
      if(body===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>100000)throw new Error('Yêu cầu quá lớn.');chunks.push(chunk);}body=Buffer.concat(chunks).toString();}
      if(typeof body==='string'){if(Buffer.byteLength(body)>100000)throw new Error('Yêu cầu quá lớn.');body=JSON.parse(body);}
      else if(Buffer.byteLength(JSON.stringify(body))>100000)throw new Error('Yêu cầu quá lớn.');
      context=normalizeRequest(body,now());
      if(!context.commitments.length)throw new Error('Nhập lịch cố định trước khi tạo kế hoạch AI.');
    } catch(e){return send(400,{error:e instanceof SyntaxError?'JSON không hợp lệ.':e.message});}
    const slots=buildSlots(context);
    if(!slots.length)return send(422,{error:'Không còn giờ rảnh phù hợp. Hãy kiểm tra lịch cố định và nhịp học.'});
    const time=now();while(calls.length && calls[0]<time-60000)calls.shift();
    // Best-effort per warm instance, not a global billing quota. Admission code
    // keeps this beta private until durable per-user quotas/auth are deployed.
    if(busy || calls.length>=3){res.setHeader('Retry-After','60');return send(429,{error:'AI đang bận hoặc đã đủ lượt trong phút này. Chờ một phút rồi thử lại.'});}
    calls.push(time);busy=true;
    try {return send(200,await model(context,slots));}
    catch(e){console.error(JSON.stringify({event:'planning_failed',code:/AI-40[13]/.test(e.message)?'provider_auth':'model_or_validation'}));return send(502,{error:/timeout|abort/i.test(e.name)?'AI phản hồi quá lâu. Hãy thử lại.':e.message});}
    finally {busy=false;}
  };
}
export default createPlanHandler();
