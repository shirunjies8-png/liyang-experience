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
  if(state.art){paintIllustrated(ctx,t,state);return;}
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
  const blink=Math.sin(t*2)>.98?1:3;
  oval('#294d4480',x,y+20,19,4);
  if(id==='bamboo'){
    oval('#263b34',x-9,y-12,5,6);oval('#263b34',x+9,y-12,5,6);
    oval('#263b34',x,y+8,12,12);oval('#f8eed6',x,y+7,8,9);oval('#f8eed6',x,y-4,13,11);
    oval('#263b34',x-5,y-5,3.5,4.5);oval('#263b34',x+5,y-5,3.5,4.5);
    oval('#fff8e8',x+6,y-5,1.3,blink*.52);
  }else{
    oval('#8d563e',x-8,y+7,7,9);oval(id==='tea'?'#4c7644':'#426a65',x,y+9,11,11);
    oval('#f3cd9d',x,y-6,10,11);oval('#24493d',x+4,y-5,1.6,blink);
    line('#cc9a58',3,[[x-13,y-11],[x+13,y-11]]);oval('#e5ba74',x,y-14,9,4);
  }
  if(state.reward){
    oval('#ffe9a090',292,427,17+Math.sin(t*5)*6,15);fill('#815131',279,427,26,14);
    line('#eed481',4,[[280,420],[302,412]]);
  }
}
function paintIllustrated(ctx,t,state){
  ctx.clearRect(0,0,360,640);
  if(!state.game)return; // artwork is a separately loaded, labelled image layer
  ctx.save();
  const x=state.x*360,y=(state.actorY||322)+Math.sin(t*5)*2;
  const ellipse=(color,x,y,rx,ry)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  const line=(color,width,points)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  if(state.id==='lake')for(let i=0;i<12;i++){const xx=(i*33+t*8)%390-15,yy=135+i*9;line('#e7f7e347',.8,[[xx,yy],[xx+22,yy+Math.sin(t+i)*.8]]);}
  for(let i=0;i<11;i++){const xx=(i*37+t*9)%380-10,yy=96+(i*31)%212;ellipse('#f4edb880',xx,yy,1.1+Math.sin(t+i)*.6,1.1);}
  if(!state.ready){boardMarks.slice(0,state.count).forEach((xx,i)=>{const a=xx*360,b=272+Math.sin(t*2+i)*2;ellipse('#173c3280',a,b+5,10,4);ellipse(state.matched.includes(i)?'#c0d6a2':'#e9ba58',a,b,9,9);ellipse('#fff3c2',a-2,b-3,3,2);ctx.fillStyle='#274538';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),a,b+3);});}
  // Layered illustrated character (not a 3-D model), a shadow, limb motion and eyes.
  ellipse('#142f2a69',x,y+26,27,6);
  if(state.externalActor){/* high detail web avatar drawn by its owning renderer */}
  else if(state.id==='bamboo'){
    ellipse('#25352e',x-15,y-22,9,10);ellipse('#25352e',x+15,y-22,9,10);ellipse('#233c32',x,y+8,22,24);ellipse('#f4eddc',x,y+5,16,19);
    ellipse('#25352e',x-16,y+23,10,7);ellipse('#25352e',x+16,y+23,10,7);ellipse('#293b30',x-22,y+4+Math.sin(t*5)*3,8,12);ellipse('#293b30',x+22,y+4-Math.sin(t*5)*3,8,12);
    ellipse('#fffae8',x,y-11,25,21);ellipse('#303e33',x-10,y-11,7,10);ellipse('#303e33',x+10,y-11,7,10);const blink=Math.sin(t*1.9)>.985;ellipse('#fff',x-10,y-12,2.2,blink?.4:3);ellipse('#fff',x+10,y-12,2.2,blink?.4:3);ellipse('#293d32',x,y-1,4,3);line('#58473c',1.2,[[x-5,y+4],[x,y+6],[x+5,y+4]]);ellipse('#e9ac94',x-17,y,3,2);ellipse('#e9ac94',x+17,y,3,2);
    line('#679e4c',3,[[x+22,y+8],[x+32,y-18]]);ellipse('#8bb85b',x+32,y-18,7,3);
  }else{
    ellipse('#79533b',x-12,y+22,9,6);ellipse('#79533b',x+12,y+22,9,6);ellipse('#a37c52',x-12,y+4,11,17);ellipse('#315c51',x,y+7,20,22);ellipse('#63877a',x,y+8,14,18);ellipse('#f0c49b',x-18,y+5+Math.sin(t*4)*3,5,6);ellipse('#f0c49b',x+18,y+5-Math.sin(t*4)*3,5,6);ellipse('#edc29a',x,y-13,17,17);ellipse('#514238',x,y-24,17,8);ellipse('#bc975a',x,y-27,24,6);ellipse('#ead19a',x,y-31,16,8);line('#f0dbab',2,[[x-15,y-27],[x+15,y-27]]);ellipse('#2b3d34',x-6,y-13,2,Math.sin(t*1.9)>.985?.4:2.7);ellipse('#2b3d34',x+6,y-13,2,Math.sin(t*1.9)>.985?.4:2.7);line('#a76b58',1.4,[[x-4,y-6],[x,y-4],[x+4,y-6]]);line('#e2c990',2,[[x-12,y+1],[x+8,y+21]]);
  }
  if(state.reward){const bx=292,by=316;ellipse('#f7d67455',bx,by,33+Math.sin(t*4)*5,30);ctx.fillStyle='#835437';ctx.fillRect(bx-22,by-3,44,22);ctx.fillStyle='#d7a653';ctx.fillRect(bx-22,by+4,44,4);ctx.fillRect(bx-3,by-3,6,22);line('#f3d184',6,[[bx-22,by-7],[bx-12,by-20],[bx+23,by-13]]);for(let i=0;i<7;i++)ellipse('#ffe5a0',bx+Math.cos(i*1.3+t)*20,by-20+Math.sin(i*1.3+t)*15,2,2);}
  ctx.restore();
}

if(typeof module!=='undefined'&&module.exports)module.exports={attach,boardMarks};
else globalThis.LiyangScene={paint,boardMarks};
