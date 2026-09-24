// Keep one resampling phase across every 24 kHz PCM packet. Starting a new
// AudioBufferSource for each packet resets the browser's resampler at boundaries.
class WordPcmPlayback extends AudioWorkletProcessor {
  constructor(){
    super();
    this.samples=new Float32Array(24000*30);
    this.read=0;this.write=0;this.length=0;this.phase=0;
    this.started=false;this.ended=false;this.reported=false;
    this.fade=0;this.last=0;this.tailByte=null;this.streamId=0;
    this.port.onmessage=event=>this.receive(event.data);
  }
  receive(message){
    if(message.type==='reset'){
      this.streamId=message.streamId;
      this.read=this.write=this.length=0;this.phase=0;
      this.started=this.ended=this.reported=false;
      this.fade=0;this.last=0;this.tailByte=null;
      return;
    }
    if(message.type==='end'){this.ended=true;return;}
    if(message.type!=='append')return;
    const incoming=new Uint8Array(message.data);
    const bytes=this.tailByte===null?incoming:new Uint8Array(incoming.length+1);
    if(this.tailByte!==null){bytes[0]=this.tailByte;bytes.set(incoming,1);}
    this.tailByte=bytes.length%2?bytes[bytes.length-1]:null;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    for(let i=0;i+1<bytes.length;i+=2){
      if(this.length>=this.samples.length){this.port.postMessage({type:'overflow'});break;}
      this.samples[this.write]=view.getInt16(i,true)/32768;
      this.write=(this.write+1)%this.samples.length;this.length++;
    }
  }
  process(_inputs,outputs){
    const output=outputs[0][0],ratio=24000/sampleRate;
    for(let i=0;i<output.length;i++){
      // Start after a short reservoir; a final short reply starts immediately.
      if(!this.started&&(this.length>=2880||(this.ended&&this.length>0)))this.started=true;
      if(this.started&&this.length){
        const a=this.samples[this.read];
        const b=this.length>1?this.samples[(this.read+1)%this.samples.length]:a;
        const value=a+(b-a)*this.phase;
        this.fade=Math.min(1,this.fade+1/(sampleRate*.008));
        output[i]=value*this.fade;
        this.last=value;
        this.phase+=ratio;
        while(this.phase>=1&&this.length){
          this.phase-=1;this.read=(this.read+1)%this.samples.length;this.length--;
        }
      }else{
        this.fade=Math.max(0,this.fade-1/(sampleRate*.008));
        output[i]=this.last*this.fade;
        if(!this.length&&!this.ended)this.started=false;
      }
    }
    if(this.ended&&!this.length&&!this.reported){
      this.reported=true;
      this.port.postMessage({type:'drained',streamId:this.streamId});
    }
    return true;
  }
}
registerProcessor('word-pcm-playback',WordPcmPlayback);
