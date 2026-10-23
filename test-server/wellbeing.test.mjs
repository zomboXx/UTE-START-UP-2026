import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderBoundary,REMINDER_INTERVAL as interval} from '../dist/try/wellbeing.js';
const start=1800000000000,focus={start,end:start+3*interval};
test('no reminder before 40 minutes, at session end, or for a 40 minute session',()=>{
  assert.equal(reminderBoundary(focus,start+interval-1),0);
  assert.equal(reminderBoundary(focus,start+interval),1);
  assert.equal(reminderBoundary(focus,focus.end),0);
  assert.equal(reminderBoundary({start,end:start+interval},start+interval),0);
  assert.equal(reminderBoundary(null,start),0);
});
test('saved boundary suppresses duplicates across reloads and uses original session start',()=>{
  assert.equal(reminderBoundary({...focus,reminderBoundary:1},start+interval+1),0);
  assert.equal(reminderBoundary({...focus,reminderBoundary:1},start+2*interval),2);
});
test('throttled wakeup yields just the latest boundary without a backlog',()=>{
  assert.equal(reminderBoundary(focus,start+2*interval+50000),2);
  assert.equal(reminderBoundary({...focus,reminderBoundary:2},start+2*interval+50000),0);
  assert.equal(reminderBoundary(focus,focus.end+50000),0);
});
