import React, { useState } from 'react';
import { templeAudio } from '../utils/audio';
import { RotateCcw, Sparkles } from 'lucide-react';

interface PrayerBeadsProps {
  meritPoints: number;
  addMerit: (pts: number) => void;
}

const MANTRAS = [
  '나무아미타불 (南無阿彌陀佛)',
  '관세음보살 (觀世音菩薩)',
  '옴 마니 반메 훔 (Om Mani Padme Hum)',
  '지금 이 순간, 평화롭습니다',
  '내 안의 분별과 집착을 내려놓습니다'
];

export const PrayerBeads: React.FC<PrayerBeadsProps> = ({
  meritPoints,
  addMerit
}) => {
  const [beadIndex, setBeadIndex] = useState(0);
  const [currentMantraIndex, setCurrentMantraIndex] = useState(0);

  const handleRollBead = () => {
    templeAudio.playMoktak(0.6);
    const next = (beadIndex + 1) % 108;
    setBeadIndex(next);
    addMerit(1);

    if (next % 10 === 0) {
      setCurrentMantraIndex(prev => (prev + 1) % MANTRAS.length);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 sm:p-6 bg-stone-900/90 rounded-3xl border border-amber-900/40 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-widest text-amber-500 font-serif font-bold">
          念 珠 (Buddhist Prayer Beads)
        </span>
        <h2 className="text-2xl font-serif text-amber-100 mt-1">108 염주 굴리기</h2>
        <p className="text-xs text-stone-400 mt-1">
          염주알을 하나씩 손끝으로 굴리듯 누르며, 한 번의 호흡과 한 번의 염불로 마음을 모읍니다.
        </p>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="bg-stone-950 px-4 py-1.5 rounded-full border border-stone-800 text-xs text-stone-300">
            굴린 염주알: <strong className="text-amber-400 font-mono text-sm">{beadIndex}</strong> / 108개
          </div>
          <div className="bg-amber-950/60 px-4 py-1.5 rounded-full border border-amber-800/60 text-xs text-amber-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>총 공덕: <strong className="text-amber-300 font-mono">{meritPoints}</strong>점</span>
          </div>
        </div>
      </div>

      {/* 둥근 염주 원형 시각화 */}
      <div
        onClick={handleRollBead}
        className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-stone-950/70 border border-amber-900/30 flex items-center justify-center cursor-pointer select-none group"
      >
        {/* 원형으로 배치된 36개의 염주알 (108개 상징) */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * (360 / 36)) * (Math.PI / 180);
          const radius = 110;
          const x = 140 + radius * Math.cos(angle);
          const y = 140 + radius * Math.sin(angle);
          const isActive = i <= (beadIndex % 36);
          const isCurrent = i === (beadIndex % 36);

          return (
            <div
              key={i}
              className={`absolute rounded-full transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2 ${
                isCurrent
                  ? 'w-6 h-6 bg-amber-400 border-2 border-yellow-200 shadow-[0_0_12px_#fbbf24] scale-125'
                  : isActive
                  ? 'w-4 h-4 bg-amber-700 border border-amber-500'
                  : 'w-3.5 h-3.5 bg-stone-800 border border-stone-700 opacity-60'
              }`}
              style={{ left: `${x}px`, top: `${y}px` }}
            />
          );
        })}

        {/* 중앙 모주(母珠) 및 염불 만트라 카드 */}
        <div className="text-center p-4 max-w-[200px] z-10">
          <span className="text-[10px] text-amber-500 font-serif">마음 챙김 한 구절</span>
          <p className="font-serif text-sm sm:text-base text-amber-100 font-semibold mt-1">
            {MANTRAS[currentMantraIndex]}
          </p>
          <span className="inline-block mt-3 px-3 py-1 bg-amber-950/70 text-amber-300 text-[11px] rounded-full border border-amber-800/50 group-hover:bg-amber-800 transition">
            염주 굴리기 (클릭)
          </span>
        </div>
      </div>

      {/* 리셋 버튼 */}
      <div className="mt-6">
        <button
          onClick={() => {
            setBeadIndex(0);
            templeAudio.playWindChime(0.4);
          }}
          className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>염주 처음부터 굴리기</span>
        </button>
      </div>
    </div>
  );
};
