import React, { useState } from 'react';
import { templeAudio } from '../utils/audio';
import { Sparkles, Dices, ArrowRight, Heart } from 'lucide-react';

interface EntranceGateModalProps {
  isOpen: boolean;
  onEnter: (profile: {
    dharmaName: string;
    gender: 'male' | 'female';
    robeColor: string;
    intention: string;
  }) => void;
  initialProfile?: {
    dharmaName: string;
    gender: 'male' | 'female';
    robeColor: string;
    intention: string;
  };
  onClose?: () => void;
}

const MALE_DHARMA_NAMES = ['청안(淸眼)', '원각(圓覺)', '보리(菩提)', '도연(道然)', '무진(無盡)', '적멸(寂滅)', '혜광(慧光)', '일심(一心)', '송운(松雲)'];
const FEMALE_DHARMA_NAMES = ['연화(蓮花)', '보현(普賢)', '묘음(妙音)', '청련(淸蓮)', '자비(慈悲)', '수정(水靜)', '혜월(慧月)', '법연(法蓮)', '선화(善花)'];

const INTENTIONS = [
  { id: 'calm', label: '복잡한 마음 비우기', icon: '🕊️', desc: '번뇌와 스트레스를 내려놓고 휴식' },
  { id: 'heal', label: '지친 하루 쉼과 치유', icon: '🌿', desc: '오늘 하루 지친 내 마음에 위로' },
  { id: 'family', label: '가족의 건강과 안녕', icon: '👨‍👩‍👧', desc: '소중한 이들의 무탈과 평안 기원' },
  { id: 'wish', label: '시험 · 취업 소원 성취', icon: '🎯', desc: '앞날의 바른 길과 성취 발원' },
];

const ROBE_COLORS = [
  { label: '승복 회색', color: '#78716c' },
  { label: '먹색 (차콜)', color: '#44403c' },
  { label: '황토색', color: '#b45309' },
  { label: '가사 주황', color: '#d97706' },
];

export const EntranceGateModal: React.FC<EntranceGateModalProps> = ({
  isOpen,
  onEnter,
  initialProfile,
  onClose
}) => {
  const [gender, setGender] = useState<'male' | 'female'>(initialProfile?.gender || 'male');
  const [dharmaName, setDharmaName] = useState(initialProfile?.dharmaName || '청안(淸眼)');
  const [robeColor, setRobeColor] = useState(initialProfile?.robeColor || '#78716c');
  const [intention, setIntention] = useState(initialProfile?.intention || '복잡한 마음 비우기');

  if (!isOpen) return null;

  const handleRandomName = () => {
    templeAudio.playWindChime(0.4);
    const list = gender === 'female' ? FEMALE_DHARMA_NAMES : MALE_DHARMA_NAMES;
    const picked = list[Math.floor(Math.random() * list.length)];
    setDharmaName(picked);
  };

  const handleGenderChange = (newGender: 'male' | 'female') => {
    setGender(newGender);
    const list = newGender === 'female' ? FEMALE_DHARMA_NAMES : MALE_DHARMA_NAMES;
    setDharmaName(list[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    templeAudio.playBell(0.85);
    onEnter({
      dharmaName: dharmaName.trim() || (gender === 'female' ? '연화' : '청안'),
      gender,
      robeColor,
      intention
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-amber-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* 상단 단청 장식 & 일주문 타이틀 */}
        <div className="text-center">
          <span className="text-[11px] uppercase tracking-widest text-amber-500 font-serif font-bold">
            一 柱 門 入 堂 式 (Entrance Rite)
          </span>
          <h2 className="text-xl sm:text-2xl font-serif text-amber-100 font-bold mt-1">
            산사 일주문(一柱門) 입재식
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            세속의 번뇌를 일주문 밖으로 내려놓고, 법당에 들기 전 나의 법명과 마음을 가다듬습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. 성별 / 도반 유형 선택 */}
          <div>
            <label className="block text-xs font-serif text-amber-200/90 mb-2">
              1. 도반 유형 (처사 / 보살)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGenderChange('male')}
                className={`p-3 rounded-2xl border text-xs font-serif flex items-center justify-center gap-2 transition ${
                  gender === 'male'
                    ? 'bg-amber-950/70 border-amber-500 text-amber-200 font-bold shadow-lg ring-1 ring-amber-400'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <span className="text-base">👦</span>
                <span>처사 (남성 동자승)</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderChange('female')}
                className={`p-3 rounded-2xl border text-xs font-serif flex items-center justify-center gap-2 transition ${
                  gender === 'female'
                    ? 'bg-pink-950/70 border-pink-500 text-pink-200 font-bold shadow-lg ring-1 ring-pink-400'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <span className="text-base">👧</span>
                <span>보살 (여성 동녀승)</span>
              </button>
            </div>
          </div>

          {/* 2. 법명(法名) 정하기 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-serif text-amber-200/90">
                2. 법명 (사찰에서 불릴 이름)
              </label>
              <button
                type="button"
                onClick={handleRandomName}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>법명 추천 뽑기</span>
              </button>
            </div>
            <input
              type="text"
              value={dharmaName}
              onChange={(e) => setDharmaName(e.target.value.slice(0, 12))}
              placeholder="예: 청안(淸眼), 보리심, 맑은바람"
              maxLength={12}
              className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs font-serif focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* 3. 승복 색상 선택 */}
          <div>
            <label className="block text-xs font-serif text-amber-200/90 mb-1.5">
              3. 승복(僧服) 색상
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ROBE_COLORS.map(c => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setRobeColor(c.color)}
                  className={`p-2 rounded-xl text-[11px] border flex flex-col items-center gap-1.5 transition ${
                    robeColor === c.color
                      ? 'border-amber-500 bg-amber-950/50 text-amber-200 font-bold ring-1 ring-amber-400'
                      : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-stone-600" style={{ backgroundColor: c.color }} />
                  <span className="text-[10px]">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. 오늘 산사를 찾은 이유 (입재 발원) */}
          <div>
            <label className="block text-xs font-serif text-amber-200/90 mb-1.5">
              4. 오늘 사찰을 찾은 마음 (입재 발원)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INTENTIONS.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setIntention(it.label)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2 ${
                    intention === it.label
                      ? 'border-amber-500 bg-amber-950/60 text-amber-200 font-bold'
                      : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <span className="text-sm shrink-0">{it.icon}</span>
                  <div>
                    <div className="text-[11px] leading-tight font-serif">{it.label}</div>
                    <div className="text-[9px] text-stone-400 mt-0.5 font-sans">{it.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. 사찰 대웅전 입장 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-serif text-sm font-bold flex items-center justify-center gap-2 shadow-xl border border-amber-400/50 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <span>사찰 대웅전 입장하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 text-center text-xs text-stone-400 hover:text-stone-200 py-1"
              >
                닫기
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
