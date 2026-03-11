import { useState, useEffect, useCallback, useRef } from 'react'

// ── TfL authentic line colours ─────────────────────────────────────────────────
const LINES = {
  bakerloo:   { name: 'Bakerloo',        color: '#B36305', text: '#fff' },
  central:    { name: 'Central',         color: '#E32017', text: '#fff' },
  circle:     { name: 'Circle',          color: '#FFD300', text: '#000' },
  district:   { name: 'District',        color: '#00782A', text: '#fff' },
  jubilee:    { name: 'Jubilee',         color: '#A0A5A9', text: '#000' },
  metropolitan:{ name: 'Metropolitan',  color: '#9B0056', text: '#fff' },
  northern:   { name: 'Northern',        color: '#000000', text: '#fff', border: '#444' },
  piccadilly: { name: 'Piccadilly',      color: '#003688', text: '#fff' },
  victoria:   { name: 'Victoria',        color: '#0098D4', text: '#fff' },
  overground: { name: 'Overground',      color: '#EE7C0E', text: '#fff' },
  elizabeth:  { name: 'Elizabeth line',  color: '#6950A1', text: '#fff' },
  dlr:        { name: 'DLR',             color: '#00A4A7', text: '#fff' },
  waterloo:   { name: 'Waterloo & City', color: '#95CDBA', text: '#000' },
  hammersmith:{ name: 'Hammersmith & City', color: '#F3A9BB', text: '#000' },
  jubilee2:   { name: 'Jubilee',         color: '#A0A5A9', text: '#000' },
}

// ── 18 pairs — each station is unique to its line ─────────────────────────────
// Carefully chosen: no station appears on more than one line in this list
const PAIRS = [
  // Bakerloo
  { id: 1,  line: 'bakerloo',    stations: ['Kensal Green', 'Stonebridge Park'] },
  // Central
  { id: 2,  line: 'central',     stations: ['Theydon Bois', 'Debden'] },
  // Circle
  { id: 3,  line: 'circle',      stations: ['Bayswater', 'Royal Oak'] },
  // District
  { id: 4,  line: 'district',    stations: ['Becontree', 'Upney'] },
  // Jubilee
  { id: 5,  line: 'jubilee',     stations: ['Kingsbury', 'Neasden'] },
  // Metropolitan
  { id: 6,  line: 'metropolitan',stations: ['Croxley Green', 'Chorleywood'] },
  // Northern
  { id: 7,  line: 'northern',    stations: ['Morden', 'Colliers Wood'] },
  // Piccadilly
  { id: 8,  line: 'piccadilly',  stations: ['Oakwood', 'Cockfosters'] },
  // Victoria
  { id: 9,  line: 'victoria',    stations: ['Pimlico', 'Blackhorse Road'] },
  // Overground
  { id: 10, line: 'overground',  stations: ['Crouch Hill', 'Harringay Green Lanes'] },
  // Elizabeth line
  { id: 11, line: 'elizabeth',   stations: ['Taplow', 'Langley'] },
  // DLR
  { id: 12, line: 'dlr',         stations: ['Mudchute', 'Crossharbour'] },
  // Waterloo & City
  { id: 13, line: 'waterloo',    stations: ['Waterloo', 'Bank'] },
  // Hammersmith & City
  { id: 14, line: 'hammersmith', stations: ['Goldhawk Road', 'Shepherd\'s Bush Market'] },
  // Bakerloo 2
  { id: 15, line: 'bakerloo',    stations: ['North Wembley', 'South Kenton'] },
  // Central 2
  { id: 16, line: 'central',     stations: ['Roding Valley', 'Chigwell'] },
  // Piccadilly 2
  { id: 17, line: 'piccadilly',  stations: ['Heathrow T4', 'Hatton Cross'] },
  // Victoria 2
  { id: 18, line: 'victoria',    stations: ['Highbury & Islington', 'Seven Sisters'] },
]

// ── Sound engine (Web Audio API — no files needed) ────────────────────────────
function createSoundEngine() {
  let ctx = null
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    return ctx
  }

  // TfL-style "bing-bong" door chime
  function playMatch(lineColor) {
    const c = getCtx()
    const now = c.currentTime
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, now + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.4)
    })
  }

  // Wrong — low buzzer
  function playWrong() {
    const c = getCtx()
    const now = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(c.destination)
    osc.frequency.value = 120
    osc.type = 'sawtooth'
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.start(now); osc.stop(now + 0.3)
  }

  // Card flip click
  function playFlip() {
    const c = getCtx()
    const now = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(c.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc.start(now); osc.stop(now + 0.1)
  }

  // Victory fanfare
  function playVictory() {
    const c = getCtx()
    const now = c.currentTime
    const melody = [523, 659, 784, 1047, 784, 1047, 1319]
    melody.forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.frequency.value = freq
      osc.type = 'triangle'
      gain.gain.setValueAtTime(0, now + i * 0.15)
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.25)
      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.3)
    })
  }

  return { playMatch, playWrong, playFlip, playVictory }
}

// ── Shuffle ────────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build the flat card array from pairs
function buildCards() {
  const cards = []
  PAIRS.forEach(pair => {
    pair.stations.forEach((station, si) => {
      cards.push({
        id: `${pair.id}-${si}`,
        pairId: pair.id,
        line: pair.line,
        station,
      })
    })
  })
  return shuffle(cards)
}

// ── Announcement banner ────────────────────────────────────────────────────────
function Announcement({ message, sub, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: '#003688',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', gap: '16px',
      animation: 'announcement-slide 0.3s ease forwards',
      borderBottom: '3px solid #E32017',
      boxShadow: '0 4px 30px rgba(0,0,0,0.8)',
    }}>
      {/* TfL roundel */}
      <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '5px solid #E32017', background: 'transparent',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: '12px', marginTop: '-6px',
          background: '#003688',
          borderTop: '3px solid #E32017', borderBottom: '3px solid #E32017',
        }} />
      </div>
      <div>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '17px', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' }}>
          {message}
        </div>
        {sub && <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Headlight flash overlay ────────────────────────────────────────────────────
function HeadlightFlash({ active }) {
  if (!active) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
      background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,240,180,0.25) 0%, transparent 70%)',
      animation: 'headlight-sweep 0.6s ease-out forwards',
    }} />
  )
}

// ── Tunnel speed lines overlay ─────────────────────────────────────────────────
function TunnelRush({ active }) {
  if (!active) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${10 + i * 10}%`,
          left: 0, right: 0,
          height: '1px',
          background: `rgba(255,255,255,${0.03 + i * 0.005})`,
          animation: `tunnel-rush 0.5s ease-out ${i * 0.03}s forwards`,
        }} />
      ))}
    </div>
  )
}

// ── Card component ─────────────────────────────────────────────────────────────
function TubeCard({ card, state, onClick, hintPulse }) {
  // state: 'idle' | 'selected' | 'matched' | 'wrong'
  const line = LINES[card.line]
  const isMatched = state === 'matched'
  const isSelected = state === 'selected'
  const isWrong = state === 'wrong'

  const borderColor = isMatched ? line.color
    : isSelected ? 'rgba(255,255,255,0.5)'
    : hintPulse ? '#f5c842'
    : '#2a2a35'

  const bgColor = isMatched
    ? `${line.color}22`
    : isSelected
    ? 'rgba(255,255,255,0.05)'
    : '#1a1a20'

  return (
    <div
      onClick={!isMatched ? onClick : undefined}
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        padding: '12px 10px',
        cursor: isMatched ? 'default' : 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        animation: isWrong ? 'card-wrong-shake 0.4s ease' :
                   isMatched ? 'card-match-flash 0.6s ease forwards' : 'none',
        '--match-color': line.color,
        boxShadow: isMatched ? `0 0 12px ${line.color}55` :
                   isSelected ? '0 0 10px rgba(255,255,255,0.1)' :
                   hintPulse ? '0 0 0 2px #f5c84244' : 'none',
        animationName: hintPulse && !isMatched && !isSelected ? 'pulse-hint' : undefined,
        animationDuration: hintPulse ? '1.5s' : undefined,
        animationIterationCount: hintPulse ? '3' : undefined,
      }}
    >
      {/* Train window reflection streak */}
      {!isMatched && (
        <div style={{
          position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
          transition: 'left 0.5s ease',
          pointerEvents: 'none',
        }} className="card-sheen" />
      )}

      {/* Line colour stripe at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: isMatched ? line.color : isSelected ? 'rgba(255,255,255,0.3)' : '#2a2a35',
        transition: 'background 0.3s ease',
      }} />

      {/* Station name */}
      <div style={{
        fontFamily: 'Oswald, sans-serif',
        fontSize: 'clamp(11px, 1.4vw, 14px)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: isMatched ? line.color : isSelected ? '#fff' : '#c8c4bc',
        textTransform: 'uppercase',
        lineHeight: 1.2,
        marginTop: '6px',
        textAlign: 'center',
      }}>
        {card.station}
      </div>

      {/* Line name shown on match */}
      {isMatched && (
        <div style={{
          marginTop: '6px',
          fontFamily: 'DM Mono, monospace',
          fontSize: '9px',
          color: line.color,
          textAlign: 'center',
          letterSpacing: '0.08em',
          opacity: 0.8,
        }}>
          {line.name.toUpperCase()}
        </div>
      )}
    </div>
  )
}

// ── Score display ──────────────────────────────────────────────────────────────
function ScorePip({ filled, color }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: '50%',
      background: filled ? color : 'transparent',
      border: `1px solid ${filled ? color : '#3a3a45'}`,
      transition: 'all 0.3s ease',
    }} />
  )
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [cards, setCards]               = useState(() => buildCards())
  const [selected, setSelected]         = useState([])       // up to 2 card ids
  const [matched, setMatched]           = useState(new Set()) // card ids
  const [wrong, setWrong]               = useState([])        // card ids temporarily wrong
  const [cluesLeft, setCluesLeft]       = useState(3)
  const [hintCards, setHintCards]       = useState([])        // card ids pulsing
  const [mistakes, setMistakes]         = useState(0)
  const [announcement, setAnnouncement] = useState(null)
  const [annSub, setAnnSub]             = useState(null)
  const [headlight, setHeadlight]       = useState(false)
  const [tunnelRush, setTunnelRush]     = useState(false)
  const [gameWon, setGameWon]           = useState(false)
  const [screen, setScreen]             = useState('intro')   // 'intro' | 'game' | 'win'

  const soundRef = useRef(null)
  function getSound() {
    if (!soundRef.current) soundRef.current = createSoundEngine()
    return soundRef.current
  }

  const announce = useCallback((msg, sub = null) => {
    setAnnouncement(msg); setAnnSub(sub)
  }, [])

  // ── Handle card click ──────────────────────────────────────────────────────
  function handleCardClick(cardId) {
    if (selected.length === 2) return
    if (matched.has(cardId)) return
    if (selected.includes(cardId)) return

    getSound().playFlip()
    setHintCards([])

    const newSelected = [...selected, cardId]
    setSelected(newSelected)

    if (newSelected.length === 2) {
      const [a, b] = newSelected.map(id => cards.find(c => c.id === id))
      setTimeout(() => evaluatePair(a, b), 500)
    }
  }

  function evaluatePair(a, b) {
    if (a.pairId === b.pairId) {
      // ✅ Match
      const newMatched = new Set([...matched, a.id, b.id])
      setMatched(newMatched)
      setSelected([])
      setHeadlight(true)
      setTunnelRush(true)
      setTimeout(() => { setHeadlight(false); setTunnelRush(false) }, 700)
      getSound().playMatch(LINES[a.line].color)
      const line = LINES[a.line]
      announce(`${line.name.toUpperCase()} LINE`, `${a.station} ↔ ${b.station}`)

      // Check win
      if (newMatched.size === cards.length) {
        setTimeout(() => {
          getSound().playVictory()
          setScreen('win')
        }, 1500)
      }
    } else {
      // ❌ Wrong
      setWrong([a.id, b.id])
      setMistakes(m => m + 1)
      getSound().playWrong()
      announce('MIND THE GAP', 'Those stations are not on the same line')
      setTimeout(() => {
        setWrong([])
        setSelected([])
      }, 800)
    }
  }

  // ── Clue / hint ────────────────────────────────────────────────────────────
  function useClue() {
    if (cluesLeft === 0) return
    // Find an unmatched pair and hint both cards
    const unmatchedPairs = PAIRS.filter(p => {
      const pairCards = cards.filter(c => c.pairId === p.id)
      return !pairCards.every(c => matched.has(c.id))
    })
    if (unmatchedPairs.length === 0) return

    const pair = unmatchedPairs[Math.floor(Math.random() * unmatchedPairs.length)]
    const pairCardIds = cards.filter(c => c.pairId === pair.id && !matched.has(c.id)).map(c => c.id)
    setHintCards(pairCardIds)
    setCluesLeft(n => n - 1)
    const line = LINES[pair.line]
    announce(`CLUE: ${line.name.toUpperCase()} LINE`, `Look for stations on the ${line.name}`)
    setTimeout(() => setHintCards([]), 4000)
  }

  // ── Card state ─────────────────────────────────────────────────────────────
  function getCardState(cardId) {
    if (matched.has(cardId)) return 'matched'
    if (wrong.includes(cardId)) return 'wrong'
    if (selected.includes(cardId)) return 'selected'
    return 'idle'
  }

  const totalPairs = PAIRS.length
  const matchedPairs = matched.size / 2

  // ── Intro screen ───────────────────────────────────────────────────────────
  if (screen === 'intro') return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '32px', padding: '40px 20px',
    }}>
      {/* Roundel */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '12px solid #E32017',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '-5%', right: '-5%', height: '30px',
          marginTop: '-15px', background: '#003688',
          borderTop: '6px solid #E32017', borderBottom: '6px solid #E32017',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'Oswald', fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.15em' }}>TUBEMATCH</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <h1 style={{ fontFamily: 'Oswald', fontSize: '52px', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, color: '#fff', marginBottom: 8 }}>
          TUBE<span style={{ color: '#E32017' }}>MATCH</span>
        </h1>
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '16px', color: '#6b6b78', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          London Underground · Matching Game
        </p>
      </div>

      <div style={{
        background: '#1a1a20', border: '1px solid #2a2a35',
        padding: '20px 28px', maxWidth: 400, width: '100%',
      }}>
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '15px', color: '#9b9b8a', lineHeight: 1.7, letterSpacing: '0.05em' }}>
          36 station cards. Match each station to its partner on the same tube line.
          <br /><br />
          You have <span style={{ color: '#f5c842' }}>3 clues</span>. Use them wisely.
        </p>
      </div>

      <button
        onClick={() => setScreen('game')}
        style={{
          fontFamily: 'Oswald', fontSize: '18px', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: '#E32017', color: '#fff',
          border: 'none', padding: '16px 48px', cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => e.target.style.background = '#c41a12'}
        onMouseLeave={e => e.target.style.background = '#E32017'}
      >
        Board the Train →
      </button>

      {/* Line colour legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: 500 }}>
        {Object.values(LINES).filter((l, i, arr) => arr.findIndex(x => x.name === l.name) === i).map(line => (
          <div key={line.name} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            border: `1px solid ${line.color}44`,
            background: `${line.color}11`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: line.color }} />
            <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#6b6b78', letterSpacing: '0.08em' }}>
              {line.name.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Win screen ─────────────────────────────────────────────────────────────
  if (screen === 'win') return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '28px', padding: '40px 20px',
    }} className="fade-up">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: 16 }}>🚇</div>
        <h2 style={{ fontFamily: 'Oswald', fontSize: '48px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
          ALL STATIONS MATCHED
        </h2>
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '18px', color: '#6b6b78', marginTop: 8, letterSpacing: '0.1em' }}>
          MIND THE GAP BETWEEN THE TRAIN AND THE PLATFORM
        </p>
      </div>

      <div style={{
        background: '#1a1a20', border: '1px solid #2a2a35',
        padding: '20px 40px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'DM Mono', fontSize: '13px', color: '#6b6b78', marginBottom: 8, letterSpacing: '0.1em' }}>MISTAKES</div>
        <div style={{ fontFamily: 'Oswald', fontSize: '52px', fontWeight: 700, color: mistakes === 0 ? '#f5c842' : '#fff' }}>
          {mistakes}
        </div>
        {mistakes === 0 && <div style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', color: '#f5c842', letterSpacing: '0.15em' }}>PERFECT RUN</div>}
      </div>

      <button
        onClick={() => {
          setCards(buildCards()); setSelected([]); setMatched(new Set())
          setWrong([]); setCluesLeft(3); setHintCards([]); setMistakes(0)
          setAnnouncement(null); setGameWon(false); setScreen('game')
        }}
        style={{
          fontFamily: 'Oswald', fontSize: '16px', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          background: '#003688', color: '#fff',
          border: '1px solid #0048c2', padding: '14px 40px', cursor: 'pointer',
        }}
      >
        Play Again
      </button>
    </div>
  )

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeadlightFlash active={headlight} />
      <TunnelRush active={tunnelRush} />
      <Announcement message={announcement} sub={annSub} onDone={() => setAnnouncement(null)} />

      {/* Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1e1e28',
        display: 'flex', alignItems: 'center', gap: '16px',
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        {/* Mini roundel */}
        <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid #E32017' }} />
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0, height: '10px', marginTop: '-5px',
            background: '#003688', borderTop: '3px solid #E32017', borderBottom: '3px solid #E32017',
          }} />
        </div>

        <span style={{ fontFamily: 'Oswald', fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em', color: '#fff' }}>
          TUBE<span style={{ color: '#E32017' }}>MATCH</span>
        </span>

        <div style={{ flex: 1 }} />

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#3a3a45', letterSpacing: '0.12em' }}>
            MATCHED
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[...Array(totalPairs)].map((_, i) => (
              <ScorePip key={i} filled={i < matchedPairs} color="#f5c842" />
            ))}
          </div>
        </div>

        {/* Mistakes */}
        <div style={{
          fontFamily: 'DM Mono', fontSize: '11px',
          color: mistakes > 0 ? '#ff6b6b' : '#3a3a45',
          letterSpacing: '0.1em', minWidth: 60, textAlign: 'right',
        }}>
          {mistakes > 0 ? `${mistakes} ERR` : 'NO ERR'}
        </div>

        {/* Clue button */}
        <button
          onClick={useClue}
          disabled={cluesLeft === 0}
          style={{
            fontFamily: 'Oswald', fontSize: '13px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: cluesLeft > 0 ? 'rgba(245,200,66,0.1)' : 'transparent',
            color: cluesLeft > 0 ? '#f5c842' : '#3a3a45',
            border: `1px solid ${cluesLeft > 0 ? 'rgba(245,200,66,0.4)' : '#2a2a35'}`,
            padding: '7px 14px', cursor: cluesLeft > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          CLUE {cluesLeft > 0 ? `(${cluesLeft})` : '—'}
        </button>
      </header>

      {/* Card grid */}
      <main style={{
        flex: 1,
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '8px',
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
        alignContent: 'start',
      }}>
        {cards.map((card, i) => (
          <div
            key={card.id}
            style={{ animation: `card-reveal 0.4s ease ${i * 0.02}s both` }}
          >
            <TubeCard
              card={card}
              state={getCardState(card.id)}
              onClick={() => handleCardClick(card.id)}
              hintPulse={hintCards.includes(card.id)}
            />
          </div>
        ))}
      </main>

      {/* Footer line */}
      <footer style={{
        padding: '10px 20px',
        display: 'flex', justifyContent: 'center', gap: '16px',
        borderTop: '1px solid #1e1e28',
      }}>
        {Object.values(LINES).filter((l, i, arr) => arr.findIndex(x => x.name === l.name) === i).map(line => (
          <div key={line.name} style={{ width: 20, height: 3, background: line.color, opacity: 0.6 }} />
        ))}
      </footer>
    </div>
  )
}
