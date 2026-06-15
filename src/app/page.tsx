'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  size: ((i * 17) % 20) / 10 + 0.6,
  top: (i * 37 + 13) % 100,
  left: (i * 53 + 7) % 100,
  opacity: ((i * 13) % 55) / 100 + 0.15,
  duration: ((i * 7) % 30) / 10 + 2,
  delay: ((i * 4) % 30) / 10,
}))

const PREVIEW_MESSAGES: Array<{
  type: string
  text?: string
  delay: number
  author?: string
  value?: number
}> = [
  { type: 'narration', text: "La porte grince. Une taverne enfumée s'ouvre devant vous — remplie de murmures et de bougies vacillantes.", delay: 400 },
  { type: 'action', author: 'Thorin', text: "J'inspecte la salle à la recherche de signes de danger.", delay: 1600 },
  { type: 'roll-request', text: '🎲 Aelindra demande un jet de Perception — d20 + SAG', delay: 2900 },
  { type: 'roll-result', author: 'Thorin', value: 19, text: '🎲 19', delay: 3800 },
  { type: 'dm', text: "Excellente perception ! Tu remarques un homme encapuchonné qui observe la porte d'entrée... et qui semble te reconnaître.", delay: 5000 },
  { type: 'narration', text: "L'inconnu pose lentement sa main sur le pommeau de son épée...", delay: 6600 },
]

function GamePreviewWindow() {
  const [shown, setShown] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    setShown(0)
    PREVIEW_MESSAGES.forEach((msg, i) => {
      timers.push(setTimeout(() => setShown(i + 1), msg.delay))
    })
    timers.push(setTimeout(() => setCycle(c => c + 1), 9800))
    return () => timers.forEach(clearTimeout)
  }, [cycle])

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '460px',
      boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 50px rgba(124,58,237,0.18)',
    }}>
      <div style={{
        background: 'var(--surface2)',
        borderBottom: '1px solid var(--border)',
        padding: '0.6rem 0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
      }}>
        <div style={{ display: 'flex', gap: '5px', marginRight: '0.35rem' }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.7rem', flex: 1 }}>
          🏰 La Taverne du Corbeau · DM IA
        </span>
        <span style={{
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.3)',
          color: 'var(--green)',
          fontSize: '0.6rem',
          fontWeight: 700,
          padding: '0.15rem 0.4rem',
          borderRadius: '20px',
        }}>● LIVE</span>
      </div>

      <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', minHeight: '258px' }}>
        {PREVIEW_MESSAGES.slice(0, shown).map((msg, i) => (
          <motion.div
            key={`${cycle}-${i}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {msg.type === 'narration' && (
              <div style={{
                background: 'linear-gradient(135deg, #1a1206, #2a1e0a)',
                borderLeft: '3px solid var(--gold)',
                padding: '0.55rem 0.7rem',
                borderRadius: '0 6px 6px 0',
                color: '#d4af37',
                fontSize: '0.74rem',
                fontStyle: 'italic',
                lineHeight: 1.55,
              }}>{msg.text}</div>
            )}
            {msg.type === 'dm' && (
              <div style={{
                background: 'linear-gradient(135deg, #1e1030, #2a1a4a)',
                borderLeft: '3px solid var(--accent)',
                padding: '0.55rem 0.7rem',
                borderRadius: '0 6px 6px 0',
                fontSize: '0.74rem',
                lineHeight: 1.55,
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.63rem', color: 'var(--accent)', marginBottom: '0.2rem' }}>🤖 Aelindra · MJ</div>
                <span style={{ color: '#c4b5fd' }}>{msg.text}</span>
              </div>
            )}
            {msg.type === 'action' && (
              <div style={{
                background: 'var(--surface2)',
                borderLeft: '3px solid var(--green)',
                padding: '0.55rem 0.7rem',
                borderRadius: '0 6px 6px 0',
                fontSize: '0.74rem',
                lineHeight: 1.55,
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.63rem', color: 'var(--green)', marginBottom: '0.2rem' }}>⚔️ {msg.author}</div>
                <span style={{ color: 'var(--text)' }}>{msg.text}</span>
              </div>
            )}
            {msg.type === 'roll-request' && (
              <div style={{
                background: 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.25)',
                padding: '0.5rem 0.7rem',
                borderRadius: '6px',
                color: 'var(--gold)',
                fontSize: '0.71rem',
                textAlign: 'center',
                fontWeight: 600,
              }}>{msg.text}</div>
            )}
            {msg.type === 'roll-result' && (
              <div style={{
                background: 'rgba(34,197,94,0.07)',
                border: '1px solid rgba(34,197,94,0.25)',
                padding: '0.5rem 0.7rem',
                borderRadius: '6px',
                color: 'var(--green)',
                fontSize: '0.71rem',
                textAlign: 'center',
                fontWeight: 700,
              }}>🎲 {msg.author} lance — {msg.value} ✨</div>
            )}
          </motion.div>
        ))}
        {shown > 0 && shown < PREVIEW_MESSAGES.length && (
          <motion.div
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.3, repeat: Infinity }}
            style={{ color: 'var(--muted)', fontSize: '0.67rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span style={{ color: 'var(--accent)' }}>●</span> Aelindra rédige...
          </motion.div>
        )}
      </div>

      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '0.6rem 0.875rem',
        background: 'var(--surface2)',
        display: 'flex',
        gap: '0.45rem',
        alignItems: 'center',
      }}>
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '0.38rem 0.65rem',
          color: 'var(--muted)',
          fontSize: '0.7rem',
        }}>Décrire votre action...</div>
        <div style={{
          background: 'var(--accent)',
          color: 'white',
          padding: '0.38rem 0.65rem',
          borderRadius: '6px',
          fontSize: '0.7rem',
          fontWeight: 700,
        }}>Envoyer</div>
      </div>
    </div>
  )
}

const COMING_FEATURES = [
  {
    icon: '🤖',
    title: 'DM Artificiel — Aelindra',
    desc: 'Une IA narrative qui maîtrise D&D 5e, génère des histoires immersives et s\'adapte à chaque décision de vos personnages.',
    color: 'var(--accent)',
    glow: 'rgba(124,58,237,0.15)',
  },
  {
    icon: '🧙',
    title: 'DM Humain',
    desc: 'Un ami prend le rôle de Maître du Jeu avec un panneau dédié : narration, PNJ, dés, XP et objets magiques.',
    color: 'var(--gold)',
    glow: 'rgba(245,158,11,0.12)',
  },
  {
    icon: '🎲',
    title: 'Dés animés d4–d20',
    desc: 'Tous les dés D&D avec animations fluides, demandés par le MJ ou lancés librement — visibles par toute la table.',
    color: 'var(--green)',
    glow: 'rgba(34,197,94,0.1)',
  },
  {
    icon: '👥',
    title: "Jusqu'à 10 aventuriers",
    desc: 'Parties multijoueurs en temps réel. Du solo à la grande table, Taleforge s\'adapte à votre groupe.',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.1)',
  },
]

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* Starfield */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {STARS.map(s => (
          <div key={s.id} style={{
            position: 'absolute',
            width: s.size + 'px',
            height: s.size + 'px',
            borderRadius: '50%',
            background: 'white',
            top: s.top + '%',
            left: s.left + '%',
            opacity: s.opacity,
            animation: `pulse-slow ${s.duration}s ease-in-out infinite`,
            animationDelay: s.delay + 's',
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── NAVBAR ── */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.1rem 2rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}>
          <span className="text-glow-gold" style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.35rem', letterSpacing: '0.04em' }}>
            🎲 Taleforge
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
              Se connecter
            </Link>
            <Link href="/auth/register" className="btn btn-gold" style={{ fontSize: '0.875rem' }}>
              Rejoindre l'aventure
            </Link>
          </div>
        </nav>

        {/* ── UNDER CONSTRUCTION HERO ── */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5rem 2rem 6rem',
          position: 'relative',
          background: 'radial-gradient(ellipse 90% 70% at 20% 50%, #2a1054 0%, transparent 60%)',
        }}>
          <div style={{
            maxWidth: '1200px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '4rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {/* Left — construction message */}
            <div style={{ flex: 1, minWidth: '300px', maxWidth: '560px' }}>

              {/* Badge en construction */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: '20px',
                  padding: '0.35rem 0.9rem',
                  marginBottom: '1.5rem',
                }}
              >
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: '1rem' }}
                >🔨</motion.span>
                <span style={{ color: 'var(--gold)', fontSize: '0.78rem', fontWeight: 700 }}>
                  En construction — bientôt disponible
                </span>
              </motion.div>

              <motion.h1
                className="text-glow-gold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                style={{
                  fontSize: 'clamp(2.8rem, 7vw, 5rem)',
                  fontWeight: 'bold',
                  color: 'var(--gold)',
                  lineHeight: 1.05,
                  marginBottom: '1.5rem',
                  letterSpacing: '-0.02em',
                }}
              >
                La forge est<br />
                <span style={{ color: 'var(--accent)' }}>en feu</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                  color: 'var(--text)',
                  lineHeight: 1.75,
                  marginBottom: '1.5rem',
                  opacity: 0.88,
                }}
              >
                Taleforge est actuellement en plein développement. Nos artisans forgent
                une expérience de <strong style={{ color: 'var(--gold)' }}>D&D 5e</strong> multijoueur
                guidée par <strong style={{ color: 'var(--accent)' }}>Aelindra (IA)</strong> ou
                un vrai <strong style={{ color: 'var(--gold)' }}>Maître du Jeu humain</strong>.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--muted)',
                  lineHeight: 1.65,
                  marginBottom: '2rem',
                }}
              >
                Créez votre compte maintenant pour être parmi les premiers aventuriers
                à franchir les portes de la taverne.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/register" className="btn btn-gold" style={{ fontSize: '1.05rem', padding: '0.85rem 2.2rem' }}>
                    ⚔️ Rejoindre l'aventure
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize: '1.05rem', padding: '0.85rem 2rem' }}>
                    Se connecter
                  </Link>
                </motion.div>
              </motion.div>

              {/* Progress indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Avancement
                  </span>
                  <span style={{ color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 700 }}>72%</span>
                </div>
                <div style={{ background: 'var(--surface2)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '72%' }}
                    transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: '99px',
                      background: 'linear-gradient(90deg, var(--accent), var(--gold))',
                      boxShadow: '0 0 8px var(--accent-glow)',
                    }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Right — game preview */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{ flex: 1, minWidth: '300px', display: 'flex', justifyContent: 'center' }}
            >
              <div>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                  fontSize: '0.7rem',
                  color: 'var(--muted)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}>
                  Aperçu en temps réel
                </div>
                <GamePreviewWindow />
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)' }}
          >
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ color: 'var(--muted)', fontSize: '1.4rem' }}
            >↓</motion.div>
          </motion.div>
        </section>

        {/* ── COMING SOON FEATURES ── */}
        <section style={{ padding: '6rem 2rem' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65 }}
              style={{ textAlign: 'center', marginBottom: '3.5rem' }}
            >
              <p style={{
                color: 'var(--accent)',
                fontSize: '0.8rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}>Ce qui s'en vient</p>
              <h2 style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
                color: 'var(--gold)',
                fontWeight: 700,
                lineHeight: 1.15,
              }}>Une expérience D&amp;D complète</h2>
              <p style={{ color: 'var(--muted)', maxWidth: '500px', margin: '1rem auto 0', lineHeight: 1.7, fontSize: '0.95rem' }}>
                Tout ce que vous aimez du jeu de rôle, repensé pour le web — disponible très bientôt.
              </p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {COMING_FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: i * 0.1 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid var(--border)`,
                    borderRadius: '14px',
                    padding: '1.75rem 1.5rem',
                    boxShadow: `0 8px 32px ${f.glow}`,
                    transition: 'box-shadow 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* coming soon pill */}
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    borderRadius: '20px',
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.6rem',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>Bientôt</div>

                  <div style={{ fontSize: '2.25rem', marginBottom: '0.85rem', lineHeight: 1 }}>{f.icon}</div>
                  <h3 style={{ color: f.color, fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem', lineHeight: 1.3 }}>{f.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.84rem', lineHeight: 1.65 }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Extra features list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.4 }}
              style={{
                marginTop: '2rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '1.5rem 2rem',
              }}
            >
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '1rem' }}>
                Et aussi...
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {[
                  '🧝 9 races jouables',
                  '⚔️ 12 classes D&D',
                  '🏆 XP & objets magiques',
                  '📜 Narration immersive',
                  '🎮 Temps réel',
                  '🆓 100% gratuit',
                  '🛡️ Panel admin',
                  '🐲 Règles D&D 5e complètes',
                ].map(tag => (
                  <span key={tag} style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.3rem 0.7rem',
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                  }}>{tag}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding: '5rem 2rem 7rem', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            <div style={{
              maxWidth: '640px',
              margin: '0 auto',
              padding: '4rem 2.5rem',
              background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #1e1030 0%, rgba(18,18,26,0.6) 60%, transparent 100%)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(4px)',
            }}>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: '3.5rem', marginBottom: '1.25rem', lineHeight: 1 }}
              >🏰</motion.div>
              <h2 className="text-glow-gold" style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                color: 'var(--gold)',
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: '1rem',
              }}>
                Prêt à forger votre légende ?
              </h2>
              <p style={{ color: 'var(--text)', opacity: 0.78, lineHeight: 1.7, maxWidth: '420px', margin: '0 auto 0.75rem', fontSize: '0.95rem' }}>
                Créez votre compte dès maintenant et soyez parmi les premiers à vivre l'aventure quand les portes s'ouvriront.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>
                Gratuit · Sans installation · Accès anticipé
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/register" className="btn btn-gold" style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
                    ⚔️ Rejoindre l'aventure
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize: '1.05rem', padding: '0.9rem 2.2rem' }}>
                    Se connecter
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '2rem 2rem',
          color: 'var(--muted)',
          fontSize: '0.83rem',
        }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>🎲 Taleforge</span>
              <span>— En construction</span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth/register" style={{ color: 'var(--muted)', textDecoration: 'none' }}>S'inscrire</Link>
              <Link href="/auth/login" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Se connecter</Link>
              <span>Guidé par <strong style={{ color: 'var(--accent)' }}>Aelindra</strong></span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
