export type AvatarGesture = 'standing' | 'sitting' | 'praying' | 'bowing';

export interface Pilgrim {
  id: string;
  name: string;
  robeColor: string;
  cushionIndex: number;
  gesture: AvatarGesture;
  meditationMinutes: number;
  isUser?: boolean;
}

export interface WishLantern {
  id: string;
  author: string;
  wish: string;
  color: 'pink' | 'amber' | 'emerald' | 'purple' | 'cyan';
  timestamp: string;
  likes: number;
}

export interface DharmaQuote {
  id: number;
  hanja?: string;
  quote: string;
  author: string;
  explanation: string;
  category: '마음 다스림' | '인연과 감사' | '지혜와 비움' | '평온과 휴식';
}

export type ActiveTab = 
  | 'hall'        // 가상 대웅전
  | 'moktak'      // 목탁 치기
  | 'bell'        // 범종 타종
  | 'incense'     // 향 피우기
  | 'lanterns'    // 연등 소원
  | 'bows'        // 108배 수행
  | 'beads'       // 108 염주
  | 'dharma'      // 반야심경 & 법어
  | 'guide';      // 유튜브 영상 분석 & 제작 가이드
