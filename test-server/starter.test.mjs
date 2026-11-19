import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID,createPublicKey,verify} from 'node:crypto';
import {createPlanHandler} from '../api/plans.mjs';
import {StarterQuota,quotaPublicKey} from '../server/starter-quota.mjs';
const key='test-provider-key-not-a-real-secret',token='a'.repeat(64);
const input={request:'Luyện nói tiếng Anh',learningContext:'',timezone:'Asia/Ho_Chi_Minh',preferences:{startMinute:1080,endMinute:1320,sessionMinutes:30,dailyMinutes:60},commitments:[],existingPlan:[]};
test('Starter HTTP flow needs no beta code, charges successful drafts once and refunds failures',async t=>{
 let used=0,modelCalls=0,time=Date.parse('2026-11-19T03:00:00Z'),fail=false,free=false,offline=false;
 const cached=new Map(),held=new Set();
 const publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(quotaPublicKey(key),'base64')]),format:'der',type:'spki'});
 const fetcher=async(url,options)=>{
  assert.equal(verify(null,Buffer.from(options.body),publicKey,Buffer.from(options.headers['X-Brain10-Signature'],'base64')),true);
  if(offline)throw new Error('network');
  const b=JSON.parse(options.body),quota=()=>({limit:5,used,remaining:5-used-held.size,period:'2026-11'});
  if(b.action==='status')return Response.json({quota:quota()});
  if(b.action==='reserve'){
   if(cached.has(b.id))return Response.json({cached:cached.get(b.id),quota:quota()});
   if(used+held.size>=5)return Response.json({error:'Bạn đã dùng đủ 5 lượt Starter tháng này.'},{status:429});
   held.add(b.id);return Response.json({reserved:true,quota:quota()});
  }
  held.delete(b.id);
  if(b.action==='commit'){if(b.charge)used++;cached.set(b.id,b.payload);assert.ok(!b.payload.includes('Luyện nói'));}
  return Response.json({quota:quota()});
 };
 const handler=createPlanHandler({key:()=>key,now:()=>time,quotaFactory:k=>new StarterQuota(k,{fetcher}),model:async()=>{modelCalls++;if(fail)throw new Error('AI unavailable');return {schemaVersion:1,status:free?'needs_clarification':'draft',summary:'Luyện nói',questions:[],assumptions:[],sessions:free?[]:[{title:'Luyện nói'}]};}});
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const url=`http://127.0.0.1:${server.address().port}`;
 const post=(id=randomUUID(),data=input)=>{time+=61000;return fetch(url,{method:'POST',headers:{Authorization:`Guest ${token}`,'Content-Type':'application/json','X-Brain10-Request-Id':id},body:JSON.stringify(data)});};
 const health=await(await fetch(url)).json();assert.equal(health.accessRequired,false);assert.equal(health.starterLimit,5);
 const id=randomUUID(),first=await(await post(id)).json();assert.equal(first.quota.remaining,4);assert.equal(used,1);
 assert.deepEqual(await(await post(id)).json(),first);assert.equal(modelCalls,1);
 fail=true;assert.equal((await post()).status,502);assert.equal(used,1);assert.equal(held.size,0);fail=false;
 free=true;assert.equal((await(await post()).json()).quota.remaining,4);assert.equal(used,1);free=false;
 for(let i=0;i<4;i++)assert.equal((await post()).status,200);
 const calls=modelCalls;assert.equal((await post()).status,429);assert.equal(modelCalls,calls);
 assert.equal((await(await fetch(url,{headers:{Authorization:`Guest ${token}`}})).json()).quota.remaining,0);
 offline=true;assert.equal((await post()).status,503);assert.equal(modelCalls,calls);
});
