export function searchGuide(index,question) {
  if(typeof question!=='string'||question.length>200||/几点|价格|票价|开放吗|今天|实时|拥堵|营业|天气/.test(question))return [];
  return index.map(({keywords,...record})=>({
    record,score:Math.max(0,...keywords.filter(word=>question.includes(word)).map(word=>word.length))
  })).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(item=>item.record);
}
