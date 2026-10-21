export const KEY = 'dpao_data_v4'
export const defaults = ['化妆水', '精华', '面霜', '眼霜', '面膜', '其他']
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function dateValue(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return NaN; const [y,m,d]=s.split('-').map(Number); const value = new Date(Date.UTC(y,m-1,d)); return value.toISOString().slice(0,10) === s ? +value : NaN }
export function expiry(opened, months) {
  if (!Number.isFinite(dateValue(opened)) || !Number.isInteger(months) || months<1 || months>120) throw Error('请填写有效日期和 1–120 个月的期限')
  const [y,m,d]=opened.split('-').map(Number); const last=new Date(Date.UTC(y,m-1+months+1,0));
  return new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth(),Math.min(d,last.getUTCDate()))).toISOString().slice(0,10)
}
export function daysLeft(item, day=today()) { return Math.round((dateValue(item.expireDate)-dateValue(day))/86400000) }
export function normalize(items) {
 if (!Array.isArray(items)) throw Error('数据格式不正确')
 const ids=new Set()
 return items.map(i=>{
  if (!i || typeof i!=='object' || !['active','empty','discarded'].includes(i.status)) throw Error('产品记录格式不正确')
  const id=String(i.id || crypto.randomUUID()); if(ids.has(id)) throw Error('产品编号重复'); ids.add(id)
  if(i.status==='active' && (!Number.isFinite(dateValue(i.openedDate)) || !Number.isFinite(dateValue(i.expireDate)))) throw Error('产品日期无效')
  const amounts={full:100,'3/4':75,'1/2':50,'1/4':25,high:75,medium:50,low:25}
  const amount=typeof i.amount==='number'?i.amount:(amounts[i.amount]??100)
  return {id,name:String(i.name||'未命名产品').slice(0,100),category:String(i.category||'其他').slice(0,30),image:typeof i.image==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(i.image)?i.image:null,openedDate:i.openedDate||null,expireDate:i.expireDate||null,pao:String(i.pao||''),amount:Math.max(0,Math.min(100,amount)),status:i.status,emptyDate:i.emptyDate||null,rating:['good','normal','bad'].includes(i.rating)?i.rating:null,nextCheck:Number.isFinite(dateValue(i.nextCheck))?i.nextCheck:null}
 })
}
