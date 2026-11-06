import React, { useState } from 'react';
import { 
  Youtube, 
  Lightbulb, 
  Code2, 
  Layers, 
  Copy, 
  Check, 
  Sparkles, 
  Share2, 
  HeartHandshake, 
  Headphones, 
  Compass,
  ArrowRight
} from 'lucide-react';

interface PromptCardProps {
  step: string;
  title: string;
  description: string;
  prompt: string;
}

const PromptCard: React.FC<PromptCardProps> = ({ step, title, description, prompt }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/80 border border-stone-800 hover:border-amber-700/50 transition">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 text-[11px] font-mono border border-amber-700/40">
            {step}
          </span>
          <h4 className="font-serif text-sm text-amber-100 font-semibold">{title}</h4>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs border border-stone-700 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '복사됨' : '프롬프트 복사'}</span>
        </button>
      </div>

      <p className="text-xs text-stone-400 mb-3">{description}</p>

      <pre className="p-3 rounded-xl bg-stone-900 border border-stone-800/80 text-[11px] text-amber-200/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-48 custom-scrollbar">
        {prompt}
      </pre>
    </div>
  );
};

export const VideoAnalysisGuide: React.FC<{ onNavigateToHall: () => void }> = ({ onNavigateToHall }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'features' | 'roadmap' | 'prompts'>('overview');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 영상 연계 안내 헤더 배너 */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/70 via-stone-900 to-amber-950/70 border border-red-900/40 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Youtube className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-semibold">
                YouTube 영상 분석 &amp; 제작 가이드
              </span>
              <h1 className="text-xl sm:text-2xl font-serif text-stone-100 font-bold mt-0.5">
                하루 10만 명 몰린 &apos;온라인 절(산사)&apos; 핵심 정리 &amp; 만들기
              </h1>
              <p className="text-xs text-stone-300 mt-1">
                영상 출처: YouTube (<span className="text-amber-300">Oue6Gg5ji1Q</span>) · Claude &amp; GPT를 활용한 가상 사찰 바이브 코딩 완벽 해설
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToHall}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-serif text-xs font-bold flex items-center gap-1.5 shadow-lg whitespace-nowrap transition"
          >
            <span>직접 체험하러 가기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex flex-wrap gap-2 border-b border-stone-800 pb-3">
        <button
          onClick={() => setActiveSection('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition ${
            activeSection === 'overview'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200'
          }`}
        >
          1. 성공 요인 &amp; 기획 의도
        </button>
        <button
          onClick={() => setActiveSection('features')}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition ${
            activeSection === 'features'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200'
          }`}
        >
          2. 필수 핵심 기능 5가지
        </button>
        <button
          onClick={() => setActiveSection('roadmap')}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition ${
            activeSection === 'roadmap'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200'
          }`}
        >
          3. 바이브 코딩 제작 로드맵
        </button>
        <button
          onClick={() => setActiveSection('prompts')}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition ${
            activeSection === 'prompts'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200'
          }`}
        >
          4. 실전 복사용 AI 프롬프트
        </button>
      </div>

      {/* 섹션 1: 성공 요인 & 기획 의도 */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
            <h3 className="text-lg font-serif text-amber-200 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <span>왜 사람들은 &apos;온라인 절(산사)&apos;에 열광했을까?</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                <div className="flex items-center gap-2 text-amber-300 font-serif text-sm font-semibold mb-2">
                  <HeartHandshake className="w-4 h-4" />
                  <span>1. &apos;말 걸지 않는 공간&apos;의 편안함</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  기존 소셜 미디어나 메타버스는 끊임없는 대화, 반응, 팔로우, 좋아요 등의 인정 투쟁과 피로감을 유발합니다. 
                  하지만 산사(SANSA)는 <strong>채팅과 마이크 기능을 의도적으로 완전히 배제</strong>하여 타인의 온기만 느끼되 아무도 나를 간섭하지 않는 안전한 쉼터를 제공했습니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                <div className="flex items-center gap-2 text-amber-300 font-serif text-sm font-semibold mb-2">
                  <Compass className="w-4 h-4" />
                  <span>2. 초경량 웹 기반 (Zero-Friction)</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  무거운 3D 게임 엔진이나 별도의 앱 설치 없이, 인스타그램/스레드/카카오톡 링크 클릭 단 한 번으로 1초 만에 스마트폰 화면에 법당이 펼쳐집니다. 
                  이 극단적인 접근성이 하루 10만 명 트래픽을 감당하고 바이럴을 유도한 핵심입니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                <div className="flex items-center gap-2 text-amber-300 font-serif text-sm font-semibold mb-2">
                  <Headphones className="w-4 h-4" />
                  <span>3. 청각적 힐링 (ASMR &amp; 목탁)</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  단순히 눈으로만 보는 것이 아니라, 화면을 탭할 때 울리는 맑은 목탁 소리, 은은한 산사 바람 소리, 에밀레종의 장엄한 울림이 현대인의 도파민 과잉 뇌를 즉각 진정시켜 줍니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                <div className="flex items-center gap-2 text-amber-300 font-serif text-sm font-semibold mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>4. 비전공자 1인 개발 &apos;바이브 코딩&apos;</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  개발 지식이 없는 기획자/디자이너도 Claude와 GPT에게 자연어로 원하는 기능과 분위기를 설명하고 피드백을 주고받으며 수일 만에 MVP를 배포한 AI 시대의 상징적 프로덕트입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 섹션 2: 필수 핵심 기능 5가지 */}
      {activeSection === 'features' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
            <h3 className="text-lg font-serif text-amber-200 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>온라인 사찰 구현 시 반드시 포함해야 할 5대 요소</span>
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-serif font-bold text-amber-200">대청마루 방석(座蒲) 그리드 시스템</h4>
                  <p className="text-xs text-stone-300 mt-1">
                    사용자가 원하는 빈 방석을 골라 앉을 수 있으며, 주위에는 이미 조용히 좌선하고 있는 다른 도반(동자승 아바타)들이 배치되어 &apos;홀로 있지만 함께 있는&apos; 느낌을 연출합니다.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-serif font-bold text-amber-200">비언어적 인터랙션 (합장, 좌선, 108배)</h4>
                  <p className="text-xs text-stone-300 mt-1">
                    채팅창 대신 동자승 아바타의 자세 변경(가슴 앞 합장, 무릎 위 명상, 엎드려 절하기)을 통해 자신의 마음 상태를 온화하게 표현합니다.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-serif font-bold text-amber-200">Web Audio API 기반 무자원 사운드 합성</h4>
                  <p className="text-xs text-stone-300 mt-1">
                    외부 mp3 오디오 파일 링크는 트래픽 폭증 시 끊기거나 저작권 문제가 발생합니다. 브라우저 내장 Web Audio 오실레이터와 밴드패스 필터를 결합해 목탁 통울림과 한국 종의 1.4Hz 맥놀이(Beating)를 100% 코드로 합성합니다.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-serif font-bold text-amber-200">비동기 소원 연등 &amp; 공덕(Merit) 카운터</h4>
                  <p className="text-xs text-stone-300 mt-1">
                    익명으로 가족의 건강이나 수험 합격을 바라는 마음을 연등에 매달고, 다른 이의 소원에 하트(합장 공감)를 보내는 따뜻한 소통 방식을 채택합니다.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  5
                </div>
                <div>
                  <h4 className="text-xs font-serif font-bold text-amber-200">자연의 소리와 호흡 가이드</h4>
                  <p className="text-xs text-stone-300 mt-1">
                    산바람, 사찰 계곡물, 밤 풀벌레 소리를 배경음으로 깔아두고 4-4-4 호흡 리듬(흡-지-호)을 시각화하여 사용자가 실제로 5분 이상 머무르며 심신 안정을 얻게 합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 섹션 3: 바이브 코딩 제작 로드맵 */}
      {activeSection === 'roadmap' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-6">
            <h3 className="text-lg font-serif text-amber-200 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-400" />
              <span>Claude / GPT로 직접 만들 때의 5단계 바이브 코딩 절차</span>
            </h3>

            <div className="relative border-l-2 border-amber-900/60 ml-4 pl-6 space-y-6">
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-600 border-2 border-stone-900" />
                <h4 className="text-sm font-serif font-bold text-amber-300">1단계: 무드보드 및 규칙 정의</h4>
                <p className="text-xs text-stone-300 mt-1">
                  AI에게 &quot;한국 전통 사찰의 고요함과 따뜻한 우드/단청 톤, 대화가 없는 무언의 힐링 공간을 만든다&quot;는 명확한 컨셉과 컬러 팔레트(석류 적색, 단청 비취, 황금색, 대청마루 원목)를 프롬프트에 명시합니다.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-600 border-2 border-stone-900" />
                <h4 className="text-sm font-serif font-bold text-amber-300">2단계: 귀여운 동자승 SVG &amp; 방석 시스템 생성</h4>
                <p className="text-xs text-stone-300 mt-1">
                  외부 이미지 의존성을 없애기 위해 순수 SVG로 동자승의 동그란 얼굴, 승복, 합장/좌선/절하기 포즈를 작성하게 합니다. 방석은 그리드로 배치하여 클릭 시 착석 상태를 변경하도록 합니다.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-600 border-2 border-stone-900" />
                <h4 className="text-sm font-serif font-bold text-amber-300">3단계: Web Audio API 목탁 합성 모듈 구현</h4>
                <p className="text-xs text-stone-300 mt-1">
                  &quot;외부 mp3 링크 없이 브라우저 Web Audio API의 OscillatorNode와 BiquadFilterNode로 실제 속이 빈 나무 목탁 소리와 범종 소리를 합성해줘&quot;라고 요청합니다. (아래 4번 탭의 프롬프트 사용)
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-600 border-2 border-stone-900" />
                <h4 className="text-sm font-serif font-bold text-amber-300">4단계: 연등 소원, 108배, 법어 기능 결합</h4>
                <p className="text-xs text-stone-300 mt-1">
                  모듈별로 컴포넌트를 분리하여 연등 걸기(LocalStorage에 저장되어 새로고침해도 유지), 108배 카운터, 대나무 산통 흔들어 법어 뽑기 기능을 순차적으로 붙여나갑니다.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-600 border-2 border-stone-900" />
                <h4 className="text-sm font-serif font-bold text-amber-300">5단계: 반응형 모바일 터치 최적화 &amp; 배포</h4>
                <p className="text-xs text-stone-300 mt-1">
                  스마트폰 화면에서 한 손으로 목탁을 탭하거나 방석을 누르기 편하도록 safe area 패딩과 햅틱(진동) 및 터치 이벤트를 점검한 뒤 배포합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 섹션 4: 실전 복사용 AI 프롬프트 치트시트 */}
      {activeSection === 'prompts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-700/40 text-xs text-amber-200">
            💡 아래 프롬프트를 복사하여 Claude, ChatGPT 또는 Gemini에게 전송하면 동일한 품질의 온라인 사찰을 단계별로 직접 구축할 수 있습니다.
          </div>

          <div className="space-y-4">
            <PromptCard
              step="Step 1: 기획 & 기본 구조"
              title="가상 법당 및 방석 그리드 메인 레이아웃 프롬프트"
              description="한국 사찰 대웅전의 고요한 분위기와 인터랙티브 방석 그리드를 생성하는 초기 프롬프트입니다."
              prompt={`React + Tailwind CSS로 '온라인 사찰 산사(SANSA)' 가상 법당을 만들어줘.
요구사항:
1. 테마: 한국 전통 사찰 대웅전(단청 처마, 불단 위 황금 부처상, 피어오르는 향로, 대청마루 원목 바닥).
2. 방석 그리드: 5x6 (총 30개)의 좌선 방석을 배치해줘.
3. 아바타: 순수 SVG로 제작된 귀여운 동자승 캐릭터(동그란 머리, 회색 승복, 평온한 미소).
4. 상호작용: 사용자가 빈 방석을 클릭하면 그 자리에 내 동자승이 앉고, '좌선 / 합장 / 절하기' 자세를 선택할 수 있어야 해.
5. 분위기: 채팅이나 대화 기능은 일체 넣지 말고, 현재 몇 명의 도반이 함께 고요히 정진 중인지 실시간 느낌을 주는 조용한 안내만 상단에 표시해줘.`}
            />

            <PromptCard
              step="Step 2: 사운드 합성"
              title="외부 파일 없는 Web Audio 목탁 & 범종 합성기 프롬프트"
              description="오디오 파일 없이 브라우저 내장 API만으로 타격감 넘치는 목탁과 에밀레종 소리를 만드는 프롬프트입니다."
              prompt={`외부 mp3/wav 파일이나 외부 cdn 의존성 없이, 순수 브라우저 Web Audio API만 사용해서 사찰 사운드 합성 유틸리티(TempleAudioEngine)를 TypeScript로 작성해줘.
필수 합성 음원:
1. 목탁(木鐸): 타격 시 짧은 클릭 노이즈(20ms, 1400Hz 밴드패스) + 속이 빈 나무 통울림 기본 주파수(840Hz 피치 미세 하강, 1260Hz 배음, exponential ramp decay).
2. 범종(梵鐘): 한국 성덕대왕신종의 시그니처인 1.4Hz '맥놀이(Acoustic Beating)' 현상을 재현하기 위해 110.0Hz와 111.4Hz의 사인파를 결합하고, 6개 이상의 자연스러운 배음(220Hz, 338Hz, 442Hz 등)이 7초 이상 서서히 감쇠하는 장엄한 종소리.
3. 자연 앰비언트: 필터드 노이즈로 만든 산바람 소리와 계곡물 소리 루프.`}
            />

            <PromptCard
              step="Step 3: 힐링 기능군"
              title="108배 수행 카운터 & 연등 소원 달기 프롬프트"
              description="108배 절하기 인터랙션과 처마 밑 연등 소원 게시판을 제작하는 프롬프트입니다."
              prompt={`온라인 절에 들어갈 '108배 마음 참회'와 '소원 연등 달기' 기능을 컴포넌트로 구현해줘.
1. 108배: 삼배(3배), 십배(10배), 백팔배(108배) 모드 선택 가능. '절하기' 버튼을 누르면 동자승이 부드럽게 엎드려 절하는 SVG 애니메이션과 함께 목탁 소리가 나고, 1배마다 깊은 성찰 문구(예: '지나온 허물을 참회하며 절합니다')가 나타나며 원형 프로그레스 바가 차오르게 해줘. 회향(완료) 시 축하 파티클 발생.
2. 연등 달기: 연분홍, 황금, 연두 등 연등 색상을 고르고 소원 글을 적으면 사찰 처마 밑에 은은한 네온 글로우 효과와 함께 걸리도록 해줘. 다른 도반들의 소원에 '합장 축원' 하트를 누를 수 있게 해줘.`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
