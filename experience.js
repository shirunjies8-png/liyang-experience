(() => {
  const $=id=>document.getElementById(id);
  const copy=text=>localeData?.text?.(text)||text;
  const el=(tag,text,cls)=>{
    const translated=copy(text),node=Object.assign(document.createElement(tag),{textContent:translated||'',className:cls||''});
    if(translated!==text)node.lang=locale;
    return node;
  };
  const button=(text,action,cls)=>Object.assign(el('button',text,cls),{type:'button',onclick:action});
  const link=(text,href,cls)=>Object.assign(el('a',text,cls),{href});
  const art=id=>'./experience-art-'+id+'.webp';
  const sceneNames={lake:'湖畔水光',bamboo:'竹林幽径',tea:'茶山晨雾',road:'山野公路',history:'地方文化展厅',village:'乡间田园'};
  function scenicImage(id,cls='scene-picture',real=false){const photo=real&&['lake','bamboo'].includes(id);const img=Object.assign(el('img','',cls),{src:photo?(id==='lake'?'./experience-photo.jpg':'./experience-bamboo.jpg'):art(id),alt:photo?sceneNames[id]+'实景':(sceneNames[id]||'研学场景')+'主题插画（非实景）',loading:'lazy'});return img;}
  const row=(...nodes)=>{const r=el('div','','row');r.append(...nodes);return r;};
  const storage=(key,value)=>{try{if(value!==undefined)localStorage.setItem(key,value);return localStorage.getItem(key);}catch{return null;}};
  const hosted=globalThis.LiyangStatic;
  const visitorModule=import('./visitor-i18n.mjs').catch(()=>null);
  let visitor,locale='zh-CN',localeData,accessibility={};
  const translate=(key,fallback)=>localeData?.ui[key]||fallback;
  document.querySelector('.skip-content').onclick=event=>{event.preventDefault();$('view').focus();};
  const accessCopy={
    'zh-CN':['无障碍','大字','高对比度','减少动效','仅文字','设置保存在本机。无障碍设施请向景区核实。'],
    en:['Accessibility','Large text','High contrast','Reduce motion','Text only','Settings stay on this device. Confirm accessible facilities with the venue.'],
    ja:['アクセシビリティ','文字を大きく','高コントラスト','動きを減らす','文字のみ','設定はこの端末に保存されます。設備は施設にご確認ください。'],
    ko:['접근성','큰 글자','고대비','동작 줄이기','텍스트만','설정은 이 기기에만 저장됩니다. 편의 시설은 방문 장소에 확인하세요.']
  };
  function applyAccessibility(){
    for(const name of ['large','contrast','motion','text'])document.documentElement.toggleAttribute('data-access-'+name,Boolean(accessibility[name]));
    if(accessibility.text){cancelVoice();stop('voice');}
    document.dispatchEvent(new Event('liyang-accessibility'));
  }
  function visitorRead(text,lang,status){
    status.lang=lang;status.textContent=text;
    if(accessibility.text||muted)return;
    cancelVoice();stop('voice');
    const synth=window.speechSynthesis,voice=visitor?.matchVoice(synth?.getVoices()||[],lang);
    const unavailable=()=>{status.lang=locale;status.textContent=translate('noVoice','本机无可用语音，请阅读文字。');};
    if(!voice||typeof SpeechSynthesisUtterance==='undefined'){unavailable();return;}
    const line=new SpeechSynthesisUtterance(text);utterance=line;line.lang=lang;line.voice=voice;line.volume=volume;line.rate=.94;
    line.onstart=()=>{if(utterance===line)voiceStatus('',true,text);};
    line.onend=()=>{if(utterance===line){utterance=null;voiceStatus('');}};
    line.onerror=()=>{if(utterance===line){utterance=null;voiceStatus('');unavailable();}};
    try{synth.speak(line);}catch{line.onerror();}
  }
  function welcomeVoice(status){
    if(locale==='zh-CN'){
      speakLocal('你好，我是小溧。欢迎来到溧阳。',{retry:false,rate:.92,
        onUnavailable:()=>voiceStatus('本机音色未启动，可播放备用样音',false,'你好，我是小溧。欢迎来到溧阳。')});
      return;
    }
    const output=status||document.querySelector('.home-companion .companion-status');
    if(output)visitorRead(translate('welcome',''),locale,output);
  }
  function utilityStatus(){const status=el('p');status.setAttribute('role','status');return status;}
  async function setLocale(value){
    if(!visitor?.supported(value))return;
    const data=await visitor.loadLocale(value);
    locale=value;localeData=data;storage(visitor.preference,value);
    await route();$('view').focus();
  }
  function visitorPage(){
    theme('lake',{photo:true});const panel=sheet(translate('visitor','国际游客'));panel.lang=locale;
    const options=selectField('visitor-language',translate('language','语言'),Object.entries(visitor.languages));
    const select=options.querySelector('select');select.value=locale;
    const status=utilityStatus(), welcome=el('p',translate('welcome','欢迎来到溧阳！'));
    select.onchange=async()=>{try{await setLocale(select.value);}catch{status.textContent=translate('error','暂时无法加载，请重试。');}};
    panel.append(options,welcome,row(button(translate('listen','朗读'),()=>visitorRead(welcome.textContent,locale,status)),button(translate('stop','停止'),cancelVoice)),status,link(translate('guide','导游'),'#guide'),el('p',translate('fallback','其他页面暂以简体中文显示。')));
    panel.append(el('h3',translate('phrases','旅行短句')),el('p',translate('draft','外语短句为待校订草稿。')));
    for(const phrase of visitor.phrases){
      const part=el('section','','visitor-phrase'),zh=el('p',phrase[0]);zh.lang='zh-CN';part.append(zh);
      for(const [index,lang] of ['en','ja','ko'].entries()){
        if(locale!=='zh-CN'&&locale!==lang)continue;
        const text=el('p',phrase[index+1]);text.lang=lang;part.append(text);
      }
      part.append(row(...(locale==='zh-CN'?['zh-CN','en','ja','ko']:['zh-CN',locale]).map(lang=>{
        const control=button(visitor.languages[lang],()=>visitorRead(phrase[Object.keys(visitor.languages).indexOf(lang)],lang,status));control.lang=lang;return control;
      })));panel.append(part);
    }
  }
  function accessibilityPage(){
    const labels=accessCopy[locale],panel=sheet(labels[0]);panel.lang=locale;theme('lake');
    for(const [index,key] of ['large','contrast','motion','text'].entries()){
      const label=el('label','','access-option'),input=Object.assign(el('input'),{type:'checkbox',checked:Boolean(accessibility[key])});
      input.onchange=()=>{accessibility[key]=input.checked;storage('liyang.accessibility.v1',JSON.stringify(accessibility));applyAccessibility();};
      label.append(input,document.createTextNode(labels[index+1]));panel.append(label);
    }
    panel.append(el('p',labels[5]),link(translate('visitor','国际游客'),'#visitor'));
  }
  const tracks={};
  let avatarCommand={name:'idle'}, voiceContext, petUpdate=()=>{}, announcePet=()=>{}, outfitChoice=storage('liyang.outfit')||'pine';
  function avatarAction(name){avatarCommand={name};document.dispatchEvent(new Event('liyang-avatar'));}
  function meter(track){
    if(track.analyser){void voiceContext.resume().catch(()=>{});return;}
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      voiceContext??=new Audio();
      void voiceContext.resume().catch(()=>{});
      const analyser=voiceContext.createAnalyser();analyser.fftSize=512;
      const source=voiceContext.createMediaElementSource(track.audio);
      source.connect(analyser).connect(voiceContext.destination);
      Object.assign(track,{analyser,source,pcm:new Float32Array(analyser.fftSize)});
    }catch{/* Retain regular audio playback when Web Audio is unavailable. */}
  }
  function voiceLevel(){
    const track=tracks.voice;
    if(!track?.analyser||!track.speaking||track.audio.paused||accessibility.text||muted)return 0;
    track.analyser.getFloatTimeDomainData(track.pcm);
    return Math.min(1,Math.max(0,(Math.sqrt(track.pcm.reduce((sum,v)=>sum+v*v,0)/track.pcm.length)-.012)*11));
  }
  let familyAudio, familyEpoch=0;
  const familyMode=()=>storage('liyang.family.mode')==='true';
  function familyDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('liyang-family-voice-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('clips');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function clipOp(key,value){const db=await familyDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('clips',value===undefined?'readonly':'readwrite'),store=tx.objectStore('clips');const req=value===undefined?store.get(key):value===null?store.delete(key):store.put(value,key);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
  function stopFamily(){familyEpoch++;if(familyAudio){familyAudio.audio.pause();URL.revokeObjectURL(familyAudio.url);familyAudio=null;}}
  async function familySpeak(key,fallback=true){const epoch=++familyEpoch;let blob;try{blob=await clipOp(key);}catch{}if(epoch!==familyEpoch||muted||accessibility.text||document.hidden)return;if(!blob){if(fallback)speakLocal(typeof fallback==='string'?fallback:voiceLines[key]);else notice('这一句还没有家庭方言录音。');return;}cancelVoice();stop('voice');const url=URL.createObjectURL(blob),audio=new Audio(url);familyAudio={audio,url};audio.volume=volume;const active=()=>familyAudio?.audio===audio;audio.onplaying=()=>{if(active())voiceStatus('家庭方言录音正在播放',true);};audio.onended=()=>{if(active()){stopFamily();voiceStatus('小溧在这里');}};audio.onerror=()=>{if(active()){stopFamily();voiceStatus('方言录音无法播放');}};try{await audio.play();}catch{if(active()){stopFamily();voiceStatus('轻触方言试听按钮播放');}}}

  const pending=new Map();
  // Only local device voices: no browser cloud TTS or overseas API.
  const voiceLines={"voice-welcome":"你好，我是小溧。欢迎来到溧阳慢游所！今天，想一起去湖边走走，还是到竹海探险呢？","voice-city":"欢迎来到慢游地图。你可以从天目湖、竹海、茶田、公路、文化馆和乡村开始。","voice-guide-lake":"天目湖山水园。公开景区名录收录了天目湖山水园。","voice-story-lake-kid":"小溧捡到三片湖光，请把它们按水波的顺序拼回来。","voice-quiz-lake-kid":"哪一个名字出现在景区名录？。天目湖山水园。云上城堡。星光码头","voice-story-lake-teen":"调查员先查景区名录，再校对被打乱的观察记录。","voice-quiz-lake-teen":"写下调查结论前，最适合核对哪项资料？。匿名留言。公开景区名录。故事地图","voice-guide-bamboo":"南山竹海。公开介绍列出了竹文化博物馆等景点。","voice-story-bamboo-kid":"竹叶在岔路口沙沙响，选一条不踩进竹丛的路。","voice-quiz-bamboo-kid":"竹海里有什么展馆？。火车展馆。竹文化博物馆。星球展馆","voice-story-bamboo-teen":"寻找竹文化展陈，再把样地观察次序记在研学笔记。","voice-quiz-bamboo-teen":"以下哪一个调查选题最符合竹文化博物馆？。竹材在当地生活里的用途。海洋鱼类迁徙。极地冰层变化","voice-guide-tea":"天目湖白茶。公开通知划定了天目湖白茶的产地范围。","voice-story-tea-kid":"茶精灵把茶叶印记藏在翻牌背面，找齐三对。","voice-quiz-tea-kid":"地理标志资料讲的是哪种地方特产？。花生。白茶。橘子","voice-story-tea-teen":"把地理标志与店铺宣传区分开，完成一轮图形记忆实验。","voice-quiz-tea-teen":"判断产地范围应该先读什么？。包装颜色。点赞最多的评论。地理标志产地通知","voice-guide-road":"溧阳1号公路。公开资料介绍了1号公路串联乡村及山水旅游资源的作用。","voice-story-road-kid":"把出发、休息和抵达三张卡排成一次小旅行。","voice-quiz-road-kid":"哪条路串起沿途的乡村与风景？。溧阳1号公路。月球公路。水上公路","voice-story-road-teen":"从资料找出公路的串联作用，再把行前核验加入路线计划。","voice-quiz-road-teen":"下面哪项最适合解释一号公路的文旅价值？。路宽决定景点文化。它连接分散的旅游资源。所有路段功能都一样","voice-guide-history":"傩文化博物馆。公开景区名录收录了傩文化博物馆。","voice-story-history-kid":"时光箱需要一个印章，去适合了解傩文化的地方找线索。","voice-quiz-history-kid":"哪个地方可以作为了解傩文化的起点？。海洋馆。滑雪场。傩文化博物馆","voice-story-history-teen":"区分场馆名录与历史证据，练习把线索、出处和结论分开。","voice-quiz-history-teen":"如果名录只列了场馆名称，可以据此确定什么？。场馆列在名录里。展品的全部年代。所有民俗的起源","voice-guide-village":"天目湖镇乡村。天目湖镇公开介绍提到了桂林村和石塘村的乡村旅游。","voice-story-village-kid":"和家人轮流接过农场任务卡，最后一起整理观察。","voice-quiz-village-kid":"哪一个村名出现在天目湖镇介绍里？。云顶村。石塘村。极光村","voice-story-village-teen":"双人分工记录观察与出处，分别复核后再写研学结论。","voice-quiz-village-teen":"两人做乡村研学，怎样减少记录偏差？。由一人凭记忆补全。先写结论再找证据。各自记录并交叉核对","voice-era-qin":"焦尾琴与史贞女。第二批溧阳市级非遗名录列有南渡镇的史贞女故事与天目湖镇的焦尾琴故事。","voice-era-mask":"傩文化资料。溧阳公开景区介绍记载，傩文化博物馆在社渚镇，2015年10月举办了傩文化国际学术研讨会。","voice-era-museum":"溧阳市博物馆。溧阳市博物馆在2025年发布的通知中回顾，馆舍于2017年建成，2024年被评定为国家二级博物馆。","voice-era-craft":"白茶制作与马灯舞。溧阳公开报道介绍，2025年7月的非遗主题展呈现了天目湖白茶制作工艺、蒋塘马灯舞与焦尾琴传说等项目。"};
  let utterance=null, pendingVoice=null, speaking=false, voiceState='正在准备声音', voiceTimer, voiceStarted=false;
  const localVoices=()=> (window.speechSynthesis?.getVoices()||[]).filter(v=>v.localService&&/^(zh[-_]?(CN|Hans)|cmn)(?:[-_]|$)/i.test(v.lang));
  const bestVoice=()=>{const list=localVoices();return list.find(v=>v.name===storage('liyang.voice.name'))||list.find(v=>/premium|enhanced|优质|增强|高品质/i.test(v.name))||list.find(v=>/Meijia|Tingting|婷婷|美佳/i.test(v.name))||list[0];};
  function voiceStatus(text,talking=false,subtitle=''){
    voiceState=text;speaking=talking;
    document.querySelectorAll('[data-voice-status]').forEach(n=>n.textContent=copy(text));
    document.querySelectorAll('[data-voice-subtitle]').forEach(n=>{n.textContent=subtitle;n.hidden=!subtitle;});
    document.querySelectorAll('.guide-face,.companion-avatar').forEach(n=>n.classList.toggle('talking',talking));
    mixVolumes();
  }
  function cancelVoice(){stopFamily();clearTimeout(voiceTimer);pendingVoice=null;const old=utterance;utterance=null;if(old)window.speechSynthesis?.cancel();voiceStatus(muted?'声音已关闭':'小溧在这里');}
  function speakLocal(text,{retry=true,rate=.96,onUnavailable}={}){
    if(muted||accessibility.text||document.hidden)return;
    cancelVoice();stop('voice');
    const synth=window.speechSynthesis,voice=bestVoice();
    if(!synth||!voice||typeof SpeechSynthesisUtterance==='undefined'){
      if(retry)pendingVoice={text,rate};
      voiceStatus('暂无本机普通话音色 · 可查看字幕',false,text);onUnavailable?.();return;
    }
    const normalized=text.replace(/([？！。])。+/g,'$1').replace(/1号公路/g,'一号公路');
    const chunks=[];for(const part of normalized.match(/[^。！？]+[。！？]?|[。！？]/g)||[normalized]){if(chunks.length&&chunks.at(-1).length+part.length<=85)chunks[chunks.length-1]+=part;else chunks.push(part);}
    const line=new SpeechSynthesisUtterance(chunks.shift()||normalized);utterance=line;voiceStarted=false;
    line.voice=voice;line.lang=voice.lang;line.rate=rate;line.pitch=1;line.volume=Math.min(1,volume);
    voiceStatus('正在准备语音 · '+voice.name);
    const finish=(status,subtitle='')=>{if(utterance!==line)return;clearTimeout(voiceTimer);utterance=null;voiceStatus(status,false,subtitle);};
    line.onstart=()=>{if(utterance!==line)return;voiceStarted=true;clearTimeout(voiceTimer);voiceStatus('小溧正在说话',true,line.text);};
    line.onend=()=>{if(utterance!==line)return;finish('小溧在这里');if(chunks.length&&!muted&&!document.hidden)speakLocal(chunks.join(''),{retry,rate});};
    line.onerror=e=>{if(utterance!==line)return;const blocked=e.error==='not-allowed';finish(blocked&&retry?'轻触画面开启人声':'本机语音未成功 · 可查看字幕',line.text+chunks.join(''));if(blocked&&retry)pendingVoice={text:line.text+chunks.join(''),rate};onUnavailable?.();};
    try{synth.speak(line);if(utterance===line&&!voiceStarted)voiceTimer=setTimeout(()=>{if(utterance!==line)return;utterance=null;synth.cancel();voiceStatus(retry?'轻触画面重试人声':'本机语音未成功 · 可查看字幕',false,line.text+chunks.join(''));if(retry)pendingVoice={text:line.text+chunks.join(''),rate};onUnavailable?.();},onUnavailable?1800:4000);}
    catch{finish('本机语音不可用 · 可查看字幕',line.text+chunks.join(''));onUnavailable?.();}
  }
  window.speechSynthesis?.addEventListener('voiceschanged',()=>{if(pendingVoice&&!muted&&bestVoice()){const {text,rate}=pendingVoice;speakLocal(text,{rate});}});

  const ambient={lake:'lake',bamboo:'bamboo',tea:'tea',road:'birds',history:'bamboo',village:'birds'};
  const chapters=()=>api('explorer/chapters');
  let muted=storage('liyang.web.mute')==='true', volume=Number(storage('liyang.web.volume')||.7), noticeTimer;
  function notice(text){
    $('toast').hidden=false;$('toast').textContent=text;clearTimeout(noticeTimer);
    noticeTimer=setTimeout(()=>{$('toast').hidden=true;},2600);
  }
  function mixVolumes(){
    for(const [channel,track] of Object.entries(tracks)){
      track.audio.volume=track.level*volume*((speaking||tracks.voice?.speaking) && ['music','ambience'].includes(channel) ? .30 : 1);
    }
  }
  function stop(channel){
    for(const key of channel?[channel]:Object.keys(tracks)){
      const track=tracks[key];
      pending.delete(key);
      if(track){track.audio.pause();track.source?.disconnect();track.analyser?.disconnect();track.audio.removeAttribute('src');track.audio.load();delete tracks[key];}
    }
    mixVolumes();
  }
  function begin(channel,track){
    if(muted||document.hidden||tracks[channel]!==track)return;
    if(channel==='voice')meter(track);
    pending.delete(channel);
    track.audio.play().catch(error=>{
      if(tracks[channel]!==track||muted)return;
      if(error.name==='NotAllowedError')pending.set(channel,track);
      else if(error.name!=='AbortError')notice('音频暂时无法播放，可继续阅读字幕。');
    });
  }
  function play(channel,name,level,loop=false){
    if(channel==='voice'&&voiceLines[name]){if(familyMode()&&(name.startsWith('voice-story-')||name.startsWith('voice-quiz-')))void familySpeak(name);else speakLocal(voiceLines[name]);return;}
    playRecorded(channel,name,level,loop);
  }
  function playRecorded(channel,name,level,loop=false,fallback, sample=false){
    if(muted||(channel==='voice'&&accessibility.text))return;
    if(channel==='voice')cancelVoice();
    if(tracks[channel]?.name===name&&loop)return;
    stop(channel);
    const audio=new Audio('./experience-audio/'+name+'.mp3');
    const track={audio,name,level};
    tracks[channel]=track;
    if(fallback)audio.addEventListener('error',()=>{
      if(tracks[channel]!==track)return;
      audio.src='./experience-audio/'+fallback+'.mp3';
      begin(channel,track);
    },{once:true});
    audio.loop=loop;audio.volume=level*volume;
    if(channel==='voice'){
      audio.onplaying=()=>{
        track.speaking=true;
        const caption=name==='voice-welcome'?'欢迎来到溧阳慢游所。我是小溧。沿着湖山，慢一点走。':voiceLines[name]||'';
        voiceStatus(sample?'正在播放备用合成样音':'小溧正在播放录音',true,caption);document.dispatchEvent(new Event('liyang-avatar'));
      };
      const end=()=>{track.speaking=false;if(tracks.voice===track)voiceStatus('小溧在这里');};
      audio.onpause=end;
      audio.onended=end;
    }
    begin(channel,track);
  }
  function env(id,voice,opening){
    if(pulsePlaying) {
      const [music,ambience]=pulse.sceneAudio(activeClimate(),activePeriod(),id);
      playRecorded('music',music,.12,true,'opening');
      const sound=pulseSound==='auto'?ambience:pulseSound;
      playRecorded('ambience',sound,.18,true,sound==='rain'?'lake':undefined);
    }else{
      play('music',hosted&&!opening?'music-'+id:'opening',.12,true);
      play('ambience',ambient[id]||'lake',.18,true);
    }
    if(voice)play('voice',voice,.88);
  }
  const gesture=event=>{if(event.target?.closest?.('#mute,[data-voice-action]'))return;for(const [channel,track] of pending)begin(channel,track);if(pendingVoice&&bestVoice()){const {text,rate}=pendingVoice;pendingVoice=null;speakLocal(text,{rate});}};
  for(const name of ['pointerdown','touchstart','keydown','click'])document.addEventListener(name,gesture,{passive:true,capture:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelVoice();stop('voice');stop('effect');for(const key of ['music','ambience'])tracks[key]?.audio.pause();}
    else for(const key of ['music','ambience'])if(tracks[key])begin(key,tracks[key]);
  });
  addEventListener('pagehide',()=>{cancelVoice();stop();});
  function icon(id,markup,label){
    $(id).innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+markup+'</svg>';
    $(id).setAttribute('aria-label',label);$(id).title=label;
  }
  function soundIcon(){
    icon('mute','<path d="M3 9h4l5-4v14l-5-4H3z"/>'+(muted?'<path d="m16 10 5 5m0-5-5 5"/>':'<path d="M16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>'),copy(muted?'开启声音':'静音'));
    $('mute').setAttribute('aria-pressed',String(muted));
  }
  soundIcon();
  $('mute').onclick=()=>{
    muted=!muted;storage('liyang.web.mute',String(muted));soundIcon();
    if(muted){cancelVoice();stop();window.speechSynthesis?.cancel();}else{currentSound?.();if($('view').classList.contains('home')&&storage('liyang.voice.welcome')!=='off')welcomeVoice();}
  };
  icon('full','<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>','全屏');
  $('full').onclick=async()=>{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if($('phone').classList.contains('filled')){$('phone').classList.remove('filled');return;}
    try{if(!$('phone').requestFullscreen)throw Error();await $('phone').requestFullscreen();}
    catch{$('phone').classList.add('filled');}
  };
  let archive=0, profileQueue=Promise.resolve(), ephemeralToken;
  const accountPass=user=>user?.role==='resident'||user?.role==='admin';
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
      if(accountPass(await api('session')))return api('explorer/account',body);
      const result=await api('mini/progress',body,storage('liyang.web.token')||ephemeralToken);
      if(result.token){ephemeralToken=result.token;storage('liyang.web.token',result.token);}
      if(body?.action==='clear'){ephemeralToken=undefined;storage('liyang.web.token','');}
      return result;
    });
    profileQueue=next.catch(()=>{});return next;
  }
  let scene={id:'lake',photo:true}, currentSound;
  const canvas=$('land'), ctx=canvas.getContext('2d'), motion=matchMedia('(prefers-reduced-motion: reduce)');
  const actorArt={};for(const id of ['panda-character','explorer-character']){const img=new Image();img.src=art(id);actorArt[id]=img;}
  function paint(t){if(ctx){const img=actorArt[scene.id==='bamboo'?'panda-character':'explorer-character'];const ready=scene.game&&img?.complete&&img.naturalWidth;globalThis.LiyangScene.paint(ctx,t,{...scene,externalActor:!!ready});if(ready){const x=scene.x*360,y=(scene.actorY||322)+Math.sin(t*5)*2,w=scene.id==='bamboo'?70:85,h=w*img.naturalHeight/img.naturalWidth;ctx.save();ctx.fillStyle='#13382962';ctx.beginPath();ctx.ellipse(x,y+24,25,6,0,0,Math.PI*2);ctx.fill();ctx.drawImage(img,x-w/2,y+22-h,w,h);ctx.restore();}}}
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
    if(!motion.matches&&!accessibility.motion&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',animate);motion.addEventListener('change',animate);animate();
  document.addEventListener('liyang-accessibility',animate);
  function theme(id,{photo=false,voice,game=false,opening=false}={}){
    scene={id,photo,art:true,game,x:.22,actorY:322,count:0,matched:[],ready:false,reward:false};
    $('world').dataset.scene=id; $('world').classList.toggle('illustrated',!photo);
    $('world').classList.toggle('photo',photo);
    currentSound=()=>env(id,voice,opening);currentSound();paint(0);
  }
  function sheet(title){
    const panel=el('section','','sheet content');panel.append(el('h2',title));$('view').replaceChildren(panel);return panel;
  }
  async function startPet(){
    const [{mountXiaoli},{petBehavior,boundPet,petCue}]=await Promise.all([import('./xiaoli-avatar.mjs'),import('./xiaoli-patrol.mjs')]);
    const phone=$('phone'), pet=button('',undefined,'xiaoli-pet'), canvas=el('canvas');
    pet.dataset.voiceAction='';
    const portrait=Object.assign(el('img'),{src:art('companion'),alt:''});canvas.setAttribute('aria-hidden','true');pet.append(portrait,canvas);
    pet.setAttribute('aria-keyshortcuts','ArrowUp ArrowDown ArrowLeft ArrowRight');
    const caption=el('p','','pet-caption');caption.dataset.voiceSubtitle='';caption.hidden=true;
    const prompt=utilityStatus();prompt.className='pet-cue';phone.append(pet,caption,prompt);
    const reduced=()=>accessibility.motion||motion.matches;
    let x=0,y=0,timer=0,step=0,drag=null,dragTime=0,anchored=false,cueTimer=0,lastAtmosphere='';
    announcePet=event=>{
      const cue=petCue(event);if(!cue||document.hidden)return;
      const [action,message]=cue;
      clearTimeout(cueTimer);
      prompt.lang=locale;prompt.textContent=copy(message);
      avatarAction(reduced()?'idle':action);
      cueTimer=setTimeout(()=>{prompt.textContent='';cueTimer=0;},4200);
    };
    const limits=()=>({w:Math.max(0,phone.clientWidth-pet.offsetWidth),h:Math.max(0,phone.clientHeight-pet.offsetHeight-76)});
    function place(px,py){
      const {w,h}=limits(),pos=boundPet(px,py,w,h);x=pos.x;y=pos.y;
      pet.style.transform='translate('+x+'px,'+y+'px)';
    }
    function tick(){
      clearTimeout(timer);
      if(document.hidden||reduced())return;
      if(!drag&&!cueTimer&&!speaking&&!tracks.voice?.speaking&&!pet.matches(':focus-visible')){
        const name=petBehavior({page:phone.dataset.page,weather:activeClimate(),period:activePeriod(),step:step++});
        avatarAction(name);
        if(!anchored&&['walk','run'].includes(name)){
          const {w}=limits();
          place(x>w*.75?x-70:x+70,y);
        }
      }
      timer=setTimeout(tick,4500);
    }
    function redraw(){
      const label=copy('与小溧互动');
      pet.setAttribute('aria-label',label);pet.title=label;
      if(reduced()){clearTimeout(timer);avatarAction('idle');}
      else if(!timer&&!document.hidden)timer=setTimeout(tick,2300);
    }
    document.addEventListener('pulse-change',()=>{
      const weather=activeClimate(),time=activePeriod(),next=weather==='rain'?'rain':['night','late'].includes(time)?'night':'';
      const previous=lastAtmosphere;lastAtmosphere=next;
      if(next&&next!==previous)announcePet(next);
    });
    pet.onclick=()=>{
      if(Date.now()-dragTime<350)return;
      if(speaking||tracks.voice?.speaking){cancelVoice();stop('voice');return;}
      avatarAction('wave');
      const greeting=translate('welcome','你好，我是小溧。欢迎来到溧阳。');
      if(muted||accessibility.text){notice(greeting);return;}
      if(locale==='zh-CN'){
        if(voiceState==='本机音色未启动，可播放备用样音'){
          playRecorded('voice','voice-welcome',.73,false,undefined,true);return;
        }
        welcomeVoice();return;
      }
      visitorRead(greeting,locale,prompt);
    };
    pet.onpointerdown=event=>{if(!event.isPrimary||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:x,startY:y,moved:false};};
    pet.onkeydown=event=>{
      const shifts={ArrowUp:[0,-24],ArrowDown:[0,24],ArrowLeft:[-24,0],ArrowRight:[24,0]};
      if(!Object.hasOwn(shifts,event.key))return;
      event.preventDefault();anchored=true;const [dx,dy]=shifts[event.key];place(x+dx,y+dy);
    };
    pet.onpointermove=event=>{
      if(drag?.id!==event.pointerId)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
      if(!drag.moved)pet.setPointerCapture(event.pointerId);
      drag.moved=true;anchored=true;pet.classList.add('dragging');
      place(drag.startX+event.clientX-drag.x,drag.startY+event.clientY-drag.y);
    };
    function drop(){if(drag?.moved)dragTime=Date.now();drag=null;pet.classList.remove('dragging');}
    for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave'])pet.addEventListener(event,()=>{if(event!=='pointerleave'||!drag?.moved)drop();});
    const size=new ResizeObserver(()=>{const {w,h}=limits();place(anchored?x:w-17,anchored?y:h-12);});size.observe(phone);
    try{mountXiaoli(canvas,{level:voiceLevel,action:()=>avatarCommand,outfit:()=>outfitChoice,onReady:()=>pet.classList.add('avatar-rendered')});}
    catch{canvas.remove();}
    petUpdate=redraw;redraw();
    document.addEventListener('liyang-accessibility',()=>{clearTimeout(timer);timer=0;redraw();});
    document.addEventListener('visibilitychange',()=>{clearTimeout(timer);timer=0;redraw();});
    motion.addEventListener('change',()=>{clearTimeout(timer);timer=0;redraw();});
  }
  function companionCard(inAssistant=false){
    const card=el('section','','home-companion companion-text');
    const body=el('div','','companion-copy');const status=el('small',voiceState,'companion-status');status.dataset.voiceStatus='';status.setAttribute('role','status');
    const replay=button('听小溧说话',()=>welcomeVoice(status),'companion-speak');replay.dataset.voiceAction='';
    const subtitle=el('p','','guide-subtitle');subtitle.dataset.voiceSubtitle='';subtitle.hidden=true;
    const controls=row(replay,inAssistant?link('声音设置','#listening','companion-link'):link('与小溧互动','#assistant','companion-link'));
    if(locale==='zh-CN'){const fallback=button('备用合成样音',()=>playRecorded('voice','voice-welcome',.73,false,undefined,true),'companion-link');fallback.dataset.voiceAction='';controls.append(fallback);}
    body.append(el('h2',inAssistant?'小溧':'请小溧带路'),el('p',inAssistant?'查找有来源的景点介绍、路线和本地资料。':'一起看看湖边、竹海与茶园。'),status,subtitle,controls);card.append(body);return card;
  }
  let releaseLandscape=()=>{};
  function home(){
    pulsePlaying=true;
    const intro=el('section','','travel-hero');
    const photos=[
      ['lake','天目湖山水园','湖山相接，沿着水岸慢行。','./experience-photo.jpg','William Ng'],
      ['bamboo','南山竹海 · 静湖','从静湖望向山谷，再走进竹海。','./experience-bamboo.jpg','赵文博'],
      ['tea','天目湖白茶','走进茶乡，了解一片茶叶的旅程。',art('tea'),null],
      ['road','溧阳一号公路','循着山野风景，开启慢游。',art('road'),null],
      ['village','乡村田园','在田园里认识自然与生活。',art('village'),null],
      ['history','地方文化','走进地方故事与非遗。',art('history'),null]
    ];
    const slide=el('div','','scenic-slide');
    const sky=skyLayer();
    const nav=row();nav.classList.add('scenic-tabs');
    let current=0,start,threeEnabled=true;
    function show(i){
      releaseLandscape();releaseLandscape=()=>{};
      current=(i+photos.length)%photos.length;
      const [id,originalTitle,originalSummary,url,author]=photos[current];
      const title=localeData?.places?.[id]?.[0]||originalTitle,summary=copy(originalSummary);
      theme(id,{photo:id==='lake',opening:false});
      const photo=Object.assign(el('img','','scenic-photo'),{src:url,alt:title+' '+copy(author?'实景':'主题插画')});
      const credit=el('small',author?copy('摄影')+': '+author+' · CC BY-SA 4.0':'AI生成主题插画 · 非实景照片');
      const top=el('div','','hero-top'), typeLabel=el('span',copy(author?'实景':'艺术场景')+' '+(current+1)+' / '+photos.length);
      top.append(el('span','江苏 · 常州 · 溧阳'),typeLabel);
      slide.replaceChildren(photo,sky,top,el('h1',title),el('p',summary,'hero-summary'),row(link('景点导览','#guide/'+id,'action'),link('探索地图','#map','hero-secondary')),credit);
      if(id==='lake'){
        const landscape=el('canvas','','landscape-3d');landscape.setAttribute('aria-hidden','true');landscape.hidden=true;
        const toggle=button('三维湖景',()=>{threeEnabled=!threeEnabled;show(current);},'landscape-toggle');toggle.hidden=true;
        top.append(toggle);slide.prepend(landscape);
        let ended=false,dispose;
        releaseLandscape=()=>{ended=true;dispose?.();};
        if(!threeEnabled){toggle.hidden=false;return updateTabs();}
        import('./landscape-three.mjs').then(({mountLandscape})=>{
          if(ended)return;
          dispose=mountLandscape(landscape,()=>sky.dataset);
          landscape.hidden=false;toggle.hidden=false;toggle.textContent=copy('查看实景');
          typeLabel.textContent=copy('三维演绎')+' '+(current+1)+' / '+photos.length;credit.hidden=true;photo.hidden=true;
        }).catch(()=>{/* Existing photo remains the fallback. */});
      }
      updateTabs();
    }
    function updateTabs(){
      for(const [index,control] of [...nav.children].entries())control.setAttribute('aria-pressed',String(index===current));
    }
    for(const [i,photo] of photos.entries())nav.append(button(localeData?.places?.[photo[0]]?.[0]||photo[1],()=>show(i)));
    intro.append(slide,nav);
    slide.addEventListener('pointerdown',event=>{start=event.target.closest('a,button')?undefined:event.clientX;});
    slide.addEventListener('pointerup',event=>{if(typeof start==='number'&&Math.abs(event.clientX-start)>50)show(current+(event.clientX<start?1:-1));start=undefined;});
    slide.addEventListener('pointercancel',()=>{start=undefined;});
    show(Math.max(0,photos.findIndex(([id])=>id===storage('liyang.home.cover'))));
    const services=el('section','','travel-services');
    const grid=el('div','','service-grid');
    for(const [label,href,path] of [
      ['景区导览','#map','M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z'],
      ['冒险世界','#explore','m12 2 9 10-9 10L3 12z'],
      ['吃住游','#directory','M5 21V3m5 18V3m-5 8h5m6 10V4l4 5v3h-4'],
      ['数字导游','#guide','M4 14v-2a8 8 0 0 1 16 0v2M4 14h4v6H4zm12 0h4v6h-4z'],
      ['历史文化','#culture','M3 9h18L12 3zM5 21h14M7 10v8m5-8v8m5-8v8'],
      ['白茶研学','#lab','M3 19Q9 5 21 4q-1 13-12 14m-3 0 10-9'],
      ['运动记录','#outdoor','M2 18h4l3-6 4 8 4-14 2 6h3'],
      ['小溧助手','#assistant','M3 4h18v12H9l-6 4zM7 9h10m-10 3h6'],
      ['声音试听','#listening','M3 12h3l2-6 4 12 4-12 2 6h3'],
      ['全部服务','#services','M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z']
    ]){
      const item=link(label,href);
      item.insertAdjacentHTML('afterbegin','<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+path+'"/></svg>');
      grid.append(item);
    }
    if(!hosted){
      grid.append(link('路线规划','#routes','action'));
      const weather=el('p','天气查询中','muted');
      services.append(weather);
      api('weather').then(data=>{
        weather.textContent=data.status==='available'
          ? locale==='zh-CN'?'溧阳 '+data.temperature+'℃ · '+data.summary+' · 来源：'+data.source:new Intl.NumberFormat(locale,{style:'unit',unit:'celsius'}).format(data.temperature)
          : copy('溧阳实时天气暂不可用');
      }).catch(()=>{weather.textContent=copy('溧阳实时天气暂不可用');});
    }
    services.append(el('h2','今天去哪儿'),grid);
    const featured=el('section','','travel-services');const destinations=el('div','','destination-grid');
    for(const [key,name] of Object.entries(places)){const card=link('','#guide/'+key,'destination-card'),title=localeData?.places?.[key]?.[0]||name,picture=scenicImage(key,'destination-image',true);picture.alt=title;card.append(picture,el('strong',title),el('small',['lake','bamboo'].includes(key)?'实景导览':'主题插画 · 资料导览'));destinations.append(card);}
    featured.append(el('h2','沿着湖山走'),destinations);
    const itinerary=el('section','','travel-services');
    itinerary.append(el('h2','山水两站 · 游玩攻略'),el('p','从天目湖了解湖岸景观，再到南山竹海静湖观察山谷和竹林。出发前请核对交通和景区公告。'),
      row(link('第一站 · 天目湖','#guide/lake','destination'),link('第二站 · 南山竹海','#guide/bamboo','destination')));
    const conditions=el('details','','home-conditions');
    conditions.append(el('summary','天气与声景'),pulseControls(false));
    const sidebar=el('div','','home-sidebar');sidebar.append(services,companionCard(),conditions);
    const hub=cityHome(),daily=todayPanel();
    $('view').append(intro,sidebar,...(storage('liyang.home.layout')==='local'?[hub,daily,featured]:[featured,hub,daily]),itinerary);
    if(!hosted)$('view').append(recentUpdates());
    if(storage('liyang.voice.welcome')!=='off')welcomeVoice();
  }
  const places={lake:'天目湖',bamboo:'南山竹海',tea:'白茶',road:'一号公路',history:'地方文化',village:'乡村田园'};
  const sealMarks={lake:'M3 16q4-4 9 0t9 0m-18 4q4-4 9 0t9 0M4 12l5-7 4 5 3-4 4 6',bamboo:'M8 21V4m8 17V3M5 8l3 2m0 4 4-3m4-4 4-3m-4 10-4-3',tea:'M3 19Q9 5 21 4q-1 13-12 14m-3 0 10-9',road:'M9 21 5 15l8-6-3-6m9 18-4-6 8-6-3-6',history:'m3 9 9-6 9 6zM5 21h14M8 11v7m4-7v7m4-7v7',village:'m3 12 9-8 9 8M6 10v10h12V10m-8 10v-5h4v5'};
  function seal(id){
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
    const path=document.createElementNS(icon.namespaceURI,'path');path.setAttribute('d',sealMarks[id]);icon.append(path);
    return icon;
  }
  async function mapView(ticket){
    theme('bamboo');
    const panel=sheet('发现湖山');
    panel.classList.add('atlas-sheet');
    const mapHead=el('div','','map-head');mapHead.append(el('p','六站插画示意，不用于导航','muted'),link('在高德查看溧阳地图','https://uri.amap.com/search?keyword='+encodeURIComponent('溧阳景点')+'&city='+encodeURIComponent('常州')+'&view=map&callnative=0','real-map-link'));panel.append(mapHead);
    const viewport=el('div','','atlas');
    const layer=el('div','','atlas-layer');
    const base=Object.assign(el('img','','atlas-art'),{src:art('atlas'),alt:copy('六站插画示意，不用于导航'),draggable:false});
    layer.append(base);viewport.append(layer);panel.append(viewport);
    const detail=el('div','','atlas-detail');
    const [records,guideRecords]=await Promise.all([chapters(),api('travel/guide')]);
    if(ticket!==archive)return;
    const guides=Object.fromEntries(guideRecords.map(g=>[g.id,g]));
    const coords=[[19,30],[67,52],[65,18],[30,68],[73,78],[24,87]];
    function select(entry,announce=false){
      if(announce)announcePet('map');
      for(const pin of layer.querySelectorAll('button'))pin.setAttribute('aria-pressed',String(pin.dataset.place===entry.id));
      const copy=el('div','','atlas-copy'),actions=row(link('查看导览','#guide/'+entry.id,'action'),link('进入挑战','#game/'+entry.id,'map-challenge'),link('高德查找地点','https://uri.amap.com/search?keyword='+encodeURIComponent('溧阳 '+entry.place)+'&city='+encodeURIComponent('常州')+'&view=map&callnative=0','map-challenge'));
      const intro=guides[entry.id], translated=localeData?.places?.[entry.id], status=utilityStatus();
      if(intro?.narration){const playIntro=()=>translated?visitorRead(translated.slice(1).join(' '),locale,status):speakLocal(intro.narration);const hear=button('听景点介绍',playIntro);hear.dataset.voiceAction='';actions.append(hear);if(announce)playIntro();}
      const title=translated?.[0]||entry.place, picture=scenicImage(entry.id,'atlas-thumb',true);picture.alt=title;
      copy.append(el('h3',title),actions,el('p',translated?.[1]||intro?.summary||entry.fact||entry.story),el('small',['lake','bamboo'].includes(entry.id)?'实景导览':'主题插画'),status);
      detail.replaceChildren(picture,copy);
    }
    records.forEach((entry,i)=>{
      const title=localeData?.places?.[entry.id]?.[0]||places[entry.id];
      const pin=button(title,()=>select(entry,true),'atlas-pin');
      pin.dataset.voiceAction='';
      const label=el('span',title);pin.replaceChildren(seal(entry.id),label);pin.dataset.place=entry.id;pin.setAttribute('aria-label',title);
      const [x,y]=coords[i];pin.style.left=x+'%';pin.style.top=y+'%';layer.append(pin);
    });
    let scale=1,x=0,y=0,drag;
    const move=()=>{layer.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';};
    const zoom=change=>{scale=Math.max(1,Math.min(2.6,scale+change));if(scale===1)x=y=0;move();};
    viewport.onpointerdown=e=>{if(e.target.closest('button'))return;drag=[e.clientX-x,e.clientY-y];viewport.setPointerCapture(e.pointerId);};
    viewport.onpointermove=e=>{if(!drag)return;x=Math.max(-140,Math.min(140,e.clientX-drag[0]));y=Math.max(-120,Math.min(120,e.clientY-drag[1]));move();};
    viewport.onlostpointercapture=()=>{drag=null;};
    const mapTools=row(button('+',()=>zoom(.25)),button('−',()=>zoom(-.25)),button('复位',()=>{scale=1;x=y=0;move();}));mapTools.classList.add('atlas-tools');mapTools.children[0].setAttribute('aria-label',copy('放大'));mapTools.children[1].setAttribute('aria-label',copy('缩小'));viewport.append(mapTools);viewport.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.15:-.15);},{passive:false});panel.append(detail);
    if(records[0])select(records[0]);
  }
  async function listening(ticket){
    const guideRecords=await api('travel/guide');if(ticket!==archive)return;
    for(const g of guideRecords)if(g.narration)voiceLines['voice-guide-'+g.id]=g.narration;
    theme('village');stop('music');stop('ambience');currentSound=undefined;
    const panel=sheet('声音试听');
    panel.append(el('p','优先使用设备本地普通话；实际自然度取决于已安装音色，需人工试听。旧 eSpeak 样音仅供手动对比，不再自动播报。','muted'));
    const picker=el('select');picker.setAttribute('aria-label','本机普通话音色');
    const fill=()=>{picker.replaceChildren(new Option('自动选择本机普通话',''));for(const v of localVoices())picker.append(new Option(v.name,v.name));picker.value=storage('liyang.voice.name')||'';};fill();picker.onchange=()=>storage('liyang.voice.name',picker.value);panel.append(picker);
    window.speechSynthesis?.addEventListener('voiceschanged',fill,{signal:pulseRoute.signal});
    const welcome=el('input');welcome.type='checkbox';welcome.checked=storage('liyang.voice.welcome')!=='off';
    welcome.onchange=()=>storage('liyang.voice.welcome',welcome.checked?'on':'off');
    const welcomeSetting=el('label','','sound-setting');welcomeSetting.append(welcome,el('span','首页自动欢迎语'));panel.append(welcomeSetting);
    const status=el('p',voiceState,'companion-status');status.dataset.voiceStatus='';status.setAttribute('role','status');
    const subtitle=el('p','','guide-subtitle');subtitle.dataset.voiceSubtitle='';subtitle.hidden=true;
    panel.append(status,subtitle);
    const roles=[
      ['欢迎','欢迎来到溧阳慢游所。跟着湖水的声音，从天目湖慢慢走。',.91],
      ['成年导游','眼前是南山竹海的静湖。先看看水面，再沿着竹林方向走。',.88],
      ['儿童角色','小小探险家，快看！竹叶在晃，我们去找找下一条线索吧！',1],
      ['研学导师','先别急着下结论。观察水面，记录变化，再和伙伴一起比较。',.9],
      ['历史旁白','在溧阳，人们把地方传说讲给一代又一代听。今天，我们从档案里找故事。',.83]
    ];
    for(const [role,words,rate] of roles)panel.append(button('本机中文 · '+role,()=>{
      if(muted){notice('请先开启声音。');return;}stop();speakLocal(words,{rate});
    },'choice'));
    for(const [label,name] of Object.entries({'旧合成欢迎样音（仅试听）':'voice-welcome','导游讲解':'voice-guide-lake','儿童角色':'voice-story-bamboo-kid','研学旁白':'voice-story-tea-teen','历史讲解':hosted?'voice-era-qin':'voice-guide-history','开场配乐':'opening','湖水':'lake','竹林':'bamboo','奖励音效':'reward'})){
      panel.append(button(label,()=>{if(muted){notice('请先开启声音。');return;}stop();playRecorded('voice',name,.82);},'choice'));
    }
    panel.append(button('停止试听',()=>{cancelVoice();stop();window.speechSynthesis?.cancel();},'choice'));
  }
  async function explore(ticket){
    theme('bamboo',{voice:hosted?'voice-city':undefined});
    const panel=sheet('湖山冒险世界');
    panel.classList.add('map-content');
    const banner=el('div','','explore-banner');banner.append(scenicImage('bamboo','explore-banner-image'),el('p','LIYANG ADVENTURE · 六站探索','eyebrow'),el('h3','每一站，都是新的故事'),el('p','选择童话探险或少年研学，收集自己的景点印章。'),row(link('白茶实验场','#lab','action'),link('少年工程师','#bridge','hero-secondary')));panel.append(banner);
    if(!hosted)panel.append(link('输入研学任务口令','#study','action'));
    const quick=row(link('小溧导游','#guide','action'),link('吃住游','#directory','action'));
    panel.append(quick);
    const list=el('div','','stops');panel.append(list);
    for(const entry of await chapters()){
      if(ticket!==archive)return;
      const stop=el('article','','listing');
      const place=link('','#guide/'+entry.id,'stop-image');place.append(scenicImage(entry.id,'stop-art',true));
      const mission=link(entry.title,'#game/'+entry.id,'stop-game');const copy=el('div','','stop-copy');copy.append(el('small',entry.game+' · '+entry.place),mission,el('p',entry.story),row(link('童话探险','#game/'+entry.id+'/kid','action'),link('少年研学','#game/'+entry.id+'/teen','stop-name')),link('查看景点','#guide/'+entry.id,'stop-name'));stop.append(place,copy);
      list.append(stop);
    }
  }
  async function guide(ticket,id){
    const places=await api('travel/guide');
    if(ticket!==archive)return;
    const place=places.find(item=>item.id===id)||places[0];
    theme(place.id,{photo:place.id==='lake'});
    if(localeData?.places?.[place.id]){
      const label=key=>translate(key,key), [title,...sections]=localeData.places[place.id], panel=sheet(label('guideTitle'));
      const full=localeData.fullGuide?.[place.id], paragraphs=full||sections.map(text=>['',text]);
      panel.lang=locale;panel.classList.add('scene-content');
      const status=utilityStatus(), subtitle=el('p','','guide-subtitle');subtitle.dataset.voiceSubtitle='';subtitle.hidden=true;
      const image=scenicImage(place.id,'guide-photo',true);image.alt=title;
      panel.append(image,el('h3',title),el('p',label('draft')),row(
        button(full?label('listenAll'):copy('朗读摘要'),()=>visitorRead(paragraphs.map(([,text])=>text).join(' '),locale,status),'action'),
        button(label('stop'),()=>{cancelVoice();status.textContent='';})
      ),status,subtitle);
      for(const [heading,text] of paragraphs){if(heading)panel.append(el('h4',heading));panel.append(el('p',text),button(label('listen'),()=>visitorRead(text,locale,status)));}
      const source=el('details');source.append(el('summary',label('source')));
      for(const src of place.sources||[{label:place.place,url:place.source}]){
        const anchor=link(src.label,src.url,'listing');anchor.lang='zh-CN';source.append(anchor);
      }
      const originalText=el('details');originalText.append(el('summary','完整中文原文'));
      const originalCopy=el('div');originalCopy.lang='zh-CN';
      for(const [heading,text] of place.sections||[]){const h=el('h4'),p=el('p');h.textContent=heading;p.textContent=text;originalCopy.append(h,p);}
      originalText.append(originalCopy);
      panel.append(source,originalText,row(link(label('map'),'#map'),link(label('home'),'#home'),link(label('visitor'),'#visitor')));
      for(const item of places)panel.append(link(localeData.places[item.id]?.[0]||item.place,'#guide/'+item.id,'listing'));
      const original=link('简体中文原文','#guide/'+place.id,'listing');original.lang='zh-CN';original.onclick=event=>{event.preventDefault();void setLocale('zh-CN');};panel.append(original);
      return;
    }
    const narration=place.narration||place.fact;
    voiceLines['voice-guide-'+place.id]=narration;
    const readGuide=(text=narration)=>{if(muted){notice('声音已关闭，请先开启声音。');return;}speakLocal(text);};
    currentSound=()=>{env(place.id);speakLocal(narration);};
    const panel=sheet('跟着小溧慢游');
    panel.classList.add('scene-content');
    const face=el('div','','guide-face');
    face.setAttribute('aria-hidden','true');
    const guideStatus=el('p',voiceState,'companion-status');guideStatus.dataset.voiceStatus='';
    const greet=button('打招呼',()=>{
      avatarAction('wave');
      face.classList.remove('greeting');requestAnimationFrame(()=>face.classList.add('greeting'));
      speakLocal('你好，我是小溧。很高兴和你一起探索溧阳！');notice('小溧向你打招呼。');
    });
    const favorites=()=>new Set(favoritePlaces());
    const save=button('收藏景点',()=>{
      const selected=favorites();
      if(selected.has(place.id))selected.delete(place.id);else selected.add(place.id);
      storage('liyang.favorites',JSON.stringify([...selected]));renderSaved();
    });
    const renderSaved=()=>{const yes=favorites().has(place.id);save.textContent=yes?'取消收藏':'收藏景点';save.setAttribute('aria-pressed',String(yes));};
    renderSaved();
    const photo=el('figure','','guide-figure');photo.append(scenicImage(place.id,'guide-photo',true),el('figcaption',['lake','bamboo'].includes(place.id)?'景区实景 · 来源见资料':'AI生成主题插画 · 非实景'));panel.append(photo);
    if(speaking||tracks.voice&&!tracks.voice.audio.paused)face.classList.add('talking');
    const guideIntro=el('div','','guide-intro');guideIntro.append(face,guideStatus,el('h3',place.place),el('p',place.summary||place.fact));
    const subtitle=el('p','','guide-subtitle');subtitle.dataset.voiceSubtitle='';subtitle.hidden=true;
    panel.append(link('返回慢游地图','#map','back-link'),guideIntro,subtitle);
    const extras=el('details','','guide-tools');extras.append(el('summary','景点工具'),row(
      greet,save,link('我的行程','#journey'),link('本站观察任务','#field/'+place.id),link('声音试听','#listening'),
      link('资料来源',place.source),
      link('去这一站探险','#game/'+place.id,'action')
    ));panel.append(extras);
    const lecture=el('section','','guide-lecture');
    const replay=button('完整语音讲解',()=>readGuide(),'action'), stopRead=button('停止讲解',cancelVoice);replay.dataset.voiceAction='';stopRead.dataset.voiceAction='';
    lecture.append(el('h3','景点讲解'),row(replay,stopRead));
    for(const [heading,text] of place.sections||[]){const part=el('article','','guide-lecture-part');const listen=button('听这一段',()=>readGuide(text));listen.dataset.voiceAction='';part.append(el('h4',heading),el('p',text),listen);lecture.append(part);}
    const sources=el('details','','guide-sources');sources.append(el('summary','查看讲解资料来源'));for(const src of place.sources||[])sources.append(link(src.label,src.url,'listing'));lecture.append(sources);panel.append(lecture);
    panel.append(el('h3','继续探索其他地点'));for(const item of places)panel.append(link(item.place,'#guide/'+item.id,'listing'));
    speakLocal(narration);
    if(!hosted)panel.append(row(link('查找当地资料','#ask','action'),link('生成游玩路线','#routes'),link('全部城市服务','#services')));
  }
  const era={qin:'history',mask:'bamboo',museum:'road',craft:'tea'};
  async function culture(ticket,id){
    const years=await api('city/timeline');
    if(ticket!==archive)return;
    const exhibit=years.find(item=>item.id===id)||years[0];
    announcePet('exhibit');
    const lecture='voice-era-'+exhibit.id;
    const translated=localeData?.culture?.[exhibit.id];
    const [artifact,note,fact,question,choices]=translated||[exhibit.artifact,exhibit.label,exhibit.fact,exhibit.question,exhibit.choices];
    theme(era[exhibit.id]||'history',translated?{}:{voice:lecture});$('world').dataset.scene=exhibit.id;
    const panel=sheet('溧阳时间机器');
    panel.classList.add('scene-content');
    const timeline=row(...years.map(item=>{
      const entry=link(String(item.year),'#culture/'+item.id,item.id===exhibit.id?'action':'');
      if(item.id===exhibit.id)entry.setAttribute('aria-current','page');return entry;
    }));
    const image=scenicImage(exhibit.id);image.alt='';
    const gallery=el('figure','','culture-art');gallery.append(image,el('span',String(exhibit.year),'exhibit-year'),el('figcaption','艺术演绎 · 非馆藏实物照片'));
    panel.append(timeline,gallery,el('h3',artifact),el('p',fact),el('p',note,'muted'),link('档案来源',exhibit.source));
    if(translated)panel.append(el('p',translate('draft','译稿待校订。'),'muted'));
    const result=el('p');result.setAttribute('role','status');
    panel.append(el('h3',question));
    choices.forEach((choice,index)=>panel.append(button(choice,async()=>{
      try{
        const verdict=await api('city/quiz',{id:exhibit.id,choice:index});
        result.textContent=copy(verdict.correct?'答对了。':'再找找档案中的线索。');
        if(verdict.correct){announcePet('correct');play('effect','reward',.84);}
      }catch(error){result.textContent=translated?translate('error',error.message):error.message;}
    },'choice')));
    panel.append(result);
    const narration=utilityStatus(),listen=button('重听讲解',()=>translated?visitorRead(fact,locale,narration):play('voice',lecture,.88),'choice');
    listen.dataset.voiceAction='';panel.append(listen,button(translate('stop','停止'),cancelVoice,'choice'),narration);
  }
  async function passport(ticket){
    theme('village');
    const panel=sheet('电子探险护照');panel.append(row(link('听见家乡 · 方言设置','#family','action'),link('我的行程','#journey','destination')));
    if(hosted)panel.append(el('p','本机体验记录，仅保存在此浏览器，不是正式服务器记录。','muted'));
    const [state,entries,user]=await Promise.all([progress(),chapters(),hosted?null:api('session')]);
    if(ticket!==archive)return;
    if(!hosted){
      const profile=row(link(user?'账号：'+user.id:'登录或绑定账号','#account','action'),link('居民与商家服务','#work'));
      panel.append(profile, row(link('全部城市服务','#services','action'),link('个性化设置','#preferences')));
    }
    const synced=accountPass(user);
    panel.append(el('h3','虚拟积分 '+state.points));
    if(hosted)panel.append(row(link('全部城市服务','#services','action'),link('个性化设置','#preferences')));
    const stamps=el('div','','stamp-grid');
    const covered=new Set(state.rewards.map(badge=>badge.chapter));
    for(const [id,name] of Object.entries(places)){
      const entry=link('','#game/'+id,'stamp'+(covered.has(id)?' earned':''));
      entry.append(scenicImage(id,'stamp-art'),seal(id),el('strong',name),el('small',covered.has(id)?'已盖章':'待探索'));
      stamps.append(entry);
    }
    panel.classList.add('passport-book');
    panel.prepend(el('div','湖山行旅 · LIYANG','passport-imprint'));
    panel.append(stamps);
    const outdoor=await import('./outdoor-view.mjs');
    if(ticket!==archive)return;
    const bridge=await import('./bridge-view.mjs');
    if(ticket!==archive)return;
    const motionBadges=outdoor.badges(), engineering=bridge.bridgeBadges();
    const achievements=el('section','','city-group');
    achievements.append(el('h3','行旅成就'),el('p',''+(state.rewards.length+motionBadges.length+engineering.length)+' 项虚拟成就 · 探险护照、此浏览器运动及工程记录'),row(link('运动与成就','#outdoor','action'),link('小溧助手','#assistant')));
    for(const badge of motionBadges)achievements.append(el('p',badge+' · 本机运动虚拟成就','listing'));
    for(const id of engineering)achievements.append(link('少年工程师 · '+(id==='foot'?'步行桥':'运茶挑战')+'印章','#bridge','listing'));
    panel.append(achievements);
    panel.append(fieldOverview());
    let saved=[];try{const value=JSON.parse(storage('liyang.favorites')||'[]');if(Array.isArray(value))saved=value;}catch{}
    if(saved.length)panel.append(el('h3','我的收藏'),row(...saved.filter(id=>Object.hasOwn(places,id)).map(id=>link(places[id],'#guide/'+id,'destination'))));
    if(!state.rewards.length)panel.append(el('p','还没有徽章，去湖山找到第一枚吧。'));
    for(const badge of state.rewards){
      const name=entries.find(entry=>entry.id===badge.chapter)?.title||badge.chapter;
      panel.append(el('p',name+' · '+(badge.mode==='teen'?'研学徽章':'故事徽章'),'listing'));
    }
    const label=el('label','声音音量 ');
    const range=Object.assign(el('input'),{type:'range',min:0,max:1,step:.05,value:volume});
    range.oninput=()=>{volume=Number(range.value);storage('liyang.web.volume',String(volume));mixVolumes();};
    label.append(range);
    panel.append(label,el('p',hosted?'本机匿名档案。不采集儿童姓名、照片或定位。':synced?'积分与徽章保存于当前账号。':'匿名访客护照保存在此服务器，通过此浏览器凭证访问。','muted'),button(synced?'清除账号护照':'清除访客护照',async()=>{
      if(!confirm('清除当前护照的积分与徽章？此操作不能撤销。'))return;
      try{await progress({action:'clear'});if(ticket===archive)route();}
      catch(error){notice(error.message);}
    },'choice'));
  }
  async function directory(ticket,id){
    theme('village');
    const panel=sheet('吃住游目录');panel.classList.add('city-service-sheet');
    if(hosted){
      panel.append(el('p','公开体验版未连接实时商家、住宿和路线目录。'),link('返回地点导览','#guide','action'));
      return;
    }
    const filters={all:'全部',attraction:'景点',food:'美食',lodging:'民宿',village:'乡村',route:'路线',merchant:'商家',event:'活动',culture:'文化',notice:'提醒'};
    const index=Object.hasOwn(filters,id||'')?id:'all';
    panel.append(row(...Object.entries(filters).map(([key,label])=>link(label,'#directory/'+key,index===key?'action':'destination'))));
    const output=el('div','','city-records');
    const search=Object.assign(el('input'),{type:'search',placeholder:'搜索名称、片区或地址',maxLength:80});search.setAttribute('aria-label','搜索目录');
    let searchId=0;
    const query=async()=>{
      const request=++searchId;
      const records=await api('directory?kind='+(index==='all'?'':index)+'&q='+encodeURIComponent(search.value.trim()));
      if(ticket!==archive||request!==searchId)return;
      output.replaceChildren();
      if(!records.length)output.append(el('p','暂无符合条件的已审核记录。可提交资料供审核，不展示虚构商家或活动。','city-empty'));
      for(const record of records)output.append(catalogCard(record));
    };
    panel.append(row(search,button('搜索',()=>query().catch(e=>notice(e.message)),'action')),output,link('提交资料或纠错','#work','action'));
    if(index==='food')panel.append(foodIdeas());
    await query();
  }
  async function game(ticket,id,variant){
    const chapter=(await chapters()).find(item=>item.id===id);
    if(ticket!==archive)return;
    if(!chapter)throw Error('找不到这个章节。');
    const spec=globalThis.LiyangPuzzles.specs[id];
    const translated=locale!=='zh-CN'&&id==='bamboo';
    if(translated)$('view').lang=locale;
    let mode=variant==='teen'?'teen':'kid', moves=[], first=null, ready=false, awarded=false, busy=false, evidenceReady=false, message='';
    const draftKey=()=>`liyang.game.draft.${id}.${mode}`;
    function resume(){
      try{moves=globalThis.LiyangPuzzles.resumeMoves(id,JSON.parse(storage(draftKey())||'[]'),chapter.tiles);}
      catch{moves=[];}
      first=null;ready=globalThis.LiyangPuzzles.solved(id,moves,chapter.tiles);awarded=false;evidenceReady=false;
      message=moves.length?'已恢复本机游戏进度。':'';
    }
    resume();
    theme(id,translated?{game:true}:{game:true,voice:'voice-story-'+id+'-'+mode});
    const stage=el('div','','playfield'), actor=button('操控角色',()=>{scene.x=Math.min(.9,scene.x+.08);paint(0);});
    stage.append(actor);
    const targets=el('div','','game-stage-tools');targets.setAttribute('aria-label',copy('场景操作'));stage.append(targets);
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
    const intro=el('div','','game-intro'), dock=el('section','','sheet game-dock');const badge=el('div','故事世界 · 可拖动角色','game-stage-label');stage.append(badge);
    $('view').append(stage,intro,dock);
    announcePet('game');
    scene.count=chapter.tiles.length;
    function reset(){
      moves=[];storage(draftKey(),'[]');first=null;ready=false;awarded=false;evidenceReady=false;message='';scene.reward=false;scene.x=.22;render();
    }
    const gameSpeech=utilityStatus();$('view').append(gameSpeech);
    function narrate(){
      const original=mode==='kid'?chapter.story:chapter.research,text=copy(original);
      if(text!==original)visitorRead(text,locale,gameSpeech);
      else play('voice','voice-story-'+id+'-'+mode,.88);
    }
    function pick(index){
      if(ready||busy)return;
      if(id==='bamboo'&&!globalThis.LiyangPuzzles.bambooPath([...moves,index])){
        message='这边没有连通的步道，换个方向。';announcePet('blocked');play('effect','unlock',.22);render();return;
      }
      message='';
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
      else if(ready){message='';announcePet('solved');play('effect','unlock',.55);}
      storage(draftKey(),JSON.stringify(globalThis.LiyangPuzzles.resumeMoves(id,moves,chapter.tiles)));
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
        storage(draftKey(),'[]');
        announcePet('reward');play('effect','reward',.84);
      }catch(error){message=translated?translate('error',error.message):error.message;}
      finally{busy=false;if(ticket===archive)render();}
    }
    function render(){
      const active=document.activeElement;
      const focusedTile=targets.contains(active)?active.dataset.tileIndex:null;
      scene.ready=ready;scene.matched=moves;
      targets.replaceChildren();
      targets.hidden=ready||awarded;
      if(!ready&&!awarded){
        const indices=['lake','road','village'].includes(id)?[2,0,1]:chapter.tiles.map((_,i)=>i);
        for(const index of indices){
          const hidden=id==='tea'&&!moves.includes(index)&&first!==index;
          const marker=button(hidden?'翻牌 '+(index+1):chapter.tiles[index],()=>pick(index),'stage-target');
          marker.dataset.tileIndex=String(index);
          if(id==='lake')marker.prepend(scenicImage(id,'puzzle-fragment'));
          marker.disabled=id!=='bamboo'&&(moves.includes(index)||first===index);targets.append(marker);
        }
      }
      intro.replaceChildren(el('small',mode==='kid'?'童话世界':'少年研学','eyebrow'),el('h2',chapter.title),el('p',mode==='kid'?chapter.story:chapter.research));
      dock.replaceChildren(row(link('返回地图','#explore'),button(mode==='kid'?'切到研学':'切到童话',()=>{
        if(busy)return;mode=mode==='kid'?'teen':'kid';scene.reward=false;scene.x=.22;resume();render();narrate();
      }),button('听小溧',narrate),link('普通话 / 方言','#family','game-language')));
      if(awarded){
        dock.append(el('p',message),row(button('打开宝箱',()=>{
          if(scene.reward)return;scene.reward=true;paint(0);play('effect','unlock',.88);notice('景点导读已解锁。');
        }),link('查看景点','#guide/'+id,'action'),link('查看护照','#passport')));
      }else if(ready&&mode==='teen'&&!evidenceReady){
        dock.append(el('h3','先核对线索'));
        const evidence=[
          ['景点公开资料', chapter.fact, true],
          ['场景中的故事设定',chapter.story,false]
        ];
        if(chapter.tiles.length%2===0)evidence.reverse();
        for(const [label,text,verified] of evidence){
          const option=button(label,()=>{
            if(verified){evidenceReady=true;message='已核对景点资料，可以作答。';}
            else message='这是故事任务，不能用来核实真实景点。';
            render();
          },'choice');
          dock.append(el('p',text),option);
        }
        dock.append(link('查看资料来源',chapter.source));
      }else if(ready){
        const quiz=chapter[mode];
        dock.append(el('h3',quiz.question),button('朗读题目',()=>{
          const pieces=[quiz.question,...quiz.choices],localized=pieces.map(copy),text=pieces.join('。');
          if(localized.every((line,i)=>line!==pieces[i]))visitorRead(localized.join('. '),locale,gameSpeech);
          else if(familyMode()&&!quiz.source)void familySpeak('voice-quiz-'+id+'-'+mode,text);
          else speakLocal(text);
        }));
        quiz.choices.forEach((choice,index)=>{const b=button(choice,()=>answer(index),'choice');b.disabled=busy;dock.append(b);});
      }else{
        if(id==='bamboo'){
          const path=globalThis.LiyangPuzzles.bambooPath(moves);
          const grid=el('div','','bamboo-trail');
          grid.setAttribute('role','img');grid.setAttribute('aria-label',[copy('步道进度'),moves.length,'/ 3'].join(' '));
          for(let i=0;i<9;i++){
            const point=el('span',i===path.at(-1)?'小溧':i===0?'起点':i===5?'静湖':'');
            if(globalThis.LiyangPuzzles.bambooCells.includes(i))point.classList.add('trail-open');
            if(path.includes(i))point.classList.add('trail-visited');
            grid.append(point);
          }
          dock.append(grid,el('p','沿连通步道前往静湖，方向键在场景中。','muted'));
        }else dock.append(el('p',spec.hint),el('p',id==='tea'?'已配对 '+moves.length/2+' / 3':moves.map(index=>chapter.tiles[index]).join(' → '),'muted'));
        dock.append(button('重试',reset));
      }
      if(message&&!awarded){const feedback=el('p',message,'muted');feedback.setAttribute('role','status');dock.append(feedback);}
      if(focusedTile!==null){
        const remain=targets.querySelector('[data-tile-index="'+focusedTile+'"]:not(:disabled)')||targets.querySelector('button:not(:disabled)');
        const next=ready?dock.querySelector('h3'):remain;
        if(next){if(ready)next.tabIndex=-1;next.focus({preventScroll:!ready});}
      }
      paint(0);
    }
    render();
  }
  async function route(){
    petUpdate();
    releaseLandscape();releaseLandscape=()=>{};
    cancelVoice();window.speechSynthesis?.cancel();
    stop('voice');stop('effect');currentSound=undefined;
    const ticket=++archive;
    const [page,id,variant]=location.hash.slice(1).split('/');
    pulsePlaying=['','home','today'].includes(page||'');
    const name=hosted&&offlineUnavailable.has('#'+page)?'offline':['visitor','accessibility','map','listening','explore','guide','culture','passport','directory','game','lab','outdoor','assistant','bridge','services','today','discover','preferences','jobs','learning','about','family','journey','field',...(!hosted?['account','work','ask','routes','study','reports','community','pages','cityops','smart']:[])].includes(page)?page:'home';
    const localized=['home','map','visitor','accessibility','guide','assistant','preferences','services','culture','offline'].includes(name);
    $('view').lang=localized?locale:'zh-CN';
    $('view').setAttribute('aria-label',localized?translate(name==='guide'?'guideTitle':'visitor','内容'):'内容');
    document.documentElement.lang=locale;
    const brand=copy('溧阳慢游所');
    document.title=brand;$('phone').setAttribute('aria-label',brand);
    document.querySelector('.wordmark').textContent=brand;
    document.querySelector('.skip-content').textContent=copy('跳到内容');
    document.querySelector('.tabs').setAttribute('aria-label',copy('慢游导航'));
    $('full').setAttribute('aria-label',copy('全屏'));$('full').title=copy('全屏');soundIcon();
    document.documentElement.dir=visitor?.direction(locale)||'ltr';
    $('visitor-language').textContent=translate('language','Language');$('visitor-language').lang=locale;
    $('access-link').textContent=accessCopy[locale][0];
    const tab=['directory','game','culture','lab','study','bridge','learning','discover','community','field'].includes(name)?'explore':['account','work','outdoor','preferences','jobs','pages','cityops','about','family','journey'].includes(name)?'passport':['ask','routes','assistant','smart'].includes(name)?'guide':['listening','services','today','reports'].includes(name)?'home':name;
    for(const a of document.querySelectorAll('[data-nav]')){
      const translated=translate(a.dataset.nav,a.textContent);
      for(const node of a.childNodes)if(node.nodeType===3)node.textContent=translated;
      if(a.dataset.nav===tab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    }
    $('view').className='view '+name; $('phone').dataset.page=name; $('view').scrollTop=0;
    $('phone').classList.toggle('wide-page',['home','services','today','discover','directory','reports','pages','community','map','explore','guide','culture','passport','lab','outdoor','bridge','assistant','learning','family'].includes(name));
    $('view').replaceChildren();
    try{
      if(name==='home')home();
      else if(name==='offline')sheet('此功能需要在线服务').append(el('p','公开体验版不连接该服务，已有本机记录不受影响。'),link('全部服务','#services','action'));
      else if(name==='accessibility')accessibilityPage();
      else if(name==='visitor'&&visitor)visitorPage();
      else await ({explore,guide,culture,passport,directory,game,listening,map:mapView,lab,account,work,ask,routes,study,outdoor:outdoorPage,assistant,bridge:bridgePage,services:servicesPage,today,discover,preferences,jobs,learning,about:aboutPage,family:familyPage,reports,community,pages,cityops,smart,journey,field:fieldPage})[name](ticket,id,variant);
    }catch(error){
      if(ticket===archive){const panel=sheet('暂时没有连上');panel.append(el('p',error.message),button('重试',route));}
    }
  }
  async function bridgePage(ticket){
    theme('road');
    const view=await import('./bridge-view.mjs');
    if(ticket===archive)view.mountBridge(sheet('少年工程师'));
  }
  async function outdoorPage(ticket){
    theme('road');
    const view=await import('./outdoor-view.mjs');
    if(ticket===archive)view.mountOutdoor(sheet('户外运动'),{isMuted:()=>muted,onSpeak:speakLocal,onStop:cancelVoice});
  }
  async function assistant(ticket){
    theme('lake');
    const view=await import('./outdoor-view.mjs');
    if(ticket===archive){
      const panel=sheet('小溧助手');panel.append(companionCard(true));const area=el('div','','assistant-interaction');panel.append(area);
      if(localeData?.places){
        panel.lang=locale;
        const form=el('form'), label=el('label','按名称查找景点'), input=el('input'), status=utilityStatus(), matches=el('div');
        input.type='search';input.required=true;input.maxLength=120;label.append(input);
        const submit=el('button','查找');submit.type='submit';
        form.append(label,submit);panel.insertBefore(form,area);panel.insertBefore(status,area);panel.insertBefore(matches,area);
        form.onsubmit=event=>{
          event.preventDefault();cancelVoice();matches.replaceChildren();
          const results=visitor.findVisitorGuide(input.value,localeData.places);
          status.textContent=results.length?'':copy('没有匹配的景点。试试天目湖、竹海或白茶。');
          for(const [id,[title,summary]] of results){
            const part=el('article');
            const read=button(translate('listen','朗读'),()=>visitorRead(summary,locale,status));read.dataset.voiceAction='';
            part.append(link(title,'#guide/'+id),el('p',summary),read);matches.append(part);
          }
          if(results.length)avatarAction('point');
        };
        const original=el('details');original.append(el('summary','中文指令与本地问答'));area.lang='zh-CN';area.replaceWith(original);original.append(area);
      }
      view.mountAssistant(area,{backend:!hosted,onSpeak:speakLocal,onStop:cancelVoice,
        ...(!hosted&&{lookup:async question=>(await api('city/guide',{question})).records})});
    }
  }
  function field(name,label,{type='text',max=120,required=true}={}){
    const wrapper=el('label',label,'app-field');
    const input=Object.assign(el('input'),{name,type,required,maxLength:max});
    wrapper.append(input);return wrapper;
  }
  function selectField(name,label,values){
    const wrapper=el('label',label,'app-field');
    const select=Object.assign(el('select'),{name});
    for(const [value,text] of values)select.append(new Option(text,value));
    wrapper.append(select);return wrapper;
  }
  function taskForm(fields,label,run){
    const form=el('form','','app-form'), submit=el('button',label,'action'), result=el('p');
    result.setAttribute('role','status');
    form.append(...fields,submit,result);
    form.onsubmit=async event=>{
      event.preventDefault();if(submit.disabled)return;
      submit.disabled=true;result.textContent='';
      try{await run(Object.fromEntries(new FormData(form)),result,form);}
      catch(error){result.textContent=error.message;}
      finally{submit.disabled=false;}
    };
    return form;
  }
  async function account(ticket){
    theme('village');
    const panel=sheet('我的账号');
    const user=await api('session');
    if(ticket!==archive)return;
    if(!user){
      const identity=field('id','账号',{max:40});
      const password=field('password','密码',{type:'password',max:128});
      identity.lastChild.autocomplete='username';password.lastChild.autocomplete='current-password';
      panel.append(taskForm([identity,password],'登录',async(data)=>{
        await api('login',data);
        if(ticket===archive)location.hash='#passport';
      }));
    }else{
      panel.append(el('p','当前账号：'+user.id),row(link('返回护照','#passport','action'),link('居民与商家服务','#work')));
      if(accountPass(user)){
        panel.append(taskForm([],'导入当前浏览器访客徽章',async(_,result)=>{
          const pass=storage('liyang.web.token')||ephemeralToken;
          if(!pass){result.textContent='当前浏览器没有可导入的访客徽章。';return;}
          await api('explorer/account',{action:'import'},pass);
          result.textContent='导入完成。已存在的徽章不会重复计分。';
        }));
      }
      panel.append(taskForm([],'退出登录',async()=>{
        await api('logout',{});
        if(ticket===archive)route();
      }));
    }
  }
  async function work(ticket){
    theme('village');
    const panel=sheet('居民与商家服务');
    const user=await api('session');
    if(ticket!==archive)return;
    if(!user){panel.append(link('登录后办理','#account','action'));return;}
    const kinds=[['feedback','意见反馈']];
    if(['resident','merchant','admin'].includes(user.role))kinds.push(['page','提交社区页面']);
    if(['merchant','admin'].includes(user.role))kinds.push(['merchant','提交商家资料']);
    if(user.role==='admin')kinds.push(...[['food','美食'],['lodging','住宿'],['route','路线'],['attraction','景点'],['village','乡村'],['event','活动'],['culture','文化'],['notice','公共提醒']]);
    panel.append(el('h3','提交与审核进度'));
    panel.append(taskForm([selectField('kind','事项',kinds),field('title','标题'),field('detail','说明',{max:2000}),field('source','资料来源（页面和商家必填）',{max:500,required:false})],'提交',async(data,result,form)=>{
      const response=await api('submissions',data);
      form.reset();result.textContent='已提交，编号 '+response.id+'，等待审核。';
      await loadSubmissions();
    }));
    const records=el('div');
    panel.append(records);
    async function loadSubmissions(){
      const rows=await api('submissions');
      records.replaceChildren();
      if(!rows.length)records.append(el('p','还没有提交记录。','muted'));
      const statuses={pending:'待审',approved:'通过',rejected:'退回',published:'已发布',withdrawn:'已撤回'};
      for(const record of rows.slice(0,10))records.append(el('p',record.title+' · '+(statuses[record.status]||record.status),'listing'));
    }
    await loadSubmissions();
    if(ticket!==archive)return;
    if(user.role==='merchant'||user.role==='admin')panel.append(link('进入商家运营工作台','/studio','action'));
    if(user.role==='admin')panel.append(row(link('进入专业审核后台','/','action'),link('城市运营与诊断','#cityops','action')));
    if(user.role==='teacher'||user.role==='admin'){
      const entries=await chapters();
      if(ticket!==archive)return;
      panel.append(el('h3','研学任务'));
      panel.append(taskForm([field('group','班级代号',{max:40}),selectField('chapter','探险章节',entries.map(entry=>[entry.id,entry.title])),field('prompt','任务说明（不要填学生信息）',{max:500})],'发布任务',async(data,result)=>{
        const response=await api('study/assignments',data);
        result.textContent='任务口令：'+response.code;
      }));
    }
  }
  function ask(){
    theme('lake');
    const panel=sheet('溧阳本地导游');
    const results=el('div');
    panel.append(el('p','搜索已收录的本地知识资料。不是在线大模型。','muted'));
    panel.append(taskForm([field('question','你想了解什么？',{max:200})],'查找',async(data,status)=>{
      const answer=await api('city/guide',data);
      results.replaceChildren();
      if(!answer.records.length)status.textContent='未找到可核实的资料。票价与营业时间请向景区求证。';
      for(const item of answer.records)results.append(el('h3',item.place),el('p',item.fact),link('查看来源',item.source,'listing'));
    }),results);
  }
  function routes(){
    theme('road');
    const panel=sheet('游玩路线');
    const results=el('div');
    panel.append(link('我的行程','#journey','destination'));
    panel.append(el('p','按主题编排推荐站点，不提供实时导航或车程。','muted'));
    const start=field('start','出发地');start.lastChild.value='溧阳城区';
    const people=field('people','人数',{type:'number'});Object.assign(people.lastChild,{min:1,max:20,value:2});
    const duration=selectField('duration','游玩时长',[['day','一日'],['half','半日'],['two','两日']]);
    const type=selectField('type','路线类型',[['standard','普通路线'],...pulse.tripTypes.map(([id,label])=>[id,label+'路线'])]);
    type.lastChild.onchange=()=>{
      if(['half','day','two'].includes(type.lastChild.value))duration.lastChild.value=type.lastChild.value;
    };
    duration.lastChild.onchange=()=>{
      if(['half','day','two'].includes(type.lastChild.value))type.lastChild.value=duration.lastChild.value;
    };
    panel.append(taskForm([start,people,selectField('budget','人均预算',[['低于100元','100元以内'],['100–300元','100–300元'],['高于300元','300元以上']]),duration,type,selectField('interest','兴趣',[['nature','湖山'],['food','美食'],['family','亲子'],['cycling','骑行'],['camping','露营'],['night','夜游'],['tea','茶文化']]),selectField('theme','主题',[['nature','湖山自然'],['heritage','非遗文化'],['drive','公路慢游']]),selectField('stops','每日最多站点',[['2','2 站'],['3','3 站'],['1','1 站']]),selectField('party','同行方式',[['solo','独自旅行'],['family','亲子家庭'],['friends','朋友同行']]),selectField('pace','节奏',[['slow','慢游'],['normal','普通']])],'生成路线',async(data,status)=>{
      const days=pulse.planTrip({...data,count:data.stops,weather:activeClimate()});
      status.textContent=data.start+'出发 · '+data.people+' 人 · 人均预算 '+data.budget+'（未核验实际票价和费用）。'+(data.party==='family'?' 亲子出行请留出休息时间并安排成人陪同。':' 出发前核对开放信息。')+(['cycling','camping','night'].includes(data.type)?' 不保证道路适骑、营地开放或夜间营业。':'');
      const plan=pulse.readJourney({days});
      if(!plan)throw Error('未能生成可用行程。');
      const feedback=el('p');feedback.setAttribute('role','status');
      results.replaceChildren(journeyDays(plan),row(button('保存为我的行程',()=>{
        if(currentJourney()&&!confirm('用这份路线替换本机已保存的行程？'))return;
        feedback.textContent=saveJourney(plan)?'已保存到此浏览器。':'无法写入浏览器存储。';
      },'action'),link('打开我的行程','#journey')),feedback);
    }),results);
  }
  function favoritePlaces(){
    try{const ids=JSON.parse(storage('liyang.favorites')||'[]');return Array.isArray(ids)?[...new Set(ids.filter(id=>Object.hasOwn(places,id)))]:[];}catch{return [];}
  }
  function currentJourney(){
    try{return pulse.readJourney(JSON.parse(storage('liyang.journey.v1')||'null'));}catch{return null;}
  }
  function saveJourney(plan){
    const raw=JSON.stringify(plan);
    return storage('liyang.journey.v1',raw)===raw;
  }
  function journeyDays(plan,onVisit,onMove){
    const board=el('div','','journey-days');
    plan.days.forEach((ids,index)=>{
      const day=el('section','','journey-day');
      day.append(el('h3','第 '+(index+1)+' 天'));
      const stops=el('ol');
      for(const [index,id] of ids.entries()){
        const stop=el('li','','journey-stop'),photo=link('','#guide/'+id,'journey-photo');
        photo.setAttribute('aria-label',places[id]+'导览');photo.append(scenicImage(id,'',true));
        const info=el('div','','journey-stop-info');info.append(link(places[id],'#guide/'+id),el('small',['lake','bamboo'].includes(id)?'实景':'艺术示意'));
        if(onVisit){
          const visited=plan.visited.includes(id), mark=button(visited?'已到访':'标记到访',()=>onVisit(id));
          mark.setAttribute('aria-pressed',String(visited));mark.setAttribute('aria-label',places[id]+' '+mark.textContent);info.append(mark);
        }
        if(onMove&&ids.length>1){
          const earlier=button('提前一站',()=>onMove(id,-1)), later=button('推后一站',()=>onMove(id,1));
          earlier.disabled=index===0;later.disabled=index===ids.length-1;
          for(const control of [earlier,later])control.setAttribute('aria-label',places[id]+' '+control.textContent);
          info.append(row(earlier,later));
        }
        stop.append(photo,info);stops.append(stop);
      }
      day.append(stops);board.append(day);
    });
    return board;
  }
  function journey(){
    theme('lake',{photo:true});
    const panel=sheet('我的行程'), content=el('div'), status=el('p');status.setAttribute('role','status');
    const render=()=>{
      const saved=currentJourney(), favorites=favoritePlaces();
      content.replaceChildren();
      if(saved){
        content.append(el('p',saved.visited.length+' / '+saved.days.flat().length+' 站已手动标记 · 此浏览器记录','muted'));
        const read=button('听小溧读行程',()=>{
          if(muted){notice('声音已关闭，请先开启声音。');return;}
          speakLocal(saved.days.map((ids,index)=>'第'+(index===0?'一':'二')+'天：'+ids.map(id=>places[id]).join('，')+'。').join(''));
        },'action');
        const stop=button('停止播报',cancelVoice), voice=el('small',voiceState,'companion-status');
        read.dataset.voiceAction='';stop.dataset.voiceAction='';voice.dataset.voiceStatus='';
        content.append(row(read,stop,voice));
        content.append(journeyDays(saved,id=>{
          if(saveJourney(pulse.journeyVisit(saved,id))){
            render();const controls=content.querySelectorAll('button[aria-pressed]');
            controls[saved.days.flat().indexOf(id)]?.focus({preventScroll:true});
          }else status.textContent='无法保存到访记录。';
        },(id,offset)=>{
          cancelVoice();
          if(saveJourney(pulse.journeyMove(saved,id,offset))){
            render();status.textContent=places[id]+'的顺序已保存。';status.focus({preventScroll:true});
          }else status.textContent='无法保存路线顺序。';
        }));
        content.append(button('清除本机行程',()=>{
          if(!confirm('清除这份行程和手动到访标记？景点收藏与账号记录不会删除。'))return;
          if(saveJourney(null)){cancelVoice();render();status.textContent='已清除本机行程。';}
          else status.textContent='无法清除本机行程。';
        }));
      }else content.append(el('p','还没有保存行程。','city-empty'));
      if(!hosted)content.append(link('规划路线','#routes','action'));
      if(favorites.length){
        content.append(button('用收藏景点创建行程',()=>{
          if(saved&&!confirm('用收藏景点替换本机已保存的行程？'))return;
          const days=[favorites.slice(0,3),favorites.slice(3)].filter(day=>day.length);
          if(saveJourney(pulse.readJourney({days})))render();else status.textContent='无法保存行程。';
        }));
      }
      content.append(link('在地图选景点','#map','destination'));
    };
    status.tabIndex=-1;panel.append(content,status);render();
  }
  function study(){
    theme('bamboo');
    const panel=sheet('研学任务');
    const assignment=el('div');
    panel.append(taskForm([field('code','任务口令',{max:16})],'打开任务',async(data)=>{
      assignment.replaceChildren();
      const code=data.code.trim().toLowerCase();
      if(!/^[a-f0-9]{16}$/.test(code))throw Error('请输入 16 位研学任务口令。');
      const task=await api('study/'+code);
      assignment.append(el('p',task.prompt),link('进入研学挑战','#game/'+task.chapter+'/teen','action'));
    }),assignment);
  }
  async function lab(ticket){
    theme('tea');
    const {stepLab}=await import('./experience-lab.mjs');
    let state=await api('explorer/lab'), busy=false;
    if(ticket!==archive)return;
    const panel=sheet('白茶实验场');
    panel.classList.add('lab-sheet');
    const plot=el('div','','tea-plot');plot.setAttribute('aria-label','茶园模拟场景');
    const farm=Object.assign(el('img','','farm-art'),{src:art('farm'),alt:'原创茶园实验场插画'});plot.append(farm);
    const farmTag=el('span','准备种植','farm-tag');const field=el('div','','farm-field');field.append(el('span','我的茶园 · 模拟','farm-field-label'),farm);plot.replaceChildren(scenicImage('tea','farm-landscape'),farmTag,field);const growth=el('div','','growth-stages');
    const meter=el('p','','lab-meter');
    const message=el('p','','muted');
    message.setAttribute('role','status');
    const actions=row();actions.classList.add('farm-actions');
    const choices=[['survey','生态调查'],['plant','栽种茶苗'],['wait','推进一天'],['harvest','采青'],['dry','模拟制作'],['sell','记入经营'],['build','规划住宅']];
    const cropLabel={bare:'空地',sprout:'茶苗正在生长',ready:'茶叶可采青',fresh:'鲜叶待制作',dry:'成品待记账'};
    function draw(){
      plot.dataset.crop=state.crop;const picture=art(state.crop==='ready'?'farm-ready':state.crop==='sprout'?'farm-sprout':'farm');if(farm.getAttribute('src')!==picture)farm.src=picture;
      const day='第 '+state.day+' 天';
      farmTag.textContent=cropLabel[state.crop];const rank={bare:0,sprout:1,ready:2,fresh:3,dry:4}[state.crop]??0;growth.replaceChildren(...['准备','生长','采青','鲜叶','制作'].map((label,i)=>{const step=el('div','','growth-stage');step.classList.toggle('current',i===rank);step.classList.toggle('done',i<rank);step.append(el('span',['◉','🌱','🍃','🧺','🍵'][i]),el('small',label));return step;}));meter.replaceChildren(...[[day,'研学日历'],[state.water,'水量'],[state.biodiversity,'多样性'],[state.tea,'茶乡记账'],[state.housing,'住宅']].map(([value,label])=>{const item=el('div');item.append(el('strong',String(value)),el('small',label));return item;}));
      for(const control of actions.children)control.disabled=busy||!stepLab(state,control.dataset.action);
    }
    async function act(action,label){
      if(busy)return;
      busy=true;draw();
      try{
        state=await api('explorer/lab',{action});
        if(ticket!==archive)return;
        message.textContent=label+'：'+cropLabel[state.crop]+'。'+(action==='reset'?'':'进度已保存。');
        play('effect',action==='sell'?'reward':'unlock',.5);
      }catch(error){if(ticket===archive)message.textContent=error.message;}
      finally{busy=false;if(ticket===archive)draw();}
    }
    for(const [id,label] of choices){
      const control=button(label,()=>void act(id,label));
      control.dataset.action=id;control.prepend(el('span',({survey:'查',plant:'种',wait:'日',harvest:'采',dry:'制',sell:'账',build:'建'})[id]||'·','farm-action-icon'));actions.append(control);
    }
    panel.append(plot,growth,meter,el('p','研学模拟 · 不代表实际茶叶工艺或收益。','muted'),actions,message,
      row(link('回到探索','#explore'),button('重置实验',()=>{if(confirm('清除本机实验进度？'))void act('reset','已重置');})));
    draw();
  }
  // Original city-life capabilities are integrated into the same application router.
  const groups=[
    ['吃住行 · 本地生活','让每一次出门更从容', [['美食推荐','早餐 / 面馆 / 农家乐','#directory/food','餐'],['民宿住宿','审核住宿资料','#directory/lodging','宿'],['本地商家','商家服务与资料','#directory/merchant','店'],['乡村慢游','田园与乡村目录','#directory/village','乡'],['路线推荐','主题路线与攻略','#routes','路'],['活动中心','亲子 / 市集 / 骑行','#directory/event','游']]],
    ['城市发现 · 每日更新','从公开来源认识溧阳', [['今日发现','按日期查看已审核内容','#discover','日'],['今日推荐','按天气条件和兴趣选择','#today','荐'],['推荐日报与周报','真实审核目录统计','#reports','报'],['公共信息','已审核提醒与来源','#directory/notice','讯'],['文化资料','非遗与地方故事','#culture','史'],['城市社区','已审核公开页面','#community','邻'],['全民页面工厂','提交原创内容与审核','#pages','创']]],
    ['探索成长 · 运动研学','每次探索都有收获', [['儿童探险','六章任务与双模式','#explore','探'],['青少年学习','工程与科学挑战','#learning','学'],['骑行与徒步','运动记录与分享','#outdoor','骑'],['电子护照','印章与成就','#passport','章'],['数字人导游','景点讲解与收藏','#guide','导'],['小溧助手','文字指令与陪伴','#assistant','声'],['游客模式','按兴趣生成主题游览','#today','客'],['本地知识助手','可查来源的问答','#ask','问']]],
    ['居民与商家 · 城市服务','办理自己的事情', [['求职工具','本地简历与面试练习','#jobs','职'],['商家运营','资料提交与营销工作台','#work','商'],['信息纠错','提交错误与审核进度','#work','改'],['我的主题','偏好与个性化设置','#preferences','设'],['平台说明','隐私、来源与服务边界','#about','信'],['城市运营','真实数据与角色门禁','#cityops','管']]]
  ];
  const serviceLabels={merchant:'商家',food:'美食',route:'路线',event:'活动',culture:'文化',notice:'提醒',attraction:'景点',village:'乡村',lodging:'住宿',page:'公开页面'};
  const offlineUnavailable=new Set(['#routes','#reports','#community','#pages','#work','#cityops','#ask','#study','#account','#smart']);
  function serviceTile([name,desc,href,mark]){
    const a=link('',href,'city-tile');
    const ornament=el('span',locale==='zh-CN'?mark:'','tile-mark');ornament.setAttribute('aria-hidden','true');
    a.append(ornament,el('strong',name),el('small',desc),el('span','›','tile-arrow'));
    if(hosted&&(offlineUnavailable.has(href)||href.startsWith('#directory'))){a.append(el('small','需同源服务','tile-status'));if(offlineUnavailable.has(href)){a.removeAttribute('href');a.setAttribute('aria-disabled','true');}}
    return a;
  }
  function cityHome(){
    const section=el('section','','city-home');
    const title=row(el('h2','溧阳本地生活'),link('全部服务','#services','city-more'));
    section.append(title);
    const grid=el('div','','city-tiles');
    for(const item of groups.flatMap(g=>g[2]).filter(item=>['美食推荐','民宿住宿','活动中心','今日发现','推荐日报与周报','青少年学习','求职工具','商家运营'].includes(item[0])))grid.append(serviceTile(item));
    section.append(grid);
    return section;
  }
  function servicesPage(){
    theme('lake',{photo:true});const panel=sheet('全部城市服务');panel.classList.add('city-service-sheet');
    panel.append(el('p','文旅、生活、成长和运营，在同一个应用中办理。','city-subtitle'));
    if(hosted)panel.append(el('p','当前为静态体验版；标记需同源服务的功能不会伪装成在线业务。','city-empty'));
    for(const [title,desc,items] of groups){const group=el('section','','city-group');group.append(el('h3',title),el('p',desc,'city-subtitle'));const grid=el('div','','city-tiles');
      for(const item of items){if(hosted&&offlineUnavailable.has(item[2])){const a=serviceTile(item);a.removeAttribute('href');a.setAttribute('aria-disabled','true');grid.append(a);}else grid.append(serviceTile(item));}group.append(grid);panel.append(group);}
  }
  function catalogCard(record){
    const card=el('article','','city-record');card.append(el('small',serviceLabels[record.kind]||'公开资料','record-kind'),el('h3',record.title),el('p',record.detail));
    const names={area:'片区',address:'地址',hours:'开放时间',duration:'参考用时',stops:'停靠点'};
    for(const [key,value] of Object.entries(record.travel||{}))if(names[key]&&value)card.append(el('p',names[key]+'：'+value,'record-meta'));
    card.append(el('small','来源：'+record.source+' · 更新：'+(record.updated||'未标记'),'record-meta'));
    if(record.travel?.address)card.append(link('百度地图查地址','https://map.baidu.com/search/'+encodeURIComponent('溧阳 '+record.travel.address),'city-more'));
    return card;
  }
  const dayPlans={
    sun:[['湖边慢走','天目湖水岸，先核对景区公告。','#guide/lake','湖'],['茶乡探索','了解白茶和乡村文化。','#guide/tea','茶'],['骑行记录','按实际位置权限记录运动。','#outdoor','骑']],
    rain:[['文化馆','室内文化资料与历史故事。','#culture','史'],['本地餐饮','浏览已审核餐饮目录。','#directory/food','餐'],['科学研学','在游戏中探索工程与自然。','#learning','学']],
    heat:[['竹海导览','注意防暑，实际开放信息需核实。','#guide/bamboo','竹'],['茶文化','以文化学习替代高强度户外。','#lab','茶'],['休息与餐饮','选择可核实的餐饮场所。','#directory/food','餐']],
    wind:[['地方故事','减少临水及高强度户外活动。','#culture','史'],['乡村文化','先阅读地方资料。','#guide/village','乡'],['室内研学','尝试少年工程师。','#bridge','工']]
  };
  function todayPanel(){
    const section=el('section','','city-home today-card');const now=new Intl.DateTimeFormat(locale,{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'long'}).format(new Date());
    const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
    const greeting=hour<6?'夜深了':hour<11?'早安，溧阳':hour<14?'午间慢游':hour<18?'下午好，溧阳':'晚上好，溧阳';
    const picks=row();
    const update=()=>{
      const period=activePeriod(), weather=activeClimate();
      const choices=['night','late'].includes(period)?[['文化故事','#culture'],['夜食参考','#directory/food']]:
        ['dawn','noon'].includes(period)?[['本地餐饮','#directory/food'],['地方文化','#culture']]:
        (dayPlans[weather]||dayPlans.rain).slice(0,2).map(([label,,href])=>[label,href]);
      picks.replaceChildren(...choices.map(([label,href])=>link(label,href,'destination')));
    };
    document.addEventListener('pulse-change',update,{signal:pulseRoute.signal});update();
    section.append(el('p',now+' · '+copy('溧阳当地时间'),'city-kicker'),el('h2',greeting),picks,link('生成今天的推荐','#today','action'));
    return section;
  }
  let pulse,pulsePlaying=false,pulseWeather=null,pulseSound='auto',weatherOverride='auto',periodOverride='auto';
  const activeClimate=()=>weatherOverride==='auto'?pulse.observedClimate(pulseWeather):weatherOverride;
  const activePeriod=()=>periodOverride==='auto'?pulse.localContext().period:periodOverride;
  function refreshPulse(){
    if(!pulsePlaying||!pulse)return;
    const context=pulse.localContext(), weather=activeClimate(), period=activePeriod();
    for(const stage of document.querySelectorAll('.city-skies')){
      Object.assign(stage.dataset,{weather,period,season:context.season,festival:context.festival});
    }
    const sky=pulse.climates.find(([id])=>id===weather)?.[1]||'天气未知';
    for(const status of document.querySelectorAll('[data-pulse-status]')){
      const stamp=pulseWeather?.observedAt&&weatherOverride==='auto'&&pulse.observedClimate(pulseWeather)!=='neutral';
      status.textContent=[copy(pulse.periods.find(([id])=>id===period)[1]),copy(context.season+'季'),locale==='zh-CN'?context.festival:'',
        weatherOverride!=='auto'?copy(sky)+' · '+copy('情境预览'):stamp?copy(sky)+' · '+pulseWeather.temperature+'℃ · '+new Date(pulseWeather.observedAt).toLocaleTimeString(locale,{timeZone:'Asia/Shanghai'}):copy('实时天气未匹配')].filter(Boolean).join(' · ');
    }
    env(scene.id);
    document.dispatchEvent(new Event('pulse-change'));
  }
  function skyLayer(){
    const stage=el('div','','city-skies');stage.setAttribute('aria-hidden','true');
    for(const name of ['light','cloud','rain','wind','stars','moon','festival'])stage.append(el('span','','sky-'+name));
    return stage;
  }
  function pulseControls(withSky=true){
    const panel=el('section','','pulse-controls');
    const intro=el('p','城市呼吸','pulse-title');
    const status=el('p','','pulse-status');status.dataset.pulseStatus='';
    const weather=selectField('scene-weather','天气',[['auto','实时／未知'],...pulse.climates]);
    const time=selectField('scene-period','出行时段',[['auto','溧阳当地时间'],...pulse.periods]);
    const sound=selectField('scene-sound','声景',[['auto','跟随场景'],['lake','湖畔'],['bamboo','竹林'],['tea','茶园'],['birds','田野鸟鸣'],['rain','雨声（合成）']]);
    for(const [control,value,set] of [[weather,weatherOverride,v=>weatherOverride=v],[time,periodOverride,v=>periodOverride=v],[sound,pulseSound,v=>pulseSound=v]]){
      for(const option of control.lastChild.options)option.textContent=copy(option.textContent);
      control.lastChild.value=value;control.lastChild.onchange=()=>{set(control.lastChild.value);refreshPulse();};
    }
    if(withSky)panel.append(skyLayer());
    panel.append(intro,status,row(weather,time,sound));
    queueMicrotask(refreshPulse);
    return panel;
  }
  async function refreshWeather(){
    if(hosted||document.hidden||!pulsePlaying)return;
    try{pulseWeather=await api('weather');}catch{pulseWeather=null;}
    refreshPulse();
  }
  function today(){
    theme('lake',{photo:true});const panel=sheet('今日推荐');panel.classList.add('city-service-sheet');
    panel.append(el('p','选择实际出行情境，生成规则式建议，不把情境模拟当成实时天气。','city-subtitle'));
    const grid=el('div','','city-tiles');const note=el('p','','city-empty');
    const update=()=>{const key=activeClimate(),mode=activePeriod();const night=['night','late'].includes(mode);let picks=dayPlans[key]||[['文化馆','开放时间请先核实。','#culture','史'],['活动中心','查阅已审核活动。','#directory/event','游']];
      if(night)picks=[['文化故事','在家也能听故事','#culture','史'],['夜食参考','请确认真实营业时间','#directory/food','餐'],['电子护照','回看今天探索成就','#passport','章']];
      else if(mode==='dawn'||mode==='noon')picks=[['本地餐饮',mode==='dawn'?'查已审核早餐目录。':'查已审核午餐目录。','#directory/food','餐'],...picks.slice(0,2)];
      grid.replaceChildren(...picks.map(serviceTile));note.textContent=night?'夜间出行留意安全与返程。':'请核对景区开放和当地天气。';};
    panel.append(pulseControls(),grid,note);
    document.addEventListener('pulse-change',update,{signal:pulseRoute.signal});update();
  }
  function recentUpdates(){
    const section=el('section','','city-home city-updates');
    const list=el('ul'),status=el('p','','muted');
    const banner=el('p','','city-update-banner');banner.hidden=true;
    let published=[],index=0,timer;
    const rotate=()=>{banner.hidden=!published.length;if(published.length)banner.textContent=published[index++%published.length].title;};
    const enable=button('播放动态弹幕',()=>{
      if(timer){clearInterval(timer);timer=null;banner.hidden=true;enable.textContent=copy('播放动态弹幕');return;}
      rotate();timer=setInterval(rotate,5000);enable.textContent=copy('停止动态弹幕');
    });
    pulseRoute.signal.addEventListener('abort',()=>clearInterval(timer),{once:true});
    const feed=async()=>{
      try{
        const rows=await api('catalog');
        const recent=rows.filter(r=>['event','merchant','route','notice','page'].includes(r.kind)).slice(0,4);
        published=recent;enable.disabled=!recent.length;if(timer)rotate();
        list.replaceChildren(...recent.map(r=>{
          const item=el('li');item.lang='zh-CN';item.append(link(r.title,r.kind==='page'?'#community':'#directory/'+r.kind));return item;
        }));
        status.textContent=recent.length?'':copy('暂无已审核动态。');
      }catch{status.textContent=copy('暂时无法读取审核目录。');}
    };
    enable.disabled=true;
    section.append(el('h2','溧阳动态'),status,banner,list,row(button('刷新',feed),enable,link('查看发现','#discover')));
    void feed();return section;
  }
  function foodIdeas(){
    const section=el('section','','city-group');section.append(el('h3','按餐饮类型找灵感'),el('p','餐饮类别参考，不代表具体商家或实际营业信息。','city-subtitle'));
    const options=['早餐','面馆','砂锅','烧烤','火锅','甜品','咖啡','夜宵','农家乐'];const grid=el('div','','city-chips');const output=el('p','选择你想吃的类型。','city-empty');
    let request=0;
    const search=async(name,context='')=>{const id=++request;try{const rows=await api('directory?kind=food&q='+encodeURIComponent(name));if(id!==request)return;output.replaceChildren(el('strong',name+' · '+rows.length+' 条已审核记录'));if(context)output.append(el('p',context));for(const item of rows)output.append(catalogCard(item));if(!rows.length)output.append(el('p','暂无对应记录。'));}catch(e){if(id===request)output.textContent=e.message;}};
    for(const name of options)grid.append(button(name,()=>search(name)));
    const people=field('people','用餐人数',{type:'number'});Object.assign(people.lastChild,{min:1,max:20,value:2});
    section.append(grid,taskForm([selectField('meal','用餐时间',[['早餐','早餐'],['午餐','午餐'],['晚餐','晚餐'],['夜宵','夜宵']]),people,selectField('budget','人均预算',[['50元以内','50元以内'],['50–120元','50–120元'],['120元以上','120元以上']])],'生成美食建议',async(data,status)=>{
      const weather=activeClimate(),name=['早餐','夜宵'].includes(data.meal)?data.meal:weather==='heat'?'面馆':weather==='rain'?'砂锅':Number(data.people)>=4?'农家乐':data.budget==='50元以内'?'面馆':'砂锅';
      await search(name,data.meal+' · '+data.people+' 人 · 人均预算 '+data.budget+'。按情境推荐类别；未核实价格、座位或营业时间。');
    }),output);return section;
  }
  async function discover(ticket){
    theme('lake',{photo:true});const panel=sheet('发现溧阳');panel.classList.add('city-service-sheet');const controls=el('div','','city-chips'),out=el('div','','city-records');
    panel.append(el('p','看见真实内容更新，而不是模拟热度或虚构榜单。','city-subtitle'),controls,out);
    if(hosted){out.append(el('p','实时目录需要同源后端。', 'city-empty'),link('浏览景点知识','#guide','action'));return;}
    const records=await api('catalog');if(ticket!==archive)return;
    function show(days){out.replaceChildren();const now=Date.now();const rows=records.filter(r=>{const stamp=String(r.updated||'');const time=Date.parse(stamp.includes('T')?stamp:stamp.replace(' ','T')+'Z');return Number.isFinite(time)&&now-time<=days*864e5&&now>=time;});
      out.append(el('p',`最近 ${days} 天 · ${rows.length} 条已审核内容（UTC）`,'city-subtitle'));
      if(!rows.length)out.append(el('p','本时段没有已审核更新。可以浏览景点知识或提交新资料。','city-empty'));
      for(const r of rows)out.append(catalogCard(r));}
    for(const [days,label] of [[1,'最近一天'],[7,'最近一周'],[30,'最近一月']])controls.append(button(label,()=>show(days)));show(7);
    panel.append(row(link('查看真实日报周报','#reports','action'),link('提交资料','#work')));
  }
  async function reports(ticket){
    theme('lake',{photo:true});const panel=sheet('城市日报与周报');panel.classList.add('city-service-sheet');const data=await api('reports');if(ticket!==archive)return;
    panel.append(el('p','统计范围：未下架的审核目录 · '+data.timezone+' · 非全市实时客流或 AI 报告。','city-subtitle'));
    const totals=data.rows.reduce((a,r)=>[a[0]+Number(r.today||0),a[1]+Number(r.week||0)],[0,0]);
    const metrics=el('div','','city-metrics');for(const [title,val] of [['今日更新',totals[0]],['近七日更新',totals[1]]]){const item=el('div');item.append(el('small',title),el('strong',String(val)));metrics.append(item);}panel.append(metrics);
    for(const r of data.rows){const card=el('div','','city-record');card.append(el('h3',serviceLabels[r.kind]||r.kind),el('p',`今日 ${r.today} · 七日 ${r.week}`));panel.append(card);}
    if(!data.rows.length)panel.append(el('p','审核目录暂未有更新；0 是当前数据库统计，不代表溧阳市没有活动。','city-empty'));
    panel.append(el('small','生成时间：'+data.generatedAt),row(link('城市发现','#discover','action'),button('重新加载',route)));
  }
  async function publishedPages(ticket,title){
    theme('village');const panel=sheet(title);panel.classList.add('city-service-sheet');
    panel.append(el('p','只展示审核发布的纯文本页面。未授权的陌生人私聊、交易、拼车和招聘保持关闭。','city-subtitle'),link('创建内容并提交审核','#work','action'));
    const records=await api('pages');if(ticket!==archive)return;
    if(!records.length)panel.append(el('p','暂时没有已发布页面。登录居民或商家账号后可提交原创内容。','city-empty'));
    for(const r of records)panel.append(catalogCard({...r,kind:'page'}));
  }
  function community(ticket){return publishedPages(ticket,'本地社区 · 审核内容');}
  async function pages(ticket){
    await publishedPages(ticket,'全民页面工厂');if(ticket!==archive)return;
    const panel=$('view').querySelector('.sheet');const user=await api('session');if(ticket!==archive)return;
    const draft=el('article','','city-record');draft.append(el('h3','你的内容将在这里预览'),el('p','输入标题和正文，生成纯文本页面草稿。'));
    const title=field('title','页面标题');const detail=el('label','页面正文','app-field');const text=Object.assign(el('textarea'),{name:'detail',maxLength:2000,required:true,rows:5});detail.append(text);
    const source=field('source','内容来源',{max:500});
    const preview=()=>draft.replaceChildren(el('small','页面预览 · 未发布','record-kind'),el('h3',title.lastChild.value||'你的标题'),el('p',text.value||'你的正文'),el('small','来源：'+source.lastChild.value,'record-meta'));
    for(const input of [title.lastChild,text,source.lastChild])input.addEventListener('input',preview);
    const form=taskForm([title,detail,source],'提交审核',async(data,status)=>{if(!['resident','merchant','admin'].includes(user?.role))throw Error('请先登录有投稿权限的账号。');const result=await api('submissions',{kind:'page',...data});status.textContent='已提交，审核编号 '+result.id+'。';});
    panel.append(el('h3','创建自己的页面'),form,draft);if(!user)panel.append(link('登录后提交','#account','action'));
  }
  function preferences(){
    theme('lake',{photo:true});const panel=sheet('我的主题与慢游偏好');panel.classList.add('city-service-sheet');
    const out=el('div','','city-tiles');
    const international=row(link(translate('visitor','国际游客'),'#visitor'),link(accessCopy[locale][0],'#accessibility'));international.lang=locale;panel.append(international);
    const interests={nature:[['湖山自然','天目湖','#guide/lake','湖'],['竹海探索','南山竹海','#guide/bamboo','竹']],culture:[['地方文化','历史文化馆','#culture','史'],['茶乡故事','白茶研学','#lab','茶']],family:[['亲子冒险','童话游戏','#explore','探'],['亲子研学','学习挑战','#learning','学']],sport:[['运动记录','骑行与徒步','#outdoor','骑'],['一号公路','文化导览','#guide/road','路']]};
    const savedInterest=storage('liyang.interest');
    const pick=selectField('interest',copy('兴趣'),[['nature','自然山水'],['culture','历史文化'],['family','亲子研学'],['sport','骑行运动']].map(([id,label])=>[id,copy(label)]));pick.lastChild.value=Object.hasOwn(interests,savedInterest)?savedInterest:'nature';
    const color=selectField('theme',copy('主题'),[['green','湖山绿'],['tea','白茶暖金'],['night','夜游深蓝']].map(([id,label])=>[id,copy(label)]));color.lastChild.value=savedTheme();
    const option=(name,label,key,values)=>{
      const field=selectField(name,copy(label),values.map(([code,text])=>[code,copy(text)]));
      const control=field.lastChild;control.value=values.some(([code])=>code===storage(key))?storage(key):values[0][0];
      control.onchange=()=>{storage(key,control.value);if(key==='liyang.outfit')outfitChoice=control.value;document.dispatchEvent(new Event('liyang-avatar'));};
      return field;
    };
    const outfit=option('outfit','小溧服装','liyang.outfit',[['pine','竹绿'],['tea','茶棕'],['river','湖蓝']]);
    const cover=option('cover','首页风景','liyang.home.cover',[['lake','天目湖'],['bamboo','南山竹海'],['tea','白茶研学']]);
    const layout=option('layout','首页模块顺序','liyang.home.layout',[['travel','景点优先'],['local','本地生活优先']]);
    function apply(){storage('liyang.interest',pick.lastChild.value);storage('liyang.theme',color.lastChild.value);document.documentElement.dataset.cityTheme=color.lastChild.value;out.replaceChildren(...interests[pick.lastChild.value].map(serviceTile));}
    pick.lastChild.onchange=apply;color.lastChild.onchange=apply;panel.append(pick,color,outfit,cover,layout,el('h3','为你推荐的入口'),out,el('p','偏好保存在本机，推荐按明确规则生成，不是未经授权的 AI 分析。','city-subtitle'));apply();
  }
  function jobs(){
    theme('village');const panel=sheet('就业中心 · 求职练习');panel.classList.add('city-service-sheet');
    panel.append(el('p','本地岗位发布与招聘交易尚未授权。下面的简历与面试工具在本机生成，不上传个人资料。','city-subtitle'));
    const preview=el('pre','','city-draft');preview.hidden=true;
    const download=button('下载简历草稿',()=>{const a=link('','');const url=URL.createObjectURL(new Blob([preview.textContent],{type:'text/plain;charset=utf-8'}));a.href=url;a.download='求职简历草稿.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'action');download.hidden=true;
    panel.append(taskForm([field('role','目标岗位'),field('skills','技能与证书',{max:500}),field('experience','相关工作经历',{max:1000})],'生成本机简历草稿',async(data,status)=>{preview.textContent=`求职方向：${data.role}\n\n技能与证书\n${data.skills}\n\n工作经历\n${data.experience}\n\n请自行核对事实、补充可验证的工作成果。`;preview.hidden=false;download.hidden=false;status.textContent='已生成本机模板，未发送给招聘方。';}),preview,download);
    const prompt=el('p','请介绍一次与目标岗位有关的真实工作经历。','city-record');const prompts=['请介绍一次与目标岗位有关的真实工作经历。','遇到异常情况时你如何排查和处理？','你如何确保工作质量，并验证结果？','你希望向面试官了解什么？'];let i=0;
    panel.append(el('h3','模拟面试'),prompt,button('下一道练习题',()=>{prompt.textContent=prompts[++i%prompts.length];},'action'),el('p','求职提醒：不要支付入职押金，不向陌生人提供身份证、验证码或银行信息。','city-empty'));
  }
  function learning(){
    announcePet('learning');
    theme('bamboo',{photo:false});const panel=sheet('游戏化学习中心');panel.classList.add('city-service-sheet');
    const grid=el('div','','city-tiles');for(const item of [['童话六章','自然、文化与语言','#explore','童'],['少年工程师','桁架与荷载挑战','#bridge','工'],['白茶实验场','种植、经营和生态','#lab','茶'],['历史推理','资料辨析与非遗','#culture','史']])grid.append(serviceTile(item));panel.append(el('p','进入真实已实现的游戏与学习任务。','city-subtitle'),grid);
    panel.append(fieldOverview(),researchDesk(),link('听见家乡 · 家庭方言','#family','action'));if(!hosted)panel.append(link('老师发布的研学任务','#study','action'));
  }
  function fieldCardsSaved(){
    try{return pulse.readFieldCards(JSON.parse(storage('liyang.field.v1')||'{}'));}catch{return {};}
  }
  function fieldOverview(){
    const section=el('section','','field-overview'), saved=fieldCardsSaved();
    const completed=Object.entries(pulse.fieldCards).filter(([id,card])=>saved[id]?.length===card.tasks.length).length;
    section.append(el('h3','湖山观察手册'),el('p',`${completed} / 6 站已完成观察 · 仅此浏览器`,'muted'));
    const grid=el('div','','field-grid');
    for(const [id,card] of Object.entries(pulse.fieldCards)){
      const item=link('','#field/'+id,'field-site');
      item.append(scenicImage(id,'field-thumb',true),el('strong',card.title),el('small',`${saved[id]?.length||0} / ${card.tasks.length}`));
      grid.append(item);
    }
    section.append(grid);return section;
  }
  function fieldPage(ticket,id){
    if(!Object.hasOwn(pulse.fieldCards,id||'')){
      theme('lake',{photo:true});sheet('湖山观察手册').append(fieldOverview());return;
    }
    const card=pulse.fieldCards[id];
    theme(id,{photo:id==='lake'||id==='bamboo'});
    const panel=sheet(card.title), figure=el('figure','','field-hero');
    figure.append(scenicImage(id,'field-photo',true),el('figcaption',['lake','bamboo'].includes(id)?'实景 · 版权见景区导览':'主题插画 · 非实景'));
    const status=el('p');status.setAttribute('role','status');
    const list=el('ol','','field-checks');
    const update=()=>{const count=fieldCardsSaved()[id]?.length||0;status.textContent=count===card.tasks.length?'本站观察已完成。':`已记录 ${count} / ${card.tasks.length} 项观察。`;};
    for(const [index,text] of card.tasks.entries()){
      const check=el('input');check.type='checkbox';check.checked=fieldCardsSaved()[id]?.includes(index)||false;
      check.onchange=()=>{
        const next=JSON.stringify(pulse.toggleFieldCard(fieldCardsSaved(),id,index));
        if(storage('liyang.field.v1',next)!==next){check.checked=!check.checked;status.textContent='无法保存到此浏览器。';return;}
        update();
      };
      const label=el('label');label.append(check,el('span',text));const item=el('li');item.append(label);list.append(item);
    }
    const narration=button('听小溧介绍任务',()=>{
      if(muted){notice('请先开启声音。');return;}
      speakLocal(card.title+'。'+card.tasks.join('。')+'。');
    },'action');
    const stop=button('停止播报',cancelVoice);
    narration.dataset.voiceAction='';stop.dataset.voiceAction='';
    const subtitle=el('p','','guide-subtitle');subtitle.dataset.voiceSubtitle='';subtitle.hidden=true;
    panel.append(figure,el('p','仅在开放区域活动。记录是手动核对，不要求定位、照片或个人资料。','muted'),row(narration,stop),subtitle,list,status,
      row(link('查看景区资料','#guide/'+id),link('进入本站研学游戏','#game/'+id+'/teen'),link('返回手册','#field','destination')));
    update();
  }
  function researchDesk(){
    const section=el('section','','research-desk');
    const area=el('div'), picker=selectField('research','研学案例',[['0','湖岸观察'],['1','茶乡生态']]);
    function open(){
      const {title,prompt,note,samples,totals}=pulse.fieldStudy(Number(picker.lastChild.value));
      const evidence=el('figure');evidence.append(scenicImage(picker.lastChild.value==='0'?'lake':'tea','scene-picture'),el('figcaption',note));
      const table=el('table'), head=el('tr');
      for(const name of ['观测组','记录一','记录二'])head.append(el('th',name));
      table.append(head);
      for(const [i,series] of samples.entries()){const tr=el('tr');tr.append(el('th',i?'乙':'甲'),...series.map(n=>el('td',String(n))));table.append(tr);}
      const response=el('div');response.setAttribute('aria-live','polite');
      const total=field('total','乙组共记录几次？',{type:'number'});total.lastChild.min=0;
      const next=()=>{
        response.replaceChildren(el('h4','这些数据能说明什么？'));
        const feedback=el('p');feedback.setAttribute('role','status');
        for(const [label,correct] of [['本次乙组记录次数较多',true],['乙组地点一定更适合所有动物',false]]){
          response.append(button(label,()=>{
            feedback.textContent=correct?'观察结论成立。两次短观察不能证明长期趋势，也不能排除其他因素。':'这把有限的观察变成了因果结论。再看看记录覆盖的范围。';
            if(correct){play('effect','reward',.55);speakLocal(feedback.textContent);}
          },'choice'));
        }
        response.append(feedback,link('查看地点讲解',picker.lastChild.value==='0'?'#guide/lake':'#guide/tea'));
      };
      area.replaceChildren(el('h4',title),el('p',prompt),evidence,table,taskForm([total],'核对记录',async(data,status)=>{
        if(Number(data.total)!==totals[1]){status.textContent='再把乙组两次记录相加。';response.replaceChildren();return;}
        status.textContent='记录已核对。';next();
      }),response);
    }
    picker.lastChild.onchange=open;section.append(el('h3','少年调查台'),picker,area);open();return section;
  }
  function familyPage(){
    theme('village');const panel=sheet('听见家乡');panel.classList.add('family-studio');
    panel.append(el('p','家长录下自己的方言故事，孩子在游戏中可以听到熟悉的声音。录音仅保存于此浏览器，不上传、不克隆声音。','muted'));
    const toggle=el('input');toggle.type='checkbox';toggle.checked=familyMode();const lab=el('label',' 在游戏中优先播放家庭方言');lab.prepend(toggle);toggle.onchange=()=>storage('liyang.family.mode',String(toggle.checked));panel.append(lab);
    const sel=el('select');sel.setAttribute('aria-label','方言台词');for(const key of Object.keys(voiceLines).filter(k=>k.startsWith('voice-story-')||k.startsWith('voice-quiz-')))sel.append(new Option(places[key.split('-')[2]]+' · '+(key.endsWith('kid')?'童话':'研学')+' · '+(key.startsWith('voice-story-')?'剧情':'题目'),key));
    const prompt=el('blockquote'),state=el('p');state.setAttribute('role','status');let recorder,stream,timer,recordKey;
    async function refresh(){prompt.textContent=voiceLines[sel.value];try{state.textContent=await clipOp(sel.value)?'已有录音，可以试听或删除。':'还没有录音。';}catch{state.textContent='当前浏览器不能保存录音。';}}
    const start=button('开始录制',async()=>{if(recorder)return;if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){state.textContent='此浏览器不支持本地麦克风录音。';return;}if(!confirm('确认录音者本人同意录制并保存在此浏览器？'))return;start.disabled=true;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!panel.isConnected){stream.getTracks().forEach(t=>t.stop());return;}const chunks=[];recordKey=sel.value;recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>{clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:recorder.mimeType});recorder=null;start.disabled=false;end.disabled=true;sel.disabled=false;if(!panel.isConnected)return;if(blob.size&&blob.size<=8*1024*1024){try{await clipOp(recordKey,blob);await refresh();}catch{state.textContent='录音未保存。';}}else state.textContent='录音为空或太大。';};recorder.start();end.disabled=false;sel.disabled=true;state.textContent='正在录音 · 最长 45 秒';timer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},45000);}catch{start.disabled=false;stream?.getTracks().forEach(t=>t.stop());state.textContent='录音权限未授予或设备不可用。';}},'action');
    const end=button('结束并保存',()=>{if(recorder?.state==='recording')recorder.stop();});end.disabled=true;sel.onchange=refresh;
    const leave=()=>{if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());};addEventListener('hashchange',leave,{once:true});addEventListener('pagehide',leave,{once:true});
    panel.append(sel,prompt,row(start,end,button('试听方言',()=>{if(muted){state.textContent='请先开启声音';return;}void familySpeak(sel.value,false);}),button('删除这句录音',async()=>{if(!confirm('删除本机这句方言录音？'))return;try{stopFamily();await clipOp(sel.value,null);refresh();}catch{state.textContent='删除失败';}})),state,link('回到学习中心','#learning','action'));refresh();
  }
  function aboutPage(){
    theme('lake',{photo:true});const panel=sheet('关于溧阳慢游所');panel.classList.add('city-service-sheet');
    panel.append(el('small','产品重构 · 54f8eab 基线 · R2','city-kicker'),el('p','个人开发者的本地生活与智慧文旅项目，非政府官方网站、非政务服务平台。'),el('h3','资料与隐私'),el('p','景点知识与审核目录显示资料来源。未知天气、票价和开放时间不作推测。匿名游戏记录与账户记录分开；运动定位须主动授权。'),el('h3','声音与外部服务'),el('p','用户可随时关闭声音。在线服务仅在授权后通过国产 API 网关调用。机械合成样音不是最终自然人声。'),el('h3','内容与风险'),el('p','资料仅供参考，实际出行请核对景区与商家公告。不开放未经授权的真实奖励、交易或社交发布。'));
    if(!hosted)panel.append(link('反馈纠错及内容提交','#work','action'));
  }
  async function cityops(ticket){
    theme('village');const panel=sheet('城市运营中心');panel.classList.add('city-service-sheet');const user=await api('session');if(ticket!==archive)return;
    panel.append(link('公开目录日报与周报','#reports','action'));
    if(user?.role!=='admin'){panel.append(el('p','运营审核、诊断、网关状态与审计仅供授权管理员使用。','city-empty'),link('管理员登录','#account','action'));return;}
    const report=el('section','','city-group'), advice=el('ul');
    const refresh=async()=>{
      try{
        const [health,stats]=await Promise.all([api('health'),api('reports')]);
        advice.replaceChildren();
        const add=text=>advice.append(el('li',text));
        if(health.database!=='ok')add('数据库探活异常，请核对近期备份；不会自动变更数据。');
        if(!stats.rows.some(record=>record.kind==='event'&&Number(record.week)>0))add('近七日无活动目录更新，可人工复核公开活动来源。');
        if(health.maps==='not_connected')add('地图服务未接通；保留示意图与第三方导航入口。');
        if(health.model!=='configured')add('生成模型未配置，保留本地知识和规则推荐。');
        if(!advice.children.length)add('本次探活和目录检查没有待复核建议。');
      }catch{advice.replaceChildren(el('li','暂时无法读取运行状态，未执行任何修复。'));}
    };
    report.append(el('h3','待人工复核'),button('检查运营建议',refresh),advice);
    panel.append(report);
    panel.append(row(link('运营与审核后台','/','action'),link('经营工作室','/studio','action')),el('h3','只读系统诊断'));
    const output=el('pre','','city-draft');panel.append(button('检查服务状态',async()=>{try{const data=await api('health');output.textContent=JSON.stringify(data,null,2);}catch(e){output.textContent=e.message;}},'action'),button('执行数据库完整性诊断',async()=>{try{const data=await api('ops/diagnostics',{});output.textContent=JSON.stringify(data,null,2);}catch(e){output.textContent=e.message;}},'action'),button('查看国产网关状态',async()=>{try{const data=await api('providers');output.textContent=JSON.stringify(data.providers,null,2);}catch(e){output.textContent=e.message;}},'action'),output,el('p','生产告警、灾备与自动修复尚未验收；此页不执行系统变更。','city-subtitle'));
  }
  function smart(){return ask();}
  function savedTheme(){
    const value=storage('liyang.theme');
    return ['green','tea','night'].includes(value)?value:'green';
  }
  document.documentElement.dataset.cityTheme=savedTheme();

  let pulseRoute=new AbortController();
  function nextRoute(){
    pulseRoute.abort();pulseRoute=new AbortController();
    void route().then(refreshWeather);
  }
  Promise.all([import('./experience-lab.mjs'),visitorModule]).then(async ([module,i18n])=>{
    pulse=module;
    visitor=i18n;
    try{
      const saved=storage(visitor?.preference);
      if(visitor?.supported(saved)){localeData=await visitor.loadLocale(saved);locale=saved;}
    }catch{}
    try{accessibility=JSON.parse(storage('liyang.accessibility.v1'))||{};}catch{}
    applyAccessibility();
    addEventListener('hashchange',nextRoute);
    setInterval(()=>{if(!document.hidden)refreshPulse();},60000);
    setInterval(refreshWeather,600000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshPulse();void refreshWeather();}});
    nextRoute();
    void startPet().catch(()=>{});
  });
})();
