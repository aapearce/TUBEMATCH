import { useState, useEffect, useCallback, useRef } from 'react'

// ── All viable TfL lines (Circle + Waterloo & City excluded — no unique stations)
const LINES = {
  bakerloo:     { name: 'Bakerloo',          color: '#B36305' },
  central:      { name: 'Central',           color: '#E32017' },
  district:     { name: 'District',          color: '#00782A' },
  hammersmith:  { name: 'Hammersmith & City',color: '#F3A9BB' },
  jubilee:      { name: 'Jubilee',           color: '#A0A5A9' },
  metropolitan: { name: 'Metropolitan',      color: '#9B0056' },
  northern:     { name: 'Northern',          color: '#1c1c1c', border: '#555' },
  piccadilly:   { name: 'Piccadilly',        color: '#003688' },
  victoria:     { name: 'Victoria',          color: '#0098D4' },
  elizabeth:    { name: 'Elizabeth',         color: '#6950A1' },
  dlr:          { name: 'DLR',               color: '#00A4A7' },
  lioness:      { name: 'Lioness',           color: '#F0A500' },
  mildmay:      { name: 'Mildmay',           color: '#0B4EAE' },
  suffragette:  { name: 'Suffragette',       color: '#4CAF50' },
  weaver:       { name: 'Weaver',            color: '#7B2D8B' },
  liberty:      { name: 'Liberty',           color: '#6B6B6B' },
}

// ── 18 pairs — every station exclusively on its listed line ──────────────────
// Sources verified: no station in this list is served by more than one of the
// 16 listed lines. Circle and W&C omitted by design (zero unique stations).
const PAIRS = [
  // Bakerloo — unique to Bakerloo only
  { id:  1, line: 'bakerloo',     stations: ['Stonebridge Park',    'Kensal Green'] },
  // Central — Hainault loop / Epping branch, Central only
  { id:  2, line: 'central',      stations: ['Theydon Bois',        'Debden'] },
  // District — Barking branch, District only
  { id:  3, line: 'district',     stations: ['Becontree',           'Upney'] },
  // Hammersmith & City — these 2 are H&C only
  { id:  4, line: 'hammersmith',  stations: ['Goldhawk Road',       "Shepherd's Bush Market"] },
  // Jubilee — Stanmore branch termini, Jubilee only
  { id:  5, line: 'jubilee',      stations: ['Kingsbury',           'Canons Park'] },
  // Metropolitan — Chesham/Amersham branch, Met only
  { id:  6, line: 'metropolitan', stations: ['Chesham',             'Amersham'] },
  // Northern — Morden branch, Northern only
  { id:  7, line: 'northern',     stations: ['Morden',              'Colliers Wood'] },
  // Piccadilly — Heathrow spur, Piccadilly only
  { id:  8, line: 'piccadilly',   stations: ['Hatton Cross',        'Heathrow Terminal 4'] },
  // Victoria — unique Victoria-only stations
  { id:  9, line: 'victoria',     stations: ['Pimlico',             'Blackhorse Road'] },
  // Elizabeth line — stations west of Hayes, Elizabeth only
  { id: 10, line: 'elizabeth',    stations: ['Taplow',              'Langley'] },
  // DLR — Island Gardens branch, DLR only
  { id: 11, line: 'dlr',          stations: ['Mudchute',            'Island Gardens'] },
  // Lioness (Overground: Watford Jn–Euston) — unique to Lioness
  { id: 12, line: 'lioness',      stations: ['Headstone Lane',      'Hatch End'] },
  // Mildmay (Overground: Stratford–Clapham Jn/Richmond) — unique to Mildmay
  { id: 13, line: 'mildmay',      stations: ['Caledonian Road & Barnsbury', 'Canonbury'] },
  // Suffragette (Overground: Gospel Oak–Barking) — unique to Suffragette
  { id: 14, line: 'suffragette',  stations: ['Wanstead Park',       'Woodgrange Park'] },
  // Weaver (Overground: Liverpool St–Enfield/Cheshunt/Chingford) — unique to Weaver
  { id: 15, line: 'weaver',       stations: ['Highams Park',        'Chingford'] },
  // Liberty (Overground: Romford–Upminster) — unique to Liberty
  { id: 16, line: 'liberty',      stations: ['Emerson Park',        'Squirrels Heath Lane'] },
  // Central second pair — Roding Valley/Chigwell on Hainault loop, Central only
  { id: 17, line: 'central',      stations: ['Roding Valley',       'Chigwell'] },
  // Piccadilly second pair — far end of Cockfosters branch, Piccadilly only
  { id: 18, line: 'piccadilly',   stations: ['Oakwood',             'Cockfosters'] },
]

// ── Sound engine (Web Audio API) ─────────────────────────────────────────────
function createSoundEngine() {
  let ctx = null
  const gc = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx }

  function playMatch() {
    const c = gc(), now = c.currentTime
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.frequency.value = freq; o.type = 'sine'
      g.gain.setValueAtTime(0, now + i * 0.12)
      g.gain.linearRampToValueAtTime(0.22, now + i * 0.12 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4)
      o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.45)
    })
  }

  function playWrong() {
    const c = gc(), now = c.currentTime
    const o = c.createOscillator(), g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.frequency.value = 110; o.type = 'sawtooth'
    g.gain.setValueAtTime(0.18, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    o.start(now); o.stop(now + 0.38)
  }

  function playFlip() {
    const c = gc(), now = c.currentTime
    const o = c.createOscillator(), g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.frequency.value = 900; o.type = 'sine'
    g.gain.setValueAtTime(0.04, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
    o.start(now); o.stop(now + 0.09)
  }

  function playVictory() {
    const c = gc(), now = c.currentTime
    ;[523, 659, 784, 1047, 784, 1047, 1319].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.frequency.value = freq; o.type = 'triangle'
      g.gain.setValueAtTime(0, now + i * 0.15)
      g.gain.linearRampToValueAtTime(0.28, now + i * 0.15 + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.28)
      o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.32)
    })
  }

  return { playMatch, playWrong, playFlip, playVictory }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildCards() {
  const cards = []
  PAIRS.forEach(pair => {
    pair.stations.forEach((station, si) => {
      cards.push({ id: `${pair.id}-${si}`, pairId: pair.id, line: pair.line, station })
    })
  })
  return shuffle(cards)
}

// ── Announcement banner ───────────────────────────────────────────────────────
function Announcement({ message, lineColor, sub, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 3200)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: '#003688', padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: '14px',
      animation: 'announcement-slide 0.3s ease forwards',
      borderBottom: `3px solid ${lineColor || '#E32017'}`,
      boxShadow: '0 4px 40px rgba(0,0,0,0.9)',
    }}>
      <Roundel size={38} />
      <div>
        <div style={{ fontFamily: 'Oswald', fontSize: '16px', fontWeight: 700, letterSpacing: '0.06em', color: '#fff' }}>{message}</div>
        {sub && <div style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: 1, letterSpacing: '0.05em' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── TfL Roundel SVG-style ─────────────────────────────────────────────────────
function Roundel({ size = 48 }) {
  const r = size / 2, stroke = size * 0.11, barH = size * 0.24
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={r} cy={r} r={r - stroke / 2} fill="none" stroke="#E32017" strokeWidth={stroke} />
      <rect x={0} y={r - barH / 2} width={size} height={barH} fill="#003688" />
      <rect x={0} y={r - barH / 2} width={size} height={stroke * 0.7} fill="#E32017" />
      <rect x={0} y={r + barH / 2 - stroke * 0.7} width={size} height={stroke * 0.7} fill="#E32017" />
    </svg>
  )
}

// ── Headlight flash ───────────────────────────────────────────────────────────
function HeadlightFlash({ active }) {
  if (!active) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
      background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(255,248,200,0.22) 0%, rgba(255,220,100,0.06) 40%, transparent 70%)',
      animation: 'headlight-sweep 0.65s ease-out forwards',
    }} />
  )
}

// ── Tunnel rush lines ────────────────────────────────────────────────────────
function TunnelRush({ active }) {
  if (!active) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none', overflow: 'hidden' }}>
      {[...Array(10)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${8 + i * 8.5}%`,
          left: '-10%', right: '-10%',
          height: i % 3 === 0 ? '2px' : '1px',
          background: `rgba(255,255,255,${0.025 + i * 0.004})`,
          animation: `tunnel-rush 0.5s ease-out ${i * 0.025}s forwards`,
        }} />
      ))}
    </div>
  )
}

// ── THE CARD ─────────────────────────────────────────────────────────────────
// Design: portrait-oriented, tile feel. Dark brushed-metal background with
// a bold coloured top band (the line colour), station name in large type,
// subtle tile-number / zone indicator details.
function TubeCard({ card, state, onClick, hintPulse }) {
  const line = LINES[card.line]
  const isMatched  = state === 'matched'
  const isSelected = state === 'selected'
  const isWrong    = state === 'wrong'
  const isIdle     = state === 'idle'

  // Derive a deterministic 2-letter station code for decorative use
  const code = card.station.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()

  const lineColor = line.color
  const lineBorder = line.border || lineColor

  // Card background: dark gradient simulating a worn tile
  const bg = isMatched
    ? `linear-gradient(160deg, ${lineColor}28 0%, ${lineColor}10 50%, #0e0e18 100%)`
    : isSelected
    ? 'linear-gradient(160deg, #252535 0%, #1a1a28 100%)'
    : isWrong
    ? 'linear-gradient(160deg, #2a1010 0%, #180808 100%)'
    : 'linear-gradient(160deg, #1e1e2c 0%, #14141e 100%)'

  const outerBorder = isMatched  ? `2px solid ${lineColor}`
    : isSelected ? '2px solid rgba(255,255,255,0.35)'
    : isWrong    ? '2px solid #cc3333'
    : hintPulse  ? '2px solid #f5c842'
    : '1px solid #2a2a3c'

  const shadow = isMatched
    ? `0 0 24px ${lineColor}50, 0 4px 16px rgba(0,0,0,0.7)`
    : isSelected
    ? '0 0 16px rgba(255,255,255,0.12), 0 4px 16px rgba(0,0,0,0.7)'
    : isWrong
    ? '0 0 16px rgba(200,50,50,0.3)'
    : '0 4px 20px rgba(0,0,0,0.6)'

  return (
    <div
      onClick={!isMatched ? onClick : undefined}
      className={isIdle ? 'tube-card-idle' : ''}
      style={{
        background: bg,
        border: outerBorder,
        borderRadius: '6px',
        cursor: isMatched ? 'default' : 'pointer',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: shadow,
        aspectRatio: '3 / 4',
        display: 'flex',
        flexDirection: 'column',
        animation: isWrong ? 'card-wrong-shake 0.4s ease'
          : isMatched ? 'match-bloom 0.5s ease forwards' : 'none',
        animationName: hintPulse && isIdle ? 'pulse-hint' : undefined,
        animationDuration: hintPulse ? '1.4s' : undefined,
        animationIterationCount: hintPulse ? '4' : undefined,
      }}
    >
      {/* ── Top colour band — the line colour ── */}
      <div style={{
        height: isMatched ? '28%' : '18%',
        background: isMatched
          ? lineColor
          : isSelected
          ? `linear-gradient(90deg, ${lineColor}88, ${lineColor}44)`
          : `linear-gradient(90deg, ${lineColor}55, ${lineColor}22)`,
        transition: 'all 0.35s ease',
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
      }}>
        {/* Roundel dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isMatched ? 'rgba(255,255,255,0.9)' : `${lineColor}cc`,
          border: isMatched ? 'none' : '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
        }} />
        {/* Station code — decorative */}
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '9px',
          letterSpacing: '0.1em',
          color: isMatched ? 'rgba(255,255,255,0.85)' : `${lineColor}99`,
          fontWeight: 500,
        }}>{code}</span>
      </div>

      {/* ── Card body ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 6px',
        gap: 6,
        position: 'relative',
      }}>
        {/* Ghost roundel watermark */}
        <div style={{
          position: 'absolute',
          bottom: 4, right: 4,
          width: 28, height: 28,
          borderRadius: '50%',
          border: `3px solid ${lineColor}18`,
          opacity: isMatched ? 0.6 : 0.25,
        }} />
        <div style={{
          position: 'absolute',
          bottom: 14, right: 0, left: 0,
          height: '7px',
          background: `${lineColor}08`,
          borderTop: `1px solid ${lineColor}12`,
          borderBottom: `1px solid ${lineColor}12`,
        }} />

        {/* Station name */}
        <div style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(10px, 1.35vw, 14px)',
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: isMatched ? '#fff'
            : isSelected ? '#e8e4d9'
            : '#b0acaa',
          textTransform: 'uppercase',
          lineHeight: 1.15,
          textAlign: 'center',
          zIndex: 1,
        }}>
          {card.station}
        </div>

        {/* Line name — revealed on match */}
        {isMatched && (
          <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '8px',
            letterSpacing: '0.12em',
            color: lineColor,
            textAlign: 'center',
            opacity: 0.9,
            zIndex: 1,
          }}>
            {line.name.toUpperCase()}
          </div>
        )}
      </div>

      {/* ── Bottom accent bar ── */}
      <div style={{
        height: '4px',
        background: isMatched
          ? `linear-gradient(90deg, transparent, ${lineColor}, transparent)`
          : `linear-gradient(90deg, transparent, ${lineColor}30, transparent)`,
        transition: 'all 0.35s ease',
        flexShrink: 0,
      }} />

      {/* Selection shimmer */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
        }} />
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [cards, setCards]               = useState(() => buildCards())
  const [selected, setSelected]         = useState([])
  const [matched, setMatched]           = useState(new Set())
  const [wrong, setWrong]               = useState([])
  const [cluesLeft, setCluesLeft]       = useState(3)
  const [hintCards, setHintCards]       = useState([])
  const [mistakes, setMistakes]         = useState(0)
  const [announcement, setAnnouncement] = useState(null)
  const [annSub, setAnnSub]             = useState(null)
  const [annColor, setAnnColor]         = useState('#E32017')
  const [headlight, setHeadlight]       = useState(false)
  const [tunnelRush, setTunnelRush]     = useState(false)
  const [screen, setScreen]             = useState('intro')

  const soundRef = useRef(null)
  const gs = () => { if (!soundRef.current) soundRef.current = createSoundEngine(); return soundRef.current }

  const announce = useCallback((msg, sub, color) => {
    setAnnouncement(msg); setAnnSub(sub); setAnnColor(color || '#E32017')
  }, [])

  function handleCardClick(cardId) {
    if (selected.length === 2) return
    if (matched.has(cardId) || selected.includes(cardId)) return
    gs().playFlip()
    setHintCards([])
    const newSelected = [...selected, cardId]
    setSelected(newSelected)
    if (newSelected.length === 2) {
      const [a, b] = newSelected.map(id => cards.find(c => c.id === id))
      setTimeout(() => evaluatePair(a, b), 480)
    }
  }

  function evaluatePair(a, b) {
    if (a.pairId === b.pairId) {
      const newMatched = new Set([...matched, a.id, b.id])
      setMatched(newMatched); setSelected([])
      setHeadlight(true); setTunnelRush(true)
      setTimeout(() => { setHeadlight(false); setTunnelRush(false) }, 700)
      gs().playMatch()
      const line = LINES[a.line]
      announce(`${line.name.toUpperCase()} LINE`, `${a.station}  ↔  ${b.station}`, line.color)
      if (newMatched.size === cards.length) {
        setTimeout(() => { gs().playVictory(); setScreen('win') }, 1400)
      }
    } else {
      setWrong([a.id, b.id]); setMistakes(m => m + 1)
      gs().playWrong()
      announce('MIND THE GAP', 'Those stations are not on the same line', '#cc3333')
      setTimeout(() => { setWrong([]); setSelected([]) }, 850)
    }
  }

  function useClue() {
    if (cluesLeft === 0) return
    const unmatched = PAIRS.filter(p =>
      !cards.filter(c => c.pairId === p.id).every(c => matched.has(c.id))
    )
    if (!unmatched.length) return
    const pair = unmatched[Math.floor(Math.random() * unmatched.length)]
    const ids = cards.filter(c => c.pairId === pair.id && !matched.has(c.id)).map(c => c.id)
    setHintCards(ids)
    setCluesLeft(n => n - 1)
    const line = LINES[pair.line]
    announce(`CLUE — ${line.name.toUpperCase()}`, `These two stations share the ${line.name} line`, line.color)
    setTimeout(() => setHintCards([]), 4500)
  }

  function getCardState(id) {
    if (matched.has(id)) return 'matched'
    if (wrong.includes(id)) return 'wrong'
    if (selected.includes(id)) return 'selected'
    return 'idle'
  }

  function resetGame() {
    setCards(buildCards()); setSelected([]); setMatched(new Set())
    setWrong([]); setCluesLeft(3); setHintCards([]); setMistakes(0)
    setAnnouncement(null); setScreen('game')
  }

  const matchedPairs = matched.size / 2
  const totalPairs = PAIRS.length

  // ── INTRO ────────────────────────────────────────────────────────────────
  if (screen === 'intro') return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '28px', padding: '40px 20px',
    }}>
      <Roundel size={100} />

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'Oswald', fontSize: 'clamp(44px, 8vw, 72px)',
          fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, color: '#fff',
        }}>
          TUBE<span style={{ color: '#E32017' }}>MATCH</span>
        </h1>
        <p style={{
          fontFamily: 'Barlow Condensed', fontSize: '14px',
          color: '#555568', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6,
        }}>London Underground · Station Matching Game</p>
      </div>

      <div style={{
        background: 'linear-gradient(160deg, #1a1a28, #111118)',
        border: '1px solid #2a2a3c', padding: '20px 28px',
        maxWidth: 400, width: '100%',
      }}>
        <p style={{
          fontFamily: 'Barlow Condensed', fontSize: '15px',
          color: '#888880', lineHeight: 1.75, letterSpacing: '0.04em',
        }}>
          36 station cards. Each card belongs to a London Underground or Overground line.
          Find the matching pair — two stations on the same line.
          <br /><br />
          You have <span style={{ color: '#f5c842' }}>3 clues</span>.
          <br />
          <span style={{ color: '#555568', fontSize: '13px' }}>
            Circle and Waterloo &amp; City lines excluded — no unique stations.
          </span>
        </p>
      </div>

      <button
        onClick={() => setScreen('game')}
        style={{
          fontFamily: 'Oswald', fontSize: '17px', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: '#E32017', color: '#fff', border: 'none',
          padding: '15px 50px', cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#c41a12'}
        onMouseLeave={e => e.currentTarget.style.background = '#E32017'}
      >
        Board the Train →
      </button>

      {/* Line legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center', maxWidth: 520 }}>
        {Object.entries(LINES).map(([key, line]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            border: `1px solid ${line.color}33`,
            background: `${line.color}0d`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: line.color }} />
            <span style={{ fontFamily: 'DM Mono', fontSize: '9px', color: '#55556a', letterSpacing: '0.1em' }}>
              {line.name.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── WIN ──────────────────────────────────────────────────────────────────
  if (screen === 'win') return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '40px 20px',
    }} className="fade-up">
      <Roundel size={80} />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Oswald', fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
          ALL STATIONS MATCHED
        </h2>
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '15px', color: '#555568', marginTop: 8, letterSpacing: '0.12em' }}>
          PLEASE STAND CLEAR OF THE CLOSING DOORS
        </p>
      </div>
      <div style={{
        background: 'linear-gradient(160deg, #1a1a28, #111118)',
        border: '1px solid #2a2a3c',
        padding: '20px 48px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'DM Mono', fontSize: '11px', color: '#444458', letterSpacing: '0.15em', marginBottom: 6 }}>MISTAKES</div>
        <div style={{ fontFamily: 'Oswald', fontSize: '56px', fontWeight: 700, color: mistakes === 0 ? '#f5c842' : '#fff', lineHeight: 1 }}>
          {mistakes}
        </div>
        {mistakes === 0 && (
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', color: '#f5c842', letterSpacing: '0.2em', marginTop: 6 }}>PERFECT RUN</div>
        )}
      </div>
      <button
        onClick={resetGame}
        style={{
          fontFamily: 'Oswald', fontSize: '15px', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          background: '#003688', color: '#fff',
          border: '1px solid #0050cc', padding: '13px 40px', cursor: 'pointer',
        }}
      >Play Again</button>
    </div>
  )

  // ── GAME ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeadlightFlash active={headlight} />
      <TunnelRush active={tunnelRush} />
      <Announcement message={announcement} sub={annSub} lineColor={annColor} onDone={() => setAnnouncement(null)} />

      {/* ── Header ── */}
      <header style={{
        padding: '10px 16px', borderBottom: '1px solid #1e1e2c',
        display: 'flex', alignItems: 'center', gap: '12px',
        background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <Roundel size={28} />
        <span style={{ fontFamily: 'Oswald', fontSize: '17px', fontWeight: 700, letterSpacing: '0.08em', color: '#fff' }}>
          TUBE<span style={{ color: '#E32017' }}>MATCH</span>
        </span>
        <div style={{ flex: 1 }} />

        {/* Progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: '9px', color: '#333348', letterSpacing: '0.14em' }}>MATCHED {matchedPairs}/{totalPairs}</div>
          <div style={{ display: 'flex', gap: 2 }}>
            {[...Array(totalPairs)].map((_, i) => (
              <div key={i} style={{
                width: 14, height: 4,
                background: i < matchedPairs ? '#f5c842' : '#1e1e2c',
                border: `1px solid ${i < matchedPairs ? '#f5c842' : '#2a2a3c'}`,
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        </div>

        <div style={{
          fontFamily: 'DM Mono', fontSize: '10px',
          color: mistakes > 0 ? '#cc4444' : '#333348',
          letterSpacing: '0.1em', minWidth: 52, textAlign: 'right',
        }}>
          {mistakes > 0 ? `${mistakes} ERR` : 'NO ERR'}
        </div>

        <button
          onClick={useClue}
          disabled={cluesLeft === 0}
          style={{
            fontFamily: 'Oswald', fontSize: '12px', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: cluesLeft > 0 ? 'rgba(245,200,66,0.08)' : 'transparent',
            color: cluesLeft > 0 ? '#f5c842' : '#2e2e3e',
            border: `1px solid ${cluesLeft > 0 ? 'rgba(245,200,66,0.35)' : '#1e1e2c'}`,
            padding: '6px 12px', cursor: cluesLeft > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          {cluesLeft > 0 ? `🔦 CLUE (${cluesLeft})` : 'NO CLUES'}
        </button>
      </header>

      {/* ── Card grid — 6 cols, portrait cards ── */}
      <main style={{
        flex: 1, padding: '14px 12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '10px',
        maxWidth: 1080, margin: '0 auto', width: '100%',
        alignContent: 'start',
      }}>
        {cards.map((card, i) => (
          <div key={card.id} style={{ animation: `card-deal 0.35s ease ${i * 0.018}s both` }}>
            <TubeCard
              card={card}
              state={getCardState(card.id)}
              onClick={() => handleCardClick(card.id)}
              hintPulse={hintCards.includes(card.id)}
            />
          </div>
        ))}
      </main>

      {/* ── Footer — tube line rainbow strip ── */}
      <footer style={{
        padding: '8px 12px', borderTop: '1px solid #1e1e2c',
        display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center',
      }}>
        {Object.values(LINES).map((line, i) => (
          <div key={i} style={{
            flex: 1, maxWidth: 52, height: '4px',
            background: line.color, opacity: 0.5,
          }} />
        ))}
      </footer>
    </div>
  )
}
