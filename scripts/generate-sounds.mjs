// Synthesizes the game's original sound effects and ambient loop as 16-bit mono WAVs
// into assets/sounds/. Run with: npm run generate-sounds
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** Renders `seconds` of audio from f(t, progress 0..1). */
const render = (seconds, f) => Array.from({ length: Math.floor(seconds * RATE) }, (_, i) => f(i / RATE, i / (seconds * RATE)));
const env = (p, attack, release = 1 - attack) => Math.min(p / attack, 1) * Math.min((1 - p) / release, 1);
const sine = (freq, t) => Math.sin(2 * Math.PI * freq * t);

// Seeded noise so output is reproducible.
let seed = 1;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

const sounds = {
  tap: render(0.06, (t, p) => sine(1400, t) * Math.pow(1 - p, 3) * 0.5),

  whoosh: (() => {
    let lp = 0;
    return render(0.32, (t, p) => {
      // Noise through a one-pole low-pass whose cutoff sweeps up: a soft air sweep.
      const a = 0.04 + 0.25 * p;
      lp += a * (noise() - lp);
      return lp * env(p, 0.35, 0.65) * 1.6;
    });
  })(),

  bounce: render(0.22, (t, p) => {
    const f = 180 - 90 * p;
    return (sine(f, t) + 0.3 * sine(f * 2, t)) * Math.pow(1 - p, 2) * 0.7;
  }),

  heart: render(0.35, (t, p) => (sine(520 - 220 * p, t) * 0.5 + sine(780 - 330 * p, t) * 0.2) * env(p, 0.05, 0.95)),

  chime: render(0.9, (t) => {
    const note = (freq, start) => (t < start ? 0 : sine(freq, t - start) * Math.exp(-(t - start) * 4));
    return (note(659.25, 0) + note(987.77, 0.12) + 0.5 * note(1318.5, 0.24)) * 0.3;
  }),

  // Calm pad: four chords, 6 s each, each fading fully in and out so the loop is seamless.
  ambient: (() => {
    const chords = [
      [261.63, 329.63, 392.0, 493.88],
      [220.0, 261.63, 329.63, 392.0],
      [174.61, 220.0, 261.63, 329.63],
      [196.0, 246.94, 293.66, 392.0],
    ];
    const len = 6;
    return render(chords.length * len, (t) => {
      const i = Math.floor(t / len);
      const local = (t % len) / len;
      const e = Math.sin(Math.PI * local) ** 2;
      const tone = chords[i].reduce((s, f) => s + sine(f, t) + 0.15 * sine(f * 2, t), 0);
      return tone * e * 0.08;
    });
  })(),
};

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(join(OUT, `${name}.wav`), wav(samples));
  console.log(`${name}.wav  ${(samples.length / RATE).toFixed(2)}s`);
}
