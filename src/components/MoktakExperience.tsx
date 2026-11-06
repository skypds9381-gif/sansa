import React, { useState, useEffect, useRef } from 'react';
import { templeAudio } from '../utils/audio';
import { Play, Pause, Sparkles, Volume2 } from 'lucide-react';
import { HEART_SUTRA_VERSES } from '../data/dharma';

interface MoktakExperienceProps {
  meritPoints: number;
  addMerit: (pts: number) => void;
}

export const MoktakExperience: React.FC<MoktakExperienceProps> = ({
  meritPoints,
  addMerit
}) => {
  const [tapCount, setTapCount] = useState(0);
  const [isStriking, setIsStriking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [currentSutraIndex, setCurrentSutraIndex] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [floatingMerits, setFloatingMerits] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meritLabels = ['+1 무량공덕(無量功德)', '+1 번뇌 소멸', '+1 자비 공양', '+1 마음 청정', '+1 보리심 발원'];

  const handleStrike = (x?: number, y?: number) => {
    templeAudio.playMoktak(0.85);
    setIsStriking(true);
    setTimeout(() => setIsStriking(false), 90);

    setTapCount(prev => prev + 1);
    addMerit(1);

    const hitX = x ?? 140;
    const hitY = y ?? 140;

    // Ripple visual effect
    const newRipple = {
      id: Date.now() + Math.random(),
      x: hitX,
      y: hitY,
    };
    setRipples(prev => [...prev.slice(-6), newRipple]);

    // Floating Merit Blessing Text
    const label = meritLabels[Math.floor(Math.random() * meritLabels.length)];
    const newMerit = {
      id: Date.now() + Math.random(),
      text: label,
      x: hitX,
      y: hitY,
    };
    setFloatingMerits(prev => [...prev.slice(-5), newMerit]);
  };

  // 스페이스바 단축키 타격 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleStrike();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 자동 목탁 리듬 재생
  useEffect(() => {
    if (autoPlay) {
      const intervalMs = (60 / bpm) * 1000;
      autoPlayRef.current = setInterval(() => {
        handleStrike();
        setCurrentSutraIndex(prev => (prev + 1) % HEART_SUTRA_VERSES.length);
      }, intervalMs);
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlay, bpm]);

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 sm:p-6 bg-stone-900/90 rounded-3xl border border-amber-900/40 shadow-2xl backdrop-blur-md">
      {/* 타이틀 및 공덕 안내 */}
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-widest text-amber-500 font-serif font-bold">
          木 鐸 (Moktak Meditation)
        </span>
        <h2 className="text-2xl font-serif text-amber-100 mt-1">목탁 치며 번뇌 비우기</h2>
        <p className="text-xs text-stone-400 mt-1">
          화면의 목탁을 탭하거나 키보드 <kbd className="px-1.5 py-0.5 bg-stone-800 text-amber-300 rounded border border-stone-700 font-mono text-[11px]">Spacebar</kbd>를 눌러 마음을 모아보세요.
        </p>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="bg-stone-950 px-4 py-1.5 rounded-full border border-stone-800 text-xs text-stone-300">
            오늘 친 횟수: <strong className="text-amber-400 text-sm font-mono">{tapCount}</strong>회
          </div>
          <div className="bg-amber-950/60 px-4 py-1.5 rounded-full border border-amber-800/60 text-xs text-amber-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>총 공덕: <strong className="text-amber-300 font-mono">{meritPoints}</strong>점</span>
          </div>
        </div>
      </div>

      {/* 목탁 일러스트 및 타격 상호작용 캔버스 영역 */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          handleStrike(e.clientX - rect.left, e.clientY - rect.top);
        }}
        className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-amber-950/40 via-stone-950 to-stone-900 border-2 border-amber-700/40 flex items-center justify-center cursor-pointer select-none group shadow-inner overflow-hidden"
      >
        {/* 리플 파동 애니메이션 */}
        {ripples.map(r => (
          <span
            key={r.id}
            className="absolute rounded-full border border-amber-400/60 animate-ping pointer-events-none"
            style={{
              width: 90,
              height: 90,
              left: r.x - 45,
              top: r.y - 45,
              animationDuration: '0.8s'
            }}
          />
        ))}

        {/* 피어오르는 공덕 축원 문구 (Floating Merit Blessings) */}
        {floatingMerits.map(m => (
          <span
            key={m.id}
            className="absolute text-xs font-serif font-bold text-amber-300 drop-shadow-[0_0_8px_#f59e0b] pointer-events-none animate-bounce"
            style={{
              left: Math.max(20, Math.min(220, m.x - 40)),
              top: Math.max(30, m.y - 30),
              animationDuration: '1.2s'
            }}
          >
            {m.text}
          </span>
        ))}

        {/* 목탁 SVG */}
        <div className={`relative transition-transform duration-75 ${isStriking ? 'scale-95 rotate-1' : 'scale-100 group-hover:scale-105'}`}>
          <svg width="220" height="220" viewBox="0 0 200 200">
            <defs>
              <radialGradient id="woodGradient" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="45%" stopColor="#92400e" />
                <stop offset="85%" stopColor="#451a03" />
                <stop offset="100%" stopColor="#291102" />
              </radialGradient>
              <radialGradient id="glowHighlight" cx="30%" cy="25%" r="35%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 목탁 그림자 */}
            <ellipse cx="100" cy="180" rx="60" ry="12" fill="rgba(0,0,0,0.5)" />

            {/* 목탁 둥근 물고기 몸체 (대추나무/박달나무 질감의 목탁) */}
            <circle cx="100" cy="100" r="75" fill="url(#woodGradient)" stroke="#78350f" strokeWidth="3" />
            <circle cx="100" cy="100" r="75" fill="url(#glowHighlight)" />

            {/* 목탁 손잡이 (꼬리 부분) */}
            <path
              d="M 32 100 C 15 88, 15 112, 32 100 Z"
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="2"
            />
            {/* 손잡이 구멍 */}
            <circle cx="34" cy="100" r="7" fill="#1c1917" />

            {/* 목탁 소리 구멍 (물고기 입 형상) */}
            <path
              d="M 80 85 Q 155 85 160 100 Q 155 115 80 115 Q 120 100 80 85 Z"
              fill="#1c1917"
              stroke="#291102"
              strokeWidth="2"
            />

            {/* 목탁 나무 결 & 조각선 */}
            <path d="M 60 70 Q 100 60 140 70" stroke="#78350f" strokeWidth="2" fill="none" opacity="0.6" />
            <path d="M 60 130 Q 100 140 140 130" stroke="#78350f" strokeWidth="2" fill="none" opacity="0.6" />
          </svg>

          {/* 목탁채 (Striking Stick) */}
          <div
            className={`absolute -right-6 top-8 transition-transform duration-100 origin-bottom-right pointer-events-none ${
              isStriking ? 'rotate-[-35deg] translate-y-3' : 'rotate-[-10deg]'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-stone-100 border border-stone-400 shadow-md" />
            <div className="w-2.5 h-28 bg-amber-800 rounded-sm mx-auto shadow" />
          </div>
        </div>

        {/* 안내 텍스트 오버레이 */}
        <div className="absolute bottom-4 text-center pointer-events-none">
          <span className="text-[11px] text-amber-300/80 bg-stone-900/80 px-2.5 py-1 rounded-full border border-stone-800">
            클릭하여 목탁 치기
          </span>
        </div>
      </div>

      {/* 반야심경 독경 자막 싱크 (목탁 칠 때마다 맑게 이어지는 한 구절) */}
      <div className="w-full mt-6 p-4 rounded-2xl bg-stone-950/80 border border-amber-900/30 text-center">
        <span className="text-[11px] text-amber-400/80 font-serif">반야심경 (般若心經) 한 구절</span>
        <p className="font-serif text-lg text-amber-100 font-semibold mt-1">
          {HEART_SUTRA_VERSES[currentSutraIndex].kr}
        </p>
        <p className="text-xs text-amber-400/70 font-serif mt-0.5">
          {HEART_SUTRA_VERSES[currentSutraIndex].hanja}
        </p>
        <p className="text-xs text-stone-300 mt-2 font-sans">
          {HEART_SUTRA_VERSES[currentSutraIndex].meaning}
        </p>
      </div>

      {/* 자동 목탁 재생 및 템포 조절기 */}
      <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-950/50 rounded-xl border border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              autoPlay
                ? 'bg-amber-600 text-stone-950'
                : 'bg-stone-800 hover:bg-stone-700 text-amber-200'
            }`}
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoPlay ? '자동 목탁 일시정지' : '자동 목탁 (독경 템포)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>속도:</span>
          {[45, 60, 75].map(val => (
            <button
              key={val}
              onClick={() => setBpm(val)}
              className={`px-2 py-0.5 rounded text-xs transition ${
                bpm === val ? 'bg-amber-800 text-amber-100 font-bold' : 'bg-stone-800 text-stone-400'
              }`}
            >
              {val} BPM
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
