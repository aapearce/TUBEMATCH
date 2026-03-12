import { useState, useCallback, useRef } from 'react'

// ── TfL lines ─────────────────────────────────────────────────────────────────
const LINES = {
  bakerloo:     { name: 'Bakerloo',      color: '#B36305' },
  central:      { name: 'Central',       color: '#E32017' },
  district:     { name: 'District',      color: '#00782A' },
  jubilee:      { name: 'Jubilee',       color: '#A0A5A9' },
  metropolitan: { name: 'Metropolitan',  color: '#9B0056' },
  northern:     { name: 'Northern',      color: '#1c1c1c', border: '#555' },
  piccadilly:   { name: 'Piccadilly',    color: '#003688' },
  victoria:     { name: 'Victoria',      color: '#0098D4' },
  elizabeth:    { name: 'Elizabeth',     color: '#6950A1' },
  dlr:          { name: 'DLR',           color: '#00A4A7' },
  lioness:      { name: 'Lioness',       color: '#F0A500' },
  mildmay:      { name: 'Mildmay',       color: '#0B4EAE' },
  suffragette:  { name: 'Suffragette',   color: '#4CAF50' },
  weaver:       { name: 'Weaver',        color: '#7B2D8B' },
  liberty:      { name: 'Liberty',       color: '#6B6B6B' },
}

// ── Full pool of valid pairs ───────────────────────────────────────────────────
const ALL_PAIRS = [
  { id:  1, line: 'bakerloo',     stations: ['Stonebridge Park',              'Kensal Green'] },
  { id:  2, line: 'central',      stations: ['Theydon Bois',                  'Debden'] },
  { id:  3, line: 'district',     stations: ['Becontree',                     'Upney'] },
  { id:  5, line: 'jubilee',      stations: ['Kingsbury',                     'Canons Park'] },
  { id:  6, line: 'metropolitan', stations: ['Chesham',                       'Amersham'] },
  { id:  7, line: 'northern',     stations: ['Morden',                        'Colliers Wood'] },
  { id:  8, line: 'piccadilly',   stations: ['Hatton Cross',                  'Heathrow Terminal 4'] },
  { id:  9, line: 'victoria',     stations: ['Pimlico',                       'Blackhorse Road'] },
  { id: 10, line: 'elizabeth',    stations: ['Taplow',                        'Langley'] },
  { id: 11, line: 'dlr',          stations: ['Mudchute',                      'Island Gardens'] },
  { id: 12, line: 'lioness',      stations: ['Headstone Lane',                'Hatch End'] },
  { id: 13, line: 'mildmay',      stations: ['Caledonian Road & Barnsbury',   'Canonbury'] },
  { id: 14, line: 'suffragette',  stations: ['Wanstead Park',                 'Woodgrange Park'] },
  { id: 15, line: 'weaver',       stations: ['Highams Park',                  'Chingford'] },
  { id: 16, line: 'liberty',      stations: ['Emerson Park',                  'Squirrels Heath Lane'] },
  { id: 17, line: 'central',      stations: ['Roding Valley',                 'Chigwell'] },
  { id: 18, line: 'piccadilly',   stations: ['Oakwood',                       'Cockfosters'] },
  { id: 19, line: 'jubilee',      stations: ['Wembley Park',                  'Neasden'] },
  { id: 20, line: 'northern',     stations: ['Totteridge & Whetstone',        'Woodside Park'] },
  { id: 21, line: 'metropolitan', stations: ['Croxley Green',                 'Watford'] },
  { id: 22, line: 'bakerloo',     stations: ['North Wembley',                 'South Kenton'] },
  { id: 23, line: 'district',     stations: ['Elm Park',                      'Hornchurch'] },
  { id: 24, line: 'victoria',     stations: ['Seven Sisters',                 'Tottenham Hale'] },
]

// ── Pick N random pairs, then shuffle the resulting cards ─────────────────────
function pickRandomPairs(n = 8) {
  const pool = [...ALL_PAIRS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const chosen = pool.slice(0, n)
  const cards = []
  chosen.forEach(pair => {
    pair.stations.forEach((station, si) => {
      cards.push({ id: `${pair.id}-${si}`, pairId: pair.id, line: pair.line, station })
    })
  })
  // Shuffle cards
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return { cards, pairs: chosen }
}

// ── Sound engine ──────────────────────────────────────────────────────────────
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

// ── Roundel ───────────────────────────────────────────────────────────────────
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

// ── Announcement banner ───────────────────────────────────────────────────────
function Announcement({ message, lineColor, sub, onDone }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: '#003688', padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: '14px',
      borderBottom: `3px solid ${lineColor || '#E32017'}`,
      boxShadow: '0 4px 40px rgba(0,0,0,0.9)',
      animation: 'announcement-slide 0.3s ease forwards',
    }}>
      <Roundel size={32} />
      <div>
        <div style={{ fontFamily: 'Oswald', fontSize: '15px', fontWeight: 700, letterSpacing: '0.06em', color: '#fff' }}>{message}</div>
        {sub && <div style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: 1, letterSpacing: '0.05em' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── HeadlightFlash ────────────────────────────────────────────────────────────
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

// ── THE CARD ──────────────────────────────────────────────────────────────────
function TubeCard({ card, state, onClick, hintPulse }) {
  const line = LINES[card.line]
  const isMatched  = state === 'matched'
  const isSelected = state === 'selected'
  const isWrong    = state === 'wrong'
  const isIdle     = state === 'idle'
  const lineColor  = line.color

  const bg = isMatched
    ? `linear-gradient(160deg, ${lineColor}30 0%, ${lineColor}10 50%, #0e0e18 100%)`
    : isSelected ? 'linear-gradient(160deg, #252535 0%, #1a1a28 100%)'
    : isWrong    ? 'linear-gradient(160deg, #2a1010 0%, #180808 100%)'
    :               'linear-gradient(160deg, #1e1e2c 0%, #14141e 100%)'

  const outerBorder = isMatched  ? `2px solid ${lineColor}`
    : isSelected ? '2px solid rgba(255,255,255,0.35)'
    : isWrong    ? '2px solid #cc3333'
    : hintPulse  ? '2px solid #f5c842'
    :               '1px solid #2a2a3c'

  const shadow = isMatched
    ? `0 0 20px ${lineColor}50, 0 2px 10px rgba(0,0,0,0.7)`
    : isSelected ? '0 0 14px rgba(255,255,255,0.10), 0 2px 10px rgba(0,0,0,0.7)'
    : isWrong    ? '0 0 14px rgba(200,50,50,0.25)'
    :               '0 2px 12px rgba(0,0,0,0.6)'

  return (
    <div
      onClick={!isMatched ? onClick : undefined}
      className={isIdle ? 'tube-card-idle' : ''}
      style={{
        background: bg,
        border: outerBorder,
        borderRadius: '5px',
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
      <div style={{
        height: '14%',
        background: isMatched
          ? lineColor
          : 'linear-gradient(90deg, #252530, #1a1a26)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 7px',
        position: 'relative',
      }}>
        {!isMatched && (
          <>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          </>
        )}
        {isMatched && (
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '8px', letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.85)', fontWeight: 500,
            width: '100%', textAlign: 'center',
          }}>
            {line.name.toUpperCase()}
          </span>
        )}
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 5px',
        gap: 4,
        position: 'relative',
      }}>
        {!isMatched && (
          <div style={{
            position: 'absolute', bottom: 3, right: 3,
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.06)',
            opacity: 0.5,
          }} />
        )}

        {isIdle && !hintPulse ? (
          <div style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: 'clamp(18px, 2.5vw, 26px)',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.12)',
            letterSpacing: '0.05em',
            zIndex: 1,
          }}>?</div>
        ) : (
          <div style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: 'clamp(9px, 1.1vw, 12px)',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: isMatched ? '#fff' : isSelected ? '#e8e4d9' : isWrong ? '#ff8888' : '#c0c0d0',
            textTransform: 'uppercase',
            lineHeight: 1.15,
            textAlign: 'center',
            zIndex: 1,
          }}>
            {card.station}
          </div>
        )}

        {isMatched && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: lineColor,
            boxShadow: `0 0 6px ${lineColor}`,
            zIndex: 1,
          }} />
        )}
      </div>

      <div style={{
        height: '3px',
        background: isMatched
          ? `linear-gradient(90deg, transparent, ${lineColor}, transparent)`
          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        flexShrink: 0,
        transition: 'all 0.35s ease',
      }} />

      {isSelected && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
        }} />
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
const PAIRS_PER_GAME = 8

export default function App() {
  const [gameData, setGameData]         = useState(() => pickRandomPairs(PAIRS_PER_GAME))
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
  const [screen, setScreen]             = useState('intro')

  const soundRef = useRef(null)
  const gs = () => { if (!soundRef.current) soundRef.current = createSoundEngine(); return soundRef.current }

  const { cards, pairs } = gameData

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
      setHeadlight(true)
      setTimeout(() => setHeadlight(false), 700)
      gs().playMatch()
      const line = LINES[a.line]
      announce(`${line.name.toUpperCase()} LINE`, `${a.station}  ↔  ${b.station}`, line.color)
      setTimeout(() => setAnnouncement(null), 2800)
      if (newMatched.size === cards.length) {
        setTimeout(() => { gs().playVictory(); setScreen('win') }, 1400)
      }
    } else {
      setWrong([a.id, b.id]); setMistakes(m => m + 1)
      gs().playWrong()
      announce('MIND THE GAP', 'Those stations are not on the same line', '#cc3333')
      setTimeout(() => { setWrong([]); setSelected([]); setAnnouncement(null) }, 1100)
    }
  }

  function useClue() {
    if (cluesLeft === 0) return
    const unmatchedPairs = pairs.filter(p =>
      !cards.filter(c => c.pairId === p.id).every(c => matched.has(c.id))
    )
    if (!unmatchedPairs.length) return
    const pair = unmatchedPairs[Math.floor(Math.random() * unmatchedPairs.length)]
    const ids = cards.filter(c => c.pairId === pair.id && !matched.has(c.id)).map(c => c.id)
    setHintCards(ids)
    setCluesLeft(n => n - 1)
    const line = LINES[pair.line]
    announce(`CLUE — ${line.name.toUpperCase()}`, `These two stations share the ${line.name} line`, line.color)
    setTimeout(() => { setHintCards([]); setAnnouncement(null) }, 4000)
  }

  function getCardState(id) {
    if (matched.has(id)) return 'matched'
    if (wrong.includes(id)) return 'wrong'
    if (selected.includes(id)) return 'selected'
    return 'idle'
  }

  // ── Start a fresh game — used by "Board the Train", "Play Again" ────────
  function startGame() {
    setGameData(pickRandomPairs(PAIRS_PER_GAME))
    setSelected([])
    setMatched(new Set())
    setWrong([])
    setCluesLeft(3)
    setHintCards([])
    setMistakes(0)
    setAnnouncement(null)
    setAnnSub(null)
    setAnnColor('#E32017')
    setHeadlight(false)
    setScreen('game')
  }

  // ── Quit to home — clears state and returns to intro ────────────────────
  function quitToHome() {
    setSelected([])
    setMatched(new Set())
    setWrong([])
    setCluesLeft(3)
    setHintCards([])
    setMistakes(0)
    setAnnouncement(null)
    setAnnSub(null)
    setAnnColor('#E32017')
    setHeadlight(false)
    setScreen('intro')
  }

  const matchedPairs = matched.size / 2
  const totalPairs = PAIRS_PER_GAME

  // ── INTRO ────────────────────────────────────────────────────────────────
  if (screen === 'intro') return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '24px', padding: '40px 20px',
    }}>
      <Roundel size={90} />

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'Oswald', fontSize: 'clamp(40px, 8vw, 68px)',
          fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, color: '#fff',
        }}>
          TUBE<span style={{ color: '#E32017' }}>MATCH</span>
        </h1>
        <p style={{
          fontFamily: 'Barlow Condensed', fontSize: '13px',
          color: '#555568', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6,
        }}>London Underground · Station Matching Game</p>
      </div>

      <div style={{
        background: 'linear-gradient(160deg, #1a1a28, #111118)',
        border: '1px solid #2a2a3c', padding: '18px 26px',
        maxWidth: 380, width: '100%',
      }}>
        <p style={{
          fontFamily: 'Barlow Condensed', fontSize: '15px',
          color: '#888880', lineHeight: 1.75, letterSpacing: '0.04em',
        }}>
          16 station cards per round — drawn fresh every game.
          Find the matching pair: two stations on the same Tube or Overground line.
          <br /><br />
          You have <span style={{ color: '#f5c842' }}>3 clues</span>. The line is only revealed when you match correctly.
        </p>
      </div>

      <button
        onClick={startGame}
        style={{
          fontFamily: 'Oswald', fontSize: '17px', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: '#E32017', color: '#fff', border: 'none',
          padding: '14px 48px', cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#c41a12'}
        onMouseLeave={e => e.currentTarget.style.background = '#E32017'}
      >
        Board the Train →
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: 480 }}>
        {Object.entries(LINES).map(([key, line]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 9px',
            border: `1px solid ${line.color}33`,
            background: `${line.color}0d`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: line.color }} />
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
      alignItems: 'center', justifyContent: 'center', gap: '22px', padding: '40px 20px',
    }} className="fade-up">
      <Roundel size={72} />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Oswald', fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
          ALL STATIONS MATCHED
        </h2>
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', color: '#555568', marginTop: 6, letterSpacing: '0.12em' }}>
          PLEASE STAND CLEAR OF THE CLOSING DOORS
        </p>
      </div>
      <div style={{
        background: 'linear-gradient(160deg, #1a1a28, #111118)',
        border: '1px solid #2a2a3c',
        padding: '18px 44px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#444458', letterSpacing: '0.15em', marginBottom: 4 }}>MISTAKES</div>
        <div style={{ fontFamily: 'Oswald', fontSize: '52px', fontWeight: 700, color: mistakes === 0 ? '#f5c842' : '#fff', lineHeight: 1 }}>
          {mistakes}
        </div>
        {mistakes === 0 && (
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', color: '#f5c842', letterSpacing: '0.2em', marginTop: 4 }}>PERFECT RUN</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={startGame}
          style={{
            fontFamily: 'Oswald', fontSize: '14px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: '#E32017', color: '#fff',
            border: 'none', padding: '12px 32px', cursor: 'pointer',
          }}
        >Play Again</button>
        <button
          onClick={quitToHome}
          style={{
            fontFamily: 'Oswald', fontSize: '14px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'transparent', color: '#555568',
            border: '1px solid #2a2a3c', padding: '12px 32px', cursor: 'pointer',
          }}
        >Home</button>
      </div>
    </div>
  )

  // ── GAME ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HeadlightFlash active={headlight} />
      <Announcement message={announcement} sub={annSub} lineColor={annColor} onDone={() => setAnnouncement(null)} />

      {/* ── Header ── */}
      <header style={{
        padding: '8px 14px', borderBottom: '1px solid #1e1e2c',
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <Roundel size={24} />
        <span style={{ fontFamily: 'Oswald', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em', color: '#fff' }}>
          TUBE<span style={{ color: '#E32017' }}>MATCH</span>
        </span>
        <div style={{ flex: 1 }} />

        {/* Progress pips */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: '8px', color: '#333348', letterSpacing: '0.14em' }}>
            {matchedPairs}/{totalPairs}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {[...Array(totalPairs)].map((_, i) => (
              <div key={i} style={{
                width: 12, height: 3,
                background: i < matchedPairs ? '#f5c842' : '#1e1e2c',
                border: `1px solid ${i < matchedPairs ? '#f5c842' : '#2a2a3c'}`,
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        </div>

        <div style={{
          fontFamily: 'DM Mono', fontSize: '9px',
          color: mistakes > 0 ? '#cc4444' : '#333348',
          letterSpacing: '0.1em', minWidth: 46, textAlign: 'right',
        }}>
          {mistakes > 0 ? `${mistakes} ERR` : 'NO ERR'}
        </div>

        <button
          onClick={useClue}
          disabled={cluesLeft === 0}
          style={{
            fontFamily: 'Oswald', fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: cluesLeft > 0 ? 'rgba(245,200,66,0.08)' : 'transparent',
            color: cluesLeft > 0 ? '#f5c842' : '#2e2e3e',
            border: `1px solid ${cluesLeft > 0 ? 'rgba(245,200,66,0.35)' : '#1e1e2c'}`,
            padding: '5px 10px', cursor: cluesLeft > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          {cluesLeft > 0 ? `🔦 ${cluesLeft}` : '—'}
        </button>

        {/* ── Quit button ── */}
        <button
          onClick={quitToHome}
          title="Quit to home screen"
          style={{
            fontFamily: 'Oswald', fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'transparent',
            color: '#444458',
            border: '1px solid #1e1e2c',
            padding: '5px 10px', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#cc3333'; e.currentTarget.style.borderColor = '#cc333344' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444458'; e.currentTarget.style.borderColor = '#1e1e2c' }}
        >
          QUIT ✕
        </button>
      </header>

      {/* ── Card grid ── */}
      <main style={{
        flex: 1,
        padding: '10px 12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '8px',
        maxWidth: 1100, margin: '0 auto', width: '100%',
        boxSizing: 'border-box',
      }}>
        {cards.map((card, i) => (
          <div key={card.id} style={{ animation: `card-deal 0.3s ease ${i * 0.02}s both` }}>
            <TubeCard
              card={card}
              state={getCardState(card.id)}
              onClick={() => handleCardClick(card.id)}
              hintPulse={hintCards.includes(card.id)}
            />
          </div>
        ))}
      </main>

      {/* ── Footer line strip ── */}
      <footer style={{
        padding: '6px 12px', borderTop: '1px solid #1e1e2c',
        display: 'flex', justifyContent: 'center', gap: '3px', alignItems: 'center',
        flexShrink: 0,
      }}>
        {Object.values(LINES).map((line, i) => (
          <div key={i} style={{ flex: 1, maxWidth: 48, height: '3px', background: line.color, opacity: 0.45 }} />
        ))}
      </footer>
    </div>
  )
}
