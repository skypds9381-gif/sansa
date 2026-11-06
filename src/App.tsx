import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Award,
  Bell,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Dices,
  Flame,
  Flower2,
  Hand,
  HandHeart,
  Lamp,
  LogOut,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
  Wind,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  playCandleLighting,
  playIncenseOffering,
  playMalaBead,
  playMoktakRoll,
  playTempleBell,
  playWoodblock,
  startHeartSutraChant,
  startNatureSoundscape,
} from "./audio";
import { heartSutraVerses, type HeartSutraVerse } from "./heartSutra";
import { prostrationVerses } from "./prostrations108";
import { prostrations3Verses } from "./prostrations3";
import TempleScene, {
  type BuddhaScaleMode,
  type CameraPreset,
  type CompanionPractitioner,
  type TempleHall,
  type TempleLantern,
  type TemplePose,
  type TempleProfile,
  type TempleTimePeriod,
} from "./TempleScene";

type Pose = TemplePose;
type WishLantern = TempleLantern;
type RitualData = { merit: number; wishLanterns: WishLantern[]; candleCount?: number; incenseCount?: number };
type HallId = TempleHall;
type TimePeriod = TempleTimePeriod;

const halls: { id: HallId; label: string; subtitle: string }[] = [
  { id: "main", label: "청연당 (淸蓮堂)", subtitle: "본당" },
  { id: "pureLand", label: "극락전 (極樂殿)", subtitle: "아미타당" },
  { id: "mountain", label: "산신각 (山神閣)", subtitle: "숲속 암자" },
];

const periods: { id: TimePeriod; label: string }[] = [
  { id: "dawn", label: "새벽" },
  { id: "day", label: "아침" },
  { id: "sunset", label: "노을" },
  { id: "night", label: "밤" },
];

function getTimePeriod(date: Date): TimePeriod {
  const hour = date.getHours();
  if (hour < 4 || hour >= 20) return "night";
  if (hour < 7) return "dawn";
  if (hour < 17) return "day";
  if (hour < 20) return "sunset";
  return "night";
}

const ritualStorageKey = "sansa-ritual-state-v1";
const profileStorageKey = "sansa-companion-profile-v1";

type DharmaNameInfo = {
  name: string;
  hanja?: string;
  meaning: string;
};

const naturalDharmaNames: DharmaNameInfo[] = [
  { name: "다정한 이끼", meaning: "바위를 포근히 감싸 안아주는 다정하고 따뜻한 이끼" },
  { name: "고요한 구름", meaning: "바람 따라 유유히 흐르며 어디에도 머물지 않는 맑은 구름" },
  { name: "느긋한 소나무", meaning: "사계절 바람에도 흔들림 없이 묵묵히 자리를 지키는 소나무" },
  { name: "새벽 안개", meaning: "온 누리를 고요하고 정결하게 감싸는 아침 안개" },
  { name: "맑은 바람", meaning: "마음의 번뇌와 더위를 씻어 내려주는 청량한 산바람" },
  { name: "따스한 햇살", meaning: "모든 생명을 편견 없이 어루만지는 자비로운 아침 햇살" },
  { name: "초록 잎사귀", meaning: "비 온 뒤 맑은 이슬을 머금은 싱그럽고 순수한 잎새" },
  { name: "은은한 달빛", meaning: "어두운 밤길을 조용히 비춰주는 부드러운 달빛" },
  { name: "푸른 여울", meaning: "맑은 물소리로 계곡을 채우며 걸림 없이 흘러가는 여울" },
  { name: "포근한 솔방울", meaning: "숲의 내음을 품고 바닥에 사뿐히 내려앉은 솔방울" },
  { name: "청아한 풍경", meaning: "처마 끝 산들바람에 맑고 그윽하게 울리는 풍경소리" },
  { name: "소박한 흙담", meaning: "자연을 거스르지 않고 소박하게 안온함을 지켜주는 돌담길" },
  { name: "깊은 산울림", meaning: "고요한 숲속에 메아리치는 평화로운 울림" },
  { name: "맑은 이슬", meaning: "새벽녘 풀잎 위에 맺힌 티없이 맑은 이슬방울" },
  { name: "연화", hanja: "蓮花", meaning: "진흙에 물들지 않는 맑은 연꽃" },
  { name: "청안", hanja: "淸安", meaning: "맑고 편안한 평상심" },
  { name: "해월", hanja: "海月", meaning: "바다에 비친 둥근 보름달" },
  { name: "송원", hanja: "松園", meaning: "사계절 늘 푸른 솔숲" },
  { name: "지안", hanja: "志安", meaning: "평온하고 흔들림 없는 맑은 지혜" },
  { name: "혜명", hanja: "慧明", meaning: "어둠을 밝히는 지혜의 등불" },
  { name: "보리심", hanja: "菩提心", meaning: "깨달음과 자비를 향한 지극한 서원" },
  { name: "도연", hanja: "度然", meaning: "순리대로 자연스레 도를 이루는 마음" },
];

const suggestedNames = naturalDharmaNames.map((item) => item.name);

const initialCompanions: CompanionPractitioner[] = [
  { id: "comp-1", seatIndex: 1, gender: "female", name: "다정한 이끼", robeColor: "orange", vow: "healing" },
  { id: "comp-5", seatIndex: 5, gender: "male", name: "고요한 구름", robeColor: "gray", vow: "quiet" },
  { id: "comp-8", seatIndex: 8, gender: "male", name: "느긋한 소나무", robeColor: "ink", vow: "family" },
  { id: "comp-11", seatIndex: 11, gender: "female", name: "따스한 햇살", robeColor: "ochre", vow: "wish" },
  { id: "comp-12", seatIndex: 12, gender: "male", name: "새벽 안개", robeColor: "gray", vow: "quiet" },
  { id: "comp-15", seatIndex: 15, gender: "female", name: "초록 잎사귀", robeColor: "ochre", vow: "healing" },
  { id: "comp-18", seatIndex: 18, gender: "female", name: "은은한 달빛", robeColor: "ink", vow: "wish" },
];

function generateOrganicCompanion(occupiedSeats: number[], existingNames: Set<string>): CompanionPractitioner | null {
  const candidateSeats = [2, 6, 9, 13, 16, 3, 7, 10, 14, 17, 19, 4, 0, 11, 18, 15, 12, 8, 5, 1];
  const availableSeat = candidateSeats.find((s) => !occupiedSeats.includes(s));
  if (availableSeat === undefined) return null;

  const availableNameObjects = naturalDharmaNames.filter((d) => !existingNames.has(d.name));
  const chosenNameObj = availableNameObjects.length > 0
    ? availableNameObjects[Math.floor(Math.random() * availableNameObjects.length)]
    : naturalDharmaNames[Math.floor(Math.random() * naturalDharmaNames.length)];

  const gender: "male" | "female" = Math.random() < 0.5 ? "female" : "male";
  const robeRoll = Math.random();
  const robeColor: "gray" | "ink" | "ochre" | "orange" =
    robeRoll < 0.38 ? "gray" : robeRoll < 0.68 ? "ink" : robeRoll < 0.88 ? "ochre" : "orange";

  const vowRoll = Math.random();
  const vow: "quiet" | "healing" | "family" | "wish" =
    vowRoll < 0.35 ? "quiet" : vowRoll < 0.65 ? "healing" : vowRoll < 0.85 ? "family" : "wish";

  return {
    id: `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    seatIndex: availableSeat,
    gender,
    name: chosenNameObj.name,
    robeColor,
    vow,
  };
}

const robeChoices: { id: TempleProfile["robeColor"]; label: string; color: string }[] = [
  { id: "gray", label: "승복 회색", color: "#a9a69d" },
  { id: "ink", label: "먹색", color: "#4b4a47" },
  { id: "ochre", label: "황토색", color: "#a17a4d" },
  { id: "orange", label: "가사 주황", color: "#b9683c" },
];
const vows: { id: TempleProfile["vow"]; label: string }[] = [
  { id: "quiet", label: "복잡한 마음 비우기" },
  { id: "healing", label: "지친 하루 치유" },
  { id: "family", label: "가족 평안" },
  { id: "wish", label: "소원 성취" },
];
const meritBlessings = ["+1 무량공덕(無量功德)", "+1 번뇌 소멸", "+1 자비 공양"];

function isTempleProfile(value: unknown): value is TempleProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (profile.gender === "male" || profile.gender === "female")
    && typeof profile.name === "string"
    && profile.name.trim().length > 0
    && (profile.robeColor === "gray" || profile.robeColor === "ink" || profile.robeColor === "ochre" || profile.robeColor === "orange")
    && (profile.vow === "quiet" || profile.vow === "healing" || profile.vow === "family" || profile.vow === "wish");
}

function readProfile(): TempleProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(profileStorageKey);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isTempleProfile(parsed) ? { ...parsed, name: parsed.name.trim() } : null;
  } catch {
    return null;
  }
}

function isWishLantern(value: unknown): value is WishLantern {
  if (typeof value !== "object" || value === null) return false;
  const lantern = value as Record<string, unknown>;
  return Number.isSafeInteger(lantern.id)
    && typeof lantern.wish === "string"
    && lantern.wish.trim().length > 0
    && typeof lantern.left === "number"
    && Number.isFinite(lantern.left)
    && lantern.left >= 0
    && lantern.left <= 100;
}

function readRitualData(): RitualData {
  if (typeof window === "undefined") return { merit: 0, wishLanterns: [], candleCount: 18, incenseCount: 12 };
  try {
    const stored = window.localStorage.getItem(ritualStorageKey);
    if (!stored) return { merit: 0, wishLanterns: [], candleCount: 18, incenseCount: 12 };
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return { merit: 0, wishLanterns: [], candleCount: 18, incenseCount: 12 };
    const record = parsed as Record<string, unknown>;
    const merit = typeof record.merit === "number" && Number.isSafeInteger(record.merit) && record.merit >= 0
      ? record.merit
      : 0;
    const wishLanterns = Array.isArray(record.wishLanterns)
      ? record.wishLanterns.filter(isWishLantern).slice(-10)
      : [];
    const candleCount = typeof record.candleCount === "number" && Number.isSafeInteger(record.candleCount) && record.candleCount >= 0
      ? record.candleCount
      : 18;
    const incenseCount = typeof record.incenseCount === "number" && Number.isSafeInteger(record.incenseCount) && record.incenseCount >= 0
      ? record.incenseCount
      : 12;
    return { merit, wishLanterns, candleCount, incenseCount };
  } catch {
    return { merit: 0, wishLanterns: [], candleCount: 18, incenseCount: 12 };
  }
}

const poses: { id: Pose; label: string; Icon: typeof Hand }[] = [
  { id: "meditate", label: "좌선", Icon: Sparkles },
  { id: "prayer", label: "합장", Icon: HandHeart },
  { id: "bow", label: "절하기", Icon: Hand },
];

function InitiationModal({ profile, onSave, onClose }: { profile: TempleProfile | null; onSave: (profile: TempleProfile) => void; onClose: () => void }) {
  const [gender, setGender] = useState<TempleProfile["gender"]>(profile?.gender ?? "male");
  const [name, setName] = useState(profile?.name ?? "");
  const [robeColor, setRobeColor] = useState<TempleProfile["robeColor"]>(profile?.robeColor ?? "gray");
  const [vow, setVow] = useState<TempleProfile["vow"]>(profile?.vow ?? "quiet");

  function recommendName() {
    const availableNames = suggestedNames.filter((suggestion) => suggestion !== name);
    setName(availableNames[Math.floor(Math.random() * availableNames.length)] ?? suggestedNames[0]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lawName = name.trim();
    if (!lawName) return;
    onSave({ gender, name: lawName, robeColor, vow });
  }

  return (
    <div className="modal-backdrop initiation-backdrop" onClick={(event) => { if (event.target === event.currentTarget && profile) onClose(); }}>
      <section className="initiation-modal" role="dialog" aria-modal="true" aria-labelledby="initiation-title">
        {profile && <button className="modal-close initiation-close" type="button" onClick={onClose} aria-label="닫기"><X size={18} /></button>}
        <div className="initiation-heading">
          <span className="initiation-seal">山</span>
          <p>일주문 입재식</p>
          <h2 id="initiation-title">고요한 발걸음으로, 법당에 들다</h2>
          <span className="initiation-intro">마음에 둘 법명과 오늘의 발원을 정해 주세요.</span>
        </div>

        <form className="initiation-form" onSubmit={submit}>
          <fieldset className="initiation-section">
            <legend>도반 유형</legend>
            <div className="gender-options" role="group" aria-label="도반 유형 선택">
              <button className={gender === "male" ? "gender-option gender-option--selected" : "gender-option"} type="button" onClick={() => setGender("male")} aria-pressed={gender === "male"}>
                <UserRound size={19} strokeWidth={1.6} />
                <span>처사</span><small>남성 동자승</small>
              </button>
              <button className={gender === "female" ? "gender-option gender-option--selected" : "gender-option"} type="button" onClick={() => setGender("female")} aria-pressed={gender === "female"}>
                <Flower2 size={19} strokeWidth={1.6} />
                <span>보살</span><small>여성 동녀승</small>
              </button>
            </div>
          </fieldset>

          <div className="initiation-section">
            <div className="field-heading">
              <label htmlFor="law-name">법명(法名)</label>
              <button className="name-draw-button" type="button" onClick={recommendName}><Dices size={15} />법명 추천 뽑기</button>
            </div>
            <input id="law-name" className="law-name-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={12} placeholder="법명을 적어 주세요" autoFocus={!profile} required />
          </div>

          <fieldset className="initiation-section">
            <legend>승복 색상</legend>
            <div className="robe-options" role="group" aria-label="승복 색상 선택">
              {robeChoices.map((choice) => (
                <button className={robeColor === choice.id ? "robe-option robe-option--selected" : "robe-option"} type="button" key={choice.id} onClick={() => setRobeColor(choice.id)} aria-pressed={robeColor === choice.id}>
                  <i style={{ backgroundColor: choice.color }} />
                  <span>{choice.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="initiation-section">
            <legend>오늘의 발원</legend>
            <div className="vow-options" role="group" aria-label="오늘 사찰을 찾은 이유">
              {vows.map((option) => (
                <button className={vow === option.id ? "vow-option vow-option--selected" : "vow-option"} type="button" key={option.id} onClick={() => setVow(option.id)} aria-pressed={vow === option.id}>{option.label}</button>
              ))}
            </div>
          </fieldset>

          <button className="initiation-submit" type="submit" disabled={!name.trim()}>
            {profile ? "수행 정보 저장" : "사찰 대웅전 입장하기"}
          </button>
        </form>
      </section>
    </div>
  );
}

function CompanionListModal({
  companions,
  userProfile,
  ownSeat,
  onWelcomeNew,
  onClose,
}: {
  companions: CompanionPractitioner[];
  userProfile: TempleProfile | null;
  ownSeat: number | null;
  onWelcomeNew: () => void;
  onClose: () => void;
}) {
  const robeLabels: Record<TempleProfile["robeColor"], { label: string; color: string }> = {
    gray: { label: "승복 회색", color: "#a9a69d" },
    ink: { label: "먹색", color: "#4b4a47" },
    ochre: { label: "황토색", color: "#a17a4d" },
    orange: { label: "가사 주황", color: "#b9683c" },
  };

  const vowLabels: Record<TempleProfile["vow"], string> = {
    quiet: "복잡한 마음 비우기",
    healing: "지친 하루 치유",
    family: "가족 평안",
    wish: "소원 성취",
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="companion-modal" role="dialog" aria-modal="true" aria-labelledby="companion-modal-title">
        <header className="modal-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="brand-seal" style={{ width: 24, height: 24, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={13} strokeWidth={2.2} />
              </span>
              <h2 id="companion-modal-title" className="text-lg font-serif text-[#f6dfa6]">도반 명부 (道伴 名簿)</h2>
            </div>
            <p className="modal-subtitle">사찰에서 인연 닿아 함께 묵언 정진 중인 도반들입니다</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div className="companion-modal-content">
          <div className="companion-user-card">
            <div className="companion-user-avatar">
              <span className="companion-robe-dot" style={{ backgroundColor: robeLabels[userProfile?.robeColor ?? "gray"].color }} />
              {userProfile?.gender === "female" ? <Flower2 size={18} className="text-pink-300" /> : <UserRound size={18} className="text-amber-200" />}
            </div>
            <div className="companion-user-info">
              <div className="flex items-center gap-2">
                <strong className="text-[#faebd0] font-serif text-base">{userProfile?.name ?? "나 (수행자)"}</strong>
                <span className="companion-badge-self">나 (본인)</span>
                <span className="companion-gender-tag">{userProfile?.gender === "female" ? "보살" : "처사"}</span>
              </div>
              <div className="companion-meta-row">
                <span className="companion-vow-badge">{vowLabels[userProfile?.vow ?? "quiet"]}</span>
                <span className="companion-robe-badge" style={{ borderColor: robeLabels[userProfile?.robeColor ?? "gray"].color }}>
                  {robeLabels[userProfile?.robeColor ?? "gray"].label}
                </span>
                <span className="companion-seat-badge">
                  {ownSeat !== null ? `제 ${Math.floor(ownSeat / 4) + 1}열 ${(ownSeat % 4) + 1}번 방석` : "법당 자유 보행 중"}
                </span>
              </div>
            </div>
          </div>

          <div className="companion-section-divider">
            <span>함께 정진하는 도반 ({companions.length}명)</span>
            <small>새 도반이 자연스럽게 오고 갑니다</small>
          </div>

          <div className="companion-list-scroll">
            {companions.map((comp) => {
              const dharmaInfo = naturalDharmaNames.find((d) => d.name === comp.name);
              const robeInfo = robeLabels[comp.robeColor];
              const rowNum = Math.floor(comp.seatIndex / 4) + 1;
              const colNum = (comp.seatIndex % 4) + 1;

              return (
                <div key={comp.id} className="companion-card">
                  <div className="companion-avatar">
                    <span className="companion-robe-dot" style={{ backgroundColor: robeInfo.color }} />
                    {comp.gender === "female" ? <Flower2 size={16} className="text-pink-300" /> : <UserRound size={16} className="text-amber-200" />}
                  </div>
                  <div className="companion-card-info">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-semibold text-[#f7e9d4] text-sm">
                        {comp.name}
                        {dharmaInfo?.hanja && <span className="text-xs text-[#c4b59d] ml-1">({dharmaInfo.hanja})</span>}
                      </span>
                      <span className="companion-gender-tag">{comp.gender === "female" ? "보살" : "처사"}</span>
                    </div>
                    {dharmaInfo?.meaning && (
                      <p className="companion-dharma-meaning">{dharmaInfo.meaning}</p>
                    )}
                    <div className="companion-meta-row mt-1">
                      <span className="companion-vow-badge">{vowLabels[comp.vow]}</span>
                      <span className="companion-robe-badge" style={{ borderColor: robeInfo.color }}>{robeInfo.label}</span>
                      <span className="companion-seat-badge">제 {rowNum}열 {colNum}번 방석</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="companion-modal-footer">
            <div className="companion-footer-hint">
              <Sparkles size={14} className="text-amber-300 flex-shrink-0" />
              <span>전국 각지에서 접속한 도반들이 일주문을 거쳐 방석에 정좌하고 함께 정진합니다.</span>
            </div>
            {companions.length < 18 && (
              <button
                type="button"
                className="companion-welcome-btn"
                onClick={onWelcomeNew}
              >
                <UserPlus size={15} />
                <span>새 도반 맞이하기 (인연 짓기)</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [profile, setProfile] = useState<TempleProfile | null>(readProfile);
  const [profileModalOpen, setProfileModalOpen] = useState(profile === null);
  const [hall, setHall] = useState<HallId>("main");
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => getTimePeriod(new Date()));
  const [localTime, setLocalTime] = useState(() => new Date());
  const [ownSeat, setOwnSeat] = useState<number | null>(null);
  const [pose, setPose] = useState<Pose>("meditate");
  const [notice, setNotice] = useState("고요한 법당에 머물러 보세요");
  const [chantEnabled, setChantEnabled] = useState(false);
  const [natureEnabled, setNatureEnabled] = useState(false);
  const [modal, setModal] = useState<"merit" | "mala" | "wish" | "candle" | "incense" | "prostration" | "sutra" | null>(null);
  const [currentSutraVerse, setCurrentSutraVerse] = useState<{ verse: HeartSutraVerse; index: number } | null>(null);
  const [ritualData, setRitualData] = useState<RitualData>(readRitualData);
  const [beadCount, setBeadCount] = useState(0);
  const [meritSequence, setMeritSequence] = useState(0);
  const [meritToast, setMeritToast] = useState<{ id: number; text: string } | null>(null);
  const [wishText, setWishText] = useState("");
  const [bowSequence, setBowSequence] = useState(0);
  const [candleSequence, setCandleSequence] = useState(0);
  const [candleVow, setCandleVow] = useState("지혜와 마음의 평안 발원");
  const [candleWishText, setCandleWishText] = useState("");
  const [incenseSequence, setIncenseSequence] = useState(0);
  const [incenseVow, setIncenseVow] = useState("삼독심을 여의고 마음의 청정을 발원합니다");
  const [incenseWishText, setIncenseWishText] = useState("");
  const [buddhaScale, setBuddhaScale] = useState<BuddhaScaleMode>("normal");
  const [prostrationType, setProstrationType] = useState<"3bae" | "108bae">("3bae");
  const [prostration3Count, setProstration3Count] = useState(0);
  const [prostration108Count, setProstration108Count] = useState(0);
  const [isAutoProstrating, setIsAutoProstrating] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("hall");
  const [zoomAction, setZoomAction] = useState<{ id: number; type: "in" | "out" | "reset" } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chantStopRef = useRef<(() => void) | null>(null);
  const natureStopRef = useRef<(() => void) | null>(null);
  const autoProstrationTimerRef = useRef<number | null>(null);
  const meritToastSequence = useRef(0);
  const { merit, wishLanterns } = ritualData;
  const [companions, setCompanions] = useState<CompanionPractitioner[]>(initialCompanions);
  const [companionListModalOpen, setCompanionListModalOpen] = useState(false);
  const practitionerCount = companions.length + (ownSeat !== null ? 1 : 0);
  const selectedHall = halls.find((item) => item.id === hall) ?? halls[0];

  const welcomeOrganicCompanion = useCallback(() => {
    setCompanions((prev) => {
      const occupied = [...prev.map((c) => c.seatIndex), ...(ownSeat !== null ? [ownSeat] : [])];
      if (occupied.length >= 20 || prev.length >= 18) {
        setNotice("법당 안 모든 방석이 도반들의 정진으로 가득 찼습니다");
        return prev;
      }
      const existingNames = new Set(prev.map((c) => c.name));
      if (profile?.name) existingNames.add(profile.name);
      const newCompanion = generateOrganicCompanion(occupied, existingNames);
      if (!newCompanion) {
        setNotice("더 이상 빈 방석이 없습니다");
        return prev;
      }
      playMalaBead(1);
      const genderLabel = newCompanion.gender === "female" ? "보살" : "처사";
      const toastId = meritToastSequence.current++;
      setMeritToast({
        id: toastId,
        text: `🌿 도반 '${newCompanion.name}' 님(${genderLabel})이 법당 방석에 정좌하셨습니다`,
      });
      setNotice(`새로운 도반 '${newCompanion.name}' 님(${genderLabel})이 합장하며 함께 정진합니다`);
      return [...prev, newCompanion];
    });
  }, [ownSeat, profile?.name]);

  // Real-time automatic online entry and departure cycle
  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setCompanions((prev) => {
        const occupied = [...prev.map((c) => c.seatIndex), ...(ownSeat !== null ? [ownSeat] : [])];
        const shouldDepart = prev.length >= 6 && Math.random() < 0.32;

        if (shouldDepart) {
          const leavingIdx = Math.floor(Math.random() * prev.length);
          const leaving = prev[leavingIdx];
          const remaining = prev.filter((_, i) => i !== leavingIdx);
          setNotice(`도반 '${leaving.name}' 님이 삼배를 올리고 평안히 회향(回向)하셨습니다`);
          return remaining;
        }

        if (prev.length < 13 && occupied.length < 20) {
          const existingNames = new Set(prev.map((c) => c.name));
          if (profile?.name) existingNames.add(profile.name);
          const newCompanion = generateOrganicCompanion(occupied, existingNames);
          if (newCompanion) {
            playMalaBead(1);
            const genderLabel = newCompanion.gender === "female" ? "보살" : "처사";
            const toastId = meritToastSequence.current++;
            setMeritToast({
              id: toastId,
              text: `🌿 도반 '${newCompanion.name}' 님(${genderLabel})이 법당 방석에 정좌하셨습니다`,
            });
            setNotice(`새 도반 '${newCompanion.name}' 님(${genderLabel})이 합장하며 함께 정진합니다`);
            return [...prev, newCompanion];
          }
        }
        return prev;
      });
    }, 32000);

    return () => clearInterval(cycleTimer);
  }, [ownSeat, profile?.name]);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  function handleZoomIn() {
    setZoomAction({ id: Date.now(), type: "in" });
  }

  function handleZoomOut() {
    setZoomAction({ id: Date.now(), type: "out" });
  }

  function handleResetView() {
    setCameraPreset("hall");
    setZoomAction({ id: Date.now(), type: "reset" });
  }

  useEffect(() => {
    const updateClock = () => {
      const current = new Date();
      setLocalTime(current);
      if (realTimeEnabled) setTimePeriod(getTimePeriod(current));
    };
    updateClock();
    const interval = window.setInterval(updateClock, 15000);
    return () => window.clearInterval(interval);
  }, [realTimeEnabled]);

  useEffect(() => {
    if (!modal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  useEffect(() => {
    if (!profileModalOpen || !profile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [profileModalOpen, profile]);

  useEffect(() => () => {
    chantStopRef.current?.();
    natureStopRef.current?.();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ritualStorageKey, JSON.stringify(ritualData));
    } catch {
      return;
    }
  }, [ritualData]);

  useEffect(() => {
    if (!profile) return;
    try {
      window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
    } catch {
      return;
    }
  }, [profile]);

  function chooseSeat(index: number | null) {
    setOwnSeat(index);
    if (index === null) {
      setNotice("마루를 천천히 거닙니다");
      return;
    }
    playWoodblock(0.12);
    setPose("meditate");
    setNotice("자리에 들었습니다. 고요히 호흡을 가다듬어 보세요");
  }

  function choosePose(pose: Pose) {
    if (ownSeat === null) {
      setNotice("먼저 빈 방석을 골라 자리에 앉아 주세요");
      return;
    }
    if (pose === "bow") {
      playWoodblock(0.3);
      setBowSequence((sequence) => sequence + 1);
    }
    setPose(pose);
    setNotice(pose === "meditate" ? "숨을 고르고 고요히 좌선에 듭니다" : pose === "prayer" ? "🙏 두 손을 모아 합장(🙏)하며 도반들과 세상에 평안의 마음을 전합니다" : "부처님 전에 정성으로 오체투지 예를 올립니다");
  }

  function saveProfile(nextProfile: TempleProfile) {
    setProfile(nextProfile);
    setProfileModalOpen(false);
    playTempleBell(0.16);
    setNotice(`${nextProfile.name} 법명으로 입재했습니다`);
  }

  function chooseTimePeriod(period: TimePeriod) {
    setRealTimeEnabled(false);
    setTimePeriod(period);
  }

  function toggleRealTime() {
    const enableRealTime = !realTimeEnabled;
    setRealTimeEnabled(enableRealTime);
    if (enableRealTime) setTimePeriod(getTimePeriod(new Date()));
  }

  function leaveSeat() {
    setOwnSeat(null);
    setNotice("자리를 비웠습니다. 머문 시간만큼 평안하시길 바랍니다");
  }

  function toggleChant() {
    if (chantStopRef.current) {
      chantStopRef.current();
      chantStopRef.current = null;
      setChantEnabled(false);
      setCurrentSutraVerse(null);
      setNotice("반야심경 독경을 마쳤습니다. 마음에 평안이 머물기를 바랍니다");
      return;
    }
    chantStopRef.current = startHeartSutraChant((verse, index) => {
      setCurrentSutraVerse({ verse, index });
    });
    setChantEnabled(true);
    setNotice("대웅전에 목탁 리듬과 함께 반야심경 독경이 울려 퍼집니다");
  }

  function toggleNature() {
    if (natureStopRef.current) {
      natureStopRef.current();
      natureStopRef.current = null;
      setNatureEnabled(false);
      return;
    }
    natureStopRef.current = startNatureSoundscape();
    setNatureEnabled(true);
  }

  function strikeWoodblock() {
    playWoodblock(0.35);
    setRitualData((current) => ({ ...current, merit: current.merit + 1 }));
    setMeritSequence((sequence) => sequence + 1);
    const id = meritToastSequence.current++;
    setMeritToast({ id, text: meritBlessings[id % meritBlessings.length] });
  }

  function strikeWoodblockRoll() {
    playMoktakRoll();
    setRitualData((current) => ({ ...current, merit: current.merit + 5 }));
    setMeritSequence((sequence) => sequence + 1);
    const id = meritToastSequence.current++;
    setMeritToast({ id, text: "+5 대경종 (목탁 연속 굴림)" });
    setNotice("또로록~ 탁! 맑은 목탁 울림이 법당 가득 울려 퍼집니다");
  }

  function handleLightCandle(customVow?: string) {
    const finalVow = (customVow || candleWishText.trim() || candleVow).trim();
    playCandleLighting();
    setCandleSequence((s) => s + 1);
    setRitualData((curr) => ({
      ...curr,
      candleCount: (curr.candleCount ?? 18) + 1,
      merit: curr.merit + 3,
    }));
    const toastId = meritToastSequence.current++;
    setMeritToast({ id: toastId, text: "+3 등불 공양 (지혜의 촛불을 밝혔습니다)" });
    setNotice(`불단 앞으로 나아가 촛불을 정성껏 올립니다: "${finalVow}"`);
    setCandleWishText("");
    setModal(null);
  }

  function handleOfferIncense(customVow?: string) {
    const finalVow = (customVow || incenseWishText.trim() || incenseVow).trim();
    playIncenseOffering();
    setIncenseSequence((s) => s + 1);
    setRitualData((curr) => ({
      ...curr,
      incenseCount: (curr.incenseCount ?? 12) + 1,
      merit: curr.merit + 3,
    }));
    const toastId = meritToastSequence.current++;
    setMeritToast({ id: toastId, text: "+3 분향 공양 (청정한 법의 향기를 올렸습니다)" });
    setNotice(`불단 앞으로 나아가 향을 정성껏 피웁니다: "${finalVow}"`);
    setIncenseWishText("");
    setModal(null);
  }

  const performProstrationStep = useCallback((typeOverride?: "3bae" | "108bae") => {
    const activeType = typeOverride ?? prostrationType;
    setOwnSeat((currentSeat) => (currentSeat === null ? 0 : currentSeat));
    setPose("bow");
    setBowSequence((seq) => seq + 1);
    playWoodblock(0.35);

    if (activeType === "3bae") {
      setProstration3Count((prev) => {
        const next = prev >= 3 ? 1 : prev + 1;
        const verse = prostrations3Verses[next - 1];
        setNotice(`[삼배 제 ${next}배] ${verse.koreanLiturgy} (${verse.shortLabel})`);
        if (next === 3) {
          setIsAutoProstrating(false);
          playTempleBell(0.3);
          setRitualData((curr) => ({ ...curr, merit: curr.merit + 3 }));
          setMeritToast({ id: meritToastSequence.current++, text: "+3 삼귀의 회향 (삼배 예불 완수 공덕)" });
        } else {
          setRitualData((curr) => ({ ...curr, merit: curr.merit + 1 }));
          setMeritToast({ id: meritToastSequence.current++, text: `+1 삼보 귀의 (제 ${next}배)` });
        }
        return next;
      });
    } else {
      setProstration108Count((prev) => {
        const next = prev >= 108 ? 1 : prev + 1;
        const verse = prostrationVerses[next - 1] ?? "부처님 전에 지극한 마음으로 예를 올립니다.";
        setNotice(`[108배 제 ${next}배] ${verse}`);
        if (next === 108) {
          setIsAutoProstrating(false);
          playTempleBell(0.3);
          setRitualData((curr) => ({ ...curr, merit: curr.merit + 108 }));
          setMeritToast({ id: meritToastSequence.current++, text: "+108 대원성취 (108배 완수 공덕)" });
        } else {
          setRitualData((curr) => ({ ...curr, merit: curr.merit + 1 }));
          setMeritToast({ id: meritToastSequence.current++, text: `+1 참회 공덕 (제 ${next}배)` });
        }
        return next;
      });
    }
  }, [prostrationType]);

  useEffect(() => {
    if (!isAutoProstrating) {
      if (autoProstrationTimerRef.current !== null) {
        window.clearInterval(autoProstrationTimerRef.current);
        autoProstrationTimerRef.current = null;
      }
      return;
    }

    performProstrationStep();

    autoProstrationTimerRef.current = window.setInterval(() => {
      performProstrationStep();
    }, 4800);

    return () => {
      if (autoProstrationTimerRef.current !== null) {
        window.clearInterval(autoProstrationTimerRef.current);
        autoProstrationTimerRef.current = null;
      }
    };
  }, [isAutoProstrating, performProstrationStep]);

  function turnBead() {
    if (beadCount >= 108) return;
    const nextCount = beadCount + 1;
    setBeadCount(nextCount);
    playMalaBead(nextCount);
    if (nextCount === 108) {
      playTempleBell();
      setNotice("108번 염주를 모두 돌렸습니다. 마음에 평안이 깃들기를 바랍니다");
    }
  }

  function hangWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wish = wishText.trim();
    if (!wish) return;
    setRitualData((current) => ({
      ...current,
      wishLanterns: [
        ...current.wishLanterns,
        { id: Date.now(), wish, left: 8 + ((current.wishLanterns.length * 17) % 84) },
      ].slice(-10),
    }));
    setWishText("");
    setModal(null);
    setNotice("소원을 담은 연꽃 연등을 처마에 걸었습니다");
  }

  return (
    <main className="sanctuary">
      <TempleScene
        companions={companions}
        friendSeats={companions.map((c) => c.seatIndex)}
        ownSeat={ownSeat}
        pose={pose}
        bowSequence={bowSequence}
        meritSequence={meritSequence}
        profile={profile}
        hall={hall}
        timePeriod={timePeriod}
        wishLanterns={wishLanterns}
        onSeatSelect={chooseSeat}
        cameraPreset={cameraPreset}
        zoomAction={zoomAction}
        candleSequence={candleSequence}
        incenseSequence={incenseSequence}
        buddhaScale={buddhaScale}
      />
      <div className="scene-vignette" aria-hidden="true" />
      <header className="topbar">
        <div className="header-left">
          <a className="brand flex items-center gap-3" href="#home" aria-label="산사 홈">
            <span className="brand-seal">山</span>
            <span><strong>SANSA</strong><small>온라인 산사</small></span>
          </a>
          <label className="hall-select-wrap">
            <select aria-label="법당 선택" value={hall} onChange={(event) => setHall(event.target.value as HallId)}>
              {halls.map((item) => <option value={item.id} key={item.id}>{item.label} ({item.subtitle})</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        </div>
        <div className="header-center">
          <div className="time-control" aria-label="시간대 분위기">
            <button className={`realtime-button${realTimeEnabled ? " realtime-button--active" : ""}`} type="button" onClick={toggleRealTime} aria-pressed={realTimeEnabled}>
              <Clock3 size={14} />
              <span>실시간</span>
              <time>{localTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}</time>
            </button>
            <div className="period-switch" role="group" aria-label="분위기 직접 선택">
              {periods.map((period) => (
                <button className={timePeriod === period.id ? "period-button period-button--active" : "period-button"} type="button" key={period.id} onClick={() => chooseTimePeriod(period.id)} aria-pressed={timePeriod === period.id}>
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="presence presence--clickable flex items-center gap-2"
            onClick={() => setCompanionListModalOpen(true)}
            aria-label={`지금 ${practitionerCount}명의 도반 정진 중. 도반 명부 보기`}
            title="현재 사찰에서 함께 정진 중인 도반 명부 보기"
          >
            <span className="presence-dot" />
            <span>지금 <b>{practitionerCount}명</b>의 도반 정진 중</span>
            <span className="presence-badge-tag">도반 명단 ▾</span>
          </button>
        </div>
        <div className="header-actions">
          <button className="profile-trigger" type="button" onClick={() => setProfileModalOpen(true)} aria-label={`법명 ${profile?.name ?? "정하기"} 변경`} title="법명과 수행 정보 변경">
            <UserRound size={15} strokeWidth={1.7} />
            <span>{profile?.name ?? "입재식"}</span>
          </button>
          <div className="audio-player" aria-label="법당 오디오">
            <button className={`audio-toggle${chantEnabled ? " audio-toggle--active" : ""}`} type="button" onClick={toggleChant} aria-pressed={chantEnabled} aria-label="반야심경 독경과 목탁 리듬 켜기 또는 끄기" title="반야심경 독경 & 목탁 리듬">
              <BookOpen size={16} strokeWidth={1.7} />
              <span>반야심경 독경<small>목탁 리듬</small></span>
              <i className="audio-state" />
            </button>
            <button className={`audio-toggle${natureEnabled ? " audio-toggle--active" : ""}`} type="button" onClick={toggleNature} aria-pressed={natureEnabled} aria-label="산사 자연음 바람과 계곡물 켜기 또는 끄기" title="산사 자연음 · 바람과 계곡물">
              <Wind size={16} strokeWidth={1.7} />
              <span>산사 자연음<small>바람 · 계곡물</small></span>
              <i className="audio-state" />
            </button>
          </div>
          <button
            className="action-icon-button"
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "전체화면 종료" : "전체화면 모드"}
            title={isFullscreen ? "전체화면 종료" : "전체화면으로 크게 보기"}
          >
            {isFullscreen ? <Minimize2 size={16} strokeWidth={1.8} /> : <Maximize2 size={16} strokeWidth={1.8} />}
          </button>
          <div className="room-name"><span>{selectedHall.label}</span><small>{selectedHall.subtitle}</small></div>
        </div>
      </header>

      <aside className="camera-panel" aria-label="시점 및 확대 조절">
        <div className="camera-preset-group" role="group" aria-label="카메라 시점">
          <button
            className={`camera-button${cameraPreset === "monk" ? " camera-button--active" : ""}`}
            type="button"
            onClick={() => setCameraPreset("monk")}
            title="동자승을 가까이서 크게 봅니다"
          >
            <Camera size={13} strokeWidth={1.8} />
            <span>동자승 줌인</span>
          </button>
          <button
            className={`camera-button${cameraPreset === "hall" ? " camera-button--active" : ""}`}
            type="button"
            onClick={() => setCameraPreset("hall")}
            title="법당의 고요한 전경을 봅니다"
          >
            <Sparkles size={13} strokeWidth={1.8} />
            <span>법당 전경</span>
          </button>
          <button
            className={`camera-button${cameraPreset === "altar" ? " camera-button--active" : ""}`}
            type="button"
            onClick={() => setCameraPreset("altar")}
            title="금빛 불단과 부처님을 가까이서 봅니다"
          >
            <Flower2 size={13} strokeWidth={1.8} />
            <span>불단 정면</span>
          </button>
        </div>
        <div className="camera-zoom-group" role="group" aria-label="화면 확대 축소">
          <button
            className="zoom-button"
            type="button"
            onClick={handleZoomIn}
            title="화면 확대 (줌인)"
            aria-label="화면 확대"
          >
            <ZoomIn size={14} strokeWidth={1.8} />
          </button>
          <button
            className="zoom-button"
            type="button"
            onClick={handleZoomOut}
            title="화면 축소 (줌아웃)"
            aria-label="화면 축소"
          >
            <ZoomOut size={14} strokeWidth={1.8} />
          </button>
          <button
            className="zoom-button"
            type="button"
            onClick={handleResetView}
            title="시점 원래대로"
            aria-label="시점 원래대로"
          >
            <RotateCcw size={13} strokeWidth={1.8} />
          </button>
        </div>
        <div className="buddha-scale-group" role="group" aria-label="불상 크기 조절">
          <button
            className={`buddha-scale-btn${buddhaScale === "grand3x" ? " buddha-scale-btn--grand" : ""}`}
            type="button"
            onClick={() => {
              const next = buddhaScale === "normal" ? "grand3x" : "normal";
              setBuddhaScale(next);
              setNotice(next === "grand3x" ? "3배 대불 모드로 변경되었습니다 (웅장한 대불 존상)" : "단아한 기본 크기로 변경되었습니다 (조화로운 본존불)");
            }}
            title={buddhaScale === "normal" ? "현재: 단아한 크기 (클릭 시 3배 대불 모드)" : "현재: 3배 대불 (클릭 시 단아한 크기)"}
            aria-label="불상 크기 조절"
          >
            <Sparkles size={13} strokeWidth={1.8} className={buddhaScale === "grand3x" ? "text-amber-300" : "text-amber-400"} />
            <span>{buddhaScale === "normal" ? "불상: 단아함" : "불상: 3배 대불"}</span>
          </button>
        </div>
      </aside>

      <div className="quiet-note" aria-live="polite"><span className="note-mark">◦</span>{notice}</div>
      {meritToast && <div className="merit-float" key={meritToast.id} role="status" aria-live="polite" onAnimationEnd={() => setMeritToast((current) => current?.id === meritToast.id ? null : current)}>{meritToast.text}</div>}

      <div className="bottom-dock">
        <section className="practice-controls" aria-label="수행 자세">
          <div className="pose-switch" role="group" aria-label="자세 선택">
            {poses.map(({ id, label, Icon }) => (
              <button
                className={`pose-button${ownSeat !== null && pose === id ? " pose-button--active" : ""}`}
                type="button"
                key={id}
                onClick={() => choosePose(id)}
                aria-label={label}
                aria-pressed={ownSeat !== null && pose === id}
                title={label}
              >
                <Icon size={17} strokeWidth={1.7} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {ownSeat !== null && (
            <button className="leave-button" type="button" onClick={leaveSeat} aria-label="자리 비우기" title="자리 비우기">
              <LogOut size={17} strokeWidth={1.7} />
            </button>
          )}
        </section>
        <section className="healing-actions" aria-label="힐링 인터랙션">
          <button className="ritual-button" type="button" onClick={() => { strikeWoodblock(); setModal("merit"); }} aria-label="목탁 치기" title="목탁 치기">
            <Bell size={16} strokeWidth={1.7} /><span>목탁 치기</span>
          </button>
          <button
            className={`ritual-button${candleSequence > 0 ? " ritual-button--glowing" : ""}`}
            type="button"
            onClick={() => setModal("candle")}
            aria-label="촛불 켜기"
            title="부처님 불전에 촛불 켜기"
          >
            <Flame size={16} strokeWidth={1.7} className="text-amber-400" />
            <span>촛불 켜기</span>
            {Boolean(ritualData.candleCount && ritualData.candleCount > 0) && (
              <small className="ritual-badge">{ritualData.candleCount}</small>
            )}
          </button>
          <button
            className={`ritual-button${incenseSequence > 0 ? " ritual-button--glowing" : ""}`}
            type="button"
            onClick={() => setModal("incense")}
            aria-label="향 피우기"
            title="부처님 불전에 분향(향 피우기)"
          >
            <Wind size={16} strokeWidth={1.7} className="text-orange-400" />
            <span>향 피우기</span>
            {Boolean(ritualData.incenseCount && ritualData.incenseCount > 0) && (
              <small className="ritual-badge">{ritualData.incenseCount}</small>
            )}
          </button>
          <button
            className={`ritual-button${prostration3Count > 0 ? " ritual-button--active" : ""}`}
            type="button"
            onClick={() => {
              setProstrationType("3bae");
              setModal("prostration");
            }}
            aria-label="3배 삼귀의 예불"
            title="부처님 전 지극한 삼배(3배) 예불 올리기"
          >
            <HandHeart size={16} strokeWidth={1.7} className="text-amber-300" />
            <span>3배 예불</span>
            {prostration3Count > 0 && (
              <small className="ritual-badge">{prostration3Count}/3</small>
            )}
          </button>
          <button
            className={`ritual-button${prostration108Count > 0 ? " ritual-button--active" : ""}`}
            type="button"
            onClick={() => {
              setProstrationType("108bae");
              setModal("prostration");
            }}
            aria-label="108배 참회 정진"
            title="108배 참회와 발원 정진"
          >
            <Award size={16} strokeWidth={1.7} className="text-amber-300" />
            <span>108배</span>
            {prostration108Count > 0 && (
              <small className="ritual-badge">{prostration108Count}/108</small>
            )}
          </button>
          <button className="ritual-button" type="button" onClick={() => setModal("mala")} aria-label="108 염주" title="108 염주">
            <CircleDot size={16} strokeWidth={1.7} /><span>108 염주</span>
          </button>
          <button className="ritual-button" type="button" onClick={() => setModal("wish")} aria-label="소원 연등" title="소원 연등">
            <Lamp size={16} strokeWidth={1.7} /><span>소원 연등</span>
          </button>
        </section>
      </div>

      {isAutoProstrating && modal !== "prostration" && (
        <aside className="prostration-hud" aria-live="polite">
          <div className="prostration-hud-badge">
            <HandHeart size={14} className="prostration-hud-icon" />
            <span>{prostrationType === "3bae" ? "3배 예불 정진 중" : "108배 정진 중"}</span>
            <strong>
              {prostrationType === "3bae" ? `${prostration3Count} / 3배` : `${prostration108Count} / 108배`}
            </strong>
          </div>
          <p className="prostration-hud-verse">
            {prostrationType === "3bae"
              ? prostrations3Verses[Math.max(0, Math.min(2, prostration3Count === 0 ? 0 : prostration3Count - 1))].koreanLiturgy
              : prostrationVerses[Math.max(0, (prostration108Count === 0 ? 0 : prostration108Count - 1))]}
          </p>
          <div className="prostration-hud-actions">
            <button
              type="button"
              className="prostration-hud-btn"
              onClick={() => setIsAutoProstrating(false)}
            >
              <Pause size={12} /> 일시정지
            </button>
            <button
              type="button"
              className="prostration-hud-btn prostration-hud-btn--accent"
              onClick={() => setModal("prostration")}
            >
              상세 보기
            </button>
          </div>
        </aside>
      )}

      {chantEnabled && currentSutraVerse && (
        <aside className="sutra-hud" aria-live="polite">
          <div className="sutra-hud-header">
            <span className="sutra-hud-badge">
              <BookOpen size={13} className="text-amber-400" />
              <span>반야심경 독경</span>
              <small>({currentSutraVerse.index + 1} / {heartSutraVerses.length})</small>
            </span>
            <button
              type="button"
              className="sutra-hud-expand-btn"
              onClick={() => setModal("sutra")}
              title="반야심경 전문 보기"
            >
              경전 전문 보기
            </button>
          </div>
          <p className="sutra-hud-hanja">{currentSutraVerse.verse.hanja}</p>
          <p className="sutra-hud-text">{currentSutraVerse.verse.text}</p>
          <p className="sutra-hud-meaning">{currentSutraVerse.verse.meaning}</p>
        </aside>
      )}

      {profileModalOpen && <InitiationModal profile={profile} onSave={saveProfile} onClose={() => setProfileModalOpen(false)} />}

      {companionListModalOpen && (
        <CompanionListModal
          companions={companions}
          userProfile={profile}
          ownSeat={ownSeat}
          onWelcomeNew={welcomeOrganicCompanion}
          onClose={() => setCompanionListModalOpen(false)}
        />
      )}

      {modal && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className={`ritual-modal${modal === "prostration" ? " ritual-modal--prostration" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ritual-title">
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="닫기"><X size={18} /></button>
            {modal === "merit" && (
              <div className="merit-content">
                <span className="modal-symbol"><Bell size={22} strokeWidth={1.5} /></span>
                <p className="modal-eyebrow">작은 울림, 맑은 마음</p>
                <h2 id="ritual-title">공덕 +1</h2>
                <p className="modal-copy">맑고 그윽한 한국 전통 목탁 소리가 고요한 법당에 울려 퍼집니다.</p>
                <div className="merit-total">쌓은 공덕 <strong>{merit}</strong></div>
                <div className="merit-btn-group">
                  <button className="modal-primary" type="button" onClick={strikeWoodblock}>목탁 1타 치기 (+1)</button>
                  <button className="modal-secondary moktak-roll-btn" type="button" onClick={strikeWoodblockRoll}>
                    <Sparkles size={14} /> 또로록~ 탁! (연속 굴림)
                  </button>
                </div>
              </div>
            )}
            {modal === "candle" && (
              <div className="candle-content">
                <span className="modal-symbol"><Flame size={24} strokeWidth={1.5} className="text-amber-400" /></span>
                <p className="modal-eyebrow">지혜와 자비의 등불</p>
                <h2 id="ritual-title">부처님 전 촛불 공양</h2>
                <p className="modal-copy">
                  어둠을 밝히는 한 자루의 촛불처럼, 번뇌를 지혜로 밝히고 온 가족의 평안을 발원합니다.
                </p>

                <div className="candle-vow-selector">
                  <span className="candle-section-label">정진 발원문 선택</span>
                  <div className="candle-preset-grid">
                    {[
                      "마음의 평화와 지혜 발원",
                      "온 가족의 무사안녕과 건강",
                      "모든 번뇌와 어둠의 소멸",
                      "간절한 소원 성취와 정진",
                    ].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`candle-preset-btn${candleVow === v ? " candle-preset-btn--selected" : ""}`}
                        onClick={() => setCandleVow(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="candle-custom-input">
                  <label htmlFor="candle-wish-input">직접 발원문 적기 (선택)</label>
                  <input
                    id="candle-wish-input"
                    type="text"
                    value={candleWishText}
                    onChange={(e) => setCandleWishText(e.target.value)}
                    placeholder="마음속 간절한 서원을 한 줄로 담아보세요"
                    maxLength={50}
                  />
                </div>

                <div className="candle-stats-banner">
                  <span>지금까지 법당에 밝힌 촛불</span>
                  <strong>{ritualData.candleCount ?? 18}자루</strong>
                </div>

                <div className="candle-modal-actions">
                  <button
                    className="modal-primary candle-light-btn"
                    type="button"
                    onClick={() => handleLightCandle()}
                  >
                    <Flame size={17} />
                    <span>정성으로 촛불 밝히기 (+3 공덕)</span>
                  </button>
                </div>
              </div>
            )}
            {modal === "incense" && (
              <div className="candle-content incense-content">
                <span className="modal-symbol"><Wind size={24} strokeWidth={1.5} className="text-orange-400" /></span>
                <p className="modal-eyebrow">청정함과 해탈의 향기</p>
                <h2 id="ritual-title">부처님 전 분향(焚香) 공양</h2>
                <p className="modal-copy">
                  계향(戒香)·정향(定香)·혜향(慧香)의 맑은 향을 피워 번뇌와 삼독심을 씻어내고 온 누리에 자비향을 올립니다.
                </p>

                <div className="candle-vow-selector">
                  <span className="candle-section-label">정진 발원문 선택</span>
                  <div className="candle-preset-grid">
                    {[
                      "삼독심(탐·진·치)을 여의고 마음의 청정 발원",
                      "온 누리 생명에게 부처님의 자비향 가득하길",
                      "선망 조상과 일체 인연 영가의 극락왕생",
                      "복잡한 생각과 번뇌를 비우고 마음의 평온",
                    ].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`candle-preset-btn${incenseVow === v ? " candle-preset-btn--selected" : ""}`}
                        onClick={() => setIncenseVow(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="candle-custom-input">
                  <label htmlFor="incense-wish-input">직접 발원문 적기 (선택)</label>
                  <input
                    id="incense-wish-input"
                    type="text"
                    value={incenseWishText}
                    onChange={(e) => setIncenseWishText(e.target.value)}
                    placeholder="마음속 간절한 서원을 한 줄로 담아보세요"
                    maxLength={50}
                  />
                </div>

                <div className="candle-stats-banner">
                  <span>지금까지 법당에 올린 분향 공양</span>
                  <strong>{ritualData.incenseCount ?? 12}회</strong>
                </div>

                <div className="candle-modal-actions">
                  <button
                    className="modal-primary candle-light-btn"
                    type="button"
                    onClick={() => handleOfferIncense()}
                  >
                    <Wind size={17} />
                    <span>정성으로 분향하기 (+3 공덕)</span>
                  </button>
                </div>
              </div>
            )}
            {modal === "prostration" && (
              <div className="prostration-content">
                <div className="prostration-tab-bar" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={prostrationType === "3bae"}
                    className={`prostration-tab${prostrationType === "3bae" ? " prostration-tab--active" : ""}`}
                    onClick={() => {
                      setIsAutoProstrating(false);
                      setProstrationType("3bae");
                    }}
                  >
                    <HandHeart size={15} />
                    <span>3배 (삼귀의 예불)</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={prostrationType === "108bae"}
                    className={`prostration-tab${prostrationType === "108bae" ? " prostration-tab--active" : ""}`}
                    onClick={() => {
                      setIsAutoProstrating(false);
                      setProstrationType("108bae");
                    }}
                  >
                    <Award size={15} />
                    <span>108배 (백팔배 참회)</span>
                  </button>
                </div>

                {prostrationType === "3bae" ? (
                  <>
                    <span className="modal-symbol"><HandHeart size={24} strokeWidth={1.5} className="text-amber-300" /></span>
                    <p className="modal-eyebrow">오체투지(五體投地) · 삼귀의(三歸依) 예불</p>
                    <h2 id="ritual-title">부처님 전 지극한 삼배(三拜) 예불</h2>
                    <p className="modal-copy">
                      불·법·승 삼보(三寶)에 지극한 정성으로 예를 올리고 삼귀의 공덕을 기립니다.
                    </p>

                    <div className="prostration-progress-box">
                      <div className="prostration-count-row">
                        <span className="prostration-step-label">현재 삼배 올린 횟수</span>
                        <strong className="prostration-number">{prostration3Count} <small>/ 3배</small></strong>
                      </div>
                      <div className="prostration-3steps-grid">
                        {prostrations3Verses.map((v, idx) => {
                          const isDone = prostration3Count >= v.bow;
                          const isCurrent = prostration3Count === v.bow || (prostration3Count === 0 && idx === 0);
                          return (
                            <div
                              key={v.bow}
                              className={`prostration-3step-card${isDone ? " prostration-3step-card--done" : isCurrent ? " prostration-3step-card--current" : ""}`}
                            >
                              <span className="step-num">{v.bow}배</span>
                              <strong className="step-label">{idx === 0 ? "불보(佛寶)" : idx === 1 ? "법보(法寶)" : "승보(僧寶)"}</strong>
                              <small className="step-sub">{idx === 0 ? "부처님 귀의" : idx === 1 ? "가르침 귀의" : "승가 귀의"}</small>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {(() => {
                      const curIdx = Math.max(0, Math.min(2, prostration3Count === 0 ? 0 : prostration3Count - 1));
                      const curVerse = prostrations3Verses[curIdx];
                      return (
                        <div className="prostration-verse-box prostration-3bae-verse-box">
                          <span className="verse-badge">{curVerse.title}</span>
                          <p className="verse-hanja">{curVerse.hanja}</p>
                          <p className="verse-liturgy">"{curVerse.koreanLiturgy}"</p>
                          <p className="verse-meaning">{curVerse.meaning}</p>
                          <p className="verse-merit-desc">◦ {curVerse.meritDescription}</p>
                        </div>
                      );
                    })()}

                    <div className="prostration-action-grid">
                      <button
                        className="modal-primary prostration-btn-single"
                        type="button"
                        onClick={() => performProstrationStep("3bae")}
                      >
                        <Hand size={16} />
                        <span>정성으로 1배 올리기 (+1)</span>
                      </button>
                      <button
                        className={`modal-secondary prostration-btn-auto${isAutoProstrating ? " prostration-btn-auto--active" : ""}`}
                        type="button"
                        onClick={() => setIsAutoProstrating((prev) => !prev)}
                      >
                        {isAutoProstrating ? (
                          <>
                            <Pause size={16} />
                            <span>자동 3배 일시정지</span>
                          </>
                        ) : (
                          <>
                            <Play size={16} />
                            <span>자동 3배 시작 (4.8초 호흡)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {prostration3Count > 0 && (
                      <div className="prostration-footer-options">
                        <button
                          type="button"
                          className="prostration-reset-btn"
                          onClick={() => {
                            setIsAutoProstrating(false);
                            setProstration3Count(0);
                            setNotice("삼배 예불을 처음부터 다시 시작합니다");
                          }}
                        >
                          <RotateCcw size={13} /> 처음부터 다시
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span className="modal-symbol"><Award size={24} strokeWidth={1.5} className="text-amber-300" /></span>
                    <p className="modal-eyebrow">오체투지(五體投地)와 접족례(接足禮)</p>
                    <h2 id="ritual-title">108배 참회 및 발원 정진</h2>

                    <div className="prostration-progress-box">
                      <div className="prostration-count-row">
                        <span className="prostration-step-label">현재 절 올린 횟수</span>
                        <strong className="prostration-number">{prostration108Count} <small>/ 108배</small></strong>
                      </div>
                      <div className="prostration-progress-track">
                        <div
                          className="prostration-progress-fill"
                          style={{ width: `${Math.min(100, (prostration108Count / 108) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="prostration-verse-box">
                      <span className="verse-badge">제 {Math.max(1, prostration108Count)}배 참회 발원문</span>
                      <p className="verse-text">
                        "{prostrationVerses[Math.max(0, (prostration108Count === 0 ? 0 : prostration108Count - 1))]}"
                      </p>
                    </div>

                    <div className="prostration-action-grid">
                      <button
                        className="modal-primary prostration-btn-single"
                        type="button"
                        onClick={() => performProstrationStep("108bae")}
                      >
                        <Hand size={16} />
                        <span>정성으로 1배 올리기 (+1)</span>
                      </button>
                      <button
                        className={`modal-secondary prostration-btn-auto${isAutoProstrating ? " prostration-btn-auto--active" : ""}`}
                        type="button"
                        onClick={() => setIsAutoProstrating((prev) => !prev)}
                      >
                        {isAutoProstrating ? (
                          <>
                            <Pause size={16} />
                            <span>자동 정진 일시정지</span>
                          </>
                        ) : (
                          <>
                            <Play size={16} />
                            <span>자동 108배 시작 (4.8초 호흡)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {prostration108Count > 0 && (
                      <div className="prostration-footer-options">
                        <button
                          type="button"
                          className="prostration-reset-btn"
                          onClick={() => {
                            setIsAutoProstrating(false);
                            setProstration108Count(0);
                            setNotice("108배를 처음부터 다시 시작합니다");
                          }}
                        >
                          <RotateCcw size={13} /> 처음부터 다시
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {modal === "mala" && (
              <div className="mala-content">
                <p className="modal-eyebrow">천천히, 한 알씩</p>
                <h2 id="ritual-title">108 염주</h2>
                <div className="mala-ring" aria-hidden="true">
                  {Array.from({ length: 108 }, (_, index) => (
                    <i className={`${index < beadCount ? "mala-bead mala-bead--turned" : "mala-bead"}${index === beadCount - 1 ? " mala-bead--rolling" : ""}`} key={index} style={{ "--bead-index": index } as React.CSSProperties} />
                  ))}
                  <div className="mala-count" key={beadCount}><strong>{beadCount}</strong><span>/ 108</span></div>
                </div>
                <p className="modal-copy">한 알을 넘길 때마다 숨을 고릅니다.</p>
                {beadCount < 108 ? (
                  <button className="modal-primary" type="button" onClick={turnBead}>염주 한 알 넘기기</button>
                ) : (
                  <button className="modal-primary" type="button" onClick={() => setBeadCount(0)}>처음부터 다시</button>
                )}
              </div>
            )}
            {modal === "sutra" && (
              <div className="sutra-content">
                <span className="modal-symbol"><BookOpen size={24} strokeWidth={1.5} className="text-amber-300" /></span>
                <p className="modal-eyebrow">대혜도경(大慧度經)의 정수</p>
                <h2 id="ritual-title">마하반야바라밀다심경 (摩訶般若波羅蜜多心經)</h2>
                <p className="modal-copy">부처님의 대지혜로 모든 고통과 번뇌를 여의는 260자 반야심경 전문입니다.</p>

                <div className="sutra-scroll-view">
                  {heartSutraVerses.map((verse, vIdx) => {
                    const isReciting = currentSutraVerse?.index === vIdx;
                    return (
                      <div
                        key={vIdx}
                        className={`sutra-verse-card${isReciting ? " sutra-verse-card--active" : ""}`}
                      >
                        <div className="sutra-card-head">
                          <span className="sutra-verse-num">제 {vIdx + 1}구</span>
                          {isReciting && <span className="sutra-reciting-indicator">지금 독경 중</span>}
                        </div>
                        <p className="sutra-card-hanja">{verse.hanja}</p>
                        <p className="sutra-card-text">{verse.text}</p>
                        <p className="sutra-card-meaning">{verse.meaning}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="sutra-modal-footer">
                  <button
                    className={`modal-primary${chantEnabled ? " sutra-btn-chanting" : ""}`}
                    type="button"
                    onClick={toggleChant}
                  >
                    {chantEnabled ? <Pause size={15} /> : <Play size={15} />}
                    <span>{chantEnabled ? "독경 일시멈춤" : "반야심경 독경 시작"}</span>
                  </button>
                </div>
              </div>
            )}
            {modal === "wish" && (
              <form className="wish-content" onSubmit={hangWish}>
                <span className="modal-symbol"><Lamp size={22} strokeWidth={1.5} /></span>
                <p className="modal-eyebrow">마음속 바람을 담아</p>
                <h2 id="ritual-title">소원 연꽃 연등</h2>
                <label htmlFor="wish-text">나만의 소원</label>
                <textarea id="wish-text" value={wishText} onChange={(event) => setWishText(event.target.value)} maxLength={100} placeholder="고요히 바라는 마음을 적어 보세요" rows={3} autoFocus />
                <div className="wish-form-footer"><span>{wishText.length} / 100</span><button className="modal-primary" type="submit" disabled={!wishText.trim()}>연등 걸기</button></div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
