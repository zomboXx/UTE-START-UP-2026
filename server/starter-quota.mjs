import {createHmac,createHash,createPrivateKey,createPublicKey,sign,randomUUID,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
const endpoint='https://brain10-admin.beadedeasel2.chatgpt.site/api/v2/planner-quota';
const hash=s=>createHash('sha256').update(s).digest('hex');
const derive=(key,scope)=>createHmac('sha256',key).update('brain10-starter-'+scope+'-v1').digest();
function signingKey(key){return createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),derive(key,'signing')]),format:'der',type:'pkcs8'});}
export function quotaPublicKey(key){return createPublicKey(signingKey(key)).export({format:'der',type:'spki'}).subarray(-32).toString('base64');}
export class StarterQuota {
 constructor(key,{fetcher=fetch,url=endpoint,now=()=>Date.now()}={}){this.key=key;this.fetcher=fetcher;this.url=url;this.now=now;}
 async rpc(b){
  const raw=JSON.stringify({...b,sentAt:this.now()}),signature=sign(null,Buffer.from(raw),signingKey(this.key)).toString('base64');
  let response;
  try{response=await this.fetcher(this.url,{method:'POST',headers:{'Content-Type':'application/json','X-Brain10-Signature':signature},body:raw,signal:AbortSignal.timeout(12000)});}catch{throw Object.assign(new Error('Chưa kiểm tra được lượt Starter. Lượt của bạn chưa bị trừ; vui lòng thử lại sau.'),{status:503});}
  let data;try{data=await response.json();}catch{throw Object.assign(new Error('Dịch vụ Starter đang bảo trì. Vui lòng thử lại sau.'),{status:503});}
  if(!response.ok)throw Object.assign(new Error(response.status===429||response.status===409?data.error:'Chưa kiểm tra được lượt Starter. Vui lòng thử lại sau.'),{status:[429,409].includes(response.status)?response.status:503});
  return data;
 }
 identity(token,requestId,context,ip='unknown'){
  const {now,...stableContext}=context;
  const principal=hash(token),id=hash(principal+':'+requestId);
  return {principal,id,lease:randomUUID(),fingerprint:hash(JSON.stringify(stableContext)),ipHash:createHmac('sha256',derive(this.key,'ip')).update(ip).digest('hex')};
 }
 status(token){return this.rpc({action:'status',principal:hash(token)});}
 reserve(identity){return this.rpc({action:'reserve',...identity});}
 async commit(identity,data){
  const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',derive(this.key,'cache'),nonce);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()]);
  const payload=Buffer.concat([nonce,cipher.getAuthTag(),encrypted]).toString('base64');
  return this.rpc({action:'commit',...identity,charge:data.status==='draft'&&data.sessions?.length>0,payload});
 }
 release(identity){return this.rpc({action:'release',...identity});}
 decode(payload){const bytes=Buffer.from(payload,'base64'),cipher=createDecipheriv('aes-256-gcm',derive(this.key,'cache'),bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString());}
}
