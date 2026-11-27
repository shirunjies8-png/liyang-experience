import * as T from './vendor/three/three.module.min.js';

export function mountLandscape(canvas, conditions) {
  const renderer = new T.WebGLRenderer({ canvas, alpha:false, antialias:false });
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(43,1,.1,110);
  camera.position.set(0,3.9,10);camera.lookAt(0,2,-8);
  scene.fog = new T.FogExp2(0x8db9bc,.037);
  const light = new T.HemisphereLight(0xffead0,0x345752,2);
  scene.add(light);
  const mesh = (geometry, material, x,y,z) => {
    const item = new T.Mesh(geometry,material);item.position.set(x,y,z);scene.add(item);return item;
  };
  const sky = new T.Color(), day = new T.Color(0x9dcbd0), dusk = new T.Color(0x604c65);
  const night = new T.Color(0x132d46), storm = new T.Color(0x657e85);
  scene.background = sky;
  for(let band=0;band<3;band++) {
    const ridge = new T.PlaneGeometry(55,9,96,22), p = ridge.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), y=p.getY(i), f=(y+4.5)/9;
      const profile=3.1+1.4*Math.cos(x*.38+band*2)+.86*Math.sin(x*.72+band)+.35*Math.sin(x*2.1);
      p.setXYZ(i,x,f*profile-1,Math.sin(x*.32)*1.4+Math.sin(f*Math.PI)*1.1);
    }
    ridge.computeVertexNormals();
    mesh(ridge,new T.MeshLambertMaterial({color:[0x7ca5a2,0x477d72,0x315f50][band],side:T.DoubleSide}),band-1,0,-25+band*4);
  }
  const water=new T.ShaderMaterial({
    uniforms:{clock:{value:0},roughness:{value:1},brightness:{value:1}},
    vertexShader:'varying vec3 pt; void main(){pt=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float clock,roughness,brightness; varying vec3 pt;
    void main(){float rip=sin(pt.y*5.+sin(pt.x*2.+clock)*1.8-clock*roughness);
    float detail=sin(pt.y*10.+pt.x*1.8+clock*roughness);
    vec3 base=mix(vec3(.12,.35,.35),vec3(.41,.65,.65),clamp((pt.y+12.)/31.,0.,1.));
    gl_FragColor=vec4((base+max(0.,rip*detail-.57)*.18)*brightness,1.);
    #include <colorspace_fragment>
    }`
  });
  mesh(new T.PlaneGeometry(70,60),water,0,0,-15).rotation.x=-Math.PI/2;
  const cloudGeo=new T.SphereGeometry(1,12,8);
  const cloudMat=new T.MeshBasicMaterial({color:0xf0e9d7,transparent:true,opacity:.40,depthWrite:false});
  const clouds=Array.from({length:11},(_,i)=>{
    const cloud=mesh(cloudGeo,cloudMat,i*4-22,4.8+Math.sin(i)*.7,-27-i%4);
    cloud.scale.set(2.1+i%3,.19+i%3*.10,.55);return cloud;
  });
  const rainGeo=new T.BufferGeometry(), drops=new Float32Array(360);
  rainGeo.setAttribute('position',new T.BufferAttribute(drops,3));
  const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xe7f1ef,transparent:true,opacity:.52}));
  rain.frustumCulled=false;scene.add(rain);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const still=()=>motion.matches||document.documentElement.hasAttribute('data-access-motion');
  let frame=0,last=-Infinity,dead=false,visible=true;
  function draw(now) {
    if(dead||document.hidden||!visible||now-last<33)return;
    last=now;
    const {weather,period}=conditions(), t=still()?0:now/1000;
    const dark=['night','late','midnight'].includes(period);
    sky.copy(weather==='rain'?storm:dark?night:period==='dusk'?dusk:day);
    scene.fog.color.copy(sky);light.intensity=dark?.8:weather==='rain'?1.2:2;
    water.uniforms.clock.value=t;water.uniforms.roughness.value=weather==='wind'?2.9:weather==='rain'?2:1;
    water.uniforms.brightness.value=dark?.48:weather==='rain'?.68:weather==='heat'?1.16:1;
    clouds.forEach((cloud,i)=>{cloud.position.x=((i*4+t*(weather==='wind'?2:.38))%48)-24;});
    rain.visible=weather==='rain';
    if(rain.visible) {
      for(let i=0;i<60;i++) {
        const x=(i*1.33)%21-10,y=8-((i*.93+t*12)%9),z=6-(i*.73)%15;
        drops.set([x,y,z,x-.10,y-.41,z],i*6);
      }
      rainGeo.attributes.position.needsUpdate=true;
    }
    renderer.render(scene,camera);
  }
  function resize() {
    if(dead)return;
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();refresh();
  }
  function tick(now){frame=0;draw(now);if(visible&&!document.hidden&&!still()&&!dead)frame=requestAnimationFrame(tick);}
  function refresh(){last=-Infinity;if(!frame&&!dead&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  const size=new ResizeObserver(resize), onScreen=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;refresh();});
  size.observe(canvas);onScreen.observe(canvas);motion.addEventListener('change',refresh);
  document.addEventListener('visibilitychange',refresh);document.addEventListener('pulse-change',refresh);document.addEventListener('liyang-accessibility',refresh);
  resize();
  return ()=>{
    dead=true;cancelAnimationFrame(frame);size.disconnect();onScreen.disconnect();motion.removeEventListener('change',refresh);
    document.removeEventListener('visibilitychange',refresh);document.removeEventListener('pulse-change',refresh);document.removeEventListener('liyang-accessibility',refresh);
    const resources=new Set();scene.traverse(item=>{if(item.geometry)resources.add(item.geometry);if(item.material)resources.add(item.material);});
    resources.forEach(item=>item.dispose());renderer.dispose();renderer.forceContextLoss();
  };
}
