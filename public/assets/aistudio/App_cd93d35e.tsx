import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bell, BookOpen, ChevronDown, CircleDot, Clock3, Dices, Flower2, Hand, HandHeart, Lamp, LogOut, Sparkles, UserRound, Wind, X } from "lucide-react";
import { playMalaBead, playTempleBell, playWoodblock, startHeartSutraChant, startNatureSoundscape } from "./audio";
import TempleScene, { type TempleHall, type TempleLantern, type TemplePose, type TempleProfile, type TempleTimePeriod } from "./TempleScene";

type Pose = TemplePose;
type WishLantern = TempleLantern;
type RitualData = { merit: number; wishLanterns: WishLantern[] };
type HallId = TempleHall;
type TimePeriod = TempleTimePeriod;

const halls: { id: HallId; label: string; subtitle: string }[] = [
  { id: "main", label: "대웅전", subtitle: "본당" },
  { id: "pureLand", label: "극락전", subtitle: "아미타당" },
  { id: "mountain", label: "산신각", subtitle: "숲속 암자" },
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
const friendSeatIndexes = [1, 5, 8, 12, 15, 18];
const suggestedNames = ["청안", "연화", "보리심", "도연", "원각", "지안", "혜명", "서원"];
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
  if (typeof window === "undefined") return { merit: 0, wishLanterns: [] };
  try {
    const stored = window.localStorage.getItem(ritualStorageKey);
    if (!stored) return { merit: 0, wishLanterns: [] };
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return { merit: 0, wishLanterns: [] };
    const record = parsed as Record<string, unknown>;
    const merit = typeof record.merit === "number" && Number.isSafeInteger(record.merit) && record.merit >= 0
      ? record.merit
      : 0;
    const wishLanterns = Array.isArray(record.wishLanterns)
      ? record.wishLanterns.filter(isWishLantern).slice(-10)
      : [];
    return { merit, wishLanterns };
  } catch {
    return { merit: 0, wishLanterns: [] };
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
          <span className="initiation-intro">마음에 둘 이름과 오늘의 발원을 정해 주세요.</span>
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
  const [modal, setModal] = useState<"merit" | "mala" | "wish" | null>(null);
  const [ritualData, setRitualData] = useState<RitualData>(readRitualData);
  const [beadCount, setBeadCount] = useState(0);
  const [meritSequence, setMeritSequence] = useState(0);
  const [meritToast, setMeritToast] = useState<{ id: number; text: string } | null>(null);
  const [wishText, setWishText] = useState("");
  const [bowSequence, setBowSequence] = useState(0);
  const chantStopRef = useRef<(() => void) | null>(null);
  const natureStopRef = useRef<(() => void) | null>(null);
  const meritToastSequence = useRef(0);
  const { merit, wishLanterns } = ritualData;
  const practitionerCount = friendSeatIndexes.length + (ownSeat !== null ? 1 : 0);
  const selectedHall = halls.find((item) => item.id === hall) ?? halls[0];

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
    setNotice(pose === "meditate" ? "숨을 고르고 고요히 머뭅니다" : pose === "prayer" ? "두 손을 모아 마음을 가다듬습니다" : "천천히 몸과 마음을 낮춥니다");
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
      return;
    }
    chantStopRef.current = startHeartSutraChant();
    setChantEnabled(true);
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
    playWoodblock(0.3);
    setRitualData((current) => ({ ...current, merit: current.merit + 1 }));
    setMeritSequence((sequence) => sequence + 1);
    const id = meritToastSequence.current++;
    setMeritToast({ id, text: meritBlessings[id % meritBlessings.length] });
  }

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
    setNotice("소원을 연등에 담아 처마에 걸었습니다");
  }

  return (
    <main className="sanctuary">
      <TempleScene
        friendSeats={friendSeatIndexes}
        ownSeat={ownSeat}
        pose={pose}
        bowSequence={bowSequence}
        meritSequence={meritSequence}
        profile={profile}
        hall={hall}
        timePeriod={timePeriod}
        wishLanterns={wishLanterns}
        onSeatSelect={chooseSeat}
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
          <div className="presence flex items-center gap-3" aria-live="polite">
            <span className="presence-dot" />
            <span>지금 <b>{practitionerCount}명</b>의 도반이 함께 정진 중</span>
          </div>
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
          <div className="room-name"><span>{selectedHall.label}</span><small>{selectedHall.subtitle}</small></div>
        </div>
      </header>

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
          <button className="ritual-button" type="button" onClick={() => setModal("mala")} aria-label="108 염주" title="108 염주">
            <CircleDot size={16} strokeWidth={1.7} /><span>108 염주</span>
          </button>
          <button className="ritual-button" type="button" onClick={() => setModal("wish")} aria-label="소원 연등" title="소원 연등">
            <Lamp size={16} strokeWidth={1.7} /><span>소원 연등</span>
          </button>
        </section>
      </div>

      {profileModalOpen && <InitiationModal profile={profile} onSave={saveProfile} onClose={() => setProfileModalOpen(false)} />}

      {modal && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="ritual-modal" role="dialog" aria-modal="true" aria-labelledby="ritual-title">
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="닫기"><X size={18} /></button>
            {modal === "merit" && (
              <div className="merit-content">
                <span className="modal-symbol"><Bell size={22} strokeWidth={1.5} /></span>
                <p className="modal-eyebrow">작은 울림, 맑은 마음</p>
                <h2 id="ritual-title">공덕 +1</h2>
                <p className="modal-copy">목탁 소리가 고요한 법당에 번집니다.</p>
                <div className="merit-total">쌓은 공덕 <strong>{merit}</strong></div>
                <button className="modal-primary" type="button" onClick={strikeWoodblock}>한 번 더 두드리기</button>
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
            {modal === "wish" && (
              <form className="wish-content" onSubmit={hangWish}>
                <span className="modal-symbol"><Lamp size={22} strokeWidth={1.5} /></span>
                <p className="modal-eyebrow">마음속 바람을 담아</p>
                <h2 id="ritual-title">소원 연등</h2>
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