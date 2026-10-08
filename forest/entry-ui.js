import { entry } from './entry-data.js?v=cognition-v2';

export function createEntryUI({getState,commit,getWorld,close,openWorkspace,hud,invited=false}) {
  const $=q=>document.querySelector(q);
  const root=$('#role-root');
  function sync() {
    const e=entry(getState());document.body.dataset.experienceRole=e.role||'gate';
    document.body.dataset.experienceMode=e.mode;
    $('#role-badge').textContent=e.mode==='preview'?'正在用参与者视角体验':e.role==='organizer'?'活动组织者':'员工体验';
    $('#preview-return').hidden=!e.preview;
    $('#role-switch').hidden=!!e.preview;
  }
  function gate() {
    close();sync();getWorld()?.town();getWorld()?.cameraRig.zoom(2);getWorld()?.setBlocked(true);
    root.hidden=false;
    root.innerHTML=`<section class="role-welcome" role="dialog" aria-modal="true" aria-labelledby="role-title">
      <h1 id="role-title">你想以哪种身份<br class="role-mobile-break">体验森友会？</h1>
      <p>先选一个角色，接下来只走属于你的那条路。</p>
      <div class="role-choices">
        <button data-action="entry-choose" data-role="employee"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 15 12-10 12 10M7 13v14h18V13M13 27v-9h6v9"/></svg><strong>我是参与活动的同事</strong><span>建自己的小屋，认识新伙伴，<br>一起完成一次协作。</span><b>进入森林</b></button>
        <button data-action="entry-choose" data-role="organizer"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="6" y="7" width="20" height="22" rx="2"/><path d="M11 4v6m10-6v6M10 15h12m-12 6h8"/></svg><strong>我是活动组织者</strong><span>准备村庄，邀请同事，<br>主持活动并查看进度。</span><b>进入村长工作台</b></button>
      </div><small>可操作的本地 Demo · 虚构邻居 · 不与其他设备同步<br>切换体验角色不会删除已填写的资料。</small>
    </section>`;
    root.querySelector('button').focus({preventScroll:true});
  }
  function enter(role) {
    if(!commit({type:'entry:choose',role,invited}))return;
    root.hidden=true;root.innerHTML='';close();sync();hud();
    if(role==='organizer')openWorkspace();
    else getWorld().town();
  }
  function resume() {
    const e=entry(getState());sync();
    if(!e.role){gate();return;}
    root.hidden=true;
    if(e.role==='organizer')openWorkspace();
  }
  function handle(action,d) {
    if(action==='entry-choose'){enter(d.role);return true;}
    if(action==='entry-gate'){if(commit({type:'entry:gate'}))gate();return true;}
    if(action==='entry-preview') {
      if(commit({type:'entry:preview'})){close();sync();getWorld().town();hud();}return true;
    }
    if(action==='entry-preview-return') {
      if(commit({type:'entry:preview-return'})){close();sync();getWorld().town();hud();openWorkspace();}return true;
    }
    return false;
  }
  root.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const buttons=[...root.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  return {sync,gate,resume,handle};
}
