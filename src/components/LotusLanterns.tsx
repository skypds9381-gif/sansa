import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { WishLantern } from '../types';
import { INITIAL_LANTERNS } from '../data/dharma';
import { Heart, Send, Sparkles } from 'lucide-react';
import { templeAudio } from '../utils/audio';

interface LotusLanternsProps {
  meritPoints: number;
  addMerit: (pts: number) => void;
}

export const LotusLanterns: React.FC<LotusLanternsProps> = ({
  meritPoints,
  addMerit
}) => {
  const [lanterns, setLanterns] = useState<WishLantern[]>(INITIAL_LANTERNS);
  const [author, setAuthor] = useState('');
  const [wishText, setWishText] = useState('');
  const [selectedColor, setSelectedColor] = useState<WishLantern['color']>('pink');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const colorStyles: Record<WishLantern['color'], { bg: string; border: string; glow: string; text: string; label: string }> = {
    pink: {
      bg: 'from-pink-900/60 to-rose-950/80',
      border: 'border-pink-500/50',
      glow: 'shadow-[0_0_15px_rgba(244,114,182,0.3)]',
      text: 'text-pink-300',
      label: '연분홍 (가족평안)'
    },
    amber: {
      bg: 'from-amber-900/60 to-yellow-950/80',
      border: 'border-amber-500/50',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      text: 'text-amber-300',
      label: '황금 (지혜성취)'
    },
    emerald: {
      bg: 'from-emerald-900/60 to-teal-950/80',
      border: 'border-emerald-500/50',
      glow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]',
      text: 'text-emerald-300',
      label: '연두 (건강장수)'
    },
    purple: {
      bg: 'from-purple-900/60 to-indigo-950/80',
      border: 'border-purple-500/50',
      glow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]',
      text: 'text-purple-300',
      label: '자주 (소원원만)'
    },
    cyan: {
      bg: 'from-cyan-900/60 to-blue-950/80',
      border: 'border-cyan-500/50',
      glow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]',
      text: 'text-cyan-300',
      label: '비취 (마음평정)'
    }
  };

  const handleSubmitWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishText.trim()) return;

    templeAudio.playWindChime(0.7);

    // 연등 꽃가루 축원
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f472b6', '#fbbf24', '#34d399', '#c084fc']
      });
    } catch {
      // fallback
    }

    const newLantern: WishLantern = {
      id: `user-${Date.now()}`,
      author: author.trim() || '이름 없는 도반',
      wish: wishText.trim(),
      color: selectedColor,
      timestamp: '방금 전',
      likes: 1
    };

    setLanterns([newLantern, ...lanterns]);
    setWishText('');
    setAuthor('');
    addMerit(15); // 연등 달기는 큰 공덕 +15
  };

  const handleLike = (id: string) => {
    if (likedIds.has(id)) return;
    templeAudio.playMoktak(0.5);
    setLikedIds(new Set([...likedIds, id]));
    setLanterns(prev =>
      prev.map(l => l.id === id ? { ...l, likes: l.likes + 1 } : l)
    );
    addMerit(2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 안내 */}
      <div className="text-center">
        <span className="text-xs uppercase tracking-widest text-amber-500 font-serif font-bold">
          燃 燈 祈 願 (Lotus Lantern Wishing)
        </span>
        <h2 className="text-2xl font-serif text-amber-100 mt-1">처마 밑 소원 연등 달기</h2>
        <p className="text-xs text-stone-400 mt-1 max-w-lg mx-auto">
          가슴속에 품은 소망이나 나를 스쳐간 고마운 이들을 위한 축원의 마음을 연등에 담아 사찰 처마에 밝혀보세요.
        </p>
      </div>

      {/* 연등 달기 작성 폼 */}
      <div className="bg-stone-900/90 rounded-3xl p-5 sm:p-6 border border-amber-900/40 shadow-xl backdrop-blur-md">
        <form onSubmit={handleSubmitWish} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-1/3">
              <label className="block text-xs text-amber-200/80 mb-1 font-serif">도반 이름 (닉네임)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="예: 청련화, 마음챙김"
                maxLength={12}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="sm:w-2/3">
              <label className="block text-xs text-amber-200/80 mb-1 font-serif">연등 색상 선택</label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(colorStyles) as WishLantern['color'][]).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] border flex flex-col items-center gap-1 transition ${
                      selectedColor === color
                        ? `${colorStyles[color].border} bg-stone-800 text-stone-100 font-bold ring-2 ring-amber-400/50`
                        : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span className="text-sm">🪷</span>
                    <span className="hidden sm:inline text-[10px]">{colorStyles[color].label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-amber-200/80 mb-1 font-serif">소원 및 축원 발원문</label>
            <textarea
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="마음속 짐을 내려놓고 밝히고 싶은 작은 소망을 적어주세요..."
              rows={2}
              maxLength={120}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400">
              * 작성 시 공덕 <strong className="text-amber-300 font-mono">+15점</strong>이 쌓입니다.
            </span>
            <button
              type="submit"
              disabled={!wishText.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-serif flex items-center gap-2 transition ${
                wishText.trim()
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shadow-lg'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>연등 처마에 걸기</span>
            </button>
          </div>
        </form>
      </div>

      {/* 사찰 처마 밑에 매달린 연등 갤러리 */}
      <div className="bg-stone-950/70 p-5 sm:p-6 rounded-3xl border border-stone-800/80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-serif text-amber-200 flex items-center gap-2">
            <span>도반들이 밝힌 연등들</span>
            <span className="text-xs text-stone-400 font-sans">({lanterns.length}개의 등불)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lanterns.map(l => {
            const style = colorStyles[l.color];
            const isLiked = likedIds.has(l.id);

            return (
              <div
                key={l.id}
                className={`relative rounded-2xl p-4 bg-gradient-to-b ${style.bg} border ${style.border} ${style.glow} flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1`}
              >
                {/* 상단 연등 고리와 처마 줄 */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-amber-700/60" />
                  <div className="w-3 h-1.5 rounded-full bg-amber-600/80" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-serif text-amber-100 font-semibold flex items-center gap-1.5">
                      <span className="text-sm">🪷</span>
                      {l.author}
                    </span>
                    <span className="text-[10px] text-stone-400">{l.timestamp}</span>
                  </div>

                  {/* 소원 발원문 */}
                  <p className="text-xs text-stone-200 font-serif leading-relaxed line-clamp-3">
                    &quot;{l.wish}&quot;
                  </p>
                </div>

                {/* 하단 합장 축원 버튼 */}
                <div className="mt-4 pt-3 border-t border-stone-800/40 flex items-center justify-between text-xs">
                  <span className={`text-[11px] ${style.text}`}>
                    {style.label.split(' ')[0]}
                  </span>
                  <button
                    onClick={() => handleLike(l.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition ${
                      isLiked
                        ? 'bg-amber-900/50 text-amber-300 font-semibold'
                        : 'bg-stone-900/60 hover:bg-stone-800 text-stone-300'
                    }`}
                    title="합장 축원 보내기"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-amber-400 text-amber-400' : 'text-stone-400'}`} />
                    <span>합장 {l.likes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
