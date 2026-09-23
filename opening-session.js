import {PROJECTS,makeProfile,QUESTIONS} from './opening-content.js?v=grove3';
import {cleanStory,buildStory} from './opening-story.js?v=grove3';
import {prepareEnergy,awardAgreement,awardProject,wateredEnergy,energyAction} from './opening-energy.js?v=grove3';
export const uid=()=>crypto.randomUUID();
const clean=(x,n=1200)=>typeof x==='string'?x.trim().slice(0,n):'';
const color=x=>/^#[0-9a-f]{6}$/i.test(x)?x:'#829475';
export function sanitizeResident(r,id){
 const p=r.profile||{},profile={};for(const k of ['intro','habits','communication','support','experience','offer','growth'])profile[k]=clean(p[k],k==='intro'?100:1200);
 profile.story=cleanStory(p.story,profile);
 const a=r.appearance||{};return {id,name:clean(r.name,20)||'新居民',profile,appearance:{body:['neutral','female','male'].includes(a.body)?a.body:'neutral',hairstyle:[0,1,2,3].includes(a.hairstyle)?a.hairstyle:1,skin:color(a.skin),hair:color(a.hair),outfit:color(a.outfit)},houseColor:color(r.houseColor),ready:!!r.ready,online:true,location:clean(r.location,50)||'小屋',joinedAt:r.joinedAt||Date.now()};
}
export const newRoom=()=>({version:3,townName:'我们的第一片合种林',ledger:[],phase:0,createdAt:Date.now(),residents:{},messages:[],agreements:[],projects:{},visits:[],revision:0,auth:{}});
export const energy=wateredEnergy;
export function standings(room){return PROJECTS.map(p=>({...p,...room.projects[p.id],points:(room.projects[p.id]?.members.length||0)*3+(room.projects[p.id]?.submitted?20:0)})).sort((a,b)=>b.points-a.points);}
// All authority and validation live at the host, never in participant view controls.
export function applyAction(room,actor,action,isHost=false){
 prepareEnergy(room);
 const r=room.residents[actor];if(!r)throw Error('请先加入场次。');if(!action||typeof action.type!=='string')throw Error('操作格式不正确。');const t=action.type,p=action.payload||{};
 if(t==='profile'){room.residents[actor]={...sanitizeResident(p,actor),joinedAt:r.joinedAt};}
 else if(t==='phase'){if(!isHost)throw Error('只有主持人可以切换阶段。');if(![0,1,2,3].includes(p.phase))throw Error('无效阶段');if(p.phase===3&&!Object.values(room.projects).some(p=>p.submitted))throw Error('请先完成一个共建项目。');if(p.phase===3&&energy(room)===0)throw Error('请先收取合作能量，为合种林浇一次水。');room.phase=p.phase;}
 else if(t==='townName'){if(!isHost)throw Error('只有主持人可以修改本场名称。');room.townName=clean(p.name,30)||'我们的第一片合种林';}
 else if(t==='presence'){r.location=clean(p.location,50);r.online=true;}
 else {
  if(room.phase<1||!r.ready)throw Error('请完成入住，并等待主持人开放串门。');
  if(t==='collect'||t==='water'){energyAction(room,actor,t,p);}
  else if(t==='visit'){
   if(p.to===actor||!room.residents[p.to]?.ready)throw Error('这位居民还没准备好。');
   if(!room.visits.some(v=>v.from===actor&&v.to===p.to))room.visits.push({from:actor,to:p.to,at:Date.now()});
   r.location=p.to;
  }else if(t==='message'){
   if(!room.residents[p.to]||p.to===actor)throw Error('请选择一位邻居。');const body=clean(p.body,500);if(!body)throw Error('请写一点想说的话。');
   if(room.messages.filter(m=>m.from===actor&&Date.now()-m.at<60000).length>=12)throw Error('留言太快了，请稍等一分钟。');
   room.messages.push({id:uid(),from:actor,to:p.to,body,at:Date.now()});room.messages=room.messages.slice(-1000);
  }else if(t==='agreement'){
   if(!room.residents[p.to]?.ready||p.to===actor)throw Error('请选择已入住的邻居。');const text=clean(p.text,400);if(!text)throw Error('先写一条具体约定。');
   if(room.agreements.some(a=>[a.from,a.to].includes(actor)&&[a.from,a.to].includes(p.to)&&!a.accepted))throw Error('已有待确认的约定，请先回复。');
   room.agreements.push({id:uid(),from:actor,to:p.to,text,kind:p.kind==='support'?'support':'cooperation',accepted:false,at:Date.now()});
  }else if(t==='accept'){
   const a=room.agreements.find(a=>a.id===p.id);if(!a||a.to!==actor)throw Error('只有收到约定的人可以确认。');a.accepted=true;awardAgreement(room,a);
  }else if(t==='projectJoin'){
   if(room.phase!==2)throw Error('请等待共建阶段。');const def=PROJECTS.find(d=>d.id===p.id);if(!def)throw Error('项目不存在');
   if(room.projects[p.id]?.submitted)throw Error('这个项目已交付。');
   if(Object.values(room.projects).some(project=>project.submitted&&project.members.includes(actor)))throw Error('你已经参与提交过一个项目。');
   for(const project of Object.values(room.projects))project.members=project.members.filter(id=>id!==actor);
   room.projects[p.id]||={id:p.id,members:[],choices:[],text:'',submitted:false};room.projects[p.id].members.push(actor);
  }else if(t==='projectApprove'){
   const project=room.projects[p.id];if(room.phase!==2||!project?.members.includes(actor))throw Error('请在共建阶段加入项目后确认。');if(project.submitted)throw Error('项目已经交付。');if(p.baseRevision!==(project.draftRevision||0))throw Error('伙伴已更新方案，请先读取新稿再确认。');if(project.choices.length<2||project.text.length<10)throw Error('先保存完整讨论稿，再共同确认。');project.approvals=[...new Set([...(project.approvals||[]),actor])];
  }else if(t==='projectSave'){
   if(room.phase!==2)throw Error('当前不在共建阶段。');const project=room.projects[p.id],def=PROJECTS.find(d=>d.id===p.id);if(!project?.members.includes(actor))throw Error('请先加入这个项目。');
   if(p.baseRevision!==(project.draftRevision||0))throw Error('伙伴已更新方案。你的文字仍在，请先复制需要保留的部分，再读取新稿。');
   const choices=[...new Set(Array.isArray(p.choices)?p.choices:[])].filter(i=>Number.isInteger(i)&&i>=0&&i<4);const spent=choices.reduce((s,i)=>s+def.options[i][1],0);if(spent>def.budget)throw Error('材料超出预算，请共同取舍。');
   const text=clean(p.text,1200);if(p.submit&&(choices.length<2||text.length<10||project.members.length<2))throw Error('至少两位居民、两项选择和十字以上的共同方案，才能提交。');
   if(project.submitted)throw Error('项目已提交，不能覆盖。');const changed=JSON.stringify(choices)!==JSON.stringify(project.choices)||text!==project.text;
   const approvals=changed?[actor]:[...new Set([...(project.approvals||[]),actor])].filter(id=>project.members.includes(id));
   if(p.submit&&approvals.length<2)throw Error('先保存讨论稿，再请另一位成员确认这版方案。修改内容后需要重新确认。');Object.assign(project,{choices,text,approvals,draftRevision:(project.draftRevision||0)+(changed?1:0),submitted:!!p.submit,updatedBy:actor,updatedAt:Date.now()});if(p.submit)awardProject(room,project);
  }else throw Error('不支持的操作');
 }
 room.revision++;return room;
}
export function snapshot(room,id){const residents=Object.fromEntries(Object.entries(room.residents).map(([key,r])=>[key,room.phase===0&&key!==id?{id:r.id,name:r.name,ready:r.ready,online:r.online,profile:{}}:r]));return {...room,residents,publicEnergy:energy(room),ledger:(room.ledger||[]).filter(e=>e.owner===id),auth:undefined,messages:room.messages.filter(m=>m.from===id||m.to===id),agreements:room.agreements.filter(a=>a.from===id||a.to===id)};}
export class TownSession{
 constructor(onChange,onStatus,onError){this.onChange=onChange;this.onStatus=onStatus;this.onError=onError;this.links=new Map();this.mode='none';this.id=localStorage.getItem('senyou-person-id')||uid();localStorage.setItem('senyou-person-id',this.id);this.secret=localStorage.getItem('senyou-person-secret')||uid();localStorage.setItem('senyou-person-secret',this.secret);}
 demo(profile){this.close();this.mode='demo';this.room=null;try{this.room=JSON.parse(localStorage.getItem('senyou-opening-demo'));}catch{}if(!this.room?.residents)this.room=newRoom();this.room.residents[this.id]=sanitizeResident(profile,this.id);
  ['阿禾','青岚','小满'].forEach((name,i)=>{const id='demo-'+i;if(this.room.residents[id])return;const answers=Object.fromEntries(QUESTIONS.map((q,j)=>[q.id,(i+j%2)%4]));this.room.residents[id]={...sanitizeResident({name,ready:true,appearance:{body:'neutral',hairstyle:i,skin:'#deb896',hair:'#594334',outfit:['#a0ad87','#c78160','#829bb2'][i]},profile:makeProfile(answers,{experience:'这是一位预设体验居民，展示协作资料的呈现方式。',offer:['一起整理欢迎地图','一起设计安静花园','一起观察森林物种'][i]})},id),demo:true,online:false};});
  for(const r of Object.values(this.room.residents))if(r.demo){r.profile.story=buildStory(r.profile);r.profile.support='';}prepareEnergy(this.room);this.onStatus('独自体验 · 邻居为预设角色');this.publish();
 }
 async host(profile,resume=false){this.close();this.mode='host';this.room=newRoom();let prior;try{prior=JSON.parse(localStorage.getItem('senyou-opening-host'));}catch{}
  if(resume&&prior?.room){this.room=prior.room;this.code=prior.code;Object.values(this.room.residents).forEach(r=>r.online=false);}else this.code=uid().replaceAll('-','').slice(0,16);
  prepareEnergy(this.room);this.room.residents[this.id]=sanitizeResident(profile,this.id);this.room.auth[this.id]=this.secret;
  await this.openPeer('senyou-v2-'+this.code);this.peer.on('connection',conn=>this.hostConnection(conn));this.healthTimer=setInterval(()=>{let changed=false;for(const [id,c] of this.links){if(Date.now()-(c.lastSeen||0)>65000){this.links.delete(id);if(this.room.residents[id])this.room.residents[id].online=false;c.close();changed=true;}}if(changed)this.publish();},10000);this.onStatus('主持人在线 · 场次 '+this.code);this.publish();return this.code;
 }
 async join(code,profile){this.close();this.mode='guest';this.code=clean(code,40).toLowerCase();if(!/^[a-f0-9]{16}$/.test(this.code))throw Error('请输入邀请中的 16 位场次码。');
  await this.openPeer();return new Promise((resolve,reject)=>{const c=this.peer.connect('senyou-v2-'+this.code,{reliable:true,serialization:'json'});this.connection=c;const timer=setTimeout(()=>{c.close();reject(Error('连接超时。请确认主持人保持页面开启，且网络允许实时连接。'));},15000);
   c.on('open',()=>{c.send({type:'join',id:this.id,secret:this.secret,profile});this.lastHostSeen=Date.now();this.healthTimer=setInterval(()=>{if(Date.now()-this.lastHostSeen>65000){c.close();this.onStatus('主持人暂时无响应 · 请重新加入场次');return;}if(c.open)c.send({type:'heartbeat'});},15000);});c.on('data',data=>{if(this.connection!==c)return;this.lastHostSeen=Date.now();if(data.type==='snapshot'){clearTimeout(timer);this.room=data.room;this.onStatus('已连接场次 '+this.code);this.onChange(this.room);resolve();this.settle(data.requestId);}else if(data.type==='error'){clearTimeout(timer);if(data.requestId)this.settle(data.requestId,Error(data.message));else{this.onError(data.message);reject(Error(data.message));}}});c.on('close',()=>{clearTimeout(timer);if(this.connection!==c)return;clearInterval(this.healthTimer);this.onStatus('与主持人断开 · 请用邀请链接重新加入');this.rejectPending('连接已中断，未确认的操作请重新提交。');reject(Error('主持人连接已关闭。'));});c.on('error',e=>{clearTimeout(timer);reject(e);});});
 }
 openPeer(id){return new Promise((resolve,reject)=>{this.onStatus('正在连接实时服务…');if(!globalThis.Peer)return reject(Error('实时组件未加载，请刷新重试。'));const p=new Peer(id,{debug:0});this.peer=p;const timer=setTimeout(()=>{p.destroy();reject(Error('实时服务连接超时，可先独自体验。'));},15000);p.on('open',()=>{clearTimeout(timer);resolve();});p.on('error',e=>{if(this.peer!==p)return;clearTimeout(timer);this.onStatus('实时连接异常');this.onError('连接未成功：'+e.type+'。请检查网络或重新加入。');reject(e);});p.on('disconnected',()=>{if(this.peer===p)this.onStatus('信令断开 · 已连接的居民可继续，新增连接需重试');});});}
 hostConnection(c){let actor=null;const hostRoom=this.room;c.on('data',data=>{if(this.room!==hostRoom)return;try{
   if(!data||JSON.stringify(data).length>18000)throw Error('消息格式不支持。');if(actor&&this.links.get(actor)!==c)throw Error('此连接已被新的登录替代。');c.lastSeen=Date.now();if(actor&&data.type==='heartbeat'){c.send({type:'pong'});return;}if(actor&&data.type==='leave'){this.links.delete(actor);this.room.residents[actor].online=false;this.publish();c.close();return;}
   if(!actor){if(data.type!=='join'||!/^[a-f0-9-]{36}$/.test(data.id)||typeof data.secret!=='string')throw Error('无效的居民身份。');if(Object.keys(this.room.residents).length>=60&&!this.room.residents[data.id])throw Error('本场已达到 60 人上限。');if(this.room.auth[data.id]&&this.room.auth[data.id]!==data.secret)throw Error('身份校验未通过。');if(data.id===this.id)throw Error('主持人不能以居民身份重复加入。');actor=data.id;this.room.auth[actor]=data.secret;this.room.residents[actor]=sanitizeResident(data.profile,actor);const prev=this.links.get(actor);if(prev&&prev!==c)prev.close();this.links.set(actor,c);this.publish();return;}
   applyAction(this.room,actor,data,false);this.publish(actor,data.requestId);
  }catch(e){c.send({type:'error',message:e.message,requestId:data?.requestId});}});
  c.on('close',()=>{if(this.room===hostRoom&&actor&&this.links.get(actor)===c){this.links.delete(actor);if(this.room?.residents[actor])this.room.residents[actor].online=false;this.publish();}});
 }
 send(type,payload={}){if(this.mode==='guest'){if(!this.connection?.open)throw Error('已断线，操作尚未发送。请重新加入场次。');const requestId=uid();this.pending||=new Map();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.settle(requestId,Error('主持人尚未确认这次操作，请检查连接后重试。')),10000);this.pending.set(requestId,{resolve,reject,timer});this.connection.send({type,payload,requestId});});}
  applyAction(this.room,this.id,{type,payload},this.mode==='host'||this.mode==='demo');this.publish();
 }
 simulateAccept(id){if(this.mode!=='demo')throw Error('仅限独自体验');const a=this.room.agreements.find(a=>a.id===id);if(!a)throw Error('约定不存在');applyAction(this.room,a.to,{type:'accept',payload:{id}},false);this.publish();}
 simulateProject(id){if(this.mode!=='demo')throw Error('仅限独自体验');applyAction(this.room,'demo-0',{type:'projectJoin',payload:{id}},false);this.publish();}
 simulateApproval(id){if(this.mode!=='demo')throw Error('仅限独自体验');applyAction(this.room,'demo-0',{type:'projectApprove',payload:{id,baseRevision:this.room.projects[id]?.draftRevision||0}},false);this.publish();}
 settle(id,error){const p=this.pending?.get(id);if(!p)return;clearTimeout(p.timer);this.pending.delete(id);error?p.reject(error):p.resolve();}
 rejectPending(message){for(const id of this.pending?.keys()||[])this.settle(id,Error(message));}
 publish(actor,requestId){if(!this.room)return;try{if(this.mode==='host')localStorage.setItem('senyou-opening-host',JSON.stringify({code:this.code,room:this.room}));if(this.mode==='demo')localStorage.setItem('senyou-opening-demo',JSON.stringify(this.room));}catch{this.onError('本机存储空间不足，请及时下载自己的居民卡。');}if(this.mode==='host')for(const [id,c] of this.links)if(c.open)c.send({type:'snapshot',room:snapshot(this.room,id),requestId:id===actor?requestId:undefined});this.onChange(snapshot(this.room,this.id));}
 close(){clearInterval(this.healthTimer);if(this.mode==='guest'&&this.connection?.open)this.connection.send({type:'leave'});this.rejectPending('已离开原场次。');this.connection=null;this.links.clear();this.peer?.destroy();this.peer=null;}
}
