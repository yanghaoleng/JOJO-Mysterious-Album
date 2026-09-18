import {journeys} from '../src/landing-journeys.js';
import {writeFile,access} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
for(const [id,journey]of Object.entries(journeys))for(const [index,step]of journey.steps.entries()){
  const path=new URL(`../assets/landing/audio/${id}-${index+1}.mp3`,import.meta.url);
  try{await access(path);continue;}catch{}
  const {stdout}=await run('curl',['-fsS','--connect-timeout','10','--retry','2','--retry-all-errors','--max-time','65','https://jma.mikeywa.site/api/tts','-H','Content-Type: application/json','--data-binary',JSON.stringify({text:step.answer,voice:'star',speechProfile:'wow-child'})],{encoding:'buffer',maxBuffer:2*1024*1024});
  if(stdout.length<1000||stdout[0]===123)throw new Error(`Invalid audio for ${id}-${index+1}`);
  await writeFile(path,stdout);console.log(`${id}-${index+1}: ${stdout.length} bytes`);
}
