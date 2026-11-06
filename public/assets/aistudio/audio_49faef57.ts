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

export function playWoodblock(volume = 0.22) {
  const context = getContext();
  const now = context.currentTime;
  const body = context.createOscillator();
  const bodyGain = context.createGain();
  body.type = "triangle";
  body.frequency.setValueAtTime(760, now);
  body.frequency.exponentialRampToValueAtTime(390, now + 0.12);
  bodyGain.gain.setValueAtTime(volume, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  body.connect(bodyGain).connect(context.destination);
  body.start(now);
  body.stop(now + 0.17);

  const click = context.createOscillator();
  const clickGain = context.createGain();
  click.type = "sine";
  click.frequency.setValueAtTime(1680, now);
  clickGain.gain.setValueAtTime(volume * 0.38, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
  click.connect(clickGain).connect(context.destination);
  click.start(now);
  click.stop(now + 0.05);
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

export function startHeartSutraChant() {
  const context = getContext();
  const now = context.currentTime;
  const droneTones: OscillatorNode[] = [];
  const droneGains: GainNode[] = [];
  let stopped = false;
  let nextVerse = 0;
  let rhythmTimer = 0;
  let verseTimer = 0;

  [130.81, 196, 261.63].forEach((frequency, index) => {
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = "sine";
    tone.frequency.value = frequency;
    gain.gain.value = [0.012, 0.008, 0.004][index];
    tone.connect(gain).connect(context.destination);
    tone.start(now);
    droneTones.push(tone);
    droneGains.push(gain);
  });

  const verses = [
    "마하반야바라밀다심경. 관자재보살, 행심반야바라밀다시 조견오온개공 도일체고액.",
    "사리자, 색즉시공 공즉시색 수상행식 역부여시. 사리자, 시제법공상 불생불멸 불구부정 부증불감.",
  ];
  const speech = "speechSynthesis" in window ? window.speechSynthesis : null;
  const speakNext = () => {
    if (stopped || !speech) return;
    const utterance = new SpeechSynthesisUtterance(verses[nextVerse]);
    utterance.lang = "ko-KR";
    utterance.rate = 0.76;
    utterance.pitch = 0.82;
    utterance.volume = 0.48;
    const koreanVoice = speech.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko"));
    if (koreanVoice) utterance.voice = koreanVoice;
    utterance.onend = () => {
      nextVerse = (nextVerse + 1) % verses.length;
      if (!stopped) verseTimer = window.setTimeout(speakNext, 1800);
    };
    speech.speak(utterance);
  };

  playWoodblock(0.1);
  rhythmTimer = window.setInterval(() => playWoodblock(0.075), 3200);
  speakNext();

  return () => {
    stopped = true;
    window.clearInterval(rhythmTimer);
    window.clearTimeout(verseTimer);
    speech?.cancel();
    droneTones.forEach((tone) => tone.stop());
    [...droneTones, ...droneGains].forEach((node) => node.disconnect());
  };
}