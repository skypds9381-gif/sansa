import React, { useState } from 'react';
import { templeAudio } from '../utils/audio';
import { Bell, Sparkles } from 'lucide-react';

interface TempleBellExperienceProps {
  meritPoints: number;
  addMerit: (pts: number) => void;
}

export const TempleBellExperience: React.FC<TempleBellExperienceProps> = ({
  meritPoints,
  addMerit
}) => {
  const [isStriking, setIsStriking] = useState(false);
  const [bellRings, setBellRings] = useState(0);
  const [waveScale, setWaveScale] = useState(false);

  const handleStrikeBell = () => {
    if (isStriking) return;
    setIsStriking(true);

    // 당목 타격 시점
    setTimeout(() => {
      templeAudio.playBell(0.95);
      setBellRings(prev => prev + 1);
      addMerit(10); // 타종은 큰 공덕 +10
      setWaveScale(true);
      setTimeout(() => setWaveScale(false), 2500);
    }, 280);

    setTimeout(() => {
      setIsStriking(false);
    }, 1800);
  };

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 sm:p-6 bg-stone-900/90 rounded-3xl border border-amber-900/40 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-widest text-amber-500 font-serif font-bold">
          梵 鐘 (Sacred Temple Bell)
        </span>
        <h2 className="text-2xl font-serif text-amber-100 mt-1">범종각 타종 (에밀레종 맥놀이)</h2>
        <p className="text-xs text-stone-300 mt-1">
          &quot;원컨대 이 종소리 널리 퍼져 철위산의 어두운 지옥까지 밝히옵고, 모든 중생이 고통을 여의어지이다.&quot;
        </p>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="bg-stone-950 px-4 py-1.5 rounded-full border border-stone-800 text-xs text-stone-300">
            총 타종: <strong className="text-amber-400 font-mono text-sm">{bellRings}</strong>회
          </div>
          <div className="bg-amber-950/60 px-4 py-1.5 rounded-full border border-amber-800/60 text-xs text-amber-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>총 공덕: <strong className="text-amber-300 font-mono">{meritPoints}</strong>점</span>
          </div>
        </div>
      </div>

      {/* 범종각 및 청동 대종 일러스트 */}
      <div className="relative w-80 h-96 sm:w-96 sm:h-[420px] rounded-3xl bg-gradient-to-b from-stone-950 via-stone-900 to-amber-950/40 border border-amber-800/30 flex flex-col items-center justify-center overflow-hidden">
        {/* 음파 진동 링 (Acoustic Wave) */}
        {waveScale && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full border-2 border-amber-400/60 animate-ping" style={{ animationDuration: '2.5s' }} />
            <div className="w-64 h-64 rounded-full border border-amber-300/40 animate-ping" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }} />
          </div>
        )}

        {/* 범종각 기둥 및 처마 */}
        <div className="absolute top-0 w-full h-8 bg-gradient-to-r from-red-900 via-amber-900 to-emerald-950 border-b border-amber-600/40 flex justify-around">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-3 h-full bg-emerald-800/60 rotate-45 origin-top border-r border-amber-500/30" />
          ))}
        </div>

        {/* 종을 매단 용뉴(龍紐)와 쇠사슬 */}
        <div className="flex flex-col items-center mb-[-8px] z-10">
          <div className="w-1.5 h-12 bg-stone-500 shadow" />
          {/* 용뉴 장식 */}
          <div className="w-10 h-6 bg-gradient-to-r from-amber-700 to-yellow-600 rounded-t-full border border-amber-500 flex items-center justify-center shadow">
            <div className="w-3 h-2 bg-amber-950 rounded-full" />
          </div>
        </div>

        {/* 청동 대종 본체 */}
        <div className={`relative transition-transform duration-300 ${waveScale ? 'scale-105' : 'scale-100'}`}>
          <svg width="200" height="230" viewBox="0 0 200 230">
            <defs>
              <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#451a03" />
                <stop offset="25%" stopColor="#78350f" />
                <stop offset="50%" stopColor="#b45309" />
                <stop offset="75%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#291102" />
              </linearGradient>
            </defs>

            {/* 종 외형 곡선 (한국 종 고유의 배흘림 곡선) */}
            <path
              d="M 45 30 C 50 15, 150 15, 155 30 C 160 80, 175 160, 185 200 C 140 215, 60 215, 15 200 C 25 160, 40 80, 45 30 Z"
              fill="url(#bronzeGradient)"
              stroke="#d97706"
              strokeWidth="2.5"
            />

            {/* 상대(上帶) 문양 띠 */}
            <path d="M 46 45 C 80 40, 120 40, 154 45" stroke="#f59e0b" strokeWidth="6" fill="none" opacity="0.8" />

            {/* 연곽(蓮廓)과 연화 9좌 유두 (Nipples of the Bell) */}
            <rect x="58" y="60" width="35" height="35" rx="3" fill="#78350f" stroke="#f59e0b" strokeWidth="1" opacity="0.8" />
            <rect x="108" y="60" width="35" height="35" rx="3" fill="#78350f" stroke="#f59e0b" strokeWidth="1" opacity="0.8" />
            {/* 유두 점들 */}
            {[0, 1, 2].map(row =>
              [0, 1, 2].map(col => (
                <circle key={`${row}-${col}`} cx={64 + col * 11} cy={66 + row * 11} r="2" fill="#fde68a" />
              ))
            )}

            {/* 비천상(飛天像) 구름을 타며 악기를 연주하는 천인 조각 */}
            <path
              d="M 95 120 Q 80 145 105 155 Q 120 135 100 120 Z"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.8"
              opacity="0.8"
            />
            <path d="M 85 135 Q 70 140 60 130" stroke="#fde68a" strokeWidth="1.5" fill="none" opacity="0.7" />

            {/* 당좌(撞座) - 타격 지점 연꽃 문양 */}
            <circle cx="100" cy="180" r="14" fill="#92400e" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="100" cy="180" r="7" fill="#fbbf24" />

            {/* 하대(下帶) 문양 띠 */}
            <path d="M 20 200 C 60 212, 140 212, 180 200" stroke="#f59e0b" strokeWidth="8" fill="none" opacity="0.8" />
          </svg>
        </div>

        {/* 당목(撞木 - 통나무 타종봉) */}
        <div
          className={`absolute left-2 top-1/2 -translate-y-8 flex items-center transition-all duration-300 z-20 ${
            isStriking ? 'translate-x-32 rotate-6' : 'translate-x-0 rotate-0'
          }`}
        >
          {/* 굵은 통나무 당목 */}
          <div className="w-32 h-8 rounded-r-full bg-gradient-to-r from-amber-950 via-stone-800 to-amber-700 border border-stone-600 shadow-2xl flex items-center justify-end pr-2">
            <div className="w-2 h-6 bg-red-800 rounded-sm" />
          </div>
          {/* 매단 밧줄 */}
          <div className="absolute left-8 -top-24 w-1 h-24 bg-stone-400" />
          <div className="absolute left-24 -top-24 w-1 h-24 bg-stone-400" />
        </div>
      </div>

      {/* 타종 버튼 */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={handleStrikeBell}
          disabled={isStriking}
          className={`px-8 py-3.5 rounded-2xl font-serif text-base tracking-wider flex items-center gap-2 shadow-xl transition-all duration-200 ${
            isStriking
              ? 'bg-amber-950 text-amber-500 cursor-not-allowed border border-amber-900'
              : 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-bold hover:scale-105 active:scale-95 border border-amber-400/50'
          }`}
        >
          <Bell className="w-5 h-5 text-stone-950 fill-stone-950" />
          <span>{isStriking ? '장엄한 범종이 울리는 중...' : '범종 타종하기 (당목 당기기)'}</span>
        </button>

        <p className="text-[11px] text-stone-400">
          * 실제 한국 성덕대왕신종의 고유 음향인 1.4Hz &apos;맥놀이(Acoustic Beating)&apos;를 Web Audio API로 정밀 합성했습니다.
        </p>
      </div>
    </div>
  );
};
