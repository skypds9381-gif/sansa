import React, { useState } from 'react';
import { Volume2, VolumeX, Wind, Droplets, Moon, Bell, Disc } from 'lucide-react';
import { templeAudio } from '../utils/audio';

export const AudioBar: React.FC = () => {
  const [ambientType, setAmbientType] = useState<'none' | 'wind' | 'stream' | 'crickets'>('wind');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const handleToggleAmbient = (type: 'wind' | 'stream' | 'crickets') => {
    if (ambientType === type && isPlaying) {
      templeAudio.toggleAmbient('none');
      setIsPlaying(false);
      setAmbientType('none');
    } else {
      templeAudio.toggleAmbient(type, volume * 0.5);
      setIsPlaying(true);
      setAmbientType(type);
    }
  };

  const handleStopAll = () => {
    templeAudio.toggleAmbient('none');
    setIsPlaying(false);
    setAmbientType('none');
  };

  return (
    <div className="bg-stone-900/90 backdrop-blur-md border border-amber-900/40 rounded-2xl px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 text-stone-200">
      {/* 앰비언트 자연 사운드 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-serif text-amber-200/80 mr-1 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          산사 자연의 소리
        </span>
        <button
          onClick={() => handleToggleAmbient('wind')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
            isPlaying && ambientType === 'wind'
              ? 'bg-amber-600 text-amber-50 font-medium shadow-sm'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
          }`}
          title="대숲 바람 소리"
        >
          <Wind className="w-3.5 h-3.5" />
          <span>산바람</span>
        </button>
        <button
          onClick={() => handleToggleAmbient('stream')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
            isPlaying && ambientType === 'stream'
              ? 'bg-sky-700 text-sky-50 font-medium shadow-sm'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
          }`}
          title="사찰 계곡물 소리"
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>계곡물</span>
        </button>
        <button
          onClick={() => handleToggleAmbient('crickets')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
            isPlaying && ambientType === 'crickets'
              ? 'bg-indigo-700 text-indigo-50 font-medium shadow-sm'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
          }`}
          title="고요한 밤 풀벌레"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>밤 풀벌레</span>
        </button>
        {isPlaying && (
          <button
            onClick={handleStopAll}
            className="p-1 rounded text-stone-400 hover:text-stone-200"
            title="소리 끄기"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 즉시 타종 / 목탁 미니 트리거 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-stone-400">즉석 타종:</span>
        <button
          onClick={() => templeAudio.playMoktak(volume)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-amber-900/60 text-amber-200 text-xs border border-stone-700 hover:border-amber-700 transition"
        >
          <Disc className="w-3 h-3 text-amber-400" />
          <span>목탁</span>
        </button>
        <button
          onClick={() => templeAudio.playBell(volume)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-amber-900/60 text-amber-200 text-xs border border-stone-700 hover:border-amber-700 transition"
        >
          <Bell className="w-3 h-3 text-amber-400" />
          <span>범종</span>
        </button>
        <button
          onClick={() => templeAudio.playWindChime(volume)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-amber-900/60 text-amber-200 text-xs border border-stone-700 hover:border-amber-700 transition"
        >
          <Wind className="w-3 h-3 text-teal-400" />
          <span>풍경</span>
        </button>
      </div>

      {/* 볼륨 슬라이더 */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <Volume2 className="w-3.5 h-3.5 text-stone-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          title="음량 조절"
        />
      </div>
    </div>
  );
};
