export function petBehavior({page,weather,period,step}){
  if(['night','late'].includes(period))return ['rest','sit','nod'][step%3];
  if(weather==='rain'||weather==='heat')return ['sit','nod','rest'][step%3];
  if(page==='map'||page==='guide')return ['point','walk','turn'][step%3];
  if(page==='game'||page==='explore'||page==='learning')return ['run','jump','wave'][step%3];
  return ['walk','wave','turn','sit'][step%4];
}

export function boundPet(x,y,width,height,padding=8){
  return {
    x:Math.max(padding,Math.min(Math.max(padding,width-padding),x)),
    y:Math.max(padding,Math.min(Math.max(padding,height-padding),y)),
  };
}

const cues={
  map:['point','小溧找到了这一站。打开导览可以阅读四段介绍。'],
  game:['point','可以用键盘逐个进入场景操作。'],
  blocked:['nod','这条路不通，试试另一个方向。'],
  solved:['wave','谜题解开了，接下来看看线索或题目。'],
  reward:['jump','徽章已在探险护照中。'],
  learning:['point','可以选一个观察任务或工程挑战。'],
  exhibit:['point','这是一份档案导读，可以查看原始来源。'],
  correct:['wave','你找到了档案中的答案。'],
  rain:['sit','这是雨景，出行前请核实天气。'],
  night:['rest','当前为夜间场景，留意返程安排。'],
};

export const petCue=event=>cues[event]||null;
