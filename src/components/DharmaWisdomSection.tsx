import React, { useState } from 'react';
import { DHARMA_QUOTES, HEART_SUTRA_VERSES } from '../data/dharma';
import { DharmaQuote } from '../types';
import { templeAudio } from '../utils/audio';
import { Sparkles, ScrollText, BookOpen } from 'lucide-react';

export const DharmaWisdomSection: React.FC = () => {
  const [selectedQuote, setSelectedQuote] = useState<DharmaQuote | null>(DHARMA_QUOTES[0]);
  const [isShaking, setIsShaking] = useState(false);
  const [viewMode, setViewMode] = useState<'quote' | 'sutra'>('quote');

  const handleDrawFortune = () => {
    if (isShaking) return;
    setIsShaking(true);
    templeAudio.playMoktak(0.6);

    setTimeout(() => {
      templeAudio.playMoktak(0.7);
    }, 150);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * DHARMA_QUOTES.length);
      setSelectedQuote(DHARMA_QUOTES[randomIndex]);
      setIsShaking(false);
      templeAudio.playWindChime(0.6);
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 탭 토글 */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setViewMode('quote')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-serif transition ${
            viewMode === 'quote'
              ? 'bg-amber-600 text-stone-950 font-bold shadow'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>오늘의 법어 뽑기 (산통)</span>
        </button>
        <button
          onClick={() => setViewMode('sutra')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-serif transition ${
            viewMode === 'sutra'
              ? 'bg-amber-600 text-stone-950 font-bold shadow'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>반야심경 전문 독경</span>
        </button>
      </div>

      {viewMode === 'quote' ? (
        <div className="bg-stone-900/90 rounded-3xl p-6 sm:p-8 border border-amber-900/40 shadow-2xl backdrop-blur-md flex flex-col items-center">
          <div className="text-center mb-6">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-serif font-bold">
              法 語 籤 (Dharma Stick of Wisdom)
            </span>
            <h2 className="text-2xl font-serif text-amber-100 mt-1">대나무 산통 흔들어 법어 뽑기</h2>
            <p className="text-xs text-stone-400 mt-1">
              마음이 복잡하거나 답을 찾고 싶을 때, 부처님과 고승들의 맑은 지혜 한 구절을 마주해보세요.
            </p>
          </div>

          {/* 대나무 점괘통 (Bamboo Shaker) */}
          <div className="my-4 flex flex-col items-center">
            <div
              onClick={handleDrawFortune}
              className={`cursor-pointer group flex flex-col items-center transition-transform ${
                isShaking ? 'animate-bounce rotate-3' : 'hover:scale-105'
              }`}
            >
              {/* 대나무 통 */}
              <div className="w-20 h-36 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 rounded-t-md rounded-b-2xl border-2 border-amber-600/60 shadow-2xl relative overflow-hidden flex flex-col items-center justify-start pt-2">
                {/* 대나무 마디 라인 */}
                <div className="w-full h-1 bg-amber-950/70 my-3" />
                <div className="w-full h-1 bg-amber-950/70 my-3" />

                {/* 한자 표시 */}
                <span className="font-serif text-xs text-amber-200/90 font-bold writing-mode-vertical">
                  佛法
                </span>

                {/* 튀어나오는 점괘 스틱 */}
                <div className={`absolute top-0 w-3 h-16 bg-amber-200 border border-amber-600 rounded-t transition-transform duration-300 ${
                  isShaking ? '-translate-y-6' : '-translate-y-2 group-hover:-translate-y-4'
                }`}>
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full mx-auto mt-1" />
                </div>
              </div>

              <span className="mt-3 text-xs text-amber-300 bg-stone-950 px-3 py-1 rounded-full border border-stone-800">
                {isShaking ? '산통 흔드는 중...' : '산통 흔들기 (클릭)'}
              </span>
            </div>
          </div>

          {/* 뽑힌 법어 카드 */}
          {selectedQuote && (
            <div className="w-full mt-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-stone-950 to-stone-900 border-2 border-amber-700/50 shadow-xl text-center relative overflow-hidden">
              <div className="absolute top-3 left-4 text-[10px] text-amber-400 font-serif border border-amber-700/40 px-2 py-0.5 rounded-full">
                {selectedQuote.category}
              </div>

              {selectedQuote.hanja && (
                <p className="font-serif text-xs sm:text-sm text-amber-500/80 tracking-widest mb-3">
                  {selectedQuote.hanja}
                </p>
              )}

              <blockquote className="font-serif text-lg sm:text-xl text-amber-100 font-medium leading-relaxed my-4">
                &quot;{selectedQuote.quote}&quot;
              </blockquote>

              <p className="text-xs text-amber-300 font-serif font-semibold">
                — {selectedQuote.author}
              </p>

              <div className="mt-4 pt-4 border-t border-stone-800/80 text-xs text-stone-300 font-sans leading-relaxed">
                {selectedQuote.explanation}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 반야심경 전문 독경 뷰 */
        <div className="bg-stone-900/90 rounded-3xl p-6 sm:p-8 border border-amber-900/40 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-serif font-bold">
              摩 訶 般 若 波 羅 蜜 多 心 經
            </span>
            <h2 className="text-2xl font-serif text-amber-100 mt-1">반야바라밀다심경 (般若心經)</h2>
            <p className="text-xs text-stone-400 mt-1">
              불교 600권 대반야경의 핵심 요체를 260자로 압축한 최고의 지혜서
            </p>
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
            {HEART_SUTRA_VERSES.map((verse, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-amber-700/40 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-serif text-amber-400 font-bold">{verse.kr}</span>
                  <span className="text-[10px] text-stone-500">{idx + 1}절</span>
                </div>
                <p className="text-xs font-serif text-amber-300/70 mb-2">{verse.hanja}</p>
                <p className="text-xs text-stone-300 leading-relaxed font-sans">{verse.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
