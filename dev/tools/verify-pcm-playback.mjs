import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

let Player;
const messages=[];
const scope={Float32Array,Uint8Array,DataView,sampleRate:48000,
  AudioWorkletProcessor:class{constructor(){this.port={postMessage:value=>messages.push(value),onmessage:null};}},
  registerProcessor:(_name,Class)=>{Player=Class;}};
vm.runInNewContext(readFileSync(new URL('../pcm-playback-worklet.js',import.meta.url),'utf8'),scope);
const player=new Player();
function send(message){player.port.onmessage({data:message});}
function render(count){const result=[];for(let i=0;i<count;i++){const output=new Float32Array(128);player.process([] ,[[output]]);result.push(...output);}return result;}
function pcm(samples){const bytes=new Uint8Array(samples.length*2);const view=new DataView(bytes.buffer);samples.forEach((value,i)=>view.setInt16(i*2,Math.round(value*32767),true));return bytes;}

const sine=Array.from({length:9000},(_,i)=>Math.sin(i*2*Math.PI*440/24000)*.35);
const bytes=pcm(sine);
send({type:'reset',streamId:1});
// A sample split across two WebSocket frames must be reconstructed exactly.
send({type:'append',data:bytes.slice(0,7001).buffer});
assert.equal(player.length,3500);
assert.equal(player.tailByte!==null,true);
const first=render(40);
send({type:'append',data:bytes.slice(7001).buffer});
send({type:'end'});
const rest=render(110);
const output=[...first,...rest];
assert.ok(output.slice(300,17000).every(Number.isFinite));
assert.ok(output.slice(300,17000).every(value=>Math.abs(value)<.37));
const maxStep=Math.max(...output.slice(300,17000).map((value,i)=>Math.abs(value-output[i+299])));
assert.ok(maxStep<.06,`Unexpected packet-edge click: ${maxStep}`);
assert.equal(messages.filter(message=>message.type==='drained'&&message.streamId===1).length,1);

send({type:'reset',streamId:2});
assert.equal(player.length,0);
assert.equal(player.fade,0);
send({type:'append',data:pcm([.2,-.2,.1]).buffer});
send({type:'end'});
render(2);
assert.equal(messages.filter(message=>message.type==='drained'&&message.streamId===2).length,1);
console.log('PASS continuous 24 kHz PCM playback: split samples, packet continuity, drain and reset');
