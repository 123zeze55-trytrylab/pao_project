import test from 'node:test'
import assert from 'node:assert/strict'
import {bucket,deadlineText,amountText} from '../src/model.js'
const day='2026-10-21'
test('attention groups distinguish expired, expiring, due, unknown and normal',()=>{
 assert.equal(bucket({expireDate:'2026-10-20',nextCheck:day},day),'expired')
 assert.equal(bucket({expireDate:'2026-11-20',nextCheck:day},day),'soon')
 assert.equal(bucket({openedDate:'2026-01-01',expireDate:'2027-01-01',nextCheck:day},day),'check')
 assert.equal(bucket({openedDate:null,expireDate:null},day),'incomplete')
 assert.equal(bucket({openedDate:'2026-01-01',expireDate:'2027-01-01'},day),'normal')
})
test('uncertain dates never present an exact countdown',()=>{
 assert.equal(deadlineText({expireDate:null},day),'期限待确认')
 assert.equal(deadlineText({expireDate:'2026-10-20',datePrecision:'approximate'},day),'可能已超期')
 assert.equal(deadlineText({expireDate:'2026-11-20',datePrecision:'approximate'},day),'预计一个月内到期')
 assert.equal(deadlineText({expireDate:'2027-01-21',datePrecision:'approximate'},day),'约剩 3 个月')
 assert.equal(deadlineText({expireDate:'2026-10-21',datePrecision:'exact'},day),'今日到期')
})
test('unknown amount stays distinct from empty',()=>{
 assert.equal(amountText(null),'余量待确认');assert.equal(amountText(0),'已见底')
})
