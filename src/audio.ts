import { heartSutraVerses, type HeartSutraVerse } from "./heartSutra";

let sharedContext: AudioContext | null = null;

function getContext() {
  sharedContext ??= new AudioContext();
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

function makeNoise(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

// --- Hyper-Realistic Korean Temple Moktak (목탁) Acoustic Synthesis ---
// Real Korean Buddhist moktaks are hollowed spherical wooden percussion instruments carved from dried
// birch or jujube wood. When struck with a hardwood mallet (당목), they produce:
// 1. A crisp, sharp hardwood transient click (딱!)
// 2. A hollow cavity Helmholtz resonance with characteristic downward pitch slide (복강 공명: ~850Hz -> ~480Hz)
// 3. A deep, dense wood body knock (목질 저음 공명: ~310Hz)
// 4. Slit lip overtones (~1420Hz)
// 5. Natural temple hall wooden acoustics & room reflection

export function playWoodblock(volume = 0.32, variation = true) {
  const context = getContext();
  const now = context.currentTime;

  // Subtle human pitch variation (±2%)
  const pitchFactor = variation ? (0.98 + Math.random() * 0.04) : 1.0;
  const volFactor = variation ? (0.94 + Math.random() * 0.12) : 1.0;
  const finalVolume = volume * volFactor;

  // Master bus for this moktak hit
  const hitBus = context.createGain();
  hitBus.gain.setValueAtTime(1.0, now);

  // 1. Hardwood Mallet Strike Transient (당목 채 타격음: 0.001s attack, filtered impulse)
  const transientLen = 0.007;
  const clickBuffer = context.createBuffer(1, Math.floor(context.sampleRate * transientLen), context.sampleRate);
  const clickData = clickBuffer.getChannelData(0);
  for (let i = 0; i < clickData.length; i += 1) {
    const envelope = Math.exp(-i / (context.sampleRate * 0.0016));
    clickData[i] = (Math.random() * 2 - 1) * envelope;
  }
  const clickSource = context.createBufferSource();
  clickSource.buffer = clickBuffer;
  const clickFilter = context.createBiquadFilter();
  clickFilter.type = "bandpass";
  clickFilter.frequency.setValueAtTime(2600 * pitchFactor, now);
  clickFilter.Q.setValueAtTime(3.8, now);
  const clickGain = context.createGain();
  clickGain.gain.setValueAtTime(finalVolume * 0.55, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + transientLen);
  clickSource.connect(clickFilter).connect(clickGain).connect(hitBus);
  clickSource.start(now);

  // 2. Fast Strike Chirp (Hardwood Surface Impact)
  const chirp = context.createOscillator();
  const chirpGain = context.createGain();
  chirp.type = "sine";
  chirp.frequency.setValueAtTime(3200 * pitchFactor, now);
  chirp.frequency.exponentialRampToValueAtTime(950 * pitchFactor, now + 0.012);
  chirpGain.gain.setValueAtTime(finalVolume * 0.42, now);
  chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);
  chirp.connect(chirpGain).connect(hitBus);
  chirp.start(now);
  chirp.stop(now + 0.016);

  // 3. Primary Hollow Cavity Resonance (복강 공명음: 850Hz -> 510Hz drop with Q resonance)
  const cavity = context.createOscillator();
  const cavityGain = context.createGain();
  const cavityFilter = context.createBiquadFilter();
  cavity.type = "triangle";
  cavity.frequency.setValueAtTime(840 * pitchFactor, now);
  cavity.frequency.exponentialRampToValueAtTime(495 * pitchFactor, now + 0.038);
  cavity.frequency.exponentialRampToValueAtTime(475 * pitchFactor, now + 0.16);

  cavityFilter.type = "bandpass";
  cavityFilter.frequency.setValueAtTime(860 * pitchFactor, now);
  cavityFilter.frequency.exponentialRampToValueAtTime(510 * pitchFactor, now + 0.04);
  cavityFilter.Q.setValueAtTime(9.2, now);

  cavityGain.gain.setValueAtTime(finalVolume * 0.95, now);
  cavityGain.gain.exponentialRampToValueAtTime(finalVolume * 0.45, now + 0.042);
  cavityGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

  cavity.connect(cavityFilter).connect(cavityGain).connect(hitBus);
  cavity.start(now);
  cavity.stop(now + 0.2);

  // 4. Dense Wood Body Thump (목질 통울림 저음: 305Hz)
  const body = context.createOscillator();
  const bodyGain = context.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(312 * pitchFactor, now);
  body.frequency.exponentialRampToValueAtTime(260 * pitchFactor, now + 0.11);
  bodyGain.gain.setValueAtTime(finalVolume * 0.62, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  body.connect(bodyGain).connect(hitBus);
  body.start(now);
  body.stop(now + 0.14);

  // 5. Lip / Slit Hollow Ring (목탁 입술 틈새 배음: 1420Hz)
  const slit = context.createOscillator();
  const slitGain = context.createGain();
  slit.type = "sine";
  slit.frequency.setValueAtTime(1420 * pitchFactor, now);
  slitGain.gain.setValueAtTime(finalVolume * 0.26, now);
  slitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.052);
  slit.connect(slitGain).connect(hitBus);
  slit.start(now);
  slit.stop(now + 0.06);

  // 6. Temple Hall Wooden Reflection (산사 대웅전 목재 잔향)
  const delay1 = context.createDelay();
  delay1.delayTime.value = 0.032;
  const delayGain1 = context.createGain();
  delayGain1.gain.value = 0.16;
  const dampFilter = context.createBiquadFilter();
  dampFilter.type = "lowpass";
  dampFilter.frequency.value = 1400;

  hitBus.connect(context.destination);
  hitBus.connect(delay1).connect(dampFilter).connect(delayGain1).connect(context.destination);
}

// Iconic Buddhist Temple Moktak Roll ("또로록~ 탁!")
export function playMoktakRoll(volume = 0.32) {
  const delays = [0, 85, 155, 210, 255, 330];
  const vols = [0.15, 0.22, 0.35, 0.52, 0.72, 1.0];
  delays.forEach((delay, idx) => {
    window.setTimeout(() => {
      playWoodblock(volume * (vols[idx] ?? 0.8), true);
    }, delay);
  });
}

// Sacred Candle Lighting Ceremony Sound (촛불 공양 - 부싯돌 불꽃 점화음 + 맑은 요령/종소리 잔향)
export function playCandleLighting() {
  const context = getContext();
  const now = context.currentTime;

  // 1. Flame ignition strike (치익~ 부드러운 불꽃 피어오름)
  const flameLen = 0.22;
  const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * flameLen), context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.6;
  }
  const noiseSource = context.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(1800, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(750, now + flameLen);
  noiseFilter.Q.value = 1.4;
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.09, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + flameLen);
  noiseSource.connect(noiseFilter).connect(noiseGain).connect(context.destination);
  noiseSource.start(now);

  // 2. Sacred Crystal Bell / Singing Bowl Chime (맑고 은은한 지혜의 공양음)
  const chimePartials = [
    { freq: 880, vol: 0.16, decay: 3.2 },
    { freq: 1760, vol: 0.11, decay: 2.8 },
    { freq: 2640, vol: 0.05, decay: 2.1 },
    { freq: 528, vol: 0.09, decay: 3.8 },
  ];

  chimePartials.forEach(({ freq, vol, decay }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + 0.02);
    gain.gain.setValueAtTime(0.0001, now + 0.02);
    gain.gain.linearRampToValueAtTime(vol, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(gain).connect(context.destination);
    osc.start(now + 0.02);
    osc.stop(now + decay + 0.1);
  });
}

// Sacred Incense Offering Ceremony Sound (분향 공양 - 은은한 점화음 + 청아한 싱잉볼 요령 잔향)
export function playIncenseOffering() {
  const context = getContext();
  const now = context.currentTime;

  // 1. Soft match / ember ignite whisper (치익~ 부드러운 불씨 점화)
  const emberLen = 0.28;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * emberLen), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.45;
  }
  const noiseSource = context.createBufferSource();
  noiseSource.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2200, now);
  filter.frequency.exponentialRampToValueAtTime(800, now + emberLen);
  filter.Q.value = 2.0;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + emberLen);
  noiseSource.connect(filter).connect(gain).connect(context.destination);
  noiseSource.start(now);

  // 2. Resonant Tibetan / Korean Bronze Singing Bowl bell chime (맑고 깊은 향공양 종소리)
  const chimePartials = [
    { freq: 659.25, vol: 0.17, decay: 4.2 }, // E5
    { freq: 1318.5, vol: 0.12, decay: 3.5 }, // E6
    { freq: 1977.75, vol: 0.06, decay: 2.6 },
    { freq: 329.63, vol: 0.14, decay: 4.8 }, // E4 deep fundamental
  ];

  chimePartials.forEach(({ freq, vol, decay }) => {
    const osc = context.createOscillator();
    const oscGain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + 0.03);
    oscGain.gain.setValueAtTime(0.0001, now + 0.03);
    oscGain.gain.linearRampToValueAtTime(vol, now + 0.07);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(oscGain).connect(context.destination);
    osc.start(now + 0.03);
    osc.stop(now + decay + 0.1);
  });
}

export function playMalaBead(beadNumber: number) {
  const context = getContext();
  const now = context.currentTime;
  const tone = context.createOscillator();
  const toneGain = context.createGain();
  const frequency = 420 + (beadNumber % 6) * 34;
  tone.type = "triangle";
  tone.frequency.setValueAtTime(frequency, now);
  tone.frequency.exponentialRampToValueAtTime(frequency * 0.58, now + 0.085);
  toneGain.gain.setValueAtTime(0.055, now);
  toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  tone.connect(toneGain).connect(context.destination);
  tone.start(now);
  tone.stop(now + 0.13);

  const click = context.createOscillator();
  const clickGain = context.createGain();
  click.type = "sine";
  click.frequency.setValueAtTime(1180 + (beadNumber % 4) * 55, now);
  clickGain.gain.setValueAtTime(0.018, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
  click.connect(clickGain).connect(context.destination);
  click.start(now);
  click.stop(now + 0.04);
}

export function playTempleBell(volume = 0.17) {
  const context = getContext();
  const now = context.currentTime;
  const partials = [
    { ratio: 1, level: 1, decay: 11 },
    { ratio: 2.01, level: 0.43, decay: 8.5 },
    { ratio: 2.72, level: 0.25, decay: 7 },
    { ratio: 4.08, level: 0.12, decay: 5.2 },
  ];

  partials.forEach(({ ratio, level, decay }) => {
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.type = "sine";
    tone.frequency.value = 164.81 * ratio;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume * level, now + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    tone.connect(envelope).connect(context.destination);
    tone.start(now);
    tone.stop(now + decay + 0.08);
  });
}

export function startNatureSoundscape() {
  const context = getContext();
  const now = context.currentTime;
  const sources: AudioBufferSourceNode[] = [];
  const oscillators: OscillatorNode[] = [];
  const modulationGains: GainNode[] = [];

  const makeLayer = (kind: "wind" | "water") => {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const lfo = context.createOscillator();
    const depth = context.createGain();

    source.buffer = makeNoise(context, 3);
    source.loop = true;
    filter.type = kind === "wind" ? "lowpass" : "bandpass";
    filter.frequency.value = kind === "wind" ? 440 : 1050;
    filter.Q.value = kind === "wind" ? 0.55 : 0.42;
    gain.gain.value = kind === "wind" ? 0.028 : 0.014;
    lfo.type = "sine";
    lfo.frequency.value = kind === "wind" ? 0.075 : 0.19;
    depth.gain.value = kind === "wind" ? 0.018 : 0.006;
    lfo.connect(depth).connect(gain.gain);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now);
    lfo.start(now);
    sources.push(source);
    oscillators.push(lfo);
    modulationGains.push(depth);
  };

  makeLayer("wind");
  makeLayer("water");

  return () => {
    sources.forEach((source) => source.stop());
    oscillators.forEach((oscillator) => oscillator.stop());
    [...sources, ...oscillators, ...modulationGains].forEach((node) => node.disconnect());
  };
}

export function startHeartSutraChant(onVerseChange?: (verse: HeartSutraVerse, index: number) => void) {
  const context = getContext();
  const now = context.currentTime;
  const droneTones: OscillatorNode[] = [];
  const droneGains: GainNode[] = [];
  let stopped = false;
  let nextVerse = 0;
  let rhythmTimer = 0;
  let verseTimer = 0;

  // Opening Moktak Roll ("또로록~ 탁!")
  playMoktakRoll(0.28);

  // Deep Temple Monk Chanting Drone (C3 fundamental + warm harmonics)
  const masterDroneGain = context.createGain();
  masterDroneGain.gain.setValueAtTime(0.001, now);
  masterDroneGain.gain.linearRampToValueAtTime(0.022, now + 1.2);
  const droneFilter = context.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = 650;

  [130.81, 196.0, 261.63, 392.0].forEach((frequency, index) => {
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = index === 0 ? "sawtooth" : "sine";
    tone.frequency.value = frequency;
    gain.gain.value = [0.016, 0.011, 0.007, 0.003][index];
    tone.connect(gain).connect(droneFilter);
    tone.start(now);
    droneTones.push(tone);
    droneGains.push(gain);
  });
  droneFilter.connect(masterDroneGain).connect(context.destination);

  const speech = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

  const speakNext = () => {
    if (stopped) return;
    const currentVerseObj = heartSutraVerses[nextVerse];
    if (!currentVerseObj) return;

    onVerseChange?.(currentVerseObj, nextVerse);

    let advanceScheduled = false;
    const scheduleNext = (delayMs: number) => {
      if (advanceScheduled || stopped) return;
      advanceScheduled = true;
      nextVerse = (nextVerse + 1) % heartSutraVerses.length;
      verseTimer = window.setTimeout(speakNext, delayMs);
    };

    if (speech) {
      try {
        speech.cancel();
        const utterance = new SpeechSynthesisUtterance(currentVerseObj.text);
        utterance.lang = "ko-KR";
        utterance.rate = 0.82; // Dignified meditative pacing
        utterance.pitch = 0.72; // Deep monk chanting tone
        utterance.volume = 0.92;

        const voices = speech.getVoices();
        const koreanVoice = voices.find((v) => v.lang.toLowerCase().startsWith("ko") && (v.name.includes("Male") || v.name.includes("남성") || v.name.includes("Google") || v.name.includes("Natural")))
          ?? voices.find((v) => v.lang.toLowerCase().startsWith("ko"));
        if (koreanVoice) utterance.voice = koreanVoice;

        utterance.onend = () => {
          scheduleNext(650);
        };
        utterance.onerror = () => {
          scheduleNext(3600);
        };
        speech.speak(utterance);

        const estDuration = Math.max(2600, currentVerseObj.text.length * 280);
        verseTimer = window.setTimeout(() => {
          if (!advanceScheduled && !stopped) {
            scheduleNext(400);
          }
        }, estDuration + 1400);
      } catch {
        scheduleNext(3600);
      }
    } else {
      scheduleNext(3800);
    }
  };

  // Steady 600ms Korean temple cadence (~100 BPM liturgical beat)
  window.setTimeout(() => {
    if (stopped) return;
    playWoodblock(0.16);
    rhythmTimer = window.setInterval(() => {
      if (stopped) return;
      playWoodblock(0.13);
    }, 600);
    speakNext();
  }, 480);

  return () => {
    stopped = true;
    window.clearInterval(rhythmTimer);
    window.clearTimeout(verseTimer);
    try {
      speech?.cancel();
    } catch {}
    masterDroneGain.gain.linearRampToValueAtTime(0.0001, context.currentTime + 0.4);
    window.setTimeout(() => {
      droneTones.forEach((tone) => {
        try { tone.stop(); } catch {}
      });
      [...droneTones, ...droneGains, droneFilter, masterDroneGain].forEach((node) => {
        try { node.disconnect(); } catch {}
      });
    }, 500);
  };
}
