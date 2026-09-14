export type MicSource = {
  stream: MediaStream;
  deviceId: string | null;
  label: string | null;
  onChunk(cb: (pcm: Int16Array) => void): void;
  setMuted(muted: boolean): void;
  stop(): void;
};

function readStoredMicDevice(): string | undefined {
  try {
    return localStorage.getItem("mockrill:micDeviceId") ?? undefined;
  } catch {
    return undefined;
  }
}

export async function createMicSource(opts?: { sampleRate?: number; deviceId?: string }): Promise<MicSource> {
  const desiredRate = opts?.sampleRate ?? 16000;
  const deviceId = opts?.deviceId ?? readStoredMicDevice();
  let stream: MediaStream;
  try {
    const audio: MediaTrackConstraints = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    if (deviceId) audio.deviceId = { exact: deviceId };
    stream = await navigator.mediaDevices.getUserMedia({ audio });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      const denied = new Error(err.message ?? "mic permission denied");
      denied.name = "MicPermissionDenied";
      throw denied;
    }
    throw e;
  }

  // AudioContext: try 16000, fallback to native rate; sampleRate: 16000
  let ctx: AudioContext;
  try {
    ctx = new AudioContext({ sampleRate: desiredRate ?? 16000 });
  } catch (_e) {
    ctx = new AudioContext();
  }
  const needsResample = ctx.sampleRate !== 16000;
  const ratio = ctx.sampleRate / 16000;
  const ctxSampleRate = ctx.sampleRate;

  const WORKLET_SRC = `class MockrillPCMWorklet extends AudioWorkletProcessor{constructor(){super();this._buf=new Float32Array(0);this._inBuf=new Float32Array(0);this._outIdx=0;this._needsResample=${needsResample};this._ratio=${ratio};this._nativeRate=${ctxSampleRate};this._base=0}process(inputs){const inp=inputs[0]?.[0];if(!inp||!inp.length)return true;const nxt=new Float32Array(this._inBuf.length+inp.length);nxt.set(this._inBuf,0);nxt.set(inp,this._inBuf.length);this._inBuf=nxt;let floatChunk;if(this._needsResample){const out=[];while(true){const pos=this._outIdx*this._ratio;const l=Math.floor(pos);const f=pos-l;if(l+1>=this._inBuf.length)break;const s=this._inBuf[l]*(1-f)+this._inBuf[l+1]*f;out.push(s);this._outIdx++;if(out.length>=8192)break}const consumed=Math.min(this._inBuf.length,Math.floor(this._outIdx*this._ratio)-this._base);if(consumed>0){this._inBuf=this._inBuf.slice(consumed);this._base+=consumed}floatChunk=new Float32Array(out)}else{floatChunk=this._inBuf;this._inBuf=new Float32Array(0)}const comb=new Float32Array(this._buf.length+floatChunk.length);comb.set(this._buf,0);comb.set(floatChunk,this._buf.length);this._buf=comb;while(this._buf.length>=3200){const ch=this._buf.slice(0,3200);this._buf=this._buf.slice(3200);const i16=new Int16Array(3200);for(let i=0;i<3200;i++){let s=Math.max(-1,Math.min(1,ch[i]));i16[i]=s<0?s*0x8000:s*0x7FFF}this.port.postMessage(i16,[i16.buffer])}return true}}registerProcessor('mockrill-pcm-worklet',MockrillPCMWorklet);`;

  const blob = new Blob([WORKLET_SRC], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "mockrill-pcm-worklet");
  source.connect(node);

  let muted = false;
  let droppedForMute = 0;
  let chunkCb: ((pcm: Int16Array) => void) | null = null;

  node.port.onmessage = (ev: MessageEvent) => {
    if (muted) {
      droppedForMute++;
      return;
    }
    void droppedForMute;
    if (chunkCb) chunkCb(ev.data as Int16Array);
  };

  return {
    stream,
    deviceId: stream.getAudioTracks()[0]?.getSettings()?.deviceId ?? deviceId ?? null,
    label: stream.getAudioTracks()[0]?.label ?? null,
    onChunk(cb: (pcm: Int16Array) => void) {
      chunkCb = cb;
    },
    setMuted(m: boolean) {
      muted = m;
    },
    stop() {
      try {
        node.disconnect();
      } catch {}
      try {
        source.disconnect();
      } catch {}
      try {
        ctx.close();
      } catch {}
      for (const t of stream.getTracks())
        try {
          t.stop();
        } catch {}
    },
  };
}
