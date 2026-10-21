import {createApp,ref,computed,onMounted,onUnmounted,nextTick} from 'vue/dist/vue.esm-bundler.js'
import {KEY,defaults,amountOptions,today,dateValue,expiry,daysLeft,normalize,bucket,deadlineText,amountText} from './model.js'
import './style.css'
createApp({setup(){
 const items=ref([]),page=ref('home'),filter=ref('全部'),search=ref(''),archiveFilter=ref('all')
 const notice=ref(''),error=ref(''),storageBlocked=ref(false),editing=ref(null),dialog=ref(false),photoBusy=ref(false),detailsOpen=ref(false)
 const privacy=ref(true),day=ref(today()),checkDays=ref(7),stopReason=ref(''),progressStep=ref('amount')
 const fresh=()=>({id:null,name:'',category:'',image:null,openedDate:'',dateMode:'unknown',months:'',amount:null,rating:'',emptyDate:today(),status:'active',stopReason:''})
 const form=ref(fresh()),progress=ref(null),rating=ref(''),amount=ref(null),nameInput=ref(null),closeProgress=ref(null)
 let timer,toastTimer,previousFocus
 const refreshDay=()=>{day.value=today()}
 onMounted(()=>{timer=setInterval(refreshDay,60000);document.addEventListener('visibilitychange',refreshDay)})
 onUnmounted(()=>{clearInterval(timer);clearTimeout(toastTimer);document.removeEventListener('visibilitychange',refreshDay)})
 try{items.value=normalize(JSON.parse(localStorage.getItem(KEY)||'[]'));privacy.value=localStorage.getItem('dpao_privacy_seen')!=='1'}catch{storageBlocked.value=true;error.value='本地数据无法读取。为保护原记录，已暂停保存；请先导出原始数据备份，再检查或恢复。'}
 const acknowledge=()=>{privacy.value=false;try{localStorage.setItem('dpao_privacy_seen','1')}catch{}}
 const categories=computed(()=>[...new Set(['未分类',...defaults,...items.value.map(i=>i.category)])])
 const active=computed(()=>items.value.filter(i=>i.status==='active'))
 const expired=computed(()=>active.value.filter(i=>bucket(i,day.value)==='expired').length)
 const soon=computed(()=>active.value.filter(i=>bucket(i,day.value)==='soon').length)
 const archived=computed(()=>items.value.filter(i=>i.status!=='active'))
 const visible=computed(()=>(page.value==='home'?active.value:archived.value).filter(i=>(filter.value==='全部'||i.category===filter.value)&&i.name.toLowerCase().includes(search.value.toLowerCase())&&(page.value==='home'||archiveFilter.value==='all'||i.status===archiveFilter.value)).sort((a,b)=>page.value==='home'?(Number.isFinite(daysLeft(a))?daysLeft(a):Infinity)-(Number.isFinite(daysLeft(b))?daysLeft(b):Infinity):(b.emptyDate||'').localeCompare(a.emptyDate||'')))
 const definitions=[['expired','需要处理','先检查状态，已超过标注期限的产品建议停用。'],['soon','临近期限','结合余量安排使用，到期后及时检查。'],['check','到时间复查了','不用精确测量，看看大概还剩多少。'],['incomplete','等待补充信息','先收录也没关系，有空再确认日期或瓶身期限。'],['normal','日常陈列','按自己的节奏，照顾每一瓶日常。']]
 const sections=computed(()=>page.value==='home'?definitions.map(([key,title,description])=>({key,title,description,items:visible.value.filter(i=>bucket(i,day.value)===key)})).filter(s=>s.items.length):[{key:'archive',title:archiveFilter.value==='discarded'?'停用记录':archiveFilter.value==='empty'?'空瓶记录':'所有归档',description:'用完和停用，都是一次认真做出的选择。',items:visible.value}].filter(s=>s.items.length))
 const save=next=>{if(storageBlocked.value){error.value='请先处理本地数据读取问题，原数据未被覆盖';return false}try{localStorage.setItem(KEY,JSON.stringify(next));items.value=next;return true}catch{error.value='保存失败，可能是浏览器空间不足。请先导出备份，或减少照片数量。';return false}}
 const toast=m=>{clearTimeout(toastTimer);notice.value=m;toastTimer=setTimeout(()=>notice.value='',3000)}
 const switchPage=p=>{page.value=p;filter.value='全部';search.value='';archiveFilter.value='all'}
 const focusDialog=async target=>{previousFocus=document.activeElement;await nextTick();target.value?.focus()}
 const close=()=>{dialog.value=false;progress.value=null;previousFocus?.focus()}
 const trap=e=>{if(e.key==='Escape'){close();return}if(e.key!=='Tab')return;const nodes=[...e.currentTarget.querySelectorAll('button,input,select,summary,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
 const open=(item=null,retro=false)=>{editing.value=item?.id||null;form.value=item?{...item,months:parseInt(item.pao)||'',dateMode:!item.openedDate?'unknown':item.datePrecision==='approximate'?'approximate':'exact',rating:item.rating||'',stopReason:item.stopReason||'',emptyDate:item.emptyDate||today()}:fresh();if(retro)form.value.status='empty';detailsOpen.value=!!item;error.value='';dialog.value=true;focusDialog(nameInput)}
 const setDateMode=mode=>{form.value.dateMode=mode;if(mode==='today')form.value.openedDate=today();else if(mode==='unknown')form.value.openedDate=''}
 const fuzzy=days=>{form.value.dateMode='approximate';form.value.openedDate=new Date(dateValue(today())-days*86400000).toISOString().slice(0,10)}
 const submit=()=>{try{
  const f=form.value,name=f.name.trim(),months=f.months===''?null:Number(f.months)
  if(!name)throw Error('请填写产品名称')
  const opened=f.dateMode==='unknown'?null:f.dateMode==='today'?today():f.openedDate
  if(f.dateMode!=='unknown'&&!Number.isFinite(dateValue(opened)))throw Error('请选择开封日期，或选择「记不清」')
  if(opened>today())throw Error('开封日期不能晚于今天')
  if(months!==null&&(!Number.isInteger(months)||months<1||months>120))throw Error('期限需为 1–120 个月，未确认时可以留空')
  if(f.status!=='active'&&(!Number.isFinite(dateValue(f.emptyDate))||f.emptyDate>today()))throw Error('请选择有效的归档日期，不能晚于今天')
  const record={dataVersion:2,id:editing.value||crypto.randomUUID(),name,category:f.category.trim()||'未分类',image:f.image,openedDate:opened,datePrecision:opened?(f.dateMode==='approximate'?'approximate':'exact'):'unknown',pao:months?months+'M':'',expireDate:opened&&months?expiry(opened,months):null,amount:f.amount,status:f.status,emptyDate:f.status==='active'?null:f.emptyDate,rating:f.status==='empty'?(f.rating||null):null,stopReason:f.status==='discarded'?(f.stopReason||null):null,nextCheck:f.status==='active'?(f.nextCheck||null):null}
  const next=editing.value?items.value.map(i=>i.id===editing.value?record:i):[...items.value,record]
  if(save(next)){close();toast(record.status==='active'?record.expireDate?'已收录':'已收录，期限可稍后补充':'已保存到档案')}
 }catch(e){error.value=e.message}}
 const upload=async e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')){error.value='请选择图片文件';return}photoBusy.value=true;try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);form.value.image=canvas.toDataURL('image/jpeg',.75);bitmap.close()}catch{error.value='图片读取失败，请换一张 JPG 或 PNG 图片'}finally{photoBusy.value=false;e.target.value=''}}
 const check=i=>{progress.value=i;amount.value=i.amount;rating.value='';stopReason.value='';checkDays.value=7;progressStep.value='amount';error.value='';focusDialog(closeProgress)}
 const update=(finish=false,discard=false)=>{
  const next=items.value.map(i=>i.id===progress.value.id?{...i,dataVersion:2,amount:finish&&!discard?0:amount.value,status:finish?(discard?'discarded':'empty'):'active',rating:finish&&!discard?(rating.value||null):i.rating,stopReason:discard?(stopReason.value||null):null,emptyDate:finish?today():i.emptyDate,nextCheck:finish||!Number(checkDays.value)?null:new Date(dateValue(today())+Number(checkDays.value)*86400000).toISOString().slice(0,10)}:i)
  if(save(next)){close();toast(finish?'已归档，心得可以稍后再补':Number(checkDays.value)?`余量已更新，${checkDays.value} 天后在应用内提示复查`:'余量已更新，不设置复查')}
 }
 const remove=()=>{if(confirm('确定删除这件产品？删除后可通过备份恢复。')&&save(items.value.filter(i=>i.id!==editing.value))){close();toast('已删除')}}
 const backup=()=>{try{const content=storageBlocked.value?(localStorage.getItem(KEY)||''):JSON.stringify({version:2,exportedAt:today(),items:items.value},null,2);const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`DPAO-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{error.value='备份读取失败，请检查浏览器存储权限'}}
 const restore=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text()),next=normalize(Array.isArray(data)?data:data.items);if(!confirm(`导入 ${next.length} 条记录，将替换当前数据。建议先导出备份。继续吗？`))return;localStorage.setItem(KEY,JSON.stringify(next));items.value=next;storageBlocked.value=false;error.value='';toast('已恢复备份')}catch(e){error.value='导入失败：'+e.message}finally{e.target.value=''}}
 return {page,filter,search,archiveFilter,notice,error,storageBlocked,dialog,form,editing,photoBusy,detailsOpen,progress,rating,amount,categories,active,expired,soon,archived,visible,sections,privacy,acknowledge,day,today,daysLeft,deadlineText,amountText,amountOptions,checkDays,stopReason,progressStep,nameInput,closeProgress,close,trap,setDateMode,switchPage,open,submit,upload,fuzzy,check,update,remove,backup,restore}
},template:`
<div class="shell">
 <header><a class="brand" href="#" @click.prevent="switchPage('home')">D.PAO<span>数字梳妆台</span></a><span class="private">你的日常，慢慢用好</span></header>
 <main>
  <div class="intro"><p class="eyebrow">A LITTLE CARE, EVERY DAY</p><h1>{{page==='home'?'今天，照顾好哪一瓶？':'用完之后，留下心得。'}}</h1><p class="subtitle">{{page==='home'?'需要关注的放在前面，其余的按自己的节奏慢慢用。':'空瓶是完成，停用是选择。感受可以以后再补。'}}</p></div>
  <aside v-if="privacy" class="privacy-note"><strong>先认识一下你的梳妆台</strong><p>记录只保存在当前设备的这个浏览器，电脑和手机暂不互通。更换浏览器或清除网站数据前，请先导出备份。</p><div><button @click="acknowledge">知道了</button><button @click="backup">导出备份</button></div></aside>
  <div class="stats"><div><strong>{{active.length}}</strong><span>正在使用</span></div><div class="rose"><strong>{{expired}}</strong><span>已超期 / 可能超期</span></div><div><strong>{{soon}}</strong><span>30 天内到期 / 预计到期</span></div></div>
  <div v-if="error&&!dialog&&!progress" role="alert" class="error">{{error}}</div>
  <div class="toolbar"><nav><button :class="{selected:page==='home'}" @click="switchPage('home')">梳妆台</button><button :class="{selected:page==='archive'}" @click="switchPage('archive')">使用档案</button></nav><button v-if="page==='home'" class="primary" @click="open()">＋ 收录产品</button><button v-else class="primary" @click="open(null,true)">＋ 补登空瓶</button></div>
  <div v-if="page==='archive'" class="archive-tabs" aria-label="档案类型"><button :class="{tint:archiveFilter==='all'}" @click="archiveFilter='all'">全部</button><button :class="{tint:archiveFilter==='empty'}" @click="archiveFilter='empty'">已用完 {{archived.filter(i=>i.status==='empty').length}}</button><button :class="{tint:archiveFilter==='discarded'}" @click="archiveFilter='discarded'">已停用 {{archived.filter(i=>i.status==='discarded').length}}</button></div>
  <div class="filters"><input aria-label="搜索产品" placeholder="搜索你的瓶瓶罐罐" v-model="search"><select aria-label="筛选分类" v-model="filter"><option>全部</option><option v-for="cat in categories" :key="cat">{{cat}}</option></select></div>
  <div v-if="!visible.length" class="empty"><span>♧</span><h2>{{search||filter!=='全部'?'没有找到符合条件的产品':page==='home'?'给第一瓶留个位置':'这里会留下你的使用故事'}}</h2><p>{{page==='home'?'记住名字，就可以先收录。日期、照片和余量都能稍后补。':'用完或停用后归档，也可以补登以前的空瓶。'}}</p><button v-if="page==='home'&&!search" @click="open()" class="primary">收录第一瓶</button></div>
  <section v-for="section in sections" :key="section.key" class="shelf" :data-section="section.key">
   <div class="section-heading"><h2>{{section.title}} <span>{{section.items.length}}</span></h2><p>{{section.description}}</p></div>
   <div class="grid"><article v-for="item in section.items" :key="item.id" class="card">
    <div class="photo"><img v-if="item.image" :src="item.image" :alt="item.name"><div v-else class="bottle">♧</div><span class="badge" :class="{warn:section.key==='expired'||section.key==='soon'}">{{item.status==='active'?(section.key==='expired'?(item.datePrecision==='approximate'?'可能超期':'已超期'):section.key==='soon'?'临近期限':section.key==='incomplete'?'待补充':section.key==='check'?'待复查':'使用中'):item.status==='discarded'?'已停用':'已空瓶'}}</span></div>
    <div class="card-body"><p class="category">{{item.category}}</p><h2>{{item.name}}</h2>
     <template v-if="item.status==='active'">
      <div class="remaining"><strong>{{deadlineText(item,day)}}</strong><span>{{amountText(item.amount)}}</span></div>
      <div v-if="item.amount!==null" class="meter"><i :style="{width:item.amount+'%'}"></i></div>
      <p v-if="section.key==='soon'&&item.amount>60" class="action-hint">余量还多，留意使用安排</p>
      <p class="dates">{{item.openedDate?(item.datePrecision==='approximate'?'约于 ':'开封 ')+item.openedDate:'开封时间待确认'}}<br>{{item.pao?'瓶身期限 '+item.pao:'开封后使用期限待确认'}}<template v-if="item.expireDate"><br>{{item.datePrecision==='approximate'?'预计用至 ':'建议用至 '}}{{item.expireDate}}</template></p>
      <div class="actions"><button @click="open(item)">{{section.key==='incomplete'?'补充信息':'编辑'}}</button><button class="tint" @click="check(item)">{{section.key==='expired'?'处理状态':'更新进度'}}</button></div>
     </template>
     <template v-else><p class="archive-result">{{item.status==='discarded'?'停用原因：'+(item.stopReason||'暂未记录'):({good:'✨ 愿意回购',normal:'💧 无功无过',bad:'🥀 不再回购'}[item.rating]||'心得待补充')}}</p><p class="dates">归档于 {{item.emptyDate||'未记录'}}</p><button class="tint wide" @click="open(item)">{{item.status==='empty'&&!item.rating?'补写心得':'编辑记录'}}</button></template>
    </div>
   </article></div>
  </section>
  <footer><p>期限以瓶身说明为准；如有变质或不适，请及时停用。</p><div><button @click="backup">导出备份</button><label class="text-button">导入备份<input type="file" accept="application/json,.json" @change="restore" hidden></label></div><p>数据仅保存在当前浏览器，电脑与手机暂不互通。复查提示仅在打开应用时显示。</p></footer>
 </main>
 <div v-if="dialog" class="overlay" @click.self="close" @keydown="trap"><section role="dialog" aria-modal="true" aria-labelledby="form-title" class="modal">
  <div class="modal-head"><h2 id="form-title">{{editing?'编辑记录':form.status==='empty'?'补登空瓶':'先记住这一瓶'}}</h2><button aria-label="关闭" @click="close">✕</button></div>
  <p v-if="!editing" class="hint">{{form.status==='active'?'只填名称也能收录，其余信息慢慢补。':'记录一次完成，评价可以稍后再写。'}}</p>
  <form @submit.prevent="submit">
   <label>产品名称<input ref="nameInput" v-model="form.name" required maxlength="100" placeholder="例如：珂润保湿面霜"></label>
   <template v-if="form.status==='active'">
    <fieldset><legend>什么时候开封的？</legend><div class="choice-row"><button v-for="opt in [{v:'today',l:'今天开的'},{v:'exact',l:'记得日期'},{v:'approximate',l:'大概记得'},{v:'unknown',l:'记不清，稍后补'}]" :key="opt.v" type="button" :aria-pressed="form.dateMode===opt.v" :class="{tint:form.dateMode===opt.v}" @click="setDateMode(opt.v)">{{opt.l}}</button></div></fieldset>
    <label v-if="form.dateMode==='exact'||form.dateMode==='approximate'">{{form.dateMode==='approximate'?'大概开封日期':'开封日期'}}<input aria-label="开封日期" type="date" v-model="form.openedDate" :max="today()" required></label>
    <div v-if="form.dateMode==='approximate'" class="quick"><button v-for="opt in [{d:7,l:'一周前'},{d:30,l:'一个月前'},{d:90,l:'三个月前'},{d:180,l:'半年前'}]" :key="opt.d" type="button" @click="fuzzy(opt.d)">{{opt.l}}</button></div>
    <p v-if="form.dateMode==='approximate'" class="hint">这是估计时间，首页也会显示「约」或「预计」，不会当作精确期限。</p>
   </template>
   <template v-else><label>归档日期<input type="date" v-model="form.emptyDate" :max="today()" required></label><label v-if="form.status==='empty'">使用心得<select v-model="form.rating"><option value="">稍后再说</option><option value="good">✨ 愿意回购</option><option value="normal">💧 无功无过</option><option value="bad">🥀 不再回购</option></select></label><label v-else>停用原因<select v-model="form.stopReason"><option value="">暂不填写</option><option v-for="r in ['超期','不适','变质','不喜欢','其他']" :key="r">{{r}}</option></select></label></template>
   <details :open="detailsOpen" @toggle="detailsOpen=$event.target.open"><summary>照片、分类{{form.status==='active'?'、期限与余量':''}} <span>选填</span></summary>
    <label class="photo-upload"><img v-if="form.image" :src="form.image" alt="产品照片"><span v-else>＋ 添加瓶身照片</span><input type="file" accept="image/*" @change="upload" hidden></label><button v-if="form.image" type="button" class="text-button" @click="form.image=null">移除照片</button>
    <label>分类<input aria-label="分类" v-model="form.category" list="categories" maxlength="30" placeholder="可以稍后分类"><datalist id="categories"><option v-for="c in categories" :key="c" :value="c"/></datalist><small>选择已有分类，或输入自己的分类名称。</small></label>
    <template v-if="form.status==='active'"><label>开封后使用期限（个月）<input type="number" min="1" max="120" v-model="form.months" placeholder="未确认可留空"></label><div class="quick"><button v-for="m in [3,6,12,24]" :key="m" type="button" :class="{tint:Number(form.months)===m}" @click="form.months=m">{{m}}M</button><button type="button" @click="form.months=''">待确认</button></div><p class="hint">以瓶身 PAO 或品牌说明为准。没有确认期限时，不会自动假设为 12 个月。</p><fieldset><legend>大概还剩多少？</legend><div class="choice-row"><button v-for="opt in amountOptions" :key="opt.label" type="button" :aria-pressed="form.amount===opt.value" :class="{tint:form.amount===opt.value}" @click="form.amount=opt.value">{{opt.label}}</button></div></fieldset></template>
   </details>
   <p v-if="error" class="error" role="alert">{{error}}</p><button class="primary wide" :disabled="photoBusy||storageBlocked">{{photoBusy?'照片处理中…':'保存产品'}}</button><button v-if="editing" type="button" class="danger wide" @click="remove">删除产品</button>
  </form>
 </section></div>
 <div v-if="progress" class="overlay" @click.self="close" @keydown="trap"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="progress-title">
  <div class="modal-head"><h2 id="progress-title">{{progressStep==='empty'?'又用完了一瓶':progressStep==='discarded'?'记录一次停用':'这一瓶用得怎么样？'}}</h2><button ref="closeProgress" aria-label="关闭" @click="close">✕</button></div><h3>{{progress.name}}</h3>
  <p v-if="daysLeft(progress,day)<0" class="callout">{{progress.datePrecision==='approximate'?'按估计日期，这瓶可能已超期，请核实开封时间和瓶身说明。':'已超过填写的使用期限，建议停用。'}}可以修正记录，也可以直接归档。</p>
  <template v-if="progressStep==='amount'"><fieldset><legend>大概还剩多少？</legend><div class="choice-row"><button v-for="opt in amountOptions" :key="opt.label" :aria-pressed="amount===opt.value" :class="{tint:amount===opt.value}" @click="amount=opt.value">{{opt.label}}</button></div></fieldset><details><summary>想记得更精确一点？</summary><label>现在还剩 {{amount===null?'未知':amount+'%'}}<input aria-label="精细余量" type="range" min="0" max="100" step="5" :value="amount??50" @input="amount=Number($event.target.value)"></label></details><label>下次什么时候看一眼？<select v-model.number="checkDays"><option :value="7">一周后</option><option :value="14">两周后</option><option :value="30">一个月后</option><option :value="0">暂不安排</option></select></label><p class="hint">复查只在打开应用时提示，不会发送后台通知。</p><button class="primary wide" @click="update()">保存进度</button><hr><button class="tint wide" @click="progressStep='empty'">已经用完了</button><button class="danger wide" @click="progressStep='discarded'">还没用完，决定停用</button></template>
  <template v-else><label v-if="progressStep==='empty'">愿意再买一次吗？<select v-model="rating"><option value="">稍后再说</option><option value="good">✨ 愿意回购</option><option value="normal">💧 无功无过</option><option value="bad">🥀 不再回购</option></select></label><label v-else>为什么决定停用？<select v-model="stopReason"><option value="">暂不填写</option><option v-for="r in ['超期','不适','变质','不喜欢','其他']" :key="r">{{r}}</option></select></label><button class="primary wide" @click="update(true,progressStep==='discarded')">{{progressStep==='empty'?'收入空瓶档案':'保存停用记录'}}</button><button class="wide" @click="progressStep='amount'">返回更新余量</button><p class="hint">不必现在就给结论，之后可以在使用档案里补充。</p></template>
  <p v-if="error" class="error" role="alert">{{error}}</p>
 </section></div>
 <div v-if="notice" class="toast" role="status">{{notice}}</div>
</div>`}).mount('#app')
