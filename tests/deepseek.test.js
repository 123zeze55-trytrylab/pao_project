import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeModel,parseWithDeepSeek} from '../server/deepseek.js'
const text='今天开了瓶洗面奶，悦诗风吟，写了12个月'
const output=()=>({brand:{text:'悦诗风吟',evidence:'悦诗风吟'},product:{text:'洗面奶',evidence:'洗面奶'},category:{value:'洁面',evidence:'洗面奶'},status:{value:'active',evidence:'今天开了瓶'},opening:{kind:'exact',date:'2026-10-21',evidence:'今天开了瓶'},period:{kind:'ambiguous',months:12,evidence:'写了12个月'},expiry:{},warnings:[]})
test('model output joins supplied brand and product while preserving duration ambiguity',()=>{
 const d=normalizeModel(output(),text,'2026-10-21');assert.equal(d.name,'悦诗风吟洗面奶');assert.equal(d.category,'洁面');assert.equal(d.durationCandidate,12);assert.equal(d.durationDisposition,'');assert.equal(d.months,'');assert.equal(d.openedDate,'2026-10-21')
})
test('fabricated identity fragments, future opening and purchase-only evidence rejected',()=>{
 const x=output();x.brand={text:'不存在的品牌',evidence:'悦诗风吟'};x.opening.date='2099-01-01';let d=normalizeModel(x,text,'2026-10-21');assert.equal(d.name,'洗面奶');assert.equal(d.openedDate,'')
 d=normalizeModel({...output(),opening:{kind:'exact',date:'2026-01-01',evidence:'三个月前买的'}},'三个月前买的洗面奶','2026-10-21');assert.equal(d.openedDate,'')
})
test('month-only EXP never becomes an exact day',()=>{
 const d=normalizeModel({...output(),expiry:{date:'2027-06-30',month:'2027-06',evidence:'EXP2027年6月'}},'洗面奶，EXP2027年6月','2026-10-21');assert.equal(d.packageExpiry,'');assert.equal(d.packageExpiryMonth,'2027-06')
})
test('uncertainty, unopened status, multi-product and malformed outputs handled',()=>{
 const x=output();x.opening={kind:'exact',date:'2026-10-21',evidence:'好像今天开的'};let d=normalizeModel(x,'洗面奶好像今天开的','2026-10-21');assert.equal(d.dateMode,'clue');assert.equal(d.openedDate,'')
 d=normalizeModel({...output(),status:{value:'unopened',evidence:'还没开封'}},text+'还没开封','2026-10-21');assert.equal(d.status,'unopened');assert.equal(d.openedDate,'');assert.equal(d.months,'')
 assert.throws(()=>normalizeModel({multiple_products:true},text,'2026-10-21'),/一次描述一瓶/)
 assert.throws(()=>normalizeModel(null,text,'2026-10-21'))
})
test('API request is server-side, fixed-provider JSON with raw input as data',async()=>{
 let request
 const draft=await parseWithDeepSeek({text,currentDate:'2026-10-21',timezone:'Asia/Shanghai',apiKey:'test-placeholder',fetchImpl:async(url,init)=>{request={url,init};return{ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output())}}]})}}})
 assert.equal(request.url,'https://api.deepseek.com/chat/completions');const body=JSON.parse(request.init.body);assert.equal(body.model,'deepseek-chat');assert.equal(body.response_format.type,'json_object');assert.equal(JSON.parse(body.messages[1].content).text,text);assert.equal(draft.parser,'deepseek')
})
test('missing keys, upstream auth and invalid JSON fail explicitly without fallback',async()=>{
 const args={text,currentDate:'2026-10-21',timezone:'Asia/Shanghai'}
 await assert.rejects(parseWithDeepSeek(args),/尚未配置/)
 await assert.rejects(parseWithDeepSeek({...args,apiKey:'test',fetchImpl:async()=>({ok:false,status:401})}),/密钥无效/)
 await assert.rejects(parseWithDeepSeek({...args,apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'not json'}}]})})}),/有效数据/)
})
