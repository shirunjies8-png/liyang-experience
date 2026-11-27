const specs={
 lake:{moves:[0,1,2],hint:'远山、湖面、岸边，按由远到近拼起来。'},
 bamboo:{moves:[0,1,0],hint:'穿过竹林：向东、向南、再向东。'},
 tea:{moves:[],hint:'找到三对相同的茶印。'},
 road:{moves:[0,1,2],hint:'选出安全的小旅行顺序。'},
 history:{moves:[1],hint:'在哪里最可能找到民俗印章？'},
 village:{moves:[0,1,2],hint:'两人轮流：观察、记录、共同核对。'}
};
const bambooCells=[0,1,4,5];
function bambooPath(moves){
 const path=[0],deltas=[1,3,-1,-3];
 for(const direction of moves){
  const previous=path.at(-1),next=previous+deltas[direction];
  if(!bambooCells.includes(next)||path.includes(next))return null;
  path.push(next);
 }
 return path;
}
function resumeMoves(id,moves,tiles){
 if(!Array.isArray(moves)||moves.length>tiles.length||moves.some(i=>!Number.isInteger(i)||i<0||i>=tiles.length))return [];
 if(id==='tea')return moves.length%2===0&&new Set(moves).size===moves.length&&moves.every((i,j)=>tiles[i]===tiles[moves[j^1]])?moves:[];
 const expected=specs[id]?.moves;
 return expected&&moves.length<=expected.length&&moves.every((i,j)=>i===expected[j])?moves:[];
}
function solved(id,moves,tiles){
 if(id==='tea')return moves.length===6&&new Set(moves).size===6&&moves.every((move,i)=>tiles[move]===tiles[moves[i^1]]);
 return moves.length===specs[id].moves.length&&moves.every((move,i)=>move===specs[id].moves[i]);
}
if(typeof module!=='undefined'&&module.exports)module.exports={specs,solved,bambooCells,bambooPath,resumeMoves};
else globalThis.LiyangPuzzles={specs,solved,bambooCells,bambooPath,resumeMoves};
