(() => {
  const $=id=>document.getElementById(id);
  const el=(tag,text,cls)=>Object.assign(document.createElement(tag),{textContent:text||'',className:cls||''});
  const button=(text,action,cls)=>Object.assign(el('button',text,cls),{type:'button',onclick:action});
  const link=(text,href,cls)=>Object.assign(el('a',text,cls),{href});
  const row=(...nodes)=>{const r=el('div','','row');r.append(...nodes);return r;};
  const storage=(key,value)=>{try{if(value!==undefined)localStorage.setItem(key,value);return localStorage.getItem(key);}catch{return null;}};
  const hosted=globalThis.LiyangStatic;
  const tracks={};
  const pending=new Map();
  const ambient={lake:'lake',bamboo:'bamboo',tea:'tea',road:'birds',history:'bamboo',village:'birds'};
  const chapters=()=>api('explorer/chapters');
  let muted=storage('liyang.web.mute')==='true', volume=Number(storage('liyang.web.volume')||.7), noticeTimer, openingTimer;
  let openingFinished=false,welcomeStarted=false,welcomePending=false;
  function notice(text){
    $('toast').hidden=false;$('toast').textContent=text;clearTimeout(noticeTimer);
    noticeTimer=setTimeout(()=>{$('toast').hidden=true;},2600);
  }
  function mixVolumes(){
    for(const [channel,track] of Object.entries(tracks)){
      track.audio.volume=track.level*volume*(tracks.voice?.speaking && ['music','ambience'].includes(channel) ? .30 : 1);
    }
  }
  function stop(channel){
    for(const key of channel?[channel]:Object.keys(tracks)){
      const track=tracks[key];
      pending.delete(key);
      if(track){track.audio.pause();track.audio.removeAttribute('src');track.audio.load();delete tracks[key];}
    }
    mixVolumes();
  }
  function begin(channel,track){
    if(muted||document.hidden||tracks[channel]!==track)return;
    pending.delete(channel);
    track.audio.play().catch(error=>{
      if(tracks[channel]!==track||muted)return;
      if(error.name==='NotAllowedError')pending.set(channel,track);
      else if(error.name!=='AbortError')notice('音频暂时无法播放，可继续阅读字幕。');
    });
  }
  function play(channel,name,level,loop=false){
    if(muted)return;
    if(tracks[channel]?.name===name&&loop)return;
    stop(channel);
    const audio=new Audio('./experience-audio/'+name+'.mp3');
    const track={audio,name,level};
    tracks[channel]=track;
    audio.loop=loop;audio.volume=level*volume;
    if(channel==='voice'){
      audio.onplaying=()=>{
        if(name==='voice-welcome'){welcomeStarted=true;welcomePending=false;}
        track.speaking=true;mixVolumes();document.querySelector('.guide-face')?.classList.add('talking');
      };
      const end=()=>{track.speaking=false;mixVolumes();document.querySelector('.guide-face')?.classList.remove('talking');};
      audio.onpause=end;
      audio.onended=()=>{end();if(name==='voice-welcome'&&!openingFinished)finishOpening();};
    }
    begin(channel,track);
  }
  function env(id,voice,opening){
    play('music',hosted&&!opening?'music-'+id:'opening',.24,true);
    play('ambience',ambient[id]||'lake',.52,true);
    if(voice)play('voice',voice,.88);
  }
  const gesture=()=>{for(const [channel,track] of pending)begin(channel,track);};
  for(const name of ['pointerdown','touchstart','keydown','click'])document.addEventListener(name,gesture,{passive:true,capture:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){stop('voice');stop('effect');for(const key of ['music','ambience'])tracks[key]?.audio.pause();}
    else for(const key of ['music','ambience'])if(tracks[key])begin(key,tracks[key]);
  });
  addEventListener('pagehide',()=>stop());
  function icon(id,markup,label){
    $(id).innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+markup+'</svg>';
    $(id).setAttribute('aria-label',label);$(id).title=label;
  }
  function soundIcon(){
    icon('mute','<path d="M3 9h4l5-4v14l-5-4H3z"/>'+(muted?'<path d="m16 10 5 5m0-5-5 5"/>':'<path d="M16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>'),muted?'开启声音':'静音');
    $('mute').setAttribute('aria-pressed',String(muted));
  }
  soundIcon();
  $('mute').onclick=()=>{
    muted=!muted;storage('liyang.web.mute',String(muted));soundIcon();
    if(muted)stop();else currentSound?.();
  };
  icon('full','<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>','全屏');
  $('full').onclick=async()=>{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if($('phone').classList.contains('filled')){$('phone').classList.remove('filled');return;}
    try{if(!$('phone').requestFullscreen)throw Error();await $('phone').requestFullscreen();}
    catch{$('phone').classList.add('filled');}
  };
  let archive=0, profileQueue=Promise.resolve(), ephemeralToken;
  async function api(path,body,token){
    if(hosted)return hosted.query(path,body);
    const response=await fetch('/api/'+path,{
      method:body===undefined?'GET':'POST',
      headers:{'Content-Type':'application/json',...(token?{'X-Explorer-Token':token}:{})},
      ...(body!==undefined?{body:JSON.stringify(body)}:{})
    });
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'暂时无法连接');
    return data;
  }
  function progress(body){
    if(hosted)return hosted.progress(body);
    const next=profileQueue.then(async()=>{
      const result=await api('mini/progress',body,storage('liyang.web.token')||ephemeralToken);
      if(result.token){ephemeralToken=result.token;storage('liyang.web.token',result.token);}
      if(body?.action==='clear'){ephemeralToken=undefined;storage('liyang.web.token','');}
      return result;
    });
    profileQueue=next.catch(()=>{});return next;
  }
  let scene={id:'lake',photo:true}, currentSound;
  const canvas=$('land'), ctx=canvas.getContext('2d'), motion=matchMedia('(prefers-reduced-motion: reduce)');
  function paint(t){if(ctx)globalThis.LiyangScene.paint(ctx,t,scene);}
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.ceil(canvas.clientWidth*ratio);canvas.height=Math.ceil(canvas.clientHeight*ratio);
    ctx?.setTransform(canvas.width/360,0,0,canvas.height/640,0,0);paint(0);
  }
  new ResizeObserver(resize).observe(canvas);
  let frame,last=0;
  function tick(now){if(now-last>=31){paint(now/1000);last=now;}frame=requestAnimationFrame(tick);}
  function animate(){
    cancelAnimationFrame(frame);paint(0);
    if(!motion.matches&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',animate);motion.addEventListener('change',animate);animate();
  function theme(id,{photo=false,voice,game=false,opening=false}={}){
    scene={id,photo,game,x:.22,actorY:389,count:0,matched:[],ready:false,reward:false};
    $('world').classList.toggle('photo',photo);
    currentSound=()=>env(id,voice,opening);currentSound();paint(0);
  }
  function sheet(title){
    const panel=el('section','','sheet content');panel.append(el('h2',title));$('view').replaceChildren(panel);return panel;
  }
  function finishOpening(){
    if(openingFinished)return;
    openingFinished=true;
    welcomePending=!welcomeStarted;
    location.hash='#explore';
  }
  function home(){
    theme('lake',{photo:true,voice:openingFinished?'':'voice-welcome',opening:true});
    const intro=el('section','','hero');
    const credit=el('small');
    if(hosted)credit.append(link('天目湖实景 · William Ng · CC BY-SA 4.0','./CREDITS.txt'));
    else credit.textContent='天目湖实景 · William Ng · CC BY-SA 4.0';
    intro.append(el('p','江苏 · 溧阳','eyebrow'),el('h1','溧阳慢游所'),el('p','在湖山之间，慢一点走。'),
      link('开始慢游','#explore','action'),credit);
    $('view').append(intro);
    if(!openingFinished)openingTimer=setTimeout(finishOpening,9000);
  }
  async function explore(ticket){
    theme('bamboo',{voice:welcomePending?'voice-welcome':hosted?'voice-city':undefined});
    const panel=sheet('沿着湖山走');
    panel.classList.add('map-content');
    const quick=row(link('小溧导游','#guide','action'),link('吃住游','#directory','action'));
    panel.append(quick);
    const list=el('div','','stops');panel.append(list);
    for(const entry of await chapters()){
      if(ticket!==archive)return;
      const stop=el('article','','listing');
      const place=link(entry.place,'#guide/'+entry.id,'stop-name');
      const mission=link(entry.title,'#game/'+entry.id,'stop-game');
      stop.append(place,mission);
      list.append(stop);
    }
  }
  async function guide(ticket,id){
    const places=await api('travel/guide');
    if(ticket!==archive)return;
    const place=places.find(item=>item.id===id)||places[0];
    theme(place.id,{photo:place.id==='lake',voice:'voice-guide-'+place.id});
    const panel=sheet('跟着小溧慢游');
    panel.classList.add('scene-content');
    const face=el('div','小溧','guide-face');
    if(tracks.voice&&!tracks.voice.audio.paused)face.classList.add('talking');
    panel.append(link('返回慢游地图','#explore'),face,el('h3',place.place),el('p',place.fact),row(
      button('重听讲解',()=>play('voice','voice-guide-'+place.id,.88)),
      link('资料来源',place.source),
      link('去这一站探险','#game/'+place.id,'action')
    ));
    for(const item of places)panel.append(link(item.place,'#guide/'+item.id,'listing'));
  }
  const era={qin:'history',mask:'bamboo',museum:'road',craft:'tea'};
  async function culture(ticket,id){
    const years=await api('city/timeline');
    if(ticket!==archive)return;
    const exhibit=years.find(item=>item.id===id)||years[0];
    const lecture=hosted?'voice-era-'+exhibit.id:'voice-guide-'+(exhibit.id==='craft'?'tea':'history');
    theme(era[exhibit.id]||'history',{voice:lecture});
    const panel=sheet('溧阳时间机器');
    panel.classList.add('scene-content');
    const timeline=row(...years.map(item=>link(String(item.year),'#culture/'+item.id,item.id===exhibit.id?'action':'')));
    panel.append(timeline,el('h3',exhibit.artifact),el('p',exhibit.fact),el('p',exhibit.label,'muted'),link('档案来源',exhibit.source));
    const result=el('p');result.setAttribute('role','status');
    panel.append(el('h3',exhibit.question));
    exhibit.choices.forEach((choice,index)=>panel.append(button(choice,async()=>{
      try{
        const verdict=await api('city/quiz',{id:exhibit.id,choice:index});
        result.textContent=verdict.correct?'答对了。':'再找找档案中的线索。';
        if(verdict.correct)play('effect','reward',.84);
      }catch(error){result.textContent=error.message;}
    },'choice')));
    panel.append(result);
    panel.append(button('重听讲解',()=>play('voice',lecture,.88),'choice'));
  }
  async function passport(ticket){
    theme('village');
    const panel=sheet('电子探险护照');
    if(hosted)panel.append(el('p','本机体验记录，仅保存在此浏览器，不是正式服务器记录。','muted'));
    const [state,entries]=await Promise.all([progress(),chapters()]);
    if(ticket!==archive)return;
    panel.append(el('h3','虚拟积分 '+state.points));
    if(!state.rewards.length)panel.append(el('p','还没有徽章，去湖山找到第一枚吧。'));
    for(const badge of state.rewards){
      const name=entries.find(entry=>entry.id===badge.chapter)?.title||badge.chapter;
      panel.append(el('p',name+' · '+(badge.mode==='teen'?'研学徽章':'故事徽章'),'listing'));
    }
    const label=el('label','声音音量 ');
    const range=Object.assign(el('input'),{type:'range',min:0,max:1,step:.05,value:volume});
    range.oninput=()=>{volume=Number(range.value);storage('liyang.web.volume',String(volume));mixVolumes();};
    label.append(range);
    panel.append(label,el('p','本机匿名档案。不采集儿童姓名、照片或定位。','muted'),button('清除本机档案',async()=>{
      if(!confirm('清除本机积分与徽章？此操作不能撤销。'))return;
      try{await progress({action:'clear'});if(ticket===archive)route();}
      catch(error){notice(error.message);}
    },'choice'));
  }
  async function directory(ticket,id){
    theme('village');
    const panel=sheet('吃住游目录');
    if(hosted){
      panel.append(el('p','公开体验版未连接实时商家、住宿和路线目录。'),link('返回地点导览','#guide','action'));
      return;
    }
    const filters={all:'全部',food:'美食',lodging:'民宿',village:'乡村',route:'路线',merchant:'商家'};
    const index=Object.hasOwn(filters,id||'')?id:'all';
    panel.append(row(...Object.entries(filters).map(([key,label])=>link(label,'#directory/'+key,index===key?'action':''))));
    const records=await api('directory?kind='+(index==='all'?'':index));
    if(ticket!==archive)return;
    if(!records.length)panel.append(el('p','暂无已审核记录。','listing'));
    for(const record of records){
      const entry=el('article','','listing');
      entry.append(el('h3',record.title),el('p',record.travel.address||record.detail),el('span','来源：'+record.source));
      panel.append(entry);
    }
  }
  async function game(ticket,id){
    const chapter=(await chapters()).find(item=>item.id===id);
    if(ticket!==archive)return;
    if(!chapter)throw Error('找不到这个章节。');
    const spec=globalThis.LiyangPuzzles.specs[id];
    let mode='kid', moves=[], first=null, ready=false, awarded=false, busy=false, message='';
    theme(id,{game:true,voice:'voice-story-'+id+'-kid'});
    const stage=el('div','','playfield'), actor=button('操控角色',()=>{scene.x=Math.min(.9,scene.x+.08);paint(0);});
    stage.append(actor);
    actor.onpointerdown=event=>{actor.setPointerCapture(event.pointerId);move(event);};
    actor.onpointermove=event=>{if(actor.hasPointerCapture(event.pointerId))move(event);};
    actor.onkeydown=event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      scene.x=Math.max(.09,Math.min(.91,scene.x+(event.key==='ArrowLeft'?-.07:.07)));paint(0);event.preventDefault();
    };
    function move(event){
      const bounds=canvas.getBoundingClientRect();
      scene.x=Math.max(.09,Math.min(.91,(event.clientX-bounds.left)/bounds.width));paint(0);
    }
    const intro=el('div','','game-intro'), dock=el('section','','sheet');
    $('view').append(stage,intro,dock);
    scene.count=chapter.tiles.length;
    function reset(){
      moves=[];first=null;ready=false;awarded=false;message='';scene.reward=false;scene.x=.22;render();
    }
    function narrate(){play('voice','voice-story-'+id+'-'+mode,.88);}
    function pick(index){
      if(ready||busy)return;
      if(id==='tea'){
        if(index===first||moves.includes(index))return;
        if(first===null)first=index;
        else{
          if(chapter.tiles[first]===chapter.tiles[index])moves.push(first,index);
          else message='没有配对，再找找。';
          first=null;
        }
      }else moves.push(index);
      ready=globalThis.LiyangPuzzles.solved(id,moves,chapter.tiles);
      if(!ready&&id!=='tea'&&moves.length>=spec.moves.length){moves=[];message='再试一次，已有奖励不会扣除。';}
      else if(ready){message='';play('effect','unlock',.55);}
      scene.x=Math.min(.88,.22+moves.length*.1);
      render();
    }
    async function answer(choice){
      if(busy||awarded)return;
      busy=true;render();
      try{
        const result=await progress({action:'finish',chapter:id,mode,choice,moves});
        if(ticket!==archive)return;
        awarded=true;message=result.awarded?'找到宝藏！10 积分与徽章已入护照。':'这枚徽章已在护照中。';
        play('effect','reward',.84);
      }catch(error){message=error.message;}
      finally{busy=false;if(ticket===archive)render();}
    }
    function render(){
      scene.ready=ready;scene.matched=moves;
      intro.replaceChildren(el('h2',chapter.title),el('p',mode==='kid'?chapter.story:chapter.research));
      dock.replaceChildren(row(link('返回地图','#explore'),button(mode==='kid'?'切到研学':'切到童话',()=>{
        if(busy)return;mode=mode==='kid'?'teen':'kid';reset();narrate();
      }),button('听小溧',narrate)));
      if(awarded){
        dock.append(el('p',message),row(button('打开宝箱',()=>{
          if(scene.reward)return;scene.reward=true;paint(0);play('effect','unlock',.88);notice('景点导读已解锁。');
        }),link('查看景点','#guide/'+id,'action'),link('查看护照','#passport')));
      }else if(ready){
        const quiz=chapter[mode];
        dock.append(el('h3',quiz.question),button('朗读题目',()=>{
          if(quiz.source)notice('新题目前只有文字版。');else play('voice','voice-quiz-'+id+'-'+mode,.88);
        }));
        quiz.choices.forEach((choice,index)=>{const b=button(choice,()=>answer(index),'choice');b.disabled=busy;dock.append(b);});
      }else{
        dock.append(el('p',spec.hint),el('p',id==='tea'?'已配对 '+moves.length/2+' / 3':moves.map(index=>chapter.tiles[index]).join(' → '),'muted'));
        const order=['lake','road','village'].includes(id)?[2,0,1]:chapter.tiles.map((_,i)=>i);
        dock.append(row(...order.map(index=>{
          const hidden=id==='tea'&&!moves.includes(index)&&first!==index;
          const b=button(hidden?'翻牌 '+(index+1):chapter.tiles[index],()=>pick(index));
          b.disabled=id!=='bamboo'&&(moves.includes(index)||first===index);
          return b;
        }),button('重试',reset)));
      }
      if(message&&!awarded)dock.append(el('p',message,'muted'));
      paint(0);
    }
    render();
  }
  async function route(){
    clearTimeout(openingTimer);
    stop('voice');stop('effect');currentSound=undefined;
    const ticket=++archive;
    const [page,id]=location.hash.slice(1).split('/');
    const name=['explore','guide','culture','passport','directory','game'].includes(page)?page:'home';
    if(name!=='home'&&!openingFinished){
      welcomePending=name==='explore'&&!welcomeStarted;
      openingFinished=true;
    }
    const tab=['guide','directory','game'].includes(name)?'explore':name;
    for(const a of document.querySelectorAll('[data-nav]')){
      if(a.dataset.nav===tab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    }
    $('view').className='view '+name;
    $('view').replaceChildren();
    try{
      if(name==='home')home();
      else await ({explore,guide,culture,passport,directory,game})[name](ticket,id);
    }catch(error){
      if(ticket===archive){const panel=sheet('暂时没有连上');panel.append(el('p',error.message),button('重试',route));}
    }
  }
  addEventListener('hashchange',route);
  route();
})();
