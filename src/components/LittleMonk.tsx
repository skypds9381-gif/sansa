import React from 'react';
import { AvatarGesture } from '../types';

interface LittleMonkProps {
  gesture?: AvatarGesture;
  robeColor?: string;
  size?: number;
  showHalo?: boolean;
  name?: string;
  statusText?: string;
}

export const LittleMonk: React.FC<LittleMonkProps> = ({
  gesture = 'sitting',
  robeColor = '#737373', // 기본 회색 승복
  size = 56,
  showHalo = false,
  name,
  statusText,
}) => {
  return (
    <div className="flex flex-col items-center select-none group relative">
      {/* 상태 툴팁 */}
      {statusText && (
        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 whitespace-nowrap bg-stone-900/90 text-amber-200 text-xs px-2 py-0.5 rounded shadow-lg backdrop-blur-sm border border-stone-700">
          {statusText}
        </div>
      )}

      {/* 후광 효과 (명상 중이거나 유저일 때) */}
      {showHalo && (
        <div 
          className="absolute rounded-full bg-amber-400/20 blur-md animate-pulse pointer-events-none"
          style={{
            width: size * 1.4,
            height: size * 1.4,
            top: -size * 0.2
          }}
        />
      )}

      {/* 동자승 SVG 그래픽 */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={`transition-transform duration-300 ${gesture === 'bowing' ? 'translate-y-2 scale-y-90' : ''}`}
      >
        {/* 머리 후광 링 */}
        {showHalo && (
          <circle cx="50" cy="36" r="28" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" className="animate-spin" style={{ transformOrigin: '50px 36px', animationDuration: '18s' }} />
        )}

        {/* 승복 몸통 (앉아있는 가부좌 자세 or 서있는 자세) */}
        {gesture === 'bowing' ? (
          // 절하는 모습 (엎드림)
          <g>
            <path d="M 20 70 Q 50 50 80 70 L 75 88 Q 50 92 25 88 Z" fill={robeColor} />
            {/* 승복 깃/동정 */}
            <path d="M 40 60 L 50 72 L 60 60" stroke="#f5f5f4" strokeWidth="3" fill="none" />
            {/* 동자승 머리 숙임 */}
            <circle cx="50" cy="50" r="18" fill="#fde68a" />
            <path d="M 42 54 Q 50 58 58 54" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          // 앉아있거나 서있는 평화로운 동자승
          <g>
            {/* 승복 하의/가부좌 치마 */}
            <path
              d="M 22 84 C 20 70, 30 54, 50 54 C 70 54, 80 70, 78 84 C 70 90, 30 90, 22 84 Z"
              fill={robeColor}
            />
            {/* 가부좌 발 디테일 (조그마한 버선) */}
            <ellipse cx="32" cy="84" rx="7" ry="4" fill="#fafaf9" opacity="0.8" />
            <ellipse cx="68" cy="84" rx="7" ry="4" fill="#fafaf9" opacity="0.8" />

            {/* 동정 / 흰 목깃 */}
            <path d="M 44 48 L 50 58 L 56 48" stroke="#fafaf9" strokeWidth="2.5" fill="none" />

            {/* 승복 띠/주름 */}
            <path d="M 38 65 Q 50 70 62 65" stroke="rgba(0,0,0,0.15)" strokeWidth="2" fill="none" />

            {/* 귀여운 손 (합장 vs 무릎 위 좌선) */}
            {gesture === 'praying' ? (
              // 가슴 앞 합장
              <g>
                <path d="M 46 56 C 47 50, 53 50, 54 56 L 52 64 L 48 64 Z" fill="#fed7aa" />
                <line x1="50" y1="52" x2="50" y2="62" stroke="#ea580c" strokeWidth="1" opacity="0.4" />
              </g>
            ) : (
              // 무릎 위 선정인 (명상 손 모양)
              <g>
                <ellipse cx="43" cy="68" rx="5" ry="3" fill="#fed7aa" />
                <ellipse cx="57" cy="68" rx="5" ry="3" fill="#fed7aa" />
              </g>
            )}

            {/* 동자승 동그란 얼굴 */}
            <circle cx="50" cy="34" r="18" fill="#fde68a" />
            {/* 귀 */}
            <circle cx="32" cy="34" r="4.5" fill="#fde68a" />
            <circle cx="68" cy="34" r="4.5" fill="#fde68a" />

            {/* 복스러운 볼터치 */}
            <circle cx="41" cy="39" r="3.5" fill="#f87171" opacity="0.45" />
            <circle cx="59" cy="39" r="3.5" fill="#f87171" opacity="0.45" />

            {/* 감은 눈 (평온한 눈웃음 미소) */}
            <path d="M 40 33 Q 44 37 47 33" stroke="#451a03" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M 53 33 Q 56 37 60 33" stroke="#451a03" strokeWidth="2.2" strokeLinecap="round" fill="none" />

            {/* 앙증맞은 미소 */}
            <path d="M 48 40 Q 50 43 52 40" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" fill="none" />

            {/* 이마 백호 (자비의 점) */}
            <circle cx="50" cy="24" r="1.3" fill="#f59e0b" />
          </g>
        )}
      </svg>

      {/* 이름표 */}
      {name && (
        <span className="text-[11px] font-medium text-stone-300 mt-0.5 tracking-tight px-1.5 py-0.5 rounded-full bg-stone-900/60 border border-stone-800">
          {name}
        </span>
      )}
    </div>
  );
};
