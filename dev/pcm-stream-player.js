// One AudioWorklet output for the whole utterance avoids packet-edge clicks
// and gives network bursts a small jitter reservoir.
export class PcmStreamPlayer {
  constructor(context,{onDrain=()=>{},onError=()=>{}}={}){
    this.context=context;this.onDrain=onDrain;this.onError=onError;this.node=null;this.streamId=0;
  }
  async prepare(){
    if(this.node)return;
    if(this.loading)return this.loading;
    this.loading=(async()=>{
      await this.context.audioWorklet.addModule(new URL('./pcm-playback-worklet.js',import.meta.url));
      const node=new AudioWorkletNode(this.context,'word-pcm-playback',{outputChannelCount:[1]});
      node.port.onmessage=event=>{
        if(event.data.type==='drained'&&event.data.streamId===this.streamId)this.onDrain();
        if(event.data.type==='overflow')this.onError('audio_buffer_overflow');
      };
      node.connect(this.context.destination);
      this.node=node;
    })();
    try{await this.loading;}finally{this.loading=null;}
  }
  append(data){if(this.node&&data?.byteLength)this.node.port.postMessage({type:'append',data},[data]);}
  end(){this.node?.port.postMessage({type:'end'});}
  reset(){this.streamId++;this.node?.port.postMessage({type:'reset',streamId:this.streamId});}
  dispose(){if(!this.node)return;this.reset();this.node.port.onmessage=null;this.node.disconnect();this.node.port.close();this.node=null;}
}
