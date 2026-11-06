import React, { useState, useEffect } from 'react';
import { LittleMonk } from './LittleMonk';
import { AvatarGesture, Pilgrim } from '../types';
import { templeAudio } from '../utils/audio';
import { Sparkles, Heart, Clock, UserCheck, Flame } from 'lucide-react';

interface MainSanctuaryProps {
  userPilgrim: Pilgrim;
  setUserPilgrim: React.Dispatch<React.SetStateAction<Pilgrim>>;
  onOpenMoktak: () => void;
  onOpenLanterns: () => void;
  onOpenBows: () => void;
  meritPoints: number;
  addMerit: (pts: number) => void;
}

// 초기 도반들 (Silent Fellow Pilgrims)
const INITIAL_PILGRIMS: Pilgrim[] = [
  { id: 'p1', name: '청안(淸眼)', robeColor: '#78716c', cushionIndex: 2, gesture: 'sitting', meditationMinutes: 24 },
  { id: 'p2', name: '연화(蓮花)', robeColor: '#a8a29e', cushionIndex: 5, gesture: 'praying', meditationMinutes: 12 },
  { id: 'p3', name: '적멸(寂滅)', robeColor: '#57534e', cushionIndex: 9, gesture: 'sitting', meditationMinutes: 45 },
  { id: 'p4', name: '자비(慈悲)', robeColor: '#d97706', cushionIndex: 14, gesture: 'sitting', meditationMinutes: 31 },
  { id: 'p5', name: '도연(道然)', robeColor: '#78716c', cushionIndex: 18, gesture: 'praying', meditationMinutes: 8 },
  { id: 'p6', name: '운수(雲水)', robeColor: '#44403c', cushionIndex: 21, gesture: 'sitting', meditationMinutes: 52 },
  { id: 'p7', name: '보리(菩提)', robeColor: '#a8a29e', cushionIndex: 26, gesture: 'sitting', meditationMinutes: 19 },
];

export const MainSanctuary: React.FC<MainSanctuaryProps> = ({
  userPilgrim,
  setUserPilgrim,
  onOpenMoktak,
  onOpenLanterns,
  onOpenBows,
  meritPoints,
  addMerit
}) => {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>(INITIAL_PILGRIMS);
  const [meditationSeconds, setMeditationSeconds] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [incenseActive, setIncenseActive] = useState(true);

  // 총 방석 개수 (30개 그리드: 5줄 x 6개)
  const TOTAL_CUSHIONS = 30;

  // 좌선 타이머 및 호흡 가이드
  useEffect(() => {
    const timer = setInterval(() => {
      setMeditationSeconds(prev => {
        const next = prev + 1;
        if (next % 30 === 0) {
          addMerit(5); // 30초 명상마다 공덕 +5
        }
        return next;
      });
    }, 1000);

    const breathTimer = setInterval(() => {
      setBreathPhase(prev => {
        if (prev === 'in') return 'hold';
        if (prev === 'hold') return 'out';
        return 'in';
      });
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(breathTimer);
    };
  }, [addMerit]);

  const handleSelectCushion = (index: number) => {
    // 이미 다른 도반이 앉아있는지 확인
    const occupied = pilgrims.find(p => p.cushionIndex === index);
    if (occupied) return;

    templeAudio.playWindChime(0.4);
    setUserPilgrim(prev => ({
      ...prev,
      cushionIndex: index
    }));
    addMerit(2);
  };

  const handleChangeGesture = (gesture: AvatarGesture) => {
    if (gesture === 'bowing') {
      templeAudio.playMoktak(0.7);
      addMerit(3);
    } else if (gesture === 'praying') {
      templeAudio.playWindChime(0.5);
      addMerit(1);
    }
    setUserPilgrim(prev => ({ ...prev, gesture }));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}분 ${s < 10 ? '0' : ''}${s}초`;
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-stone-950 via-stone-900 to-amber-950/40 border border-amber-900/30 shadow-2xl p-4 sm:p-6 md:p-8">
      {/* 사찰 단청 처마 장식 상단 */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-red-800 via-emerald-800 to-amber-700 opacity-80 border-b border-amber-500/30 flex justify-around overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-6 h-full bg-emerald-700/60 rotate-45 transform origin-top border-r border-amber-400/40" />
        ))}
      </div>

      {/* 중앙 불단 및 부처님 상 (Altar Section) */}
      <div className="flex flex-col items-center justify-center pt-6 pb-8 border-b border-stone-800/80 relative">
        {/* 은은한 부처님 광배 후광 */}
        <div className="absolute w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* 연등 걸이 줄 (Lotus Lanterns hanging above) */}
        <div className="w-full flex justify-between items-center px-4 mb-4 opacity-90">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
          <div className="flex gap-4 sm:gap-8 px-4">
            <span className="cursor-pointer hover:scale-110 transition transform text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]" onClick={onOpenLanterns} title="연등 달기">🪷</span>
            <span className="cursor-pointer hover:scale-110 transition transform text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]" onClick={onOpenLanterns} title="연등 달기">🪷</span>
            <span className="cursor-pointer hover:scale-110 transition transform text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.6)]" onClick={onOpenLanterns} title="연등 달기">🪷</span>
            <span className="cursor-pointer hover:scale-110 transition transform text-purple-300 drop-shadow-[0_0_8px_rgba(216,180,254,0.6)]" onClick={onOpenLanterns} title="연등 달기">🪷</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
        </div>

        {/* 대웅전 현판 */}
        <div className="bg-stone-900 border-2 border-amber-600/70 rounded-md px-6 py-1 mb-4 shadow-lg">
          <span className="font-serif text-amber-200 tracking-[0.35em] text-sm sm:text-base font-bold">
            大 雄 殿 (대웅전)
          </span>
        </div>

        {/* 부처님 불상 (Golden Buddha Silhouette with peaceful aura) */}
        <div className="relative group flex flex-col items-center">
          <div className="w-28 h-28 sm:w-36 sm:h-36 relative flex items-center justify-center">
            {/* 후광 링 */}
            <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-pulse bg-gradient-to-b from-amber-500/10 to-transparent" />
            <div className="absolute inset-2 rounded-full border border-amber-400/20" />

            {/* 금동불상 SVG */}
            <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              {/* 연화대좌 (Lotus Throne) */}
              <ellipse cx="50" cy="85" rx="35" ry="10" fill="#92400e" stroke="#f59e0b" strokeWidth="1" />
              <path d="M 20 85 Q 35 76 50 82 Q 65 76 80 85 Z" fill="#d97706" />

              {/* 가부좌 몸체 */}
              <path d="M 26 78 C 24 60, 36 48, 50 48 C 64 48, 76 60, 74 78 Z" fill="#f59e0b" />
              {/* 법의 주름 */}
              <path d="M 36 54 Q 50 68 64 56" stroke="#b45309" strokeWidth="2" fill="none" />
              <path d="M 32 64 Q 50 78 68 66" stroke="#b45309" strokeWidth="1.8" fill="none" />

              {/* 항마촉지인 수인 (Mudrā Hands) */}
              <circle cx="50" cy="67" r="4.5" fill="#fde68a" />
              <path d="M 46 68 L 54 68" stroke="#b45309" strokeWidth="1" />

              {/* 부처님 머리 및 육계 */}
              <circle cx="50" cy="34" r="14" fill="#fbbf24" />
              {/* 나발 머리카락/육계 (Topknot) */}
              <circle cx="50" cy="20" r="5" fill="#d97706" />
              {/* 백호 */}
              <circle cx="50" cy="29" r="1.5" fill="#ef4444" />
              {/* 자비로운 눈 */}
              <path d="M 43 33 Q 46 36 48 33" stroke="#78350f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 52 33 Q 54 36 57 33" stroke="#78350f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 48 38 Q 50 40 52 38" stroke="#78350f" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          {/* 향로와 촛대 (Candles and Incense Burner) */}
          <div className="flex items-center gap-6 sm:gap-12 mt-2">
            {/* 좌측 촛불 */}
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-3 bg-amber-400 rounded-full animate-bounce blur-[0.5px] shadow-[0_0_8px_#f59e0b]" />
              <div className="w-1.5 h-7 bg-red-800 rounded-sm" />
              <div className="w-5 h-1.5 bg-amber-700 rounded-sm" />
            </div>

            {/* 중앙 향로 (Incense burner with smoke) */}
            <div 
              onClick={() => {
                setIncenseActive(!incenseActive);
                templeAudio.playWindChime(0.4);
              }}
              className="cursor-pointer group flex flex-col items-center relative"
              title="향을 끄거나 다시 피웁니다"
            >
              {incenseActive && (
                <div className="absolute -top-7 flex flex-col items-center pointer-events-none">
                  {/* 연기 애니메이션 */}
                  <div className="w-1.5 h-8 bg-gradient-to-t from-stone-400/60 to-transparent blur-sm rounded-full animate-pulse transform -rotate-3" />
                  <div className="w-1 h-1 rounded-full bg-orange-500 animate-ping" />
                </div>
              )}
              <div className="w-8 h-4 bg-stone-800 border border-amber-600/50 rounded-b-lg shadow-inner flex items-center justify-center">
                <div className="w-1 h-2 bg-amber-700" />
              </div>
              <span className="text-[10px] text-amber-200/60 mt-1">
                {incenseActive ? '피어오르는 향' : '향 피우기 (클릭)'}
              </span>
            </div>

            {/* 우측 촛불 */}
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-3 bg-amber-400 rounded-full animate-bounce blur-[0.5px] shadow-[0_0_8px_#f59e0b]" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-7 bg-red-800 rounded-sm" />
              <div className="w-5 h-1.5 bg-amber-700 rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* 실시간 상태 안내 배너 (산사의 철학: 대화 없는 공존) */}
      <div className="my-4 px-4 py-2.5 rounded-xl bg-stone-900/60 border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>현재 법당에 <strong>{pilgrims.length + 1}명</strong>의 도반이 함께 고요히 정진 중입니다.</span>
        </div>
        <div className="flex items-center gap-4 text-stone-400">
          <span className="flex items-center gap-1 text-amber-200">
            <Clock className="w-3.5 h-3.5" />
            머문 시간: {formatTime(meditationSeconds)}
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            쌓인 공덕: {meritPoints}점
          </span>
        </div>
      </div>

      {/* 방석(座蒲) 그리드 - 대청마루 바닥 */}
      <div className="bg-stone-950/70 p-4 sm:p-6 rounded-2xl border border-stone-800/80 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-serif text-amber-100 flex items-center gap-2">
            <span>대청마루 참선 방석</span>
            <span className="text-xs text-stone-400 font-sans font-normal">(빈 방석을 클릭하여 앉을 수 있습니다)</span>
          </h3>

          {/* 나의 현재 자세 변경 바 */}
          <div className="flex items-center gap-1.5 bg-stone-900 px-2 py-1 rounded-xl border border-stone-800">
            <span className="text-[11px] text-stone-400 mr-1">나의 자세:</span>
            <button
              onClick={() => handleChangeGesture('sitting')}
              className={`px-2 py-0.5 rounded text-xs transition ${
                userPilgrim.gesture === 'sitting' ? 'bg-amber-700 text-amber-50 font-medium' : 'text-stone-300 hover:text-white'
              }`}
            >
              좌선
            </button>
            <button
              onClick={() => handleChangeGesture('praying')}
              className={`px-2 py-0.5 rounded text-xs transition ${
                userPilgrim.gesture === 'praying' ? 'bg-amber-700 text-amber-50 font-medium' : 'text-stone-300 hover:text-white'
              }`}
            >
              합장
            </button>
            <button
              onClick={() => handleChangeGesture('bowing')}
              className={`px-2 py-0.5 rounded text-xs transition ${
                userPilgrim.gesture === 'bowing' ? 'bg-amber-700 text-amber-50 font-medium' : 'text-stone-300 hover:text-white'
              }`}
            >
              절하기
            </button>
          </div>
        </div>

        {/* 방석 매트릭스 (Grid of Cushions) */}
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 sm:gap-4 md:gap-5 justify-items-center">
          {Array.from({ length: TOTAL_CUSHIONS }).map((_, index) => {
            const isUserHere = userPilgrim.cushionIndex === index;
            const pilgrimHere = pilgrims.find(p => p.cushionIndex === index);

            return (
              <div
                key={index}
                onClick={() => handleSelectCushion(index)}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ${
                  isUserHere
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-950 bg-amber-950/50 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                    : pilgrimHere
                    ? 'bg-stone-900/60 border border-stone-800'
                    : 'bg-stone-900/30 border border-stone-800/50 hover:bg-amber-950/30 hover:border-amber-600/50'
                }`}
              >
                {/* 방석 연화 문양 배경 */}
                <div className="absolute inset-1 rounded-xl border border-stone-800/40 pointer-events-none flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full border border-stone-700/30" />
                </div>

                {/* 내 동자승 아바타 */}
                {isUserHere && (
                  <div className="relative z-10">
                    <LittleMonk
                      gesture={userPilgrim.gesture}
                      robeColor={userPilgrim.robeColor}
                      size={46}
                      showHalo={true}
                      name="나 (정진중)"
                    />
                  </div>
                )}

                {/* 함께 정진하는 도반 아바타 */}
                {!isUserHere && pilgrimHere && (
                  <div className="relative z-10">
                    <LittleMonk
                      gesture={pilgrimHere.gesture}
                      robeColor={pilgrimHere.robeColor}
                      size={42}
                      name={pilgrimHere.name}
                      statusText={`${pilgrimHere.meditationMinutes}분째 참선 중`}
                    />
                  </div>
                )}

                {/* 빈 방석일 때의 은은한 안내 */}
                {!isUserHere && !pilgrimHere && (
                  <span className="text-[11px] text-stone-600 select-none group-hover:text-amber-400/60 transition">
                    방석 {index + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 호흡 명상 가이드 띠 (Mindful Breathing Bar) */}
      <div className="mt-6 p-4 rounded-2xl bg-stone-900/70 border border-amber-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full border-2 transition-all duration-1000 flex items-center justify-center ${
            breathPhase === 'in'
              ? 'scale-125 border-emerald-400 bg-emerald-500/20 shadow-[0_0_12px_#34d399]'
              : breathPhase === 'hold'
              ? 'scale-110 border-amber-400 bg-amber-500/20'
              : 'scale-90 border-teal-500 bg-teal-500/10'
          }`}>
            <span className="text-[10px] text-stone-200">
              {breathPhase === 'in' ? '흡' : breathPhase === 'hold' ? '지' : '호'}
            </span>
          </div>
          <div>
            <p className="text-xs font-serif text-amber-200">
              {breathPhase === 'in' && '숨을 가만히 깊게 들이쉬세요...'}
              {breathPhase === 'hold' && '잠시 숨결의 고요를 머금으세요...'}
              {breathPhase === 'out' && '온몸의 긴장을 풀며 부드럽게 내쉬세요...'}
            </p>
            <p className="text-[11px] text-stone-400">말이 필요 없는 공간에서 마음의 소리에만 귀 기울여보세요.</p>
          </div>
        </div>

        {/* 간편 불교 수행 바로가기 버튼군 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMoktak}
            className="px-3 py-1.5 rounded-xl bg-amber-800/40 hover:bg-amber-700/60 text-amber-200 text-xs border border-amber-700/50 flex items-center gap-1.5 transition"
          >
            <span>목탁 치기</span>
          </button>
          <button
            onClick={onOpenBows}
            className="px-3 py-1.5 rounded-xl bg-amber-900/30 hover:bg-amber-800/50 text-amber-100 text-xs border border-amber-700/40 flex items-center gap-1.5 transition"
          >
            <span>108배 참회</span>
          </button>
          <button
            onClick={onOpenLanterns}
            className="px-3 py-1.5 rounded-xl bg-pink-950/40 hover:bg-pink-900/50 text-pink-200 text-xs border border-pink-700/40 flex items-center gap-1.5 transition"
          >
            <span>연등 달기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
