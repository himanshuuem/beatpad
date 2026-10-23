import { audio, play } from "./synth.js";

const PADS = [
  { voice: "kick", key: "a", label: "Kick" },
  { voice: "snare", key: "s", label: "Snare" },
  { voice: "hihat", key: "d", label: "Hi-hat" },
  { voice: "openhat", key: "f", label: "Open hat" },
  { voice: "clap", key: "g", label: "Clap" },
  { voice: "tom", key: "h", label: "Tom" },
  { voice: "rim", key: "j", label: "Rim" },
  { voice: "cowbell", key: "k", label: "Cowbell" },
];
const STEPS = 16;
const PATTERN_KEY = "beatpad-pattern";

const PRESETS = {
  boombap: { kick: [0, 7, 10], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14], openhat: [14] },
  house: { kick: [0, 4, 8, 12], clap: [4, 12], hihat: [2, 6, 10, 14], openhat: [6, 14] },
  bhangra: { kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], tom: [2, 10, 13], cowbell: [0, 8], rim: [6, 15] },
};

const padsEl = document.querySelector(".pads");
const gridEl = document.querySelector("#grid");
const playBtn = document.querySelector("#playBtn");
const tempoInput = document.querySelector("#tempo");
const tempoOut = document.querySelector("#tempoOut");

let pattern = loadPattern();
let tempo = Number(tempoInput.value);
let playing = false;
let currentStep = 0;
let nextNoteTime = 0;
let schedulerTimer;
const scheduledSteps = [];

function emptyPattern() {
  return Object.fromEntries(PADS.map(({ voice }) => [voice, Array(STEPS).fill(false)]));
}

function loadPattern() {
  try {
    const stored = JSON.parse(localStorage.getItem(PATTERN_KEY));
    if (stored && PADS.every(({ voice }) => Array.isArray(stored[voice]) && stored[voice].length === STEPS)) return stored;
  } catch {
    // fall through to default
  }
  return presetPattern("boombap");
}

function savePattern() {
  try {
    localStorage.setItem(PATTERN_KEY, JSON.stringify(pattern));
  } catch {
    // Not fatal: the beat just won't survive a reload.
  }
}

function presetPattern(name) {
  const fresh = emptyPattern();
  for (const [voice, steps] of Object.entries(PRESETS[name])) steps.forEach((s) => { fresh[voice][s] = true; });
  return fresh;
}

function buildPads() {
  padsEl.innerHTML = PADS.map(({ voice, key, label }, i) => `
    <button type="button" class="pad" data-voice="${voice}" style="--hue:${i * 42}" aria-keyshortcuts="${key}">
      <span class="pad-key">${key.toUpperCase()}</span>
      <span class="pad-label">${label}</span>
    </button>`).join("");
}

function buildGrid() {
  const rows = PADS.map(({ voice, label }, rowIndex) => {
    const cells = Array.from({ length: STEPS }, (_, step) => `
      <button type="button" role="gridcell" class="cell${step % 4 === 0 ? " beat" : ""}"
        data-voice="${voice}" data-step="${step}" aria-pressed="${pattern[voice][step]}"
        aria-label="${label} step ${step + 1}" style="--hue:${rowIndex * 42}"></button>`).join("");
    return `<div class="row" role="row"><span class="row-label" role="rowheader">${label}</span>${cells}</div>`;
  });
  gridEl.innerHTML = rows.join("");
}

function hit(voice, time) {
  play(voice, time);
  const pad = padsEl.querySelector(`[data-voice="${voice}"]`);
  const delay = time ? Math.max(0, (time - audio().currentTime) * 1000) : 0;
  setTimeout(() => {
    pad.classList.remove("hit");
    void pad.offsetWidth;
    pad.classList.add("hit");
  }, delay);
}

// Look-ahead scheduler: queue notes slightly ahead on the audio clock for rock-solid timing.
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

function scheduler() {
  const context = audio();
  while (nextNoteTime < context.currentTime + SCHEDULE_AHEAD_S) {
    for (const { voice } of PADS) {
      if (pattern[voice][currentStep]) hit(voice, nextNoteTime);
    }
    scheduledSteps.push({ step: currentStep, time: nextNoteTime });
    nextNoteTime += 60 / tempo / 4; // sixteenth notes
    currentStep = (currentStep + 1) % STEPS;
  }
  schedulerTimer = setTimeout(scheduler, LOOKAHEAD_MS);
}

function drawPlayhead() {
  if (!playing) return;
  const now = audio().currentTime;
  let step = null;
  while (scheduledSteps.length && scheduledSteps[0].time <= now) step = scheduledSteps.shift().step;
  if (step !== null) {
    gridEl.querySelectorAll(".cell.playing").forEach((c) => c.classList.remove("playing"));
    gridEl.querySelectorAll(`[data-step="${step}"]`).forEach((c) => c.classList.add("playing"));
  }
  requestAnimationFrame(drawPlayhead);
}

function togglePlay() {
  playing = !playing;
  playBtn.setAttribute("aria-pressed", String(playing));
  playBtn.textContent = playing ? "■ Stop" : "▶ Play";
  document.body.classList.toggle("is-playing", playing);
  if (playing) {
    currentStep = 0;
    scheduledSteps.length = 0;
    nextNoteTime = audio().currentTime + 0.05;
    scheduler();
    requestAnimationFrame(drawPlayhead);
  } else {
    clearTimeout(schedulerTimer);
    gridEl.querySelectorAll(".cell.playing").forEach((c) => c.classList.remove("playing"));
  }
}

padsEl.addEventListener("pointerdown", (event) => {
  const pad = event.target.closest(".pad");
  if (pad) hit(pad.dataset.voice);
});
padsEl.addEventListener("keydown", (event) => {
  // Enter/Space on a focused pad (pointerdown doesn't fire for keyboard activation).
  const pad = event.target.closest(".pad");
  if (pad && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    event.stopPropagation();
    hit(pad.dataset.voice);
  }
});

gridEl.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const { voice, step } = cell.dataset;
  pattern[voice][step] = !pattern[voice][step];
  cell.setAttribute("aria-pressed", String(pattern[voice][step]));
  if (pattern[voice][step] && !playing) hit(voice);
  savePattern();
});

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.target.closest("input, select")) return;
  if (event.code === "Space" && !event.target.closest("button")) {
    event.preventDefault();
    togglePlay();
    return;
  }
  const pad = PADS.find(({ key }) => key === event.key.toLowerCase());
  if (pad) hit(pad.voice);
});

playBtn.addEventListener("click", togglePlay);
tempoInput.addEventListener("input", () => {
  tempo = Number(tempoInput.value);
  tempoOut.textContent = tempo;
});
document.querySelector("#preset").addEventListener("change", (event) => {
  if (!event.target.value) return;
  pattern = presetPattern(event.target.value);
  savePattern();
  buildGrid();
});
document.querySelector("#clearBtn").addEventListener("click", () => {
  pattern = emptyPattern();
  savePattern();
  buildGrid();
});

buildPads();
buildGrid();
