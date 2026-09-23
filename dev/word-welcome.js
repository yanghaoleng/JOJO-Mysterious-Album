// Only a nickname and an age are retained, in memory, for the current introduction.
const ageWords={three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
export function welcomeAnswer(raw,step='name'){
  const text=String(raw||'').trim().slice(0,160);
  if(/[\u3400-\u9fff]/.test(text))return {english:false};
  const number=text.match(/\b(\d{1,3}|three|four|five|six|seven|eight|nine|ten)\b/i);
  const parsedAge=number?Number(number[1])||ageWords[number[1].toLowerCase()]:null;
  const age=parsedAge>=3&&parsedAge<=10?parsedAge:null;
  let name='';
  if(step==='name'){
    const explicit=text.match(/(?:my name is|call me|i am|i'm|it's)\s+([a-z][a-z'-]{0,23})/i);
    const bare=text.match(/^([a-z][a-z'-]{0,23})[.!?]?$/i);
    const candidate=(explicit?.[1]||bare?.[1]||'').toLowerCase();
    if(candidate&&!new Set(['hello','hi','yes','no','okay','ok','domi','old','years','i',...Object.keys(ageWords)]).has(candidate))name=candidate[0].toUpperCase()+candidate.slice(1);
  }
  return {english:/[a-z0-9]/i.test(text),name,age,outOfRange:parsedAge!==null&&!age};
}
