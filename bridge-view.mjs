import {joints,pieces,lessons,testBridge} from './bridge.mjs';
const key='liyang.bridge.badges.v1';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
const button=(text,action)=>Object.assign(el('button',text),{type:'button',onclick:action});
const tags=['A','B','C','D','E'];
function svg(name,attrs){
  const node=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
  return node;
}
export function bridgeBadges(){
  try{const values=JSON.parse(localStorage.getItem(key));return Array.isArray(values)?[...new Set(values.filter(id=>Object.hasOwn(lessons,id)))]:[];}catch{return [];}
}
export function mountBridge(panel){
  panel.classList.add('bridge-sheet');
  let lesson='foot',selected=new Set,verdict;
  const choice=el('select');choice.setAttribute('aria-label','工程挑战');
  for(const [id,rule] of Object.entries(lessons))choice.append(new Option(rule.label,id));
  const stage=svg('svg',{viewBox:'0 0 360 210',role:'img','aria-label':'教学用桥梁结构图：五个节点，侧视'});
  stage.classList.add('bridge-stage');
  const tools=el('div');tools.className='bridge-pieces';
  const budget=el('p'),status=el('p');
  status.setAttribute('role','status');
  const selectHelp=el('p','将杆件连成三角形，再试着增加车辆荷载。','muted');
  const back=Object.assign(el('a','返回探索'),{href:'#explore'});
  panel.append(choice,selectHelp,stage,tools,budget,button('加载测试',()=>{
    verdict=testBridge([...selected],lesson);
    const notes={
      unstable:'结构不稳定。检查桥面是否有支撑，并试试用斜杆形成三角形。',
      budget:'结构超过材料预算。试试移除一根冗余长杆。',
      deflection:'桥面下挠超过限值。试试加一根长斜杆，同时留意材料预算。',
      pass:lesson==='foot'?'通过！切换到运茶挑战，比较较重荷载下的桥面变形。':'通过！比较有无长斜杆时的下挠差异，同时记录材料代价。'
    };
    status.textContent=notes[verdict.reason]+(verdict.deflection==null?'':' 模型下挠：'+verdict.deflection.toFixed(3)+'。');
    if(verdict.passed){
      try{localStorage.setItem(key,JSON.stringify([...new Set([...bridgeBadges(),lesson])]));
        status.textContent+=' 虚拟工程印章已保存。';}
      catch{status.textContent+=' 浏览器未能保存印章。';}
    }
    draw();
  }),button('清空杆件',()=>{selected.clear();verdict=null;status.textContent='';draw();}),status,back,
  el('p','理想铰接杆件的教学简化模型，不可用于真实工程设计。','muted'));
  const controls=pieces.map(([a,b],i)=>{
    const control=button(tags[a]+'–'+tags[b],()=>{
      if(selected.has(i))selected.delete(i);else selected.add(i);
      verdict=null;status.textContent='';draw();
    });
    tools.append(control);return control;
  });
  choice.onchange=()=>{lesson=choice.value;verdict=null;status.textContent='';draw();};
  function draw(){
    const free=[2,3,4,6,7,8,9];
    const shift=(index,axis)=>verdict?.shifts?.[free.indexOf(index*2+axis)]||0;
    const positions=joints.map(([x,y],i)=>[38+x*71+shift(i,0)*70,141-y*55-shift(i,1)*90]);
    stage.replaceChildren(svg('image',{href:'./experience-art-lake.webp',width:360,height:210,preserveAspectRatio:'xMidYMid slice'}),svg('rect',{width:360,height:210,fill:'#092f2b','fill-opacity':'.28'}),
      svg('path',{d:'M0 153C90 146 126 165 177 157S266 152 360 160V210H0Z',fill:'#6eb4b3','fill-opacity':'.4'}),
      svg('path',{d:'M4 160H38V145H4ZM322 145h34v15h-34z',fill:'#756b56'}));
    pieces.forEach(([a,b],i)=>{
      const yes=selected.has(i);
      stage.append(svg('line',{x1:positions[a][0],y1:positions[a][1],x2:positions[b][0],y2:positions[b][1],
        stroke:yes?(verdict?.passed?'#ffdd91':'#f0ad55'):'#f0f3e2','stroke-width':yes?6:1.5,'stroke-dasharray':yes?'none':'4 4'}));
      controls[i].setAttribute('aria-pressed',String(yes));
    });
    if(verdict)stage.append(svg('path',{d:'M180 30v26m-8-8 8 8 8-8',fill:'none',stroke:'#a55130','stroke-width':3,class:'bridge-load'}));
    positions.forEach(([x,y],i)=>{
      stage.append(svg('circle',{cx:x,cy:y,r:5,fill:'#e9b652'}));
      const label=svg('text',{x:x-4,y:y+20,fill:'#274034','font-size':13,stroke:'none'});
      label.textContent=tags[i];stage.append(label);
    });
    const result=testBridge([...selected],lesson);
    budget.textContent='材料 '+result.used+' / '+result.limit+' · 荷载 '+lessons[lesson].load;
  }
  draw();
}
