import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createPlanHandler,betaAccessCode} from '../api/plans.mjs';
import {normalizeRequest,buildSlots,validateDraft} from '../server/planner.mjs';
import {makePlanningRequest,convertDraft,validateAcceptance} from '../dist/try/planning.js';

const now=Date.parse('2026-10-23T08:00:00Z'),key='test-only-provider-placeholder';
const input=()=>({request:'DBMS trong 3 ngày',learningContext:'Ôn JOIN',timezone:'Asia/Ho_Chi_Minh',preferences:{startMinute:1080,endMinute:1320,sessionMinutes:30,dailyMinutes:60},commitments:[{title:'Đi học',weekdays:[1,2,3,4,5],startMinute:420,endMinute:720}],existingPlan:[]});
function modelDraft(context,slots){return validateDraft({status:'draft',summary:'Ôn JOIN',questions:[],assumptions:[],exams:[{subject:'DBMS',date:'2026-10-26'}],sessions:[{slotId:slots[0].id,title:'Luyện INNER JOIN',subject:'DBMS',objectives:['Viết truy vấn JOIN'],steps:['Ôn ví dụ','Tự giải bài'],expectedOutput:'Hai truy vấn đúng',examDate:'2026-10-26'}]},context,slots);}

test('public beta rejects missing/invalid credentials and foreign origins without a model call',async t=>{
  let calls=0;
  const pagesOrigin='https://zomboxx.github.io';
  const copiedKey=key+'\n';
  assert.equal(betaAccessCode(copiedKey),betaAccessCode(key));
  const handler=createPlanHandler({key:()=>copiedKey,now:()=>now,webOrigin:pagesOrigin,model:async(c,s)=>{calls++;return modelDraft(c,s);}});
  const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.address().port}`,code=betaAccessCode(key);
  const post=(headers={},body=input())=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const preflight=(origin)=>fetch(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
  const approved=await preflight(pagesOrigin);
  assert.equal(approved.status,204);
  assert.equal(approved.headers.get('access-control-allow-origin'),pagesOrigin);
  assert.equal(approved.headers.get('access-control-allow-headers'),'Authorization, Content-Type');
  const rejected=await preflight('https://foreign.example');
  assert.equal(rejected.headers.get('access-control-allow-origin'),null);
  assert.equal((await post()).status,401);
  assert.equal((await post({Authorization:'Bearer '+'é'.repeat(28)})).status,401);
  assert.equal((await post({Authorization:`Bearer ${code}`,Origin:'https://foreign.example'})).status,403);
  assert.equal((await post({Authorization:`Bearer ${code}`},{...input(),commitments:[]})).status,400);
  assert.equal(calls,0);
  const response=await post({Authorization:`Bearer ${code}`,Origin:pagesOrigin});
  assert.equal(response.status,200);assert.equal((await response.json()).sessions.length,1);assert.equal(calls,1);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'),pagesOrigin);
});
test('web contract excludes profile data and rejects stale/duplicate confirmations',()=>{
  const state={profile:{name:'Private name',birthday:'2005-01-01'},commitments:[{title:'Đi học',weekdays:[1,2,3,4,5],start:420,end:720}],plan:[],studyPreferences:input().preferences};
  const request=makePlanningRequest(state,'DBMS sau 3 ngày','Ôn JOIN');
  assert.equal('profile' in request,false);assert.ok(!JSON.stringify(request).includes('Private name'));
  const context=normalizeRequest(request,now),draft=modelDraft(context,buildSlots(context)),sessions=convertDraft(draft);
  assert.equal(validateAcceptance(sessions,state,now),null);
  assert.equal(sessions[0].source,'ai');assert.equal(sessions[0].start,1080);
  state.plan.push(sessions[0]);assert.match(validateAcceptance(sessions,state,now),/trùng/);
  state.plan=[];state.commitments.push({title:'Lịch mới',weekdays:[5],start:1080,end:1200});
  assert.match(validateAcceptance(sessions,state,now),/Lịch cố định/);
});
test('no server secret means fail closed; provider failure never becomes a draft',async t=>{
  const server=createServer(createPlanHandler({key:()=>' \n'}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.address().port}`;
  assert.deepEqual(await (await fetch(url)).json(),{configured:false,accessRequired:true,model:'gpt-5.4-mini'});
  assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,503);
});
