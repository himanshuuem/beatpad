# 🥁 BeatPad

> A browser drum machine with eight **synthesised** drum voices, keyboard-playable pads and a **16-step sequencer** that keeps sample-accurate time. It uses no audio files at all, only the Web Audio API.

**🔗 Live demo:** https://himanshuuem.github.io/beatpad/

![JavaScript](https://img.shields.io/badge/ES_Modules-F7DF1E?logo=javascript&logoColor=black)
![Web Audio](https://img.shields.io/badge/Web_Audio_API-FF6B1A)

## ✨ Features

- **8 synthesised voices:** kick (a pitch-swept sine), snare (high-passed noise plus a body tone), closed and open hats, a three-burst clap, tom, rim and a two-oscillator 808-style cowbell.
- **Play with your keyboard** (<kbd>A</kbd>–<kbd>K</kbd>), mouse or touch. Pads have a tactile press and a flash.
- **16-step sequencer** using the classic **look-ahead scheduler** pattern: notes are queued on the `AudioContext` clock ~100 ms ahead, so timing doesn't drift when the main thread is busy. A `requestAnimationFrame` playhead stays in sync with the audio.
- **Tempo** from 60 to 180 BPM, three presets (Boom Bap, Four on the Floor, Bhangra-ish), and auto-save of your pattern to `localStorage`.
- <kbd>Space</kbd> plays and stops. Grid cells are labelled buttons with `aria-pressed`.
- A hardware-inspired look: a beige chassis, chunky coloured pads and LEDs that blink in time.

## 🧠 How the sound works

Each voice is a short graph: an `OscillatorNode` or noise `AudioBufferSourceNode`, then an optional `BiquadFilterNode`, then a `GainNode` envelope with an exponential decay, then a shared `DynamicsCompressorNode`. See [`synth.js`](synth.js).

## 🛠 Tech Stack

Vanilla JS ES modules · Web Audio API · CSS Grid · CSS custom properties (per-pad `--hue`)

## 🚀 Run Locally

```bash
git clone https://github.com/himanshuuem/beatpad.git
cd beatpad
npx serve .
```

## 📚 Origin

This is a reimagined **Drum Kit** project from [The Complete Web Development Bootcamp](https://www.udemy.com/course/the-complete-web-development-bootcamp/). The keyboard events from the course are still here, but the sound is synthesised and there's a sequencer on top.

---

Made by [Himanshu](https://github.com/himanshuuem)
