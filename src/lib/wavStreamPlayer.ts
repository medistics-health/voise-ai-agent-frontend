export class WavStreamPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private enabled = true;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  async enqueueBase64Wav(base64Audio: string): Promise<void> {
    if (!this.enabled || !base64Audio) {
      return;
    }

    const audioContext = this.ensureContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoded = await audioContext.decodeAudioData(bytes.buffer.slice(0));
    const source = audioContext.createBufferSource();
    source.buffer = decoded;
    source.connect(audioContext.destination);

    const startAt = Math.max(audioContext.currentTime + 0.03, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + decoded.duration;
  }

  async suspend(): Promise<void> {
    this.enabled = false;
    if (this.audioContext && this.audioContext.state === "running") {
      await this.audioContext.suspend();
    }
  }

  async resume(): Promise<void> {
    this.enabled = true;
    const audioContext = this.ensureContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    this.nextStartTime = Math.max(this.nextStartTime, audioContext.currentTime);
  }

  async close(): Promise<void> {
    this.enabled = false;
    this.nextStartTime = 0;
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
    this.audioContext = null;
  }
}
