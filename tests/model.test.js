import test from 'node:test'
import assert from 'node:assert/strict'
import {expiry,daysLeft,normalize,dateValue} from '../src/model.js'
test('month-end PAO stays within target month, including leap years',()=>{
 assert.equal(expiry('2026-01-31',1),'2026-02-28')
 assert.equal(expiry('2024-01-31',1),'2024-02-29')
 assert.equal(expiry('2024-02-29',12),'2025-02-28')
 assert.equal(expiry('2026-10-21',3),'2027-01-21')
})
test('calendar day boundaries determine expiry',()=>{
 assert.equal(daysLeft({expireDate:'2026-10-21'},'2026-10-21'),0)
 assert.equal(daysLeft({expireDate:'2026-10-20'},'2026-10-21'),-1)
 assert.equal(daysLeft({expireDate:'2026-11-20'},'2026-10-21'),30)
})
test('invalid dates and PAO are rejected',()=>{
 assert.ok(Number.isNaN(dateValue('2026-02-30')))
 assert.throws(()=>expiry('2026-02-30',12))
 assert.throws(()=>expiry('2026-01-01',0))
})
test('legacy records retain categories, ratings and amount',()=>{
 const [active,retro]=normalize([{id:1,status:'active',openedDate:'2026-01-01',expireDate:'2027-01-01',amount:'3/4',category:'自定义',name:'面霜'}, {id:2,status:'empty',category:'历史补登',rating:'good'}])
 assert.equal(active.amount,75);assert.equal(active.category,'自定义');assert.equal(retro.category,'历史补登');assert.equal(retro.rating,'good')
})
test('malformed backups rejected and unsafe image URLs removed',()=>{
 assert.throws(()=>normalize({}));assert.throws(()=>normalize([{status:'active'}]))
 assert.throws(()=>normalize([{id:'a',status:'empty'},{id:'a',status:'empty'}]))
 assert.equal(normalize([{id:1,status:'empty',image:'javascript:alert(1)'}])[0].image,null)
})

test('quick entries preserve unknown dates and amounts through backup',()=>{
 const [i]=normalize([{dataVersion:2,id:'quick',name:'待确认',status:'active',openedDate:null,expireDate:null,amount:null}])
 assert.equal(i.datePrecision,'unknown');assert.equal(i.amount,null);assert.equal(i.expireDate,null)
 assert.deepEqual(normalize(JSON.parse(JSON.stringify([i]))),[i])
})
test('estimated dates and stop reasons survive migration',()=>{
 const [i]=normalize([{dataVersion:2,id:'approx',name:'精华',status:'discarded',openedDate:'2026-01-01',expireDate:'2027-01-01',datePrecision:'approximate',stopReason:'不适',amount:75}])
 assert.equal(i.datePrecision,'approximate');assert.equal(i.stopReason,'不适');assert.equal(i.amount,75)
})
