export const modes={ride:'骑行',walk:'徒步',run:'跑步',family:'亲子探索'};
const radians=n=>n*Math.PI/180;
export function metres(a,b){
  const x=Math.sin(radians(b.lat-a.lat)/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(radians(b.lon-a.lon)/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,x)));
}
export function sample(position){
  const {latitude:lat,longitude:lon,accuracy,altitude,altitudeAccuracy,speed}=position.coords;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||
    !Number.isFinite(accuracy)||accuracy<0||accuracy>45||!Number.isFinite(position.timestamp))return null;
  return {lat,lon,accuracy,time:position.timestamp,alt:Number.isFinite(altitude)&&Number.isFinite(altitudeAccuracy)&&altitudeAccuracy<=18?altitude:null,
    speed:Number.isFinite(speed)&&speed>=0?speed:null};
}
export function newTrack(mode,now=Date.now()){
  if(!Object.hasOwn(modes,mode))throw Error('未知运动模式');
  return {mode,started:now,activeSince:now,activeMs:0,state:'running',points:[],metres:0,climb:0,altitude:null,speed:null,segments:1};
}
export function pause(track,now){
  if(track.state!=='running')return;
  track.activeMs+=Math.max(0,now-track.activeSince);track.state='paused';track.speed=null;
}
export function resume(track,now){
  if(track.state!=='paused')return;
  track.activeSince=now;track.state='running';track.segments++;
}
export function addPoint(track,point){
  if(!point||track.state!=='running'||point.time<track.activeSince-2000||track.points.length>=20000)return false;
  const last=track.points.at(-1);
  if(last&&point.time<=last.time)return false;
  const previous=last?.segment===track.segments?last:null;
  const movement=previous?metres(previous,point):0;
  const gap=previous?(point.time-previous.time)/1000:0;
  if(previous&&gap<1)return false;
  if(previous&&gap>90){track.segments++;track.speed=null;}
  else if(previous){
    const limit=track.mode==='ride'?25:12;
    if(movement/gap>limit)return false;
    if(movement<Math.max(5,(previous.accuracy+point.accuracy)*.45)){track.speed=0;return false;}
    track.metres+=movement;
    track.speed=point.speed!==null&&point.speed<=limit?point.speed:movement/gap;
    if(point.alt!==null&&previous.alt!==null&&point.alt-previous.alt>=5)track.climb+=point.alt-previous.alt;
  }
  track.altitude=point.alt;
  track.points.push({...point,segment:track.segments});
  return true;
}
export const duration=(track,now)=>track.activeMs+(track.state==='running'?Math.max(0,now-track.activeSince):0);
export function summary(track,now){
  return {mode:track.mode,metres:track.metres,ms:duration(track,now),count:track.points.length,
    climb:track.points.some(p=>p.alt!==null)?Math.round(track.climb):null};
}
// Approximate adult gross energy: MET × kg × hours. Not a sensor reading or a health target.
export function estimatedCalories(stats,weight){
  const met={ride:6.8,walk:3.5,run:8}[stats.mode];
  if(!met||!Number.isFinite(weight)||weight<30||weight>250||!Number.isFinite(stats.ms)||stats.ms<=0||stats.count<2||stats.metres<=0)return null;
  return Math.round(met*weight*stats.ms/3600000);
}
export function achievement(stats){
  return stats.count>=3&&stats.metres>=1000?'湖山一公里':null;
}
export function shareText(stats,style){
  const label=modes[stats.mode];
  const base=label+'记录：'+(stats.metres/1000).toFixed(2)+' 公里，记录时长 '+Math.round(stats.ms/60000)+' 分钟。';
  const tag=achievement(stats);
  return ({note:'湖山慢游笔记\n',short:'跟我一起去溧阳慢游。\n',social:'今天的湖山时光。\n'}[style]||'')+base+(Number.isFinite(stats.kcal)?'\n预计消耗：'+stats.kcal+' 千卡（成人粗略估算）。':'')+(tag?'\n解锁虚拟成就：'+tag+'。':'');
}
export function intent(value){
  const text=String(value).trim().replace(/[。！!，,\s]+/g,'').replace(/^小溧[，,]?/,'');
  if(/^(暂停|暂停运动|暂停记录)$/.test(text))return {kind:'pause'};
  if(/^(继续|恢复|继续运动|恢复运动)$/.test(text))return {kind:'resume'};
  if(/^(结束|结束运动|停止运动|结束记录)$/.test(text))return {kind:'finish'};
  for(const [mode,label] of Object.entries(modes))if(text==='开始'+label)return {kind:'start',mode};
  const destinations={'打开溧阳慢游所':'home','打开溧阳漫游所':'home','打开地图':'map','查看成就':'passport','打开护照':'passport','开始学习':'lab','打开游戏':'explore','查询路线':'routes','查询美食':'directory/food','查询住宿':'directory/lodging','打开运动':'outdoor'};
  return Object.hasOwn(destinations,text)?{kind:'navigate',target:destinations[text]}:null;
}
