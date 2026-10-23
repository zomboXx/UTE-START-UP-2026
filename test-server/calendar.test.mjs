import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionStatus,weekStart,addDays,calendarWeeks} from '../dist/try/calendar.js';

const now=Date.parse('2026-10-24T10:00:00+07:00');
const entry={id:'p',day:'2026-10-24',start:630,duration:45,done:false};
test('session status crosses start/end exactly; completed and fixed blocks use correct semantics',()=>{
  assert.deepEqual(sessionStatus(entry,now),{key:'upcoming',label:'Sắp tới',relative:'Còn 30 phút',checkout:false});
  assert.equal(sessionStatus(entry,now+30*60000).key,'active');
  assert.equal(sessionStatus(entry,now+75*60000).key,'overdue');
  assert.equal(sessionStatus(entry,now+75*60000).checkout,true);
  assert.equal(sessionStatus({...entry,done:true},now).key,'done');
  assert.equal(sessionStatus({...entry,fixed:true},now+75*60000).key,'ended');
  assert.equal(sessionStatus({...entry,fixed:true},now+75*60000).checkout,false);
});
test('week math handles Sundays, month/year rollover and four complete weeks',()=>{
  assert.equal(weekStart('2027-01-03'),'2026-12-28');
  assert.equal(addDays('2026-12-28',7),'2027-01-04');
  assert.equal(calendarWeeks({plan:[],commitments:[]},'2026-12-28',4).at(-1).days.at(-1),'2027-01-24');
});
test('calendar keeps multiple same-cell sessions, three periods, recurring fixed blocks, and source data',()=>{
  const state={commitments:[{id:'f',title:'Đi học',weekdays:[1],start:420,end:480}],plan:[
    {...entry,id:'a',day:'2026-10-19',start:480},
    {...entry,id:'b',day:'2026-10-19',start:540},
    {...entry,id:'c',day:'2026-10-19',start:720},
    {...entry,id:'d',day:'2026-10-19',start:1080}
  ]};
  const original=JSON.stringify(state),weeks=calendarWeeks(state,'2026-10-19',2);
  assert.deepEqual(weeks[0].cells[0][0].map(p=>p.id),['fixed:f:2026-10-19','a','b']);
  assert.equal(weeks[0].cells[1][0][0].id,'c');
  assert.equal(weeks[0].cells[2][0][0].id,'d');
  assert.equal(weeks[1].cells[0][0][0].id,'fixed:f:2026-10-26');
  assert.equal(JSON.stringify(state),original);
});
