export const KEY = 'dpao_data_v4'
export const defaults = ['化妆水', '精华', '面霜', '眼霜', '面膜', '其他']
export const amountOptions = [{label:'还有很多',value:75},{label:'剩一半',value:50},{label:'快见底',value:15},{label:'看不清',value:null}]
export function today() {
 const d=new Date()
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function dateValue(s) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return NaN
 const [y,m,d]=s.split('-').map(Number),value=new Date(Date.UTC(y,m-1,d))
 return value.toISOString().slice(0,10)===s?+value:NaN
}
export function expiry(opened,months) {
 if(!Number.isFinite(dateValue(opened))||!Number.isInteger(months)||months<1||months>120)throw Error('请填写有效日期和 1–120 个月的期限')
 const [y,m,d]=opened.split('-').map(Number),last=new Date(Date.UTC(y,m+months,0))
 return new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth(),Math.min(d,last.getUTCDate()))).toISOString().slice(0,10)
}
export function daysLeft(item,day=today()) {return Math.round((dateValue(item.expireDate)-dateValue(day))/86400000)}
export function bucket(item,day=today()) {
 const days=daysLeft(item,day)
 if(days<0)return 'expired'
 if(days<=30)return 'soon'
 if(item.nextCheck&&item.nextCheck<=day)return 'check'
 if(!item.openedDate||!item.expireDate)return 'incomplete'
 return 'normal'
}
export function deadlineText(item,day=today()) {
 const days=daysLeft(item,day),approx=item.datePrecision==='approximate'
 if(!Number.isFinite(days))return '期限待确认'
 if(approx)return days<0?'可能已超期':days<=30?'预计一个月内到期':`约剩 ${Math.max(1,Math.round(days/30))} 个月`
 return days<0?`超期 ${Math.abs(days)} 天`:days===0?'今日到期':`剩余 ${days} 天`
}
export function amountText(value) {
 return value===null||value===undefined?'余量待确认':value===0?'已见底':value<=25?'快见底':value<=60?'剩一半左右':'余量较多'
}
export function normalize(items) {
 if(!Array.isArray(items))throw Error('数据格式不正确')
 const ids=new Set()
 return items.map(i=>{
  if(!i||typeof i!=='object'||!['active','empty','discarded'].includes(i.status))throw Error('产品记录格式不正确')
  const id=String(i.id||crypto.randomUUID());if(ids.has(id))throw Error('产品编号重复');ids.add(id)
  for(const key of ['openedDate','expireDate','emptyDate'])if(i[key]&&!Number.isFinite(dateValue(i[key])))throw Error('产品日期无效')
  if(i.status==='active'&&i.dataVersion!==2&&(!i.openedDate||!i.expireDate))throw Error('产品日期无效')
  const amounts={full:100,'3/4':75,'1/2':50,'1/4':25,high:75,medium:50,low:25}
  const raw=i.amount===null||i.amount===undefined?null:typeof i.amount==='number'?i.amount:amounts[i.amount]
  const amount=Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):null
  return {dataVersion:2,id,name:String(i.name||'未命名产品').slice(0,100),category:String(i.category||'未分类').slice(0,30),image:typeof i.image==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(i.image)?i.image:null,openedDate:i.openedDate||null,datePrecision:i.openedDate?(i.datePrecision==='approximate'?'approximate':'exact'):'unknown',expireDate:i.expireDate||null,pao:String(i.pao||''),amount,status:i.status,emptyDate:i.emptyDate||null,rating:['good','normal','bad'].includes(i.rating)?i.rating:null,stopReason:['超期','不适','变质','不喜欢','其他'].includes(i.stopReason)?i.stopReason:null,nextCheck:Number.isFinite(dateValue(i.nextCheck))?i.nextCheck:null}
 })
}
