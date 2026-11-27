import {modes,newTrack,sample,addPoint,pause,resume,summary,achievement,shareText,intent,estimatedCalories} from './outdoor.mjs';

const key='liyang.outdoor.history.v1';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
const button=(text,fn)=>Object.assign(el('button',text),{type:'button',onclick:fn});
const href=(text,value)=>Object.assign(el('a',text),{href:value});
const flex=(...items)=>{const row=el('div');row.className='row';row.append(...items);return row;};
const num=n=>(n/1000).toFixed(2);
const clock=ms=>{const seconds=Math.floor(ms/1000);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
let track,watch,sequence=0,latest,feedback='',adultWeight=null, generated=new Map(), update=()=>{}, quiet=false, narration, isMuted=()=>false, onSpeak=null, onStop=null;
const read=()=>{
  try{const rows=JSON.parse(localStorage.getItem(key));return Array.isArray(rows)?rows.filter(row=>row?.stats&&Object.hasOwn(modes,row.stats.mode)&&Array.isArray(row.points)):[];}catch{return [];}
};
function say(text){
  if(quiet||isMuted()||document.hidden)return;
  if(onSpeak){onSpeak(text);return;}
  const speech=window.speechSynthesis;
  const voice=speech?.getVoices().find(v=>v.localService&&/^zh[-_]CN$/i.test(v.lang));
  if(!voice)return;
  speech.cancel();narration=new SpeechSynthesisUtterance(text);narration.voice=voice;narration.lang='zh-CN';speech.speak(narration);
}
function stopSpeech(){onStop?.();if(narration)window.speechSynthesis?.cancel();narration=null;}
function stopWatch(){
  sequence++;
  if(watch!==undefined)navigator.geolocation?.clearWatch(watch);
  watch=undefined;
}
function trackLocation(){
  const generation=++sequence;
  let lastAnnouncement=Date.now();
  watch=navigator.geolocation.watchPosition(position=>{
    if(generation!==sequence||!track||track.state!=='running')return;
    const point=sample(position);
    if(!point){feedback='定位精度不足，未计入里程。';update();return;}
    addPoint(track,point);
    feedback='正在记录前台定位';
    if(Date.now()-lastAnnouncement>5*60*1000&&track.metres>0){
      lastAnnouncement=Date.now();say('目前记录 '+num(track.metres)+' 公里。请注意路况。');
    }
    update();
  },error=>{
    if(generation!==sequence)return;
    feedback=error.code===1?'未获定位权限，未记录距离。':'当前没有可靠定位，记录已暂停。';
    stopWatch();if(track)pause(track,Date.now());update();
  },{enableHighAccuracy:true,maximumAge:0,timeout:18000});
}
function run(action,mode){
  if(action==='start'){
    if(track)return '已有运动在进行，请先结束。';
    if(!navigator.geolocation||!window.isSecureContext)return '当前环境不能安全使用定位。';
    track=newTrack(mode);
    feedback='等待定位授权与信号';
    trackLocation();
  }
  if(action==='pause'&&track?.state==='running'){
    pause(track,Date.now());stopWatch();feedback='已暂停定位';
  }
  if(action==='resume'&&track?.state==='paused'){
    resume(track,Date.now());feedback='等待恢复定位';trackLocation();
  }
  if(action==='finish'&&track){
    const stats=summary(track,Date.now());
    stats.kcal=estimatedCalories(stats,adultWeight);adultWeight=null;
    stopWatch();
    if(stats.count>=2&&stats.metres>0){
      latest={stats,date:Date.now(),points:track.points};track=undefined;
      try{localStorage.setItem(key,JSON.stringify([latest,...read()].slice(0,8)));feedback='记录已保存在此浏览器。';}
      catch{feedback='浏览器空间不可用；本次结果只保留在当前会话。';}
      say('完成'+modes[stats.mode]+'，记录 '+num(stats.metres)+' 公里，时长 '+Math.round(stats.ms/60000)+' 分钟。'+(stats.kcal!==null?'预计消耗 '+stats.kcal+' 千卡。':'')+(achievement(stats)?'解锁湖山一公里。':'')+'找个安全的地方休息一下吧。');
      prepareVideo(latest);
      dispatchEvent(new CustomEvent('liyang:achievement',{detail:{kind:'outdoor',badge:achievement(stats)}}));
    }else{track=undefined;feedback='没有足够的有效定位点，未生成运动记录。';}
  }
  update();
  return feedback||'当前没有可执行的运动记录。';
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&track?.state==='running'){
    pause(track,Date.now());stopWatch();stopSpeech();feedback='离开前台后已暂停定位，回来可手动恢复。';update();
  }
});
addEventListener('pagehide',()=>{
  if(track?.state==='running')pause(track,Date.now());
  stopWatch();stopSpeech();
});
function mapDraw(canvas,points){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#e5eddf';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#cad9c5';ctx.lineWidth=1;
  for(let x=0;x<w;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=0;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  if(!points.length){ctx.fillStyle='#405a50';ctx.font='19px system-ui';ctx.fillText('等待有效定位',20,40);return;}
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of points){minX=Math.min(minX,p.lon);maxX=Math.max(maxX,p.lon);minY=Math.min(minY,p.lat);maxY=Math.max(maxY,p.lat);}
  const middle=(minY+maxY)/2, ratio=Math.cos(middle*Math.PI/180)||1;
  const span=Math.max((maxX-minX)*ratio/(w-44),(maxY-minY)/(h-44),.0000001);
  ctx.strokeStyle='#176d60';ctx.lineWidth=4;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  let end,lastSegment;
  for(const p of points){
    end=[w/2+(p.lon-(minX+maxX)/2)*ratio/span,h/2-(p.lat-middle)/span];
    if(lastSegment!==p.segment)ctx.moveTo(...end);else ctx.lineTo(...end);
    lastSegment=p.segment;
  }
  ctx.stroke();ctx.fillStyle='#d59a39';ctx.beginPath();ctx.arc(...end,6,0,2*Math.PI);ctx.fill();
}
function download(blob,name){
  const url=URL.createObjectURL(blob),link=Object.assign(el('a'),{href:url,download:name});
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
let coverPromise;
function coverImages(){return coverPromise??=Promise.all(['./experience-photo.jpg','./experience-bamboo.jpg'].map(src=>new Promise(resolve=>{
  const img=new Image();
  const done=value=>{clearTimeout(timer);img.onload=img.onerror=null;resolve(value);};
  const timer=setTimeout(()=>done(null),2500);
  img.onload=()=>done(img);img.onerror=()=>done(null);img.src=src;
}))).then(photos=>{if(photos.some(photo=>!photo))coverPromise=null;return photos;});}
function artwork(canvas,stats,phase=1,photos=[]){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#183c35';ctx.fillRect(0,0,w,h);
  const img=photos[Math.min(1,Math.floor(phase*2))]||photos[0];
  if(img){const z=Math.max(w/img.width,h/img.height)*(1+phase*.05);ctx.drawImage(img,(w-img.width*z)/2,(h-img.height*z)/2,img.width*z,img.height*z);}
  const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#0c282a45');shade.addColorStop(.36,'#0e302d28');shade.addColorStop(.67,'#102e2edb');shade.addColorStop(1,'#102e2e');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#f5d89a';ctx.font='bold 24px system-ui';ctx.fillText('溧阳慢游所  /  湖山日记',28,58);
  ctx.fillStyle='#fff';ctx.font='bold 42px system-ui';ctx.fillText(modes[stats.mode]+'完成',28,420);
  ctx.font='bold 72px system-ui';ctx.fillText(num(stats.metres*Math.min(1,phase*1.6))+' km',28,510);
  ctx.strokeStyle='#ffffff60';ctx.beginPath();ctx.moveTo(28,535);ctx.lineTo(450,535);ctx.stroke();
  ctx.font='24px system-ui';ctx.fillText('时长  '+clock(stats.ms),28,578);
  if(Number.isFinite(stats.kcal))ctx.fillText('预计消耗  '+stats.kcal+' kcal',28,615);
  if(achievement(stats)){ctx.fillStyle='#f5d89a';ctx.fillText('虚拟成就 · '+achievement(stats),28,655);}
  ctx.fillStyle='#e4eade';ctx.font='16px system-ui';ctx.fillText('主题风景素材，非本次运动实拍',28,748);
  ctx.font='13px system-ui';ctx.fillText('天目湖：William Ng / 静湖：赵文博',28,777);ctx.fillText('CC BY-SA 4.0 · 不含私人位置或轨迹',28,801);
}
function prepareVideo(record){
  if(!record||generated.has(record.date))return;
  const item={state:'pending'};generated.set(record.date,item);
  while(generated.size>3)generated.delete(generated.keys().next().value);
  video(record.stats).then(({blob,scored})=>{Object.assign(item,{state:'ready',blob,scored});})
    .catch(error=>{Object.assign(item,{state:'error',error:error.message});})
    .finally(()=>dispatchEvent(new CustomEvent('liyang:video-ready',{detail:record.date})));
}
async function filmScore(context){
  if(!context)return null;
  try{
    await context.resume();
    const response=await fetch('./experience-audio/music-lake.mp3',{signal:AbortSignal.timeout(2500)});
    if(!response.ok)return null;
    const buffer=await context.decodeAudioData(await response.arrayBuffer());
    const bus=context.createMediaStreamDestination(),source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffer;source.connect(gain).connect(bus);
    return {track:bus.stream.getAudioTracks()[0],start(){
      const now=context.currentTime;
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(.25,now+.3);
      gain.gain.setValueAtTime(.25,now+2.4);
      gain.gain.linearRampToValueAtTime(0,now+2.95);
      source.start(now,0,3);
    }};
  }catch{return null;}
}
let encoding=false;
async function video(stats){
  if(encoding)throw Error('另一段短片正在编码，请稍后再试。');
  const c=Object.assign(el('canvas'),{width:480,height:854});
  if(!window.MediaRecorder||!c.captureStream)throw Error('此浏览器不支持视频导出，可使用图片或文案。');
  const type=['video/mp4','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!type)throw Error('此浏览器没有受支持的视频编码。');
  encoding=true;
  let context,stream;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    try{if(Audio)context=new Audio();}catch{/* Silent fallback. */}
    const [photos,score]=await Promise.all([coverImages(),Promise.race([
      filmScore(context),new Promise(resolve=>setTimeout(resolve,2800,null))
    ])]);
    artwork(c,stats,0,photos);stream=c.captureStream(18);
    let scored=Boolean(score?.track),recorder;
    if(scored)stream.addTrack(score.track);
    try{recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:1800000});}
    catch(error){
      if(!scored)throw error;
      stream.removeTrack(score.track);score.track.stop();scored=false;
      recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:1800000});
    }
    const chunks=[];
    const started=performance.now();
    const blob=await new Promise((resolve,reject)=>{
      let timer,deadline;
      const cleanup=()=>{clearInterval(timer);clearTimeout(deadline);};
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{cleanup();reject(Error('视频编码失败。'));};
      recorder.onstop=()=>{cleanup();resolve(new Blob(chunks,{type:recorder.mimeType}));};
      if(scored)score.start();
      recorder.start();
      timer=setInterval(()=>{
        const p=Math.min(1,(performance.now()-started)/1750);
        artwork(c,stats,p,photos);
        if(performance.now()-started>=3000&&recorder.state==='recording')recorder.stop();
      },55);
      deadline=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},4500);
    });
    if(!blob.size)throw Error('没有生成有效视频。');
    return {blob,scored};
  }finally{
    stream?.getTracks().forEach(track=>track.stop());
    if(context)void context.close().catch(()=>{});
    encoding=false;
  }
}
function settlement(panel,record,onRedraw){
  const {stats}=record;
  const status=el('p');status.setAttribute('role','status');
  const style=el('select');style.setAttribute('aria-label','文案样式');
  for(const [id,label] of [['note','小红书笔记'],['short','短视频文案'],['social','朋友圈总结']])style.append(new Option(label,id));
  const text=el('textarea');text.readOnly=true;text.rows=4;text.setAttribute('aria-label','分享文案');
  const refresh=()=>{text.value=shareText(stats,style.value);};
  style.onchange=refresh;refresh();
  const create=button('导出竖屏视频',async()=>{
    create.disabled=true;status.textContent='正在本机编码…';
    try{const existing=generated.get(record.date);if(existing?.state==='pending'){status.textContent='短片正在生成，请稍后查看预览。';return;}const {blob}=existing?.blob?existing:await video(stats);download(blob,'liyang-outdoor.'+(blob.type.includes('mp4')?'mp4':'webm'));status.textContent='视频已生成，不会自动发布。';}
    catch(error){status.textContent=error.message;}
    finally{create.disabled=false;}
  });
  const badge=achievement(stats);
  panel.append(el('h3',modes[stats.mode]+'结算'),el('p',num(stats.metres)+' 公里 · '+clock(stats.ms)+' · '+stats.count+' 个有效定位点'));if(Number.isFinite(stats.kcal))panel.append(el('p','预计消耗 '+stats.kcal+' 千卡（成人粗略估算）'));
  const movie=el('div');movie.className='trip-film';panel.append(movie);
  let previewUrl;
  const filmStatus=()=>{
    if(!movie.isConnected)return;
    const item=generated.get(record.date);
    if(item?.state==='ready'){
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      previewUrl=URL.createObjectURL(item.blob);
      const player=el('video');player.controls=true;player.playsInline=true;player.preload='metadata';player.src=previewUrl;
      movie.replaceChildren(el('h3','你的旅行纪念短片'),player,el('p',item.scored?'本地配乐 · 不含私人轨迹':'无声短片 · 不含私人轨迹'));
    }else if(item?.state==='pending')movie.textContent='正在自动生成旅行纪念短片…';
    else{
      const retry=button(item?'重试生成短片':'生成旅行纪念短片',()=>{generated.delete(record.date);prepareVideo(record);filmStatus();});
      movie.replaceChildren(...(item?[el('p','短片未生成：'+item.error)]:[]),retry);
    }
  };
  const ready=e=>{if(e.detail===record.date)filmStatus();};
  addEventListener('liyang:video-ready',ready);
  const cleanup=new MutationObserver(()=>{
    if(panel.isConnected&&movie.isConnected)return;
    removeEventListener('liyang:video-ready',ready);
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    cleanup.disconnect();
  });
  cleanup.observe(document.body,{childList:true,subtree:true});filmStatus();
  if(badge)panel.append(el('p','已解锁虚拟成就：'+badge+'。无实物奖励。'));
  panel.append(button('播报结算',()=>say(modes[stats.mode]+'完成，记录 '+num(stats.metres)+' 公里。')),style,text,flex(
    button('导出文案',()=>download(new Blob([text.value],{type:'text/plain;charset=utf-8'}),'liyang-outdoor.txt')),
    button('导出海报',async()=>{
      const c=Object.assign(el('canvas'),{width:480,height:854});artwork(c,stats,1,await coverImages());
      c.toBlob(blob=>{if(blob)download(blob,'liyang-outdoor.png');});
    }),create),el('p','导出件不包含地址、轨迹或身份，不会自动发布。'),status);
  const routeCanvas=Object.assign(el('canvas'),{width:480,height:220,className:'outdoor-map'});
  const replay=button('回放私人轨迹',()=>{
    replay.disabled=true;let start=performance.now();
    const draw=()=>{
      if(!routeCanvas.isConnected)return;
      const fraction=Math.min(1,(performance.now()-start)/4500);
      mapDraw(routeCanvas,record.points.slice(0,Math.max(1,Math.ceil(record.points.length*fraction))));
      if(fraction<1)requestAnimationFrame(draw);else{replay.disabled=false;}
    };
    requestAnimationFrame(draw);
  });
  panel.prepend(replay,routeCanvas);
  mapDraw(routeCanvas,record.points);
  panel.append(button('删除此记录',()=>{
    if(!confirm('删除本机这条运动记录？'))return;
    try{localStorage.setItem(key,JSON.stringify(read().filter(item=>item.date!==record.date)));if(latest?.date===record.date)latest=undefined;generated.delete(record.date);onRedraw();}
    catch{status.textContent='无法清除本机记录。';}
  }));
}
export function mountOutdoor(panel,options={}){
  isMuted=options.isMuted||(()=>false);onSpeak=options.onSpeak||null;onStop=options.onStop||null;
  panel.classList.add('outdoor');
  const mode=el('select');mode.setAttribute('aria-label','运动类型');
  for(const [id,label] of Object.entries(modes))mode.append(new Option(label,id));
  if(track)mode.value=track.mode;
  const data=el('div');data.className='outdoor-metrics';
  const status=el('p');status.setAttribute('role','status');
  const canvas=Object.assign(el('canvas'),{width:480,height:220,className:'outdoor-map'});
  canvas.setAttribute('aria-label','本机运动轨迹示意');
  const weight=el('input');weight.type='number';weight.min='30';weight.max='250';weight.step='0.5';weight.placeholder='可不填';weight.setAttribute('aria-label','成人体重公斤');const weightLabel=el('label','成人可选：体重（公斤，仅用于本次估算）');weightLabel.append(weight);const adult=el('input');adult.type='checkbox';const adultLabel=el('label',' 我是成年人，希望估算本次热量消耗');adultLabel.prepend(adult);weight.disabled=true;adult.onchange=()=>{weight.disabled=!adult.checked;if(!adult.checked)weight.value='';};const start=button('开始并授权定位',()=>{adultWeight=adult.checked&&mode.value!=='family'&&weight.value?Number(weight.value):null;weight.value='';adult.checked=false;weight.disabled=true;run('start',mode.value);redraw();});
  const toggle=button('暂停',()=>run(track?.state==='running'?'pause':'resume'));
  const end=button('结束运动',()=>{run('finish');drawHistory();});
  const voice=el('input');voice.type='checkbox';voice.checked=!quiet;
  const voiceLabel=el('label','使用本机普通话播报');
  voiceLabel.prepend(voice);
  voice.onchange=()=>{quiet=!voice.checked;if(quiet)stopSpeech();else if(!window.speechSynthesis?.getVoices().some(v=>v.localService&&/^zh[-_]CN$/i.test(v.lang)))status.textContent='设备未提供本机普通话音色，仍可查看文字。';};
  const history=el('div');
  const preparation=el('section');preparation.className='ride-preparation';
  const optionsPanel=el('details');optionsPanel.className='ride-options';
  optionsPanel.append(el('summary','播报与热量设置'),voiceLabel,adultLabel,weightLabel);
  preparation.append(el('p','骑行中请勿操作屏幕。仅在前台记录，轨迹保存在此浏览器。'),mode,start,optionsPanel);
  start.className='action';
  const runningControls=flex(toggle,end);
  panel.append(preparation,status,runningControls,data,canvas,history);
  function redraw(){
    preparation.hidden=Boolean(track);runningControls.hidden=!track;data.hidden=!track;canvas.hidden=!track;
    mode.disabled=Boolean(track);start.disabled=Boolean(track);toggle.disabled=!track;end.disabled=!track;
    toggle.textContent=track?.state==='paused'?'恢复':'暂停';
    const stats=track&&summary(track,Date.now());
    const items=[
      ['距离',stats?.count?num(stats.metres)+' km':'—'],['记录时长',stats?clock(stats.ms):'—'],
      ['当前速度',track?.speed!=null?(track.speed*3.6).toFixed(1)+' km/h':'—'],
      ['平均速度',stats?.count>1&&stats.ms>0?(stats.metres*3600/stats.ms).toFixed(1)+' km/h':'—'],
      ['海拔',track?.altitude!=null?Math.round(track.altitude)+' m':'—'],
      ['累计爬升',stats?.climb!=null?stats.climb+' m':'—'],['预计消耗',stats&&estimatedCalories(stats,adultWeight)!==null?estimatedCalories(stats,adultWeight)+' kcal':'—']
    ];
    data.replaceChildren(...items.map(([label,value])=>{const item=el('div');item.append(el('small',label),el('strong',value));return item;}));
    if(status.textContent!==feedback)status.textContent=feedback;
    mapDraw(canvas,track?.points||[]);
  }
  function drawHistory(){
    const rows=read();
    if(!rows.length&&!latest){history.replaceChildren(el('p','暂无已完成运动。'));return;}
    history.replaceChildren(el('h3','本机运动历史'));
    function show(item){details.replaceChildren();settlement(details,item,drawHistory);}
    for(const item of rows)history.append(button(new Date(item.date).toLocaleDateString()+' · '+modes[item.stats.mode]+' · '+num(item.stats.metres)+' km',()=>show(item)));
    const details=el('div');history.append(details);
    show(latest||rows[0]);
  }
  update=redraw;drawHistory();redraw();
  const ticker=setInterval(()=>{if(!panel.isConnected){clearInterval(ticker);if(update===redraw)update=()=>{};}else if(track)redraw();},1000);
}
export function mountAssistant(panel,{backend=false,onSpeak=()=>{},onStop=()=>{},lookup}={}){
  const form=el('form'),input=el('input'),status=el('p');input.maxLength=100;input.required=true;
  input.setAttribute('aria-label','给小溧的指令');input.placeholder='例如：打开地图';
  const submit=el('button','执行');submit.type='submit';
  form.append(input,submit);status.setAttribute('role','status');
  const results=el('div');results.className='assistant-results';
  let request=0;
  form.onsubmit=async event=>{
    event.preventDefault();
    const id=++request, question=input.value.trim();
    if(!question)return;
    results.replaceChildren();onStop();
    const command=intent(question);
    if(!command){
      if(/难过|不开心|孤独|疲惫/.test(question)){status.textContent='听起来这会儿不太轻松。可以先停一停，找个舒服的地方休息，或和信任的人聊聊。';onSpeak(status.textContent);return;}
      if(!lookup){status.textContent='这条指令未识别。本地资料问答需要连接 App 后端。';return;}
      status.textContent='查找本地资料中…';
      try{
        const records=await lookup(question);
        if(id!==request||!panel.isConnected)return;
        status.textContent=records.length?'找到 '+records.length+' 条本地资料。':'暂未找到可核实的资料。实时票价、开放和天气请向官方渠道确认。';
        for(const record of records){
          const entry=el('article');entry.append(el('h3',record.place),el('p',record.fact));
          if(/^https:\/\/(?:[\w-]+\.)*(?:liyang|changzhou)\.gov\.cn\//i.test(record.source))entry.append(href('查看原始资料',record.source));
          if(['lake','bamboo','tea','road','history','village'].includes(record.id))entry.append(href('进入完整讲解','#guide/'+record.id));
          results.append(entry);
        }
        if(records.length)onSpeak(records[0].place+'。'+records[0].fact);
      }catch{if(id===request&&panel.isConnected)status.textContent='本地资料暂不可用，请稍后重试。';}
      return;
    }
    if(command.kind==='navigate'){
      if(!backend&&command.target==='routes'){status.textContent='路线生成需要连接 App 后端。';return;}
      location.hash='#'+command.target;
    }
    else if(command.kind==='start'){
      if(track){status.textContent='已有运动在进行。';return;}
      location.hash='#outdoor';
      status.textContent=run('start',command.mode);
    }else if(!track){status.textContent='当前没有进行中的运动。';}
    else {status.textContent=run(command.kind);location.hash='#outdoor';}
  };
  panel.classList.add('outdoor');
  panel.append(form,flex(...['介绍南山竹海','查询路线','查看成就'].map(command=>button(command,()=>{input.value=command;form.requestSubmit();})),button('停止播报',onStop)),status,results,href('进入运动记录','#outdoor'));
}
export function badges(){
  return [...new Set(read().map(row=>achievement(row.stats)).filter(Boolean))];
}
