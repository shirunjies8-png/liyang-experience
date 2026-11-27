import * as T from './vendor/three/three.module.min.js';
import { VRM, VRMHumanoid } from './vendor/three-vrm/runtime.mjs';

// Original, rigid-part mascot. The normalized VRM pose drives the visible bones.
export function buildXiaoli(){
  const scene=new T.Group(), bones={};
  function joint(name,parent,x,y,z=0){
    const node=new T.Bone();node.name=name;node.position.set(x,y,z);parent.add(node);bones[name]={node};return node;
  }
  const materials=new Map();
  const orb=new T.SphereGeometry(1,24,16);
  function shape(parent,color,x,y,z,sx,sy,sz){
    if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:color===0xf1b959?.4:.78,metalness:color===0xf1b959?.22:0}));
    const part=new T.Mesh(orb,materials.get(color));part.position.set(x,y,z);part.scale.set(sx,sy,sz);parent.add(part);return part;
  }
  const skin=0xf6b88f,hair=0x36292a,pine=0x156b5c,mint=0xe4f0d4,gold=0xf1b959;
  const hips=joint('hips',scene,0,.82), spine=joint('spine',hips,0,.14),
    chest=joint('chest',spine,0,.23), head=joint('head',chest,0,.35);
  shape(hips,pine,0,-.05,0,.33,.29,.19);
  shape(chest,pine,0,-.10,0,.31,.31,.18);
  shape(chest,mint,0,.05,.13,.23,.13,.11);
  shape(chest,gold,-.07,-.19,.19,.06,.055,.029);
  shape(hips,gold,0,.073,.023,.318,.029,.186);
  shape(chest,0x296653,.19,.04,.13,.075,.226,.044).rotation.z=-.22;
  shape(hips,0x1d6152,-.18,-.045,.14,.14,.09,.062);
  shape(hips,0xe5ebc8,-.18,-.012,.183,.11,.021,.023);
  shape(head,hair,0,.32,-.05,.41,.44,.29);
  shape(head,skin,0,.24,.08,.34,.36,.265);
  shape(head,skin,0,.204,.335,.046,.058,.048);
  const fringe=shape(head,hair,-.067,.463,.23,.302,.15,.125);fringe.rotation.z=.24;
  const mouth=shape(head,0x863c36,0,.105,.324,.087,.021,.029);
  const smile=shape(head,0xf0aa88,0,.132,.316,.084,.012,.023);
  const eyes=[];
  for(const side of [-1,1]){
    const key=side===1?'left':'right', x=side*.144;
    shape(head,skin,side*.329,.217,.045,.072,.091,.075);
    shape(head,0xee977f,side*.22,.15,.292,.063,.039,.021);
    const eye=new T.Group();eye.position.set(x,.267,.31);head.add(eye);eyes.push(eye);
    shape(eye,0xfffcf0,0,0,0,.08,.065,.036);
    shape(eye,0x243b34,.006,0,.027,.045,.052,.021);
    shape(eye,0xffffff,-.006,.019,.045,.012,.012,.007);
    shape(head,hair,x,.359,.302,.077,.015,.013).rotation.z=-side*.10;
    const arm=joint(key+'UpperArm',chest,side*.28,.065);
    const elbow=joint(key+'LowerArm',arm,side*.29,0);
    const hand=joint(key+'Hand',elbow,side*.23,0);
    shape(arm,pine,side*.14,0,0,.172,.112,.101);
    shape(elbow,mint,side*.105,0,0,.137,.082,.075);
    shape(hand,skin,side*.056,0,0,.067,.065,.042);
    for(const [i,finger] of ['Index','Middle','Ring','Little'].entries()){
      const base=joint(key+finger+'Proximal',hand,side*.091,.044-i*.023,.006);
      const mid=joint(key+finger+'Intermediate',base,side*.023,0);
      const tip=joint(key+finger+'Distal',mid,side*.018,0);
      for(const j of [base,mid,tip])shape(j,skin,side*.009,0,0,.017,.013,.014);
    }
    const thumb=joint(key+'ThumbMetacarpal',hand,side*.037,-.055,.019);
    const thumbMid=joint(key+'ThumbProximal',thumb,side*.016,-.016);
    const thumbTip=joint(key+'ThumbDistal',thumbMid,side*.015,-.010);
    for(const j of [thumb,thumbMid,thumbTip])shape(j,skin,0,-.009,0,.016,.023,.016);
    const thigh=joint(key+'UpperLeg',hips,side*.14,-.12), shin=joint(key+'LowerLeg',thigh,0,-.31);
    const foot=joint(key+'Foot',shin,0,-.27);
    shape(thigh,0x29494a,0,-.12,0,.108,.212,.112);shape(shin,0x29494a,0,-.1,0,.088,.185,.087);
    shape(foot,0x332b2a,0,-.044,.055,.11,.08,.16);
  }
  shape(head,0x365b48,-.26,.49,.285,.082,.122,.024).rotation.z=-.67;
  scene.updateMatrixWorld(true);
  const humanoid=new VRMHumanoid(bones);
  const vrm=new VRM({scene,humanoid,meta:{metaVersion:'1',name:'小溧',authors:['溧阳慢游所']}});
  return {vrm,orb,materials,eyes,mouth,smile};
}

export const moves=['idle','walk','wave','turn','nod','point','run','jump','sit','rest'];
export function mountXiaoli(canvas,{level,action,onReady,outfit=()=>'pine'}){
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
  const world=new T.Scene(), camera=new T.PerspectiveCamera(32,1,.1,20);
  camera.position.set(0,1.35,4.85);camera.lookAt(0,1.11,0);
  world.add(new T.HemisphereLight(0xfff1d6,0x708e81,2.7));
  const sun=new T.DirectionalLight(0xffe0af,2.25);sun.position.set(2,4,5);world.add(sun);
  const {vrm,orb,materials,eyes,mouth,smile}=buildXiaoli();world.add(vrm.scene);
  const bone=name=>vrm.humanoid.getNormalizedBoneNode(name);
  const mq=matchMedia('(prefers-reduced-motion: reduce)');
  const reduced=()=>mq.matches||document.documentElement.hasAttribute('data-access-motion');
  const fabrics={pine:0x156b5c,tea:0x94613e,river:0x315079};
  let raf=0,last=0,visible=true,disposed=false,first=true,pose='idle',command,since=0,opening=0,lastOutfit;
  function loop(now){
    raf=0;if(disposed||document.hidden||!visible)return;
    if(!first&&now-last<32){raf=requestAnimationFrame(loop);return;}
    const dt=Math.min(.06,(now-last)/1000);last=now;
    const choice=outfit();
    if(lastOutfit!==choice){
      lastOutfit=choice;
      materials.get(0x156b5c).color.setHex(Object.hasOwn(fabrics,choice)?fabrics[choice]:fabrics.pine);
      canvas.dataset.outfit=choice;
    }
    const next=action();if(next!==command){command=next;pose=next.name;since=now;}
    const t=reduced()?0:now/1000,p=reduced()?.42:Math.min(1,(now-since)/1600);
    const active=pose!=='idle'&&p<1, sweep=active?Math.sin(Math.PI*p):0;
    const locomotion=pose==='walk'||pose==='run';
    const walk=locomotion&&active?Math.sin(p*(pose==='run'?16:8)*Math.PI)*Math.min(1,5*sweep):0;
    const seated=['sit','rest'].includes(pose)?(reduced()?1:Math.min(1,p*3)):0;
    vrm.scene.position.x=0;
    vrm.scene.position.y=pose==='jump'&&!reduced()?Math.max(0,Math.sin(Math.PI*Math.min(1,p*2)))*.42:-seated*.30+Math.abs(walk)*.04;
    vrm.scene.rotation.y=pose==='turn'?sweep*1.12:.13*Math.sin(t*.77);
    bone('spine').rotation.x=.026*Math.sin(t*2.1)+(pose==='run'?.13*sweep:0)+(pose==='rest'?.14*seated:0);
    bone('hips').rotation.y=walk*.09;
    bone('head').rotation.x=pose==='nod'?sweep*.24*Math.sin(p*14):0;
    bone('head').rotation.z=.032*Math.sin(t*.88)+(pose==='rest'?.21*seated:0);
    bone('leftUpperArm').rotation.z=pose==='point'?-.38-.55*sweep:-1.1;
    bone('rightUpperArm').rotation.z=pose==='wave'?1.1-2.3*sweep:1.1;
    bone('leftUpperArm').rotation.x=pose==='point'?-sweep*1.25:walk*.32;
    bone('rightLowerArm').rotation.z=pose==='wave'&&active?-sweep*(.85+.37*Math.sin(p*29)):0;
    bone('rightUpperArm').rotation.x=-walk*.32;
    bone('leftUpperLeg').rotation.x=walk*.48-seated*1.20;bone('rightUpperLeg').rotation.x=-walk*.48-seated*1.20;
    bone('leftLowerLeg').rotation.x=Math.max(0,-walk)*.4+seated*1.15;bone('rightLowerLeg').rotation.x=Math.max(0,walk)*.4+seated*1.15;
    for(const eye of eyes)eye.scale.y=pose==='rest'?.17:t%4.1>3.96?.13:1;
    for(const side of ['left','right'])for(const finger of ['Index','Middle','Ring','Little']){
      const j=bone(side+finger+'Proximal');if(j)j.rotation.y=(side==='left'?1:-1)*(pose==='point'&&finger==='Index'?0:seated*.38);
    }
    const sampled=level();
    opening+=(sampled-opening)*.48;
    canvas.dataset.pose=pose;
    canvas.dataset.mouth=opening.toFixed(3);
    mouth.scale.y=.021+opening*.072;mouth.scale.x=.087-opening*.02;
    smile.scale.x=.084+((pose==='wave'&&active)?sweep*.025:0);
    vrm.update(dt);renderer.render(world,camera);
    if(first){first=false;onReady();}
    if(!reduced()||opening>.005)raf=requestAnimationFrame(loop);
  }
  function wake(){if(!raf&&!disposed&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(loop);}}
  const resize=new ResizeObserver(()=>{
    if(!canvas.clientWidth||!canvas.clientHeight)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
    camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();wake();
  });
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();});
  resize.observe(canvas);intersection.observe(canvas);mq.addEventListener('change',wake);
  for(const event of ['visibilitychange','liyang-accessibility','liyang-avatar'])document.addEventListener(event,wake);
  wake();
  return ()=>{
    disposed=true;cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();mq.removeEventListener('change',wake);
    for(const event of ['visibilitychange','liyang-accessibility','liyang-avatar'])document.removeEventListener(event,wake);
    orb.dispose();materials.forEach(material=>material.dispose());renderer.dispose();renderer.forceContextLoss();
  };
}
