import test from 'node:test';
import assert from 'node:assert/strict';
import {taskChanges,activityChanges,activityHistory} from '../dist/try/record-model.js';
test('task edits preserve completion and audience metadata; moving a completed task is rejected',()=>{
 const before={id:'t',title:'Old',duration:30,day:'2026-11-19',done:true,completedAt:'2026-11-19T09:00:00Z',reflection:'Done',audience:'selected',recipients:['member'],extension:{keep:true}};
 const edited={...before,...taskChanges(before,{title:'New',duration:45,day:before.day,note:'New note'})};
 assert.deepEqual({...edited,title:before.title,duration:before.duration,note:undefined},{...before,note:undefined});
 assert.throws(()=>taskChanges(before,{title:'New',duration:45,day:'2026-11-20'}),/hoàn thành/);
 for(const values of [{title:''},{duration:0},{duration:481},{duration:1.5},{day:'2026-02-30'}])assert.throws(()=>taskChanges(before,{title:'New',duration:45,day:before.day,...values}));
});
test('historical activities stay editable while new records retain the rolling window and future checks',()=>{
 const now=Date.parse('2026-11-19T10:00:00Z'),entry={id:'a',start:'2026-11-01T08:00:00Z',end:'2026-11-01T09:00:00Z'};
 const values={...entry,title:'Đọc sách',note:'Nội dung mới',photo:null};
 assert.equal(activityChanges(entry,values,now).duration,60);
 assert.throws(()=>activityChanges(null,values,now),/24 giờ/);
 assert.throws(()=>activityChanges(entry,{...values,end:'2026-12-01T09:00:00Z'},now),/tương lai/);
 assert.throws(()=>activityChanges(entry,{...values,end:entry.start},now),/sau/);
});
test('history searches title and notes without modifying source records and filters by local day',()=>{
 const records=[{id:'a',title:'Đọc sách',note:'Thư viện',end:'2026-11-01T09:00:00Z'},{id:'b',title:'Chạy bộ',note:'Công viên',end:'2026-11-18T09:00:00Z'},{id:'c',title:'Luyện nói',end:'2026-11-19T09:00:00Z'}];
 assert.deepEqual(activityHistory(records).map(a=>a.id),['c','b','a']);
 assert.deepEqual(activityHistory(records,{search:'THU VIEN'}).map(a=>a.id),['a']);
 assert.equal(activityHistory(records,{date:'2026-11-18'})[0].id,'b');
 assert.deepEqual(records.map(a=>a.id),['a','b','c']);
});
