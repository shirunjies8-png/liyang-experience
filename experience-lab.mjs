export const initialLab = { water:3, biodiversity:2, tea:0, crop:'bare', housing:0, day:1, surveyed:false };
export function stepLab(state, action) {
  const next = {...state};
  if (action === 'survey') {
    if (state.surveyed) return null;
    next.surveyed = true; next.biodiversity++;
  }
  else if (action === 'plant' && state.water>0 && state.crop==='bare') { next.water--; next.crop='sprout'; }
  else if (action === 'wait') {
    if(state.day>=365) return null;
    next.day++; next.water=Math.min(5,state.water+1); if(state.crop==='sprout') next.crop='ready';
  }
  else if (action === 'observe_lake' && !state.lakeObserved) next.lakeObserved=true;
  else if (action === 'protect_lake' && state.lakeObserved && !state.lakeBadge && state.water>0) {
    next.water--; next.biodiversity++; next.lakeBadge=true;
  }
  else if (action === 'observe_bamboo' && !state.bambooObserved) next.bambooObserved=true;
  else if (action === 'report_bamboo' && state.bambooObserved && !state.bambooBadge) next.bambooBadge=true;
  else if (action === 'harvest' && state.crop==='ready') next.crop='fresh';
  else if (action === 'dry' && state.crop==='fresh') next.crop='dry';
  else if (action === 'sell' && state.crop==='dry') { next.tea++; next.crop='bare'; }
  else if (action === 'build' && state.surveyed && state.water>=2 && state.biodiversity>1) {
    next.housing++; next.water-=2; next.biodiversity--;
  } else return null;
  return next;
}
export const periods=[['dawn','清晨'],['morning','上午'],['noon','中午'],['afternoon','下午'],['dusk','傍晚'],['night','夜间'],['late','深夜']];
export const climates=[['sun','晴天'],['rain','雨天'],['heat','高温'],['wind','大风']];
const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hourCycle:'h23',hour:'2-digit',month:'numeric',day:'numeric'});
const lunar=new Intl.DateTimeFormat('en-u-ca-chinese',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric'});
export function localContext(date=new Date()){
  const parts=formatter=>Object.fromEntries(formatter.formatToParts(date).map(({type,value})=>[type,value]));
  const {hour,month,day}=parts(clock);
  const h=Number(hour), m=Number(month);
  const period=h<5||h>=23?'late':h<8?'dawn':h<11?'morning':h<14?'noon':h<17?'afternoon':h<19?'dusk':'night';
  const season=m>=3&&m<=5?'春':m<=8&&m>=6?'夏':m>=9&&m<=11?'秋':'冬';
  const moon=parts(lunar);
  const festival=m===10&&Number(day)===1?'国庆':({'1/1':'春节','1/15':'元宵','5/5':'端午','8/15':'中秋'})[moon.month+'/'+moon.day]||'';
  return {period,season,festival};
}
export function observedClimate(data,now=Date.now()){
  const time=Date.parse(data?.observedAt);
  if(data?.status!=='available'||!Number.isFinite(data.temperature)||!Number.isFinite(time)||time>now+300000||now-time>7200000)return 'neutral';
  const summary=String(data.summary);
  if(/雨|雷/.test(summary))return 'rain';
  if(/大风|强风|狂风|台风/.test(summary))return 'wind';
  if(data.temperature>=35)return 'heat';
  return /晴/.test(summary)?'sun':'neutral';
}
export function sceneAudio(weather,period,place){
  if(weather==='rain')return ['music-history','rain'];
  if(weather==='wind')return ['music-bamboo','bamboo'];
  if(weather==='heat')return ['music-tea','tea'];
  if(['night','late'].includes(period))return ['music-history','lake'];
  if(period==='dawn')return ['music-lake','birds'];
  return ['music-'+place,({lake:'lake',bamboo:'bamboo',tea:'tea',road:'birds',history:'bamboo',village:'birds'})[place]||'lake'];
}
export const tripTypes=[['half','半日'],['day','一日'],['two','两日'],['family','亲子'],['couple','情侣'],['cycling','骑行'],['photo','摄影'],['rainy','雨天'],['night','夜游'],['camping','露营'],['weekend','周末'],['holiday','节假日']];
const stopsByType={family:['lake','bamboo','village'],couple:['lake','tea','village'],cycling:['road','village','tea'],photo:['tea','lake','road'],rainy:['history','tea'],night:['history','lake'],camping:['village','road','lake'],weekend:['lake','bamboo','tea'],holiday:['history','tea','village']};
const stopsByInterest={food:['village','tea','lake'],nature:['lake','bamboo','village'],family:stopsByType.family,cycling:stopsByType.cycling,camping:stopsByType.camping,night:stopsByType.night,tea:['tea','village','history']};
export function planTrip({type,interest,theme,duration,pace,count,weather}){
  const days=type==='two'||(!['half','day'].includes(type)&&duration==='two')?2:1;
  const half=type==='half'||(!['day','two'].includes(type)&&duration==='half');
  const sheltered=['rain','wind','heat'].includes(weather)||type==='rainy';
  const preferred=sheltered?stopsByType.rainy:stopsByType[type]||(theme==='heritage'?['history','tea','village']:theme==='drive'?stopsByType.cycling:stopsByInterest[interest])||stopsByInterest.nature;
  const limit=Math.min(half?1:3,pace==='slow'||sheltered?2:3,Number(count)||2);
  const reserve=sheltered?preferred:[...new Set([...preferred,'history','village','tea','road','bamboo','lake'])];
  const perDay=sheltered&&days===2?1:limit;
  return Array.from({length:days},(_,day)=>reserve.slice(day*perDay,(day+1)*perDay));
}
const researchCases=[
  ['湖岸观察','比较两个湖岸观测时段，判断记录能支持什么结论。','两组观测各 10 分钟，分别记录水鸟出现次数。以下数字为教学练习，不是天目湖实测。',[[3,4],[8,6]]],
  ['茶乡生态','比较两个茶田样方，区分观察与因果。','每个样方各观察 10 分钟，记录昆虫出现次数。以下数字为教学练习，不是茶园实测。',[[5,4],[7,10]]]
];
export function fieldStudy(index){
  const [title,prompt,note,samples]=researchCases[index]||researchCases[0];
  const totals=samples.map(series=>series.reduce((a,b)=>a+b,0));
  return {title,prompt,note,samples,totals};
}
const journeyPlaces=new Set(['lake','bamboo','tea','road','history','village']);
export function readJourney(value){
  if(!value||!Array.isArray(value.days)||!value.days.length||value.days.length>2)return null;
  if(value.days.some(day=>!Array.isArray(day)||!day.length||day.length>3||day.some(id=>!journeyPlaces.has(id))))return null;
  const ids=value.days.flat();
  if(new Set(ids).size!==ids.length)return null;
  return {days:value.days.map(day=>day.slice()),visited:[...new Set(Array.isArray(value.visited)?value.visited.filter(id=>ids.includes(id)):[])]};
}
export function journeyVisit(value,id){
  const journey=readJourney(value);
  if(!journey?.days.some(day=>day.includes(id)))return journey;
  journey.visited=journey.visited.includes(id)?journey.visited.filter(place=>place!==id):[...journey.visited,id];
  return journey;
}
export function journeyMove(value,id,offset){
  const journey=readJourney(value);
  if(!journey||![-1,1].includes(offset))return journey;
  const day=journey.days.find(stops=>stops.includes(id));
  if(!day)return journey;
  const index=day.indexOf(id), next=index+offset;
  if(next>=0&&next<day.length)[day[index],day[next]]=[day[next],day[index]];
  return journey;
}
export const fieldCards={
  lake:{title:'湖岸观察',tasks:['在开放步道比较近岸和远岸的景色','找一处水面倒影，观察风对倒影的影响','说出一条保护湖岸的做法']},
  bamboo:{title:'竹林调查',tasks:['在步道旁观察竹节与叶片','比较竹荫内外的光线','从导览资料找一种竹材的用途']},
  tea:{title:'一杯茶的来历',tasks:['在允许参观的区域观察茶叶形状','从产地资料核对天目湖白茶的名称','用自己的话区分鲜叶、加工与成品']},
  road:{title:'山路安全观察',tasks:['在允许停留的地点观察道路标线','指出安全停留区与行车道的区别','从导览找出公路连接的两种旅游资源']},
  history:{title:'民俗证据卡',tasks:['从展签或公开资料记住一件展品的名称','区分展签中的记录和传说','指出一条还需要更多来源才能确认的信息']},
  village:{title:'田园观察',tasks:['从公共步道观察一种农作物','说出植物生长所需的一种条件','两人分别描述观察后相互核对']}
};
export function readFieldCards(value){
  const result={};
  if(!value||typeof value!=='object')return result;
  for(const [id,{tasks}] of Object.entries(fieldCards)){
    if(!Object.hasOwn(value,id)||!Array.isArray(value[id]))continue;
    const marks=[...new Set(value[id].filter(n=>Number.isInteger(n)&&n>=0&&n<tasks.length))];
    if(marks.length)result[id]=marks;
  }
  return result;
}
export function toggleFieldCard(value,id,index){
  const cards=readFieldCards(value);
  if(!Object.hasOwn(fieldCards,id)||!Number.isInteger(index)||index<0||index>=fieldCards[id].tasks.length)return cards;
  const marks=cards[id]||[];
  return readFieldCards({...cards,[id]:marks.includes(index)?marks.filter(n=>n!==index):[...marks,index]});
}
