/**
 * Pure Web Audio API Sound Synthesizer for Korean Online Temple (SANSA)
 * Generates realistic wooden moktak, bronze temple bell (맥놀이 현상),
 * Buddhist monks chant drone, Heart Sutra cadence, Korean bamboo flute (Daegeum),
 * and ambient mountain nature soundscapes with zero external audio assets.
 */

import { HEART_SUTRA_VERSES } from '../data/dharma';

export type BuddhistTrackId = 'sutra' | 'bell_puja' | 'daegeum' | 'singing_bowl';

export interface BuddhistTrack {
  id: BuddhistTrackId;
  title: string;
  subtitle: string;
  description: string;
}

export const BUDDHIST_TRACKS: BuddhistTrack[] = [
  {
    id: 'sutra',
    title: '반야심경 독송과 목탁',
    subtitle: '스님의 범음(梵音) 독경과 청아한 목탁 리듬',
    description: '규칙적인 목탁 타종과 저음 승려 합송 옴(Om) 드론 사운드'
  },
  {
    id: 'daegeum',
    title: '천년고찰 대금(大琴) 명상곡',
    subtitle: '대숲 바람과 전통 대금 대선율',
    description: '한국 전통 5음계(황종·태주·중려·임종·남려)로 연주되는 명상 대금'
  },
  {
    id: 'bell_puja',
    title: '새벽 예불과 에밀레 범종',
    subtitle: '1.4Hz 맥놀이 대종과 은은한 풍경소리',
    description: '산사의 안개를 가르는 깊은 울림의 새벽 타종'
  },
  {
    id: 'singing_bowl',
    title: '432Hz 치유의 싱잉볼 & 계곡수',
    subtitle: '맑은 산사 계곡물과 명상 공명음',
    description: '마음의 긴장을 풀고 깊은 이완을 돕는 주파수'
  }
];

class TempleAudioEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientSourceNode: AudioNode | null = null;
  private isAmbientPlaying = false;
  private currentAmbientType: 'wind' | 'stream' | 'crickets' | 'none' = 'none';

  // Buddhist Music Player state
  private currentTrack: BuddhistTrackId | null = null;
  private isMusicPlaying = false;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicMasterGain: GainNode | null = null;
  private activeMusicNodes: AudioNode[] = [];
  private currentVerseIdx = 0;
  private speechSynthesisActive = false;

  public onVerseChange?: (index: number) => void;
  public onTrackStatusChange?: (isPlaying: boolean, trackId: BuddhistTrackId | null) => void;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * 목탁(木鐸) 소리 단발 합성
   */
  public playMoktak(volume = 0.8) {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // 1. 타격 충격음 (Transient Strike Click)
    const bufferSize = ctx.sampleRate * 0.02; // 20ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(3, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);

    // 2. 나무 몸통 기본 울림 (Wood Body Resonance)
    const baseFreq = 840;
    const osc1 = ctx.createOscillator();
    const oscGain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq + 35, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);

    oscGain1.gain.setValueAtTime(volume * 0.9, now);
    oscGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(oscGain1);
    oscGain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // 3. 상부 목탁 배음
    const osc2 = ctx.createOscillator();
    const oscGain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1260, now);
    oscGain2.gain.setValueAtTime(volume * 0.35, now);
    oscGain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc2.connect(oscGain2);
    oscGain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.13);
  }

  /**
   * 한국 사찰 범종 (에밀레종) 타종 소리 (맥놀이 현상)
   */
  public playBell(volume = 0.9) {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const duration = 7.5;

    const frequencies = [
      { f: 110.0, gain: 0.9, decay: 7.0 },
      { f: 111.4, gain: 0.85, decay: 6.8 }, // 1.4Hz 맥놀이 쌍
      { f: 220.0, gain: 0.45, decay: 5.5 },
      { f: 338.0, gain: 0.35, decay: 4.2 },
      { f: 442.0, gain: 0.28, decay: 3.5 },
      { f: 672.0, gain: 0.18, decay: 2.5 },
      { f: 1180.0, gain: 0.12, decay: 1.6 }
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    const strikeOsc = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    strikeOsc.type = 'triangle';
    strikeOsc.frequency.setValueAtTime(75, now);
    strikeGain.gain.setValueAtTime(volume * 0.8, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    strikeOsc.connect(strikeGain);
    strikeGain.connect(masterGain);
    strikeOsc.start(now);
    strikeOsc.stop(now + 0.25);

    frequencies.forEach(part => {
      const osc = ctx.createOscillator();
      const partGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(part.f, now);

      partGain.gain.setValueAtTime(part.gain, now);
      partGain.gain.exponentialRampToValueAtTime(0.0001, now + part.decay);

      osc.connect(partGain);
      partGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  /**
   * 풍경 소리
   */
  public playWindChime(volume = 0.6) {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const notes = [2150, 2450, 3100, 4200];

    notes.forEach((freq, i) => {
      const delay = i * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(volume * (0.3 / (i + 1)), now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 2.0);
    });
  }

  /**
   * 싱잉볼 소리
   */
  public playSingingBowl(volume = 0.7) {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(4.5, now);
    lfoGain.gain.setValueAtTime(1.8, now);
    lfo.connect(osc.frequency);
    lfo.start(now);

    gain.gain.setValueAtTime(volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 4.8);
    lfo.stop(now + 4.8);
  }

  // ==========================================
  // 불교 음악 & 반야심경 독경 트랙 재생 엔진
  // ==========================================

  public playBuddhistTrack(trackId: BuddhistTrackId, masterVolume = 0.7) {
    this.stopBuddhistMusic();
    const ctx = this.initContext();
    this.currentTrack = trackId;
    this.isMusicPlaying = true;

    const mGain = ctx.createGain();
    mGain.gain.setValueAtTime(0.001, ctx.currentTime);
    mGain.gain.linearRampToValueAtTime(masterVolume, ctx.currentTime + 1.5);
    mGain.connect(ctx.destination);
    this.musicMasterGain = mGain;

    if (trackId === 'sutra') {
      this.startHeartSutraEngine(ctx, mGain);
    } else if (trackId === 'daegeum') {
      this.startDaegeumFluteEngine(ctx, mGain);
    } else if (trackId === 'bell_puja') {
      this.startDawnPujaEngine(ctx, mGain);
    } else if (trackId === 'singing_bowl') {
      this.startSingingBowlEngine(ctx, mGain);
    }

    this.onTrackStatusChange?.(true, trackId);
  }

  public stopBuddhistMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.activeMusicNodes.forEach(node => {
      try {
        if ('stop' in node) {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeMusicNodes = [];

    if (this.musicMasterGain) {
      try {
        this.musicMasterGain.disconnect();
      } catch {
        // ignore
      }
      this.musicMasterGain = null;
    }

    this.isMusicPlaying = false;
    this.currentTrack = null;
    this.onTrackStatusChange?.(false, null);
  }

  public toggleBuddhistMusic(trackId: BuddhistTrackId = 'sutra', masterVolume = 0.7) {
    if (this.isMusicPlaying && this.currentTrack === trackId) {
      this.stopBuddhistMusic();
      return false;
    } else {
      this.playBuddhistTrack(trackId, masterVolume);
      return true;
    }
  }

  public getCurrentMusicStatus() {
    return {
      isPlaying: this.isMusicPlaying,
      trackId: this.currentTrack,
      verseIndex: this.currentVerseIdx
    };
  }

  /**
   * 1. 반야심경 독경 엔진:
   * 승려들의 저음 범음 옴(Om) 드론(130Hz) + 규칙적인 목탁 케이던스 + 실시간 구절 자막 싱크
   */
  private startHeartSutraEngine(ctx: AudioContext, masterGain: GainNode) {
    // A. 지속되는 승려 합송 옴(Om) 드론 (Low Buddhist Chant Drone)
    const droneFreqs = [128, 130.5, 194]; // C3 화음 드론
    droneFreqs.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // 모음 '옴~' 포먼트 필터 (Vowel formant resonant filter)
      const formantFilter = ctx.createBiquadFilter();
      formantFilter.type = 'bandpass';
      formantFilter.frequency.setValueAtTime(450, ctx.currentTime);
      formantFilter.Q.setValueAtTime(4, ctx.currentTime);

      const dGain = ctx.createGain();
      dGain.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(formantFilter);
      formantFilter.connect(dGain);
      dGain.connect(masterGain);

      osc.start();
      this.activeMusicNodes.push(osc, dGain, formantFilter);
    });

    // B. 목탁 타종 & 반야심경 구절 진행 타이머 (약 54 BPM)
    let beat = 0;
    this.currentVerseIdx = 0;
    this.onVerseChange?.(0);

    // 구절 읽기 (Speech Synthesis 지원 시 차분한 스님 보이스 톤)
    this.speakVerse(HEART_SUTRA_VERSES[0].kr);

    const intervalMs = 1100; // 약 1.1초 간격 목탁
    this.musicInterval = setInterval(() => {
      beat++;
      // 목탁 맑은 타종
      this.playMoktak(0.65);

      // 매 5타마다 다음 구절로 전환 & 싱잉볼
      if (beat % 5 === 0) {
        this.currentVerseIdx = (this.currentVerseIdx + 1) % HEART_SUTRA_VERSES.length;
        this.onVerseChange?.(this.currentVerseIdx);
        this.speakVerse(HEART_SUTRA_VERSES[this.currentVerseIdx].kr);

        if (this.currentVerseIdx === 0) {
          // 전 구절 끝나고 새로 시작할 때 종소리
          this.playBell(0.6);
        }
      }
    }, intervalMs);
  }

  /**
   * 한국어 반야심경 스님 낭독 (Web Speech API)
   */
  private speakVerse(text: string) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.72; // 차분하고 느린 독경 템포
      utterance.pitch = 0.7; // 경건한 저음
      utterance.volume = 0.55;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  }

  /**
   * 2. 천년고찰 대금(大琴) 명상곡 엔진:
   * 전통 5음계(G3, Bb3, C4, D4, F4)를 사용해 한국 대금 특유의 갈대청 비브라토와 바람소리 합성
   */
  private startDaegeumFluteEngine(ctx: AudioContext, masterGain: GainNode) {
    // 배경 대숲 바람
    const windBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = windBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(320, ctx.currentTime);
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.18, ctx.currentTime);
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSource.start();
    this.activeMusicNodes.push(windSource, windFilter, windGain);

    // 대금 전통 5음계 주파수 (Pentatonic Pyongjo/Gyemyeonjo Scale)
    const scale = [196, 233.08, 261.63, 293.66, 349.23, 392.0];
    const melody = [0, 1, 2, 3, 2, 1, 4, 3, 2, 0, 1, 2];
    let noteIdx = 0;

    const playFluteNote = () => {
      const now = ctx.currentTime;
      const freq = scale[melody[noteIdx % melody.length]];
      noteIdx++;

      // 대금 기본음 + 미세한 숨소리 (Flute tone with breath vibrato)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // 추성/퇴성 미세 피치 벤딩
      osc.frequency.linearRampToValueAtTime(freq * 1.015, now + 0.6);
      osc.frequency.linearRampToValueAtTime(freq, now + 1.2);

      // 갈대청(Reed) 질감용 오버톤
      const reedOsc = ctx.createOscillator();
      reedOsc.type = 'triangle';
      reedOsc.frequency.setValueAtTime(freq * 2, now);

      const fGain = ctx.createGain();
      fGain.gain.setValueAtTime(0.001, now);
      fGain.gain.linearRampToValueAtTime(0.35, now + 0.25);
      fGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(fGain);
      reedOsc.connect(fGain);
      fGain.connect(masterGain);

      osc.start(now);
      reedOsc.start(now);
      osc.stop(now + 2.4);
      reedOsc.stop(now + 2.4);

      if (Math.random() < 0.35) {
        this.playWindChime(0.25);
      }
    };

    playFluteNote();
    this.musicInterval = setInterval(playFluteNote, 2400);
  }

  /**
   * 3. 새벽 예불과 범종각 엔진
   */
  private startDawnPujaEngine(ctx: AudioContext, masterGain: GainNode) {
    this.playBell(0.8);
    this.playWindChime(0.4);

    this.musicInterval = setInterval(() => {
      this.playBell(0.75);
      setTimeout(() => this.playWindChime(0.35), 4000);
    }, 11000);
  }

  /**
   * 4. 432Hz 치유의 싱잉볼 & 계곡수 엔진
   */
  private startSingingBowlEngine(ctx: AudioContext, masterGain: GainNode) {
    this.playSingingBowl(0.7);

    // 계곡물 배경
    this.toggleAmbient('stream', 0.25);

    this.musicInterval = setInterval(() => {
      this.playSingingBowl(0.65);
    }, 6000);
  }

  // --- 기존 자연음 앰비언트 유지 ---
  public toggleAmbient(type: 'wind' | 'stream' | 'crickets' | 'none', volume = 0.25) {
    const ctx = this.initContext();

    if (this.ambientSourceNode) {
      try {
        if ('stop' in this.ambientSourceNode) {
          (this.ambientSourceNode as AudioScheduledSourceNode).stop();
        }
        this.ambientSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.ambientSourceNode = null;
    }

    if (type === 'none' || this.currentAmbientType === type && this.isAmbientPlaying) {
      this.isAmbientPlaying = false;
      this.currentAmbientType = 'none';
      return false;
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 1.2);
    gainNode.connect(ctx.destination);
    this.ambientGain = gainNode;

    if (type === 'wind' || type === 'stream') {
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = type === 'wind' ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(type === 'wind' ? 420 : 680, now);
      filter.Q.setValueAtTime(type === 'wind' ? 1.2 : 2.5, now);

      noise.connect(filter);
      filter.connect(gainNode);
      noise.start(now);
      this.ambientSourceNode = noise;
    } else if (type === 'crickets') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4800, now);

      const mod = ctx.createOscillator();
      mod.type = 'triangle';
      mod.frequency.setValueAtTime(14, now);

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(0.4, now);

      const tremolo = ctx.createGain();
      mod.connect(tremolo.gain);
      osc.connect(tremolo);
      tremolo.connect(gainNode);

      osc.start(now);
      mod.start(now);
      this.ambientSourceNode = osc;
    }

    this.isAmbientPlaying = true;
    this.currentAmbientType = type;
    return true;
  }
}

export const templeAudio = new TempleAudioEngine();
