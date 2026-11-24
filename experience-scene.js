const palettes={
  lake:['#b9dce1','#6b9c87','#53969e'], bamboo:['#d8e7bd','#799471','#407046'],
  tea:['#e5e1ba','#90ac70','#68934b'], road:['#dce8de','#8fa780','#8f8970'],
  history:['#f2dcb5','#a99976','#875f4b'], village:['#e8e0aa','#a8a26c','#87964e']
};
const boardMarks=[.24,.36,.48,.60,.72,.84];
function attach(page,selector,read){
  let node,frame,stopped=false;
  wx.createSelectorQuery().in(page).select(selector).fields({node:true,size:true}).exec(result=>{
    if(stopped||!result[0]?.node)return;
    const {width,height}=result[0];node=result[0].node;
    const ratio=Math.min(2,wx.getWindowInfo?.().pixelRatio||1);
    node.width=width*ratio;node.height=height*ratio;
    const ctx=node.getContext('2d');ctx.scale(node.width/360,node.height/640);
    let last=0;
    const draw=now=>{
      if(stopped)return;
      if(now-last>=30){paint(ctx,now/1000,read());last=now;}
      frame=node.requestAnimationFrame(draw);
    };
    paint(ctx,0,read());frame=node.requestAnimationFrame(draw);
  });
  return ()=>{stopped=true;if(node&&frame!==undefined)node.cancelAnimationFrame(frame);};
}
function paint(ctx,t,state){
  const id=state.id||'lake';
  const [sky,hill,ground]=palettes[id]||palettes.lake;
  const fill=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const oval=(color,x,y,rx,ry)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  const line=(color,width,points)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  if(state.photo)ctx.clearRect(0,0,360,640);
  else fill(sky,0,0,360,640);
  oval('#fbefcc',274,95,25,25);
  for(let i=0;i<4;i++)oval('#ffffff8a',(i*116+t*9)%450-30,50+i%2*39,42,12);
  const birdX=(t*31+72)%400-20, wing=5+Math.sin(t*7)*3;
  line('#28433f',1.8,[[birdX-9,135-wing],[birdX,135],[birdX+9,135-wing]]);
  if(!state.photo){
    for(let i=0;i<5;i++)oval(hill,i*96,272,126,75+i%3*18);
    fill(ground,0,279,360,361);
  }
  if(id==='lake') {
    for(let i=0;i<25;i++){const x=(i*39+t*13)%400-30,y=295+i*11;line('#c9eee290',2,[[x,y],[x+15,y+Math.sin(t+i)*4],[x+36,y]]);}
  } else if(id==='bamboo'){
    for(let i=0;i<13;i++){const x=i*31,sway=Math.sin(t*1.4+i)*7;line('#234d36',5,[[x,574],[x+sway,179+i%4*11]]);oval('#8aad62',x+sway,237+i%4*16,14,4);}
  } else if(id==='tea'){
    for(let j=0;j<7;j++)for(let i=0;i<12;i++)oval(j%2?'#4b763e':'#94a956',i*34-15,313+j*41+Math.sin(i+t)*4,22,14);
  } else if(id==='road'){
    line('#535853',61,[[0,548],[103,431],[221,530],[360,392]]);line('#f0d384',4,[[0,548],[103,431],[221,530],[360,392]]);
  } else {
    for(let i=0;i<3;i++){const x=19+i*115;fill('#f0d7a0',x,342+i%2*53,62,67);line('#5f4836',8,[[x-7,346+i%2*53],[x+31,313+i%2*53],[x+69,346+i%2*53]]);}
  }
  if(!state.game)return;
  if(!state.ready){
    const marks=boardMarks.slice(0,state.count);
    marks.forEach((x,i)=>{
      oval(state.matched.includes(i)?'#d9e4a6':'#f9d984',x*360,370,9,9);
      ctx.fillStyle='#284235';ctx.font='10px sans-serif';ctx.fillText(String(i+1),x*360-3,374);
    });
  }
  const x=state.x*360, y=(state.actorY||485)+Math.sin(t*5)*2;
  oval('#294d44',x,y+19,20,5);oval('#ffe5a4',x,y,13,18);oval('#24493d',x+4,y-5,2,Math.sin(t*2)>.98?1:3);
  if(state.reward){
    oval('#ffe9a090',292,427,17+Math.sin(t*5)*6,15);fill('#815131',279,427,26,14);
    line('#eed481',4,[[280,420],[302,412]]);
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports={attach,boardMarks};
else globalThis.LiyangScene={paint,boardMarks};
