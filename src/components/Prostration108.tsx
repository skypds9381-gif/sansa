import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { templeAudio } from '../utils/audio';
import { LittleMonk } from './LittleMonk';
import { PROSTRATION_PRAYERS_SAMPLE } from '../data/dharma';
import { RotateCcw, Award, Play, Pause, ChevronRight } from 'lucide-react';

interface Prostration108Props {
  meritPoints: number;
  addMerit: (pts: number) => void;
}

export const Prostration108: React.FC<Prostration108Props> = ({
  addMerit
}) => {
  const [targetCount, setTargetCount] = useState<number>(3); // 3배, 10배, 108배
  const [currentBows, setCurrentBows] = useState(0);
  const [isBowing, setIsBowing] = useState(false);
  const [isAutoPacing, setIsAutoPacing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const prayerText = PROSTRATION_PRAYERS_SAMPLE[currentBows % PROSTRATION_PRAYERS_SAMPLE.length];

  const handleDoBow = () => {
    if (isBowing || completed) return;

    setIsBowing(true);
    templeAudio.playMoktak(0.8);

    setTimeout(() => {
      templeAudio.playWindChime(0.4);
      setIsBowing(false);

      const nextCount = currentBows + 1;
      setCurrentBows(nextCount);
      addMerit(5); // 1배당 공덕 +5

      if (nextCount >= targetCount) {
        setCompleted(true);
        setIsAutoPacing(false);
        templeAudio.playBell(0.9);
        try {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#f59e0b', '#ef4444', '#10b981', '#6366f1']
          });
        } catch {
          // ignore
        }
      }
    }, 1400);
  };

  // 자동 페이싱 (Auto prostration cadence every 5.5s)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isAutoPacing && !completed) {
      interval = setInterval(() => {
        handleDoBow();
      }, 5500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPacing, completed, currentBows, isBowing]);

  const handleReset = () => {
    setCurrentBows(0);
    setCompleted(false);
    setIsAutoPacing(false);
  };

  const progressPercent = Math.min(100, Math.round((currentBows / targetCount) * 100));

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 sm:p-6 bg-stone-900/90 rounded-3xl border border-amber-900/40 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-widest text-amber-500 font-serif font-bold">
          百 八 拜 (Prostration Practice)
        </span>
        <h2 className="text-2xl font-serif text-amber-100 mt-1">108배 / 삼배 마음 참회</h2>
        <p className="text-xs text-stone-400 mt-1">
          몸을 가장 낮은 곳으로 낮추며, 내 안의 오만과 번뇌를 털어내고 본래의 맑은 마음을 되찾습니다.
        </p>

        {/* 목표 배수 선택 탭 */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[3, 10, 108].map(count => (
            <button
              key={count}
              onClick={() => {
                setTargetCount(count);
                handleReset();
              }}
              className={`px-3 py-1 rounded-xl text-xs font-serif transition ${
                targetCount === count
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {count === 3 ? '삼배 (3배)' : count === 10 ? '십배 (10배)' : '백팔배 (108배)'}
            </button>
          ))}
        </div>
      </div>

      {/* 절하는 동자승 비주얼 스테이지 */}
      <div className="relative w-full py-8 bg-stone-950/80 rounded-2xl border border-stone-800 flex flex-col items-center justify-center">
        {/* 진행률 링 */}
        <div className="relative flex items-center justify-center mb-4">
          <svg className="w-36 h-36 transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="60"
              stroke="#292524"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="72"
              cy="72"
              r="60"
              stroke="#f59e0b"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={377}
              strokeDashoffset={377 - (377 * progressPercent) / 100}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>

          {/* 중앙 동자승 아바타 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <LittleMonk
              gesture={isBowing ? 'bowing' : 'praying'}
              size={56}
              robeColor="#78716c"
              showHalo={completed}
            />
          </div>
        </div>

        {/* 현재 진행 현황 */}
        <div className="text-center">
          <div className="text-2xl font-serif text-amber-200 font-bold">
            {currentBows} <span className="text-sm font-sans font-normal text-stone-400">/ {targetCount}배</span>
          </div>
          <span className="text-xs text-amber-400 font-mono">{progressPercent}% 회향</span>
        </div>

        {/* 이번 배수의 성찰 발원문 */}
        <div className="w-11/12 mt-4 p-3 rounded-xl bg-stone-900/80 border border-amber-900/30 text-center">
          <span className="text-[10px] text-amber-500 font-serif">제 {Math.min(currentBows + 1, targetCount)}배 참회 발원문</span>
          <p className="text-xs sm:text-sm font-serif text-stone-200 mt-1 italic">
            &quot;{prayerText}&quot;
          </p>
        </div>
      </div>

      {/* 완료 축하 카드 */}
      {completed && (
        <div className="w-full mt-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-center animate-fade-in">
          <div className="inline-flex p-2 rounded-full bg-amber-500/20 text-amber-400 mb-1">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif text-amber-100 font-bold">
            {targetCount}배 회향(廻向)을 축원합니다
          </h3>
          <p className="text-xs text-stone-300 mt-1">
            정성껏 숙인 몸과 마음에 무량한 평화와 지혜의 빛이 가득하기를 기원합니다.
          </p>
        </div>
      )}

      {/* 제어 버튼군 */}
      <div className="w-full mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>처음부터</span>
        </button>

        <div className="flex items-center gap-2">
          {!completed && (
            <button
              onClick={() => setIsAutoPacing(!isAutoPacing)}
              className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition ${
                isAutoPacing
                  ? 'bg-amber-900 text-amber-200 border border-amber-700'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              {isAutoPacing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAutoPacing ? '자동 절 멈춤' : '자동 박자 안내'}</span>
            </button>
          )}

          <button
            onClick={handleDoBow}
            disabled={isBowing || completed}
            className={`px-6 py-2.5 rounded-xl font-serif text-sm tracking-wide flex items-center gap-2 shadow-lg transition ${
              isBowing || completed
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold hover:scale-105 active:scale-95'
            }`}
          >
            <span>{isBowing ? '몸을 숙여 절하는 중...' : `${currentBows + 1}번째 절하기`}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
