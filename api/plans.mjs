import {createHmac,timingSafeEqual} from 'node:crypto';
import {normalizeRequest,buildSlots,callModel,planningModel} from '../server/planner.mjs';
import {StarterQuota,quotaPublicKey} from '../server/starter-quota.mjs';

// Private beta admission credential; never the PoolAI provider key.
// It rotates automatically with the provider key. Only its owner distributes it.
export function betaAccessCode(key) {
  return createHmac('sha256',key.trim()).update('brain10-private-ai-beta-v1').digest('base64url').slice(0,28);
}
export function createPlanHandler({model=callModel,now=()=>Date.now(),key=()=>process.env.POOL_API_KEY,webOrigin=process.env.BRAIN10_WEB_ORIGIN,quotaFactory=key=>new StarterQuota(key)}={}) {
  let busy=false;
  const calls=[];
  return async function handler(req,res) {
    const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
    const origin=req.headers.origin;
    if(webOrigin){
      res.setHeader('Vary','Origin');
      if(origin===webOrigin)res.setHeader('Access-Control-Allow-Origin',webOrigin);
    }
    if(req.method==='OPTIONS' && webOrigin && origin===webOrigin){
      res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Brain10-Request-Id'});
      return res.end();
    }
    const providerKey=key()?.trim();
    const configured=!!providerKey;
    const guest=/^Guest ([a-f0-9]{64})$/.exec(String(req.headers.authorization||''))?.[1];
    const quota=configured?quotaFactory(providerKey):null;
    if(req.method==='GET'){
      if(guest&&configured){try{return send(200,await quota.status(guest));}catch(e){return send(e.status||503,{error:e.message});}}
      return send(200,{configured,accessRequired:false,starterLimit:5,quotaPublicKey:configured?quotaPublicKey(providerKey):null,model:planningModel(),planningVersion:3});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'Chỉ hỗ trợ tạo kế hoạch bằng POST.'});}
    if(!configured)return send(503,{error:'AI chưa được cấu hình trên máy chủ Brain10.'});
    if(origin && ![webOrigin,'https://brain10-ute-startup2026.vercel.app','http://127.0.0.1:4176','http://127.0.0.1:4178','http://127.0.0.1:4174','http://localhost:4176','http://localhost:4178'].includes(origin))return send(403,{error:'Không nhận yêu cầu từ website này.'});
    const supplied=String(req.headers.authorization || '').replace(/^Bearer /,'');
    const expected=betaAccessCode(providerKey);
    if(!guest&&(!/^[A-Za-z0-9_-]{28}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))))return send(401,{error:'Chưa nhận được định danh Starter. Hãy cập nhật Brain10 rồi thử lại.'});
    let context;
    try {
      let body=req.body;
      if(body===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>100000)throw new Error('Yêu cầu quá lớn.');chunks.push(chunk);}body=Buffer.concat(chunks).toString();}
      if(typeof body==='string'){if(Buffer.byteLength(body)>100000)throw new Error('Yêu cầu quá lớn.');body=JSON.parse(body);}
      else if(Buffer.byteLength(JSON.stringify(body))>100000)throw new Error('Yêu cầu quá lớn.');
      context=normalizeRequest(body,now());
    } catch(e){return send(400,{error:e instanceof SyntaxError?'JSON không hợp lệ.':e.message});}
    const slots=buildSlots(context).filter(slot=>!context.targetDate || slot.date<context.targetDate);
    if(!slots.length)return send(422,{error:'Không còn giờ rảnh phù hợp. Hãy kiểm tra lịch cố định và nhịp học.'});
    const time=now();while(calls.length && calls[0]<time-60000)calls.shift();
    // Short burst control is separate from the durable monthly Starter quota.
    if(busy || calls.length>=3){res.setHeader('Retry-After','60');return send(429,{error:'AI đang bận hoặc đã đủ lượt trong phút này. Chờ một phút rồi thử lại.'});}
    const requestId=req.headers['x-brain10-request-id'];
    if(guest&&!/^[a-f0-9-]{36}$/.test(requestId||''))return send(400,{error:'Thiếu mã yêu cầu. Hãy cập nhật Brain10 rồi thử lại.'});
    const identity=guest?quota.identity(guest,requestId,context,String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()):null;
    calls.push(time);busy=true;
    let reserved=false;
    try {
      if(identity){const r=await quota.reserve(identity);if(r.cached)return send(200,{...quota.decode(r.cached),quota:r.quota});reserved=true;}
      const data=await model(context,slots);
      if(identity){const result=await quota.commit(identity,data);reserved=false;data.quota=result.quota;}
      return send(200,data);
    }
    catch(e){
      if(reserved){try{await quota.release(identity);}catch{}}
      console.error(JSON.stringify({event:'planning_failed',code:e.status?'quota':/AI-40[13]/.test(e.message)?'provider_auth':'model_or_validation'}));return send(e.status||502,{error:/timeout|abort/i.test(e.name)?'AI phản hồi quá lâu. Hãy thử lại.':e.message});
    }
    finally {busy=false;}
  };
}
export default createPlanHandler();
