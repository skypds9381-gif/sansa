import React, { useEffect, useRef, useState } from 'react';
import { SansaTemple3D, MonkActor } from '../three/TempleScene';
import { templeAudio } from '../utils/audio';
import { BuddhistMusicPlayer } from './BuddhistMusicPlayer';
import { 
  Heart, 
  Sparkles, 
  Bell, 
  Disc, 
  Wind, 
  Droplets, 
  Moon, 
  VolumeX, 
  Users, 
  BookOpen, 
  Youtube,
  Info
} from 'lucide-react';

interface SansaTempleViewportProps {
  onOpenMoktakModal: () => void;
  onOpenLanternModal: () => void;
  onOpenBeadsModal: () => void;
  onOpenDharmaModal: () => void;
  onOpenGuideModal: () => void;
  meritPoints: number;
  addMerit: (pts: number) => void;
}

export const SansaTempleViewport: React.FC<SansaTempleViewportProps> = ({
  onOpenMoktakModal,
  onOpenLanternModal,
  onOpenBeadsModal,
  onOpenDharmaModal,
  onOpenGuideModal,
  meritPoints,
  addMerit
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const templeSceneRef = useRef<SansaTemple3D | null>(null);

  // UI States
  const [playerState, setPlayerState] = useState<MonkActor['state']>('sitting');
  const [cushionIndex, setCushionIndex] = useState<number | null>(7);
  const [notification, setNotification] = useState<string | null>('가상 사찰 청연당에 오신 것을 환영합니다.');
  const [onlinePilgrimsCount] = useState(134);
  const [currentServer, setCurrentServer] = useState('청연당 1관');
  const [ambientType, setAmbientType] = useState<'wind' | 'stream' | 'crickets' | 'none'>('wind');
  const [isPlayingAmbient, setIsPlayingAmbient] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(true);
  // 실제 현재 시각 자동 연동 시스템
  const getAutoTimeOfDay = (): 'dawn' | 'morning' | 'sunset' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 7) return 'dawn'; // 새벽 04:00 ~ 06:59
    if (hour >= 7 && hour < 17) return 'morning'; // 아침/한낮 07:00 ~ 16:59
    if (hour >= 17 && hour < 20) return 'sunset'; // 저녁 노을 17:00 ~ 19:59
    return 'night'; // 깊은 밤 20:00 ~ 03:59
  };

  const [isAutoTime, setIsAutoTime] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'morning' | 'sunset' | 'night'>(getAutoTimeOfDay());
  const [hallTheme, setHallTheme] = useState<'daewoong' | 'geungnak' | 'sansin'>('daewoong');

  const handleSelectTime = (t: 'dawn' | 'morning' | 'sunset' | 'night', manual = true) => {
    if (manual) setIsAutoTime(false);
    setTimeOfDay(t);
    templeSceneRef.current?.setTimeOfDay(t);
  };

  const handleToggleAutoTime = () => {
    setIsAutoTime(true);
    const autoT = getAutoTimeOfDay();
    setTimeOfDay(autoT);
    templeSceneRef.current?.setTimeOfDay(autoT);
    setNotification(`실제 현재 시각(지금 ${new Date().getHours()}시)으로 자동 연동되었습니다.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectHall = (h: 'daewoong' | 'geungnak' | 'sansin') => {
    setHallTheme(h);
    templeSceneRef.current?.setHallTheme(h);
    if (h === 'daewoong') setCurrentServer('대웅전 (본당)');
    else if (h === 'geungnak') setCurrentServer('극락전 (아미타당)');
    else if (h === 'sansin') setCurrentServer('산신각 (숲속 암자)');
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const temple = new SansaTemple3D(mountRef.current);
    templeSceneRef.current = temple;

    temple.onPlayerStateChange = (state, cIdx) => {
      setPlayerState(state);
      setCushionIndex(cIdx);
    };

    temple.onNotification = (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3500);
    };

    // Auto-dismiss controls hint after 6s
    const timer = setTimeout(() => setShowControlsHint(false), 7000);

    return () => {
      clearTimeout(timer);
      temple.dispose();
      templeSceneRef.current = null;
    };
  }, []);

  const handleToggleAmbient = (type: 'wind' | 'stream' | 'crickets') => {
    if (ambientType === type && isPlayingAmbient) {
      templeAudio.toggleAmbient('none');
      setIsPlayingAmbient(false);
      setAmbientType('none');
    } else {
      templeAudio.toggleAmbient(type, 0.35);
      setIsPlayingAmbient(true);
      setAmbientType(type);
    }
  };

  const handleAction = (action: 'pray' | 'bow' | 'stand' | 'sit') => {
    if (!templeSceneRef.current) return;
    templeSceneRef.current.performPlayerAction(action);
    if (action === 'bow') addMerit(5);
    if (action === 'pray') addMerit(2);
  };

  const handleQuickMoktak = () => {
    templeAudio.playMoktak(0.8);
    addMerit(1);
    setNotification('목탁을 쳤습니다. (공덕 +1)');
    setTimeout(() => setNotification(null), 2000);
  };

  return (
    <div className="relative w-full h-[calc(100vh-60px)] min-h-[640px] overflow-hidden bg-stone-950 select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP BAR: 서버명 / 도반 수 / 자연음 제어 */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none z-20">
        {/* 좌측 서버 선택기 & 불교 음악 플레이어 */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="bg-stone-900/85 backdrop-blur-md border border-amber-900/40 rounded-2xl px-3.5 py-1.5 shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <select
              value={hallTheme}
              onChange={(e) => handleSelectHall(e.target.value as 'daewoong' | 'geungnak' | 'sansin')}
              className="bg-transparent font-serif text-xs text-amber-200 font-bold focus:outline-none cursor-pointer"
            >
              <option value="daewoong" className="bg-stone-900 text-stone-200">대웅전 (本堂 · 석가모니불)</option>
              <option value="geungnak" className="bg-stone-900 text-stone-200">극락전 (아미타당 · 치유소원)</option>
              <option value="sansin" className="bg-stone-900 text-stone-200">산신각 (숲속 암자 · 삼성각)</option>
            </select>
          </div>

          {/* 반야심경 독경 및 불교 치유 음악 플레이어 */}
          <BuddhistMusicPlayer />

          {/* 시간대 전환기 (실시간 연동 + 수동 새벽/아침/노을/밤) */}
          <div className="bg-stone-900/85 backdrop-blur-md border border-amber-900/40 rounded-2xl p-1 shadow-xl flex items-center gap-1 text-[11px] font-serif">
            <button
              onClick={handleToggleAutoTime}
              className={`px-2 py-1 rounded-xl transition flex items-center gap-1 ${
                isAutoTime
                  ? 'bg-emerald-900 text-emerald-200 font-bold border border-emerald-500/50'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="실제 현실 시각으로 자동 연동"
            >
              <span>⏰ 실시간</span>
            </button>
            <div className="w-[1px] h-3.5 bg-stone-800 mx-0.5" />
            <button
              onClick={() => handleSelectTime('dawn')}
              className={`px-2 py-1 rounded-xl transition ${
                timeOfDay === 'dawn'
                  ? 'bg-indigo-900 text-indigo-100 font-bold border border-indigo-500/50'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="새벽 5시 예불 (서늘한 안개와 여명)"
            >
              🌅 새벽
            </button>
            <button
              onClick={() => handleSelectTime('morning')}
              className={`px-2 py-1 rounded-xl transition ${
                timeOfDay === 'morning'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="아침 9시 (황금빛 햇살)"
            >
              ☀️ 아침
            </button>
            <button
              onClick={() => handleSelectTime('sunset')}
              className={`px-2 py-1 rounded-xl transition ${
                timeOfDay === 'sunset'
                  ? 'bg-orange-800 text-orange-100 font-bold border border-orange-500/50'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="저녁 6시 (붉은 노을빛)"
            >
              🌇 노을
            </button>
            <button
              onClick={() => handleSelectTime('night')}
              className={`px-2 py-1 rounded-xl transition ${
                timeOfDay === 'night'
                  ? 'bg-slate-900 text-amber-300 font-bold border border-amber-500/50'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="깊은 밤 (달빛과 촛불)"
            >
              🌙 밤
            </button>
          </div>
        </div>

        {/* 중앙 부동 알림 배너 */}
        {notification && (
          <div className="pointer-events-auto max-w-sm px-4 py-1.5 rounded-full bg-stone-900/90 border border-amber-600/50 text-amber-200 text-xs text-center shadow-2xl backdrop-blur-sm transition-all duration-300">
            {notification}
          </div>
        )}

        {/* 우측 접속자 수 & 자연음 토글 */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* 동시 정진자 수 */}
          <div className="hidden sm:flex items-center gap-1.5 bg-stone-900/85 backdrop-blur-md border border-stone-800 rounded-2xl px-3 py-1.5 text-xs text-stone-300 shadow-xl">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>도반 <strong>{onlinePilgrimsCount}명</strong></span>
          </div>

          {/* 배경 자연음 토글 */}
          <div className="bg-stone-900/85 backdrop-blur-md border border-amber-900/40 rounded-2xl p-1 shadow-xl flex items-center gap-1">
            <button
              onClick={() => handleToggleAmbient('wind')}
              className={`p-1.5 rounded-xl transition ${
                isPlayingAmbient && ambientType === 'wind'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="산바람 소리"
            >
              <Wind className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToggleAmbient('stream')}
              className={`p-1.5 rounded-xl transition ${
                isPlayingAmbient && ambientType === 'stream'
                  ? 'bg-sky-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="계곡물 소리"
            >
              <Droplets className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToggleAmbient('crickets')}
              className={`p-1.5 rounded-xl transition ${
                isPlayingAmbient && ambientType === 'crickets'
                  ? 'bg-indigo-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="풀벌레 소리"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            {isPlayingAmbient && (
              <button
                onClick={() => {
                  templeAudio.toggleAmbient('none');
                  setIsPlayingAmbient(false);
                }}
                className="p-1.5 rounded-xl text-stone-500 hover:text-stone-300"
                title="음소거"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 제작 분석 가이드 모달 트리거 */}
          <button
            onClick={onOpenGuideModal}
            className="flex items-center gap-1.5 bg-red-950/85 hover:bg-red-900/90 text-red-200 border border-red-700/50 rounded-2xl px-3 py-1.5 text-xs font-serif shadow-xl backdrop-blur-md transition"
          >
            <Youtube className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden md:inline">유튜브 바이브코딩 분석</span>
            <span className="md:hidden">가이드</span>
          </button>
        </div>
      </div>

      {/* 조작법 안내 힌트 카드 (화면 중앙 상단에 잠깐 표시) */}
      {showControlsHint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-stone-900/90 border border-amber-900/40 rounded-2xl px-4 py-2 text-xs text-stone-300 backdrop-blur-md shadow-2xl flex items-center gap-2 pointer-events-none z-10 transition">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>마루 바닥</strong>을 클릭하면 걸어가고, <strong>방석</strong>을 누르면 착석합니다. 마우스 드래그로 법당을 둘러보세요.
          </span>
          <button
            onClick={() => setShowControlsHint(false)}
            className="pointer-events-auto ml-2 text-stone-500 hover:text-stone-300 text-[10px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* BOTTOM ACTION DOCK (산사의 시그니처 하단 액션 독) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-auto max-w-[95vw] z-30">
        <div className="bg-stone-900/90 backdrop-blur-md border border-amber-900/40 rounded-3xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-1.5 sm:gap-2 text-stone-200">
          {/* 1. 방석 앉기 / 일어나기 */}
          {playerState === 'sitting' || playerState === 'praying' || playerState === 'bowing' ? (
            <button
              onClick={() => handleAction('stand')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-serif transition"
              title="방석에서 일어나기"
            >
              <span>🚶</span>
              <span className="hidden sm:inline">일어나기</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (cushionIndex !== null) handleAction('sit');
                else setNotification('착석할 방석을 클릭해주세요.');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold text-xs font-serif transition"
              title="방석에 앉기"
            >
              <span>🧘</span>
              <span className="hidden sm:inline">방석 앉기</span>
            </button>
          )}

          {/* 2. 합장하기 (Gassho salute) */}
          <button
            onClick={() => handleAction('pray')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-amber-200 text-xs font-serif border border-stone-700 hover:border-amber-600/50 transition"
            title="도반들에게 합장 인사"
          >
            <span>🙏</span>
            <span className="hidden sm:inline">합장</span>
          </button>

          {/* 3. 절하기 (Bow) */}
          <button
            onClick={() => handleAction('bow')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-amber-200 text-xs font-serif border border-stone-700 hover:border-amber-600/50 transition"
            title="부처님 전에 절하기"
          >
            <span>🙇</span>
            <span className="hidden sm:inline">절하기</span>
          </button>

          <div className="w-[1px] h-6 bg-stone-800 mx-0.5" />

          {/* 4. 목탁 즉석 타격 */}
          <button
            onClick={handleQuickMoktak}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 text-xs font-serif border border-amber-800/60 transition"
            title="목탁 치기"
          >
            <Disc className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">목탁</span>
          </button>

          {/* 5. 염주 굴리기 */}
          <button
            onClick={onOpenBeadsModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-serif border border-stone-700 transition"
            title="108 염주 굴리기"
          >
            <span>📿</span>
            <span className="hidden sm:inline">염주</span>
          </button>

          {/* 6. 소원 연등 */}
          <button
            onClick={onOpenLanternModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-pink-950/60 hover:bg-pink-900/70 text-pink-200 text-xs font-serif border border-pink-800/50 transition"
            title="처마 밑 연등 소원"
          >
            <span>🪷</span>
            <span className="hidden sm:inline">연등 달기</span>
          </button>

          {/* 7. 오늘의 법어 뽑기 */}
          <button
            onClick={onOpenDharmaModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-serif border border-stone-700 transition"
            title="지혜의 말씀 법어 뽑기"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">법어</span>
          </button>
        </div>
      </div>
    </div>
  );
};
