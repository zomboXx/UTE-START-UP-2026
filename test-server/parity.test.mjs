import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weekSummary,circleStreak} from '../dist/try/parity-model.js';
import {readDemoState,mergeDemoState} from '../dist/try/demo-state.js';
const empty=()=>({version:1,ready:true,profile:{name:'An'},tasks:[],commitments:[],plan:[],activities:[],sessions:[]});
test('weekly totals split a focus session at local midnight and exclude other weeks',()=>{
  const state=empty();
  state.sessions=[{id:'cross',start:new Date(2026,10,16,23,30).toISOString(),end:new Date(2026,10,17,0,30).toISOString(),seconds:3600},{day:'2026-11-09',seconds:7200}];
  state.tasks=[{id:'task',done:true,completedAt:new Date(2026,10,17,8).toISOString()},{done:true,completedAt:new Date(2026,10,9,8).toISOString()}];
  const days=weekSummary(state,'2026-11-16',+new Date(2026,10,18,10));
  assert.equal(days[0].focusSeconds,1800);assert.equal(days[1].focusSeconds,1800);
  assert.equal(days[1].tasks.length,1);assert.equal(days[3].future,true);
});
test('legacy local groups and existing data survive migration and concurrent edits',()=>{
  const raw={...empty(),circle:{name:'Đọc sách',goal:'10 trang',members:['Bình'],checkin:'2026-11-16'}};
  const baseline=readDemoState(JSON.stringify(raw));
  assert.equal(baseline.circles[0].members[0].name,'Bình');assert.equal(baseline.checkins[0].date,'2026-11-16');
  const local=structuredClone(baseline),latest=structuredClone(baseline);
  local.checkins.push({id:'a',circleId:'new',date:'2026-11-17'});latest.circles.push({id:'new',name:'Tập luyện',members:[]});
  const merged=mergeDemoState(baseline,local,latest);
  assert.equal(merged.circles.length,2);assert.equal(merged.checkins.length,2);assert.deepEqual(merged.tasks,raw.tasks);
});
test('rest days break streaks and yesterday remains the current streak before check-in',()=>{
  const checkins=[{circleId:'a',date:'2026-11-15'},{circleId:'a',date:'2026-11-16'},{circleId:'b',date:'2026-11-17'}];
  assert.equal(circleStreak(checkins,'a','2026-11-17'),2);
  checkins.push({circleId:'a',date:'2026-11-17',rest:true});
  assert.equal(circleStreak(checkins,'a','2026-11-18'),0);
});
