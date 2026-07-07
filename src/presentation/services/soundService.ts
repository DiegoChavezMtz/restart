// Synthesized feedback tones for the respond flow — no audio files, everything
// is generated at runtime via the Web Audio API (AudioContext/OscillatorNode).

const MUTE_STORAGE_KEY = "restart_sound_muted";

let audioContext: AudioContext | null = null;
let muted =
  typeof window !== "undefined" && window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";

type MuteListener = () => void;
const muteListeners = new Set<MuteListener>();

// For useSyncExternalStore in MuteButton — lets the button re-render on toggle
// without stashing a parallel copy of this in React state.
export function subscribeMuted(listener: MuteListener): () => void {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

// A single short tone: quick attack, exponential decay — avoids the clicky
// pop a hard on/off gain change would produce.
function playTone(frequency: number, startOffset: number, duration: number, peakGain: number) {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const start = ctx.currentTime + startOffset;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(peakGain, start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  } catch {
    // Sound is a non-critical enhancement — never let it break the respond flow.
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(value: boolean): void {
  muted = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(value));
  }
  muteListeners.forEach((listener) => listener());
}

export function playSelectSound(): void {
  playTone(620, 0, 0.09, 0.12);
}

export function playAdvanceSound(): void {
  playTone(520, 0, 0.1, 0.11);
  playTone(760, 0.07, 0.14, 0.11);
}

export function playTimeWarningSound(): void {
  playTone(880, 0, 0.16, 0.14);
}

export function playCompleteSound(): void {
  playTone(523.25, 0, 0.16, 0.13); // C5
  playTone(659.25, 0.13, 0.16, 0.13); // E5
  playTone(783.99, 0.26, 0.24, 0.14); // G5
}
