import React, { useState, useEffect } from 'react';
import { templeAudio, BUDDHIST_TRACKS, BuddhistTrackId } from '../utils/audio';
import { HEART_SUTRA_VERSES } from '../data/dharma';
import { Play, Pause, Music, Volume2, ChevronDown, Sparkles } from 'lucide-react';

export const BuddhistMusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<BuddhistTrackId>('sutra');
  const [verseIdx, setVerseIdx] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showTrackMenu, setShowTrackMenu] = useState(false);

  useEffect(() => {
    templeAudio.onTrackStatusChange = (playing, trackId) => {
      setIsPlaying(playing);
      if (trackId) setCurrentTrackId(trackId);
    };

    templeAudio.onVerseChange = (idx) => {
      setVerseIdx(idx);
    };

    return () => {
      templeAudio.onTrackStatusChange = undefined;
      templeAudio.onVerseChange = undefined;
    };
  }, []);

  const handleTogglePlay = (trackId?: BuddhistTrackId) => {
    const target = trackId || currentTrackId;
    if (isPlaying && currentTrackId === target) {
      templeAudio.stopBuddhistMusic();
    } else {
      templeAudio.playBuddhistTrack(target, volume);
      setCurrentTrackId(target);
    }
    setShowTrackMenu(false);
  };

  const currentTrack = BUDDHIST_TRACKS.find(t => t.id === currentTrackId) || BUDDHIST_TRACKS[0];
  const currentVerse = HEART_SUTRA_VERSES[verseIdx] || HEART_SUTRA_VERSES[0];

  return (
    <>
      {/* 1. 상단 플로팅 음악 플레이어 바 */}
      <div className="relative">
        <div className="bg-stone-900/90 backdrop-blur-md border border-amber-800/50 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center gap-2 text-stone-200">
          {/* 재생 / 일시정지 메인 버튼 */}
          <button
            onClick={() => handleTogglePlay()}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition shadow-md ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold'
                : 'bg-stone-800 hover:bg-stone-700 text-amber-200'
            }`}
            title={isPlaying ? '음악 멈춤' : '불교 음악 / 반야심경 독경 재생'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* 트랙 정보 & 드롭다운 토글 */}
          <div
            onClick={() => setShowTrackMenu(!showTrackMenu)}
            className="cursor-pointer group flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-stone-800/60 transition"
          >
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <Music className={`w-3 h-3 ${isPlaying ? 'text-amber-400 animate-spin' : 'text-stone-400'}`} style={{ animationDuration: '6s' }} />
                <span className="font-serif text-xs text-amber-100 font-bold max-w-[140px] sm:max-w-[180px] truncate">
                  {currentTrack.title}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-amber-300 transition" />
              </div>
              <span className="text-[10px] text-stone-400 max-w-[140px] sm:max-w-[180px] truncate">
                {isPlaying ? (currentTrackId === 'sutra' ? '실시간 독경 중...' : '명상곡 연주 중') : '눌러서 음악 선택'}
              </span>
            </div>
          </div>

          {/* 음량 조절 슬라이더 */}
          <div className="hidden lg:flex items-center gap-1 pl-1 border-l border-stone-800">
            <Volume2 className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (isPlaying) {
                  templeAudio.playBuddhistTrack(currentTrackId, val);
                }
              }}
              className="w-14 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              title="음악 볼륨"
            />
          </div>
        </div>

        {/* 2. 트랙 선택 팝업 메뉴 */}
        {showTrackMenu && (
          <div className="absolute top-12 left-0 w-72 bg-stone-900 border border-amber-900/50 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
            <div className="px-2 py-1 text-[11px] font-serif text-amber-400/90 font-bold border-b border-stone-800 mb-1">
              불교 치유 음향 &amp; 독경 선택
            </div>
            <div className="space-y-1">
              {BUDDHIST_TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTogglePlay(t.id)}
                  className={`w-full text-left p-2 rounded-xl text-xs transition flex flex-col ${
                    currentTrackId === t.id && isPlaying
                      ? 'bg-amber-950/80 border border-amber-600/50 text-amber-100'
                      : 'hover:bg-stone-800 text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-semibold text-xs text-amber-200">
                      {t.title}
                    </span>
                    {currentTrackId === t.id && isPlaying && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        재생중
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-0.5">{t.subtitle}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. 반야심경 독경 중일 때 3D 법당 상단에 은은하게 흐르는 실시간 자막 리본 */}
      {isPlaying && currentTrackId === 'sutra' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-xl w-[90vw] pointer-events-none z-20 animate-fade-in">
          <div className="bg-stone-950/85 backdrop-blur-md border border-amber-600/40 rounded-2xl px-5 py-3 shadow-2xl text-center">
            {/* 음파 비주얼라이저 인디케이터 */}
            <div className="flex items-center justify-center gap-1 mb-1.5 opacity-80">
              <span className="w-0.5 h-3 bg-amber-400 animate-pulse" />
              <span className="w-0.5 h-4 bg-amber-300 animate-pulse" style={{ animationDelay: '0.1s' }} />
              <span className="w-0.5 h-2 bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="text-[10px] font-serif text-amber-300/90 tracking-widest mx-1.5">
                스님의 반야심경(般若心經) 독경
              </span>
              <span className="w-0.5 h-2 bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-0.5 h-4 bg-amber-300 animate-pulse" style={{ animationDelay: '0.1s' }} />
              <span className="w-0.5 h-3 bg-amber-400 animate-pulse" />
            </div>

            {/* 한글 독경 자막 */}
            <h4 className="font-serif text-sm sm:text-base text-amber-100 font-bold tracking-wide">
              {currentVerse.kr}
            </h4>

            {/* 한자 표기 */}
            <p className="text-[11px] font-serif text-amber-400/80 mt-0.5">
              {currentVerse.hanja}
            </p>

            {/* 현대적 우리말 해석 */}
            <p className="text-xs text-stone-300 mt-1.5 font-sans leading-relaxed">
              &quot;{currentVerse.meaning}&quot;
            </p>
          </div>
        </div>
      )}
    </>
  );
};
