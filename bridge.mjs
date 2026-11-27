export const joints = [[0,0],[2,0],[4,0],[1,1.35],[3,1.35]];
export const pieces = [[0,1],[1,2],[0,3],[3,1],[1,4],[4,2],[3,4],[0,4],[2,3]];
export const lessons = {
  foot:{load:4,budget:15,limit:.18,label:'步行桥'},
  cargo:{load:5,budget:19,limit:.13,label:'运茶挑战'}
};
const free = [2,3,4,6,7,8,9];
const length = ([i,j])=>Math.hypot(joints[j][0]-joints[i][0],joints[j][1]-joints[i][1]);
const cost = edge=>Math.ceil(length(edge));
export function testBridge(ids,lesson='foot'){
  const rule=lessons[lesson];
  if(!Object.hasOwn(lessons,lesson)||!Array.isArray(ids)||ids.some(id=>!Number.isInteger(id)||!pieces[id]))throw Error('Invalid bridge design');
  const chosen=[...new Set(ids)];
  const members=chosen.map(i=>{
    const edge=pieces[i], [a,b]=edge, len=length(edge);
    const x=(joints[b][0]-joints[a][0])/len, y=(joints[b][1]-joints[a][1])/len;
    const dofs=[2*a,2*a+1,2*b,2*b+1];
    const signs=[-x,-y,x,y];
    return {id:i, len, edge, projection:free.map(id=>{const offset=dofs.indexOf(id);return offset<0?0:signs[offset];})};
  });
  const used=members.reduce((sum,row)=>sum+cost(row.edge),0);
  const matrix=free.map((_,i)=>free.map((__,j)=>members.reduce((sum,m)=>sum+160/m.len*m.projection[i]*m.projection[j],0)));
  matrix.forEach((row,i)=>row.push(free[i]===3?-rule.load:0));
  for(let i=0;i<free.length;i++){
    let pivot=i;
    for(let r=i+1;r<free.length;r++)if(Math.abs(matrix[r][i])>Math.abs(matrix[pivot][i]))pivot=r;
    if(Math.abs(matrix[pivot][i])<1e-8)return {passed:false,reason:'unstable',used,limit:rule.budget};
    [matrix[i],matrix[pivot]]=[matrix[pivot],matrix[i]];
    const divisor=matrix[i][i];matrix[i]=matrix[i].map(value=>value/divisor);
    for(let r=0;r<free.length;r++){
      if(r===i)continue;
      const factor=matrix[r][i];
      matrix[r]=matrix[r].map((value,k)=>value-factor*matrix[i][k]);
    }
  }
  const shifts=matrix.map(row=>row.at(-1));
  const deflection=Math.abs(shifts[free.indexOf(3)]);
  const reason=used>rule.budget?'budget':deflection>rule.limit?'deflection':'pass';
  return {passed:reason==='pass',reason,used,limit:rule.budget,deflection,shifts};
}
