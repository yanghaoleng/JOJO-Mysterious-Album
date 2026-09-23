import { StoryVoice } from './voice.js';

// The classic implementation stays intact. A failed realtime connection falls
// back for this visit; choosing classic also persists across reloads.
export class RealtimeWordVoice extends StoryVoice {
  constructor(options){super(options);this.getLesson=options.getLesson;this.getMode=options.getMode;this.realtimeFailed=false;this.sources=new Set();this.playAt=0;this.rtGeneration=0;}
  get realtimeActive(){return !this.realtimeFailed&&this.socket?.readyState===WebSocket.OPEN;}
  async connectRealtime(){
    if(this.realtimeFailed)throw new Error('realtime_unavailable');
    if(this.rtConnecting)return this.rtConnecting;
    if(this.realtimeActive)return;
    const generation=this.rtGeneration;
    this.rtConnecting=new Promise((resolve,reject)=>{
      const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/word-realtime`);socket.binaryType='arraybuffer';this.socket=socket;
      let ready=false;
      const timer=setTimeout(()=>{socket.close();reject(new Error('realtime_timeout'));},15000);
      socket.onopen=()=>socket.send(JSON.stringify({type:'start',mode:this.getMode?.()||'game',lesson:this.getLesson?.()||''}));
      socket.onmessage=event=>{
        if(generation!==this.rtGeneration)return;
        if(event.data instanceof ArrayBuffer){this.playPCM(event.data);return;}
        let message;try{message=JSON.parse(event.data);}catch{return;}
        if(message.type==='ready'){ready=true;clearTimeout(timer);resolve();return;}
        if(message.type==='error'){socket.close();return;}
        if(message.type==='event')this.handleRealtime(message.event,message.data||{});
      };
      socket.onerror=()=>{clearTimeout(timer);reject(new Error('realtime_unavailable'));};
      socket.onclose=()=>{
        clearTimeout(timer);
        if(!ready)reject(new Error('realtime_unavailable'));
        if(generation===this.rtGeneration&&ready){this.realtimeFailed=true;this.stopPlayback();this.finishRead();this.captureFeedback('fallback','Real-time voice disconnected. Classic voice is ready.');this.refreshListening();}
      };
    }).catch(error=>{if(generation===this.rtGeneration){this.realtimeFailed=true;this.captureFeedback('fallback','Real-time voice is unavailable. Using classic voice.');}throw error;}).finally(()=>{if(generation===this.rtGeneration)this.rtConnecting=null;});
    return this.rtConnecting;
  }
  async enable(){
    this.onState('requesting');
    const generation=this.rtGeneration;
    try{await this.connectRealtime();}catch{}
    if(generation!==this.rtGeneration)return;
    return super.enable();
  }
  capture(packet){
    if(!this.realtimeActive)return super.capture(packet);
    if(!this.recording||packet.token!==this.captureToken||!packet.samples?.length)return;
    const samples=packet.samples,ratio=this.context.sampleRate/16000;
    const pcm=new Int16Array(Math.floor(samples.length/ratio));
    let energy=0;
    for(let i=0;i<pcm.length;i++){
      const start=Math.floor(i*ratio),end=Math.min(samples.length,Math.floor((i+1)*ratio));let sum=0;
      for(let j=start;j<end;j++)sum+=samples[j];
      const v=Math.max(-1,Math.min(1,sum/Math.max(1,end-start)));pcm[i]=v<0?v*32768:v*32767;energy+=v*v;
    }
    this.onLevel(Math.min(1,Math.sqrt(energy/Math.max(1,pcm.length))*15));
    if(this.socket.bufferedAmount>128000){this.socket.close();return;}
    this.socket.send(pcm.buffer);
  }
  handleRealtime(event,data){
    if(event===450){this.stopPlayback();this.finishRead();this.partial='';this.ignoreAudio=false;this.answerDelivered=false;this.onState('listening');}
    if(event===451){
      const results=data.results||[];this.partial=results.map(r=>r.text||'').join('');
      this.captureFeedback('partial','',this.partial);
    }
    if(event===459&&!this.answerDelivered){this.answerDelivered=true;const text=this.partial?.trim();if(text)Promise.resolve(this.onAnswer(text)).catch(()=>this.onError('Please try again.'));}
    if(event===350){
      // Only audio belonging to an English subtitle is accepted.
      this.ignoreAudio=!/[a-z]/i.test(data.text||'')||/[\u3400-\u9fff]/.test(data.text||'');
      if(!this.ignoreAudio){this.onState('speaking');this.captureFeedback('reply','',data.text||'');}
    }
    if(event===359){clearTimeout(this.endTimer);this.endTimer=setTimeout(()=>{this.finishRead('ended');this.onState(this.recording?'listening':'off');},Math.max(0,(this.playAt-(this.context?.currentTime||0))*1000)+30);}
  }
  playPCM(data){
    if(this.ignoreAudio||!this.context||data.byteLength%2)return;
    const pcm=new Int16Array(data),buffer=this.context.createBuffer(1,pcm.length,24000),channel=buffer.getChannelData(0);
    for(let i=0;i<pcm.length;i++)channel[i]=pcm[i]/32768;
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);
    const start=Math.max(this.context.currentTime+.025,this.playAt);this.playAt=start+buffer.duration;
    this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();};source.start(start);
  }
  stopPlayback(){clearTimeout(this.endTimer);for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();this.playAt=0;this.ignoreAudio=true;}
  finishRead(status='cancelled'){if(!this.rtRead)return;clearTimeout(this.rtRead.timer);this.rtRead.progress?.({status,start:-1,end:-1});this.rtRead.resolve();this.rtRead=null;}
  async say(text,voice,onStart=()=>{},npcId='',onProgress){
    if(this.realtimeFailed)return super.say(text,voice,onStart,npcId,onProgress);
    const generation=this.rtGeneration;
    try{await this.unlock();await this.connectRealtime();}catch{if(generation===this.rtGeneration)return super.say(text,voice,onStart,npcId,onProgress);return;}
    if(generation!==this.rtGeneration)return;
    this.skip();this.ignoreAudio=false;onStart();
    return new Promise(resolve=>{
      this.rtRead={resolve,progress:onProgress,timer:setTimeout(()=>{this.stopPlayback();this.finishRead();},20000)};
      // Real-time does not provide word timestamps: never fabricate timing.
      this.socket.send(JSON.stringify({type:'say',text}));
    });
  }
  skip(){super.skip();this.stopPlayback();this.finishRead();}
  pause(){this.rtGeneration++;this.rtConnecting=null;this.socket?.close();this.socket=null;this.stopPlayback();this.finishRead();super.pause();}
}
