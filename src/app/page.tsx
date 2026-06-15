'use client'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

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
  { type: 'roll-request', text: '🎲 Claude demande un jet de Perception — d20 + SAG', delay: 2900 },
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
                <div style={{ fontWeight: 700, fontSize: '0.63rem', color: 'var(--accent)', marginBottom: '0.2rem' }}>🤖 Claude · MJ</div>
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
            <span style={{ color: 'var(--accent)' }}>●</span> Claude rédige...
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

function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode
  delay?: number
  style?: React.CSSProperties
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay }}
    >
      {children}
    </motion.div>
  )
}

const sectionLabel: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: '0.8rem',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  fontWeight: 700,
  marginBottom: '0.75rem',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
  color: 'var(--gold)',
  fontWeight: 700,
  lineHeight: 1.15,
}

const FAQ_ITEMS = [
  {
    q: 'Est-ce gratuit ?',
    a: "Oui, Taleforge est entièrement gratuit. Créez votre compte, forgez votre héros et lancez-vous dans l'aventure sans aucun abonnement ni carte bancaire.",
  },
  {
    q: "Le DM IA comprend vraiment les règles D&D 5e ?",
    a: "Claude connaît les règles D&D 5e et les applique en jeu : jets de dés contextuels, modificateurs de statistiques, avantage/désavantage. Il maintient aussi la cohérence narrative tout au long de l'aventure.",
  },
  {
    q: 'Combien de joueurs peuvent participer ?',
    a: "Jusqu'à 6 aventuriers peuvent rejoindre la même partie en temps réel. Le DM IA comme le DM humain s'adaptent à la taille du groupe, de la session solo à la table de six.",
  },
  {
    q: 'Faut-il connaître D&D pour jouer ?',
    a: "Non. Le DM IA explique les règles en cours de jeu et gère tous les aspects techniques. Taleforge est une excellente porte d'entrée — les débutants y sont les bienvenus.",
  },
  {
    q: 'Comment fonctionne le mode DM Humain ?',
    a: "Un joueur prend le rôle de Maître du Jeu et accède à un panneau dédié : narration en parchemin doré, gestion des PNJ, jets de dés, distribution d'XP et d'objets magiques aux aventuriers.",
  },
  {
    q: 'Puis-je jouer seul avec le DM IA ?',
    a: "Absolument. Le DM IA est disponible 24h/24 et adapte l'histoire à un joueur solitaire comme à un groupe de six. Parfait pour explorer entre deux sessions avec vos amis.",
  },
]

function FAQItem({ item, delay }: { item: typeof FAQ_ITEMS[0]; delay: number }) {
  const [open, setOpen] = useState(false)
  return (
    <FadeIn delay={delay}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(124,58,237,0.06)' : 'var(--surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '10px',
          padding: '1.2rem 1.5rem',
          cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.4 }}>{item.q}</span>
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: 'var(--accent)', fontSize: '1.4rem', flexShrink: 0, lineHeight: 1, display: 'block' }}
          >+</motion.span>
        </div>
        {open && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{ marginTop: '0.8rem', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75 }}
          >
            {item.a}
          </motion.p>
        )}
      </div>
    </FadeIn>
  )
}

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
              Commencer gratuitement
            </Link>
          </div>
        </nav>

        {/* ── HERO ── */}
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
            {/* Left — text */}
            <div style={{ flex: 1, minWidth: '300px', maxWidth: '560px' }}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.4)',
                  borderRadius: '20px',
                  padding: '0.35rem 0.9rem',
                  marginBottom: '1.5rem',
                }}
              >
                <span style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 700 }}>
                  ✦ DM IA · DM Humain · Temps réel
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
                Forgez votre<br />
                <span style={{ color: 'var(--accent)' }}>légende</span><br />
                en D&amp;D
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                  color: 'var(--text)',
                  lineHeight: 1.75,
                  marginBottom: '2rem',
                  opacity: 0.88,
                }}
              >
                D&D 5e multijoueur en ligne — guidé par{' '}
                <strong style={{ color: 'var(--accent)' }}>Claude (IA)</strong> ou par un vrai{' '}
                <strong style={{ color: 'var(--gold)' }}>Maître du Jeu humain</strong>.
                Jusqu'à 6 aventuriers, zéro installation.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/register" className="btn btn-gold" style={{ fontSize: '1.05rem', padding: '0.85rem 2.2rem' }}>
                    ⚔️ Commencer gratuitement
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize: '1.05rem', padding: '0.85rem 2rem' }}>
                    Se connecter
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}
              >
                {[
                  { icon: '🆓', label: 'Gratuit' },
                  { icon: '⚡', label: 'Temps réel' },
                  { icon: '🤖', label: 'Claude IA' },
                  { icon: '👥', label: "Jusqu'à 6 joueurs" },
                ].map(b => (
                  <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
                    <span>{b.icon}</span>
                    <span>{b.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — game preview */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{ flex: 1, minWidth: '300px', display: 'flex', justifyContent: 'center' }}
            >
              <GamePreviewWindow />
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

        {/* ── TRUST STRIP ── */}
        <div style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(18,18,26,0.7)',
          padding: '1rem 2rem',
        }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {[
              { icon: '🤖', label: 'Propulsé par Claude · Anthropic' },
              { icon: '⚡', label: 'Supabase Realtime' },
              { icon: '🐉', label: 'Règles D&D 5e' },
              { icon: '🔒', label: 'Compte sécurisé' },
              { icon: '🆓', label: '100% gratuit' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                color: 'var(--muted)', fontSize: '0.78rem',
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── DM MODES ── */}
        <section style={{ padding: '7rem 2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <p style={sectionLabel}>Flexibilité totale</p>
                <h2 style={{ ...sectionTitle, marginBottom: '1rem' }}>
                  Deux façons de jouer, une seule plateforme
                </h2>
                <p style={{ color: 'var(--muted)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7, fontSize: '1rem' }}>
                  IA disponible à toute heure ou ami humain au clavier — Taleforge supporte les deux modes sans compromis.
                </p>
              </div>
            </FadeIn>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>

              {/* ── AI DM card ── */}
              <FadeIn delay={0.1}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  style={{
                    background: 'linear-gradient(160deg, #1e1030 0%, #14102a 50%, #12121a 100%)',
                    border: '1px solid var(--accent)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(124,58,237,0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{
                    padding: '2rem 2rem 1.5rem',
                    borderBottom: '1px solid rgba(124,58,237,0.2)',
                    background: 'rgba(124,58,237,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '3rem', lineHeight: 1 }}>🤖</div>
                      <div>
                        <span style={{
                          display: 'inline-block',
                          background: 'var(--accent)',
                          color: 'white',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          marginBottom: '0.5rem',
                        }}>Claude · IA</span>
                        <h3 style={{ color: 'var(--text)', fontSize: '1.65rem', fontWeight: 700 }}>DM Artificiel</h3>
                      </div>
                    </div>
                    <p style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                      Claude, le modèle d'Anthropic, incarne un Maître du Jeu expert. Il génère des histoires immersives, applique les règles D&D 5e et s'adapte à chaque décision de vos personnages — instantanément.
                    </p>
                  </div>

                  {/* Example narration */}
                  <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
                    <div style={{ fontSize: '0.67rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                      Exemple de narration
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #1a1206, #2a1e0a)',
                      borderLeft: '3px solid var(--gold)',
                      padding: '0.75rem',
                      borderRadius: '0 6px 6px 0',
                      color: '#d4af37',
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                      marginBottom: '0.5rem',
                    }}>
                      "Le dragon lève la tête, ses yeux dorés vous fixent avec une curiosité glaciale. Il n'a pas encore décidé si vous êtes une menace... ou un repas."
                    </div>
                    <div style={{
                      background: 'rgba(245,158,11,0.07)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      color: 'var(--gold)',
                      fontSize: '0.72rem',
                      textAlign: 'center',
                    }}>
                      🎲 Claude demande : Persuasion ou Initiative — à vous de choisir
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7rem', margin: 0, padding: 0 }}>
                      {[
                        'Disponible 24h/24, 7j/7',
                        'Narrations riches et cohérentes',
                        'Règles D&D 5e appliquées automatiquement',
                        'Jets de dés demandés au bon moment',
                        'Adapte la difficulté et le style au groupe',
                        'Parfait pour jouer seul ou découvrir D&D',
                      ].map(item => (
                        <li key={item} style={{ color: 'var(--text)', fontSize: '0.875rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--accent)', flexShrink: 0, fontWeight: 900 }}>✦</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '1.5rem 2rem 2rem' }}>
                    <Link href="/auth/register" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem' }}>
                      Jouer avec le DM IA →
                    </Link>
                  </div>
                </motion.div>
              </FadeIn>

              {/* ── Human DM card ── */}
              <FadeIn delay={0.2}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  style={{
                    background: 'linear-gradient(160deg, #1a1206 0%, #1a130a 50%, #12121a 100%)',
                    border: '1px solid var(--gold)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(245,158,11,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{
                    padding: '2rem 2rem 1.5rem',
                    borderBottom: '1px solid rgba(245,158,11,0.2)',
                    background: 'rgba(245,158,11,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '3rem', lineHeight: 1 }}>🧙</div>
                      <div>
                        <span style={{
                          display: 'inline-block',
                          background: 'var(--gold)',
                          color: '#1a1206',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          marginBottom: '0.5rem',
                        }}>Joueur humain · MJ</span>
                        <h3 style={{ color: 'var(--text)', fontSize: '1.65rem', fontWeight: 700 }}>DM Humain</h3>
                      </div>
                    </div>
                    <p style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                      Un de vos amis endosse le rôle de Maître du Jeu. Il dispose d'un panneau dédié pour narrer, gérer les PNJ, lancer les dés et récompenser les joueurs — l'expérience D&D authentique.
                    </p>
                  </div>

                  {/* DM Panel preview */}
                  <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
                    <div style={{ fontSize: '0.67rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                      Aperçu du panneau MJ
                    </div>
                    <div style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        background: 'linear-gradient(90deg, #1a1206, #221808)',
                        borderBottom: '1px solid rgba(245,158,11,0.2)',
                        padding: '0.45rem 0.75rem',
                        display: 'flex',
                        gap: '0.4rem',
                      }}>
                        {[['📜 Narration', true], ['⚔️ Combat', false], ['🏆 Récompenses', false]].map(([tab, active]) => (
                          <span key={String(tab)} style={{
                            fontSize: '0.65rem',
                            color: active ? 'var(--gold)' : 'var(--muted)',
                            padding: '0.2rem 0.5rem',
                            background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                            borderRadius: '4px',
                          }}>{tab}</span>
                        ))}
                      </div>
                      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.45rem 0.6rem',
                          color: 'var(--muted)',
                          fontSize: '0.69rem',
                        }}>Décrire la scène ou la réaction d'un PNJ...</div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {[
                            { label: '📜 Narrer', bg: 'var(--accent)', color: 'white' },
                            { label: '🎲 Dés', bg: 'rgba(245,158,11,0.15)', color: 'var(--gold)' },
                            { label: '🏆 XP', bg: 'rgba(34,197,94,0.1)', color: 'var(--green)' },
                          ].map(btn => (
                            <div key={btn.label} style={{
                              flex: 1, background: btn.bg, color: btn.color,
                              padding: '0.35rem', borderRadius: '4px',
                              fontSize: '0.64rem', textAlign: 'center', fontWeight: 700,
                            }}>{btn.label}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7rem', margin: 0, padding: 0 }}>
                      {[
                        'Créativité et improvisation humaine',
                        'Panneau MJ : narration, PNJ, dés, modes',
                        "Distribution de XP et d'objets aux joueurs",
                        'Contrôle total sur le rythme de la partie',
                        "L'expérience authentique D&D entre amis",
                        "Devenez joueur si quelqu'un d'autre DM",
                      ].map(item => (
                        <li key={item} style={{ color: 'var(--text)', fontSize: '0.875rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--gold)', flexShrink: 0, fontWeight: 900 }}>✦</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '1.5rem 2rem 2rem' }}>
                    <Link href="/auth/register" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem' }}>
                      Inviter mes amis →
                    </Link>
                  </div>
                </motion.div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section style={{
          padding: '5rem 2rem',
          background: 'linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.04) 40%, transparent 100%)',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                <p style={sectionLabel}>Tout ce qu'il vous faut</p>
                <h2 style={sectionTitle}>Une expérience D&amp;D complète</h2>
              </div>
            </FadeIn>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {[
                { icon: '⚔️', title: 'Multijoueur temps réel', desc: "Jusqu'à 6 aventuriers synchronisés à la milliseconde via Supabase Realtime. Chat, actions, narrations — tout arrive en direct." },
                { icon: '🎲', title: 'Dés animés d4–d20', desc: 'Tous les dés D&D avec animations fluides. Demandés par le MJ ou lancés librement — les résultats sont visibles par tous.' },
                { icon: '🧝', title: 'Création de personnage', desc: '9 races, 12 classes, stats D&D 5e complètes (FOR, DEX, CON, INT, SAG, CHA). Votre héros en quelques clics.' },
                { icon: '🏆', title: 'XP & objets magiques', desc: "Gagnez de l'expérience, montez en niveau. Récupérez des équipements communs, épiques ou légendaires." },
                { icon: '📜', title: 'Narration immersive', desc: 'Messages codés par type : narration en parchemin doré, actions en vert, dialogues DM en violet mystique.' },
                { icon: '🛡️', title: 'Administration complète', desc: 'Gérez utilisateurs, personnages, objets et parties depuis un panneau admin dédié avec accès privilégié.' },
              ].map((f, i) => (
                <FadeIn key={f.title} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ scale: 1.03, borderColor: 'var(--accent)' }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="card"
                    style={{ padding: '1.75rem 1.5rem', height: '100%' }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem', lineHeight: 1 }}>{f.icon}</div>
                    <h3 style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.975rem' }}>{f.title}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.65 }}>{f.desc}</p>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOR WHO ── */}
        <section style={{ padding: '5rem 2rem' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                <p style={sectionLabel}>Pour tout le monde</p>
                <h2 style={sectionTitle}>Taleforge est fait pour vous</h2>
              </div>
            </FadeIn>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {[
                { icon: '🐣', title: 'Débutants D&D', desc: "Jamais joué ? Le DM IA explique les règles en cours de jeu. Parfait pour découvrir D&D sans intimidation." },
                { icon: '🧙', title: 'Vétérans', desc: "Connaissez vos règles ? Plongez directement dans des aventures complexes avec un DM qui les maîtrise aussi." },
                { icon: '👨‍👩‍👧‍👦', title: "Groupes d'amis", desc: "L'un de vous DM, les autres jouent — ou laissez l'IA gérer pendant que tout le monde joue ensemble." },
                { icon: '🌙', title: 'Joueurs solitaires', desc: "Le DM IA est disponible à minuit comme à midi. Jouez à votre rythme, seul ou avec votre groupe en ligne." },
              ].map((c, i) => (
                <FadeIn key={c.title} delay={i * 0.09}>
                  <motion.div
                    whileHover={{ scale: 1.04, borderColor: 'var(--accent)' }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="card"
                    style={{ padding: '1.75rem 1.5rem', textAlign: 'center', height: '100%' }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{c.icon}</div>
                    <h3 style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem' }}>{c.title}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.65 }}>{c.desc}</p>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{
          padding: '5rem 2rem',
          background: 'linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.03) 40%, transparent 100%)',
        }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                <p style={sectionLabel}>Simple & rapide</p>
                <h2 style={sectionTitle}>Prêt à jouer en 3 étapes</h2>
              </div>
            </FadeIn>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                {
                  num: '01', icon: '📝',
                  title: 'Créez votre compte',
                  desc: 'Inscription gratuite en 30 secondes. Aucune carte bancaire, aucune configuration. Juste votre email.',
                  detail: 'Compte sécurisé · Email vérifié',
                },
                {
                  num: '02', icon: '🧝',
                  title: 'Forgez votre héros',
                  desc: 'Choisissez race, classe, statistiques et écrivez le passé de votre personnage. Il vous appartient et progresse au fil des aventures.',
                  detail: '9 races · 12 classes · Stats D&D 5e',
                },
                {
                  num: '03', icon: '🎮',
                  title: 'Lancez ou rejoignez une partie',
                  desc: "Créez une salle (DM IA ou DM humain), partagez le code, et l'aventure commence. Vos amis vous rejoignent en un clic.",
                  detail: "Jusqu'à 6 joueurs · Temps réel",
                },
              ].map((step, i) => (
                <FadeIn key={step.num} delay={i * 0.14}>
                  <div className="card" style={{ padding: '1.75rem 2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                    <div style={{
                      flexShrink: 0, width: '52px', height: '52px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent) 0%, #4c1d95 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 800, color: 'white', letterSpacing: '0.05em',
                      boxShadow: '0 0 18px var(--accent-glow)',
                    }}>
                      {step.num}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                        <h3 style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.05rem' }}>{step.title}</h3>
                      </div>
                      <p style={{ color: 'var(--muted)', lineHeight: 1.65, fontSize: '0.875rem', marginBottom: '0.6rem' }}>{step.desc}</p>
                      <span style={{
                        fontSize: '0.72rem', color: 'var(--accent)',
                        background: 'rgba(124,58,237,0.1)',
                        padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 600,
                      }}>{step.detail}</span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <FadeIn>
          <section style={{
            padding: '3.5rem 2rem',
            background: 'linear-gradient(90deg, rgba(124,58,237,0.08) 0%, rgba(245,158,11,0.08) 100%)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              maxWidth: '1000px', margin: '0 auto',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '2rem', textAlign: 'center',
            }}>
              {[
                { value: '6', label: 'Aventuriers max', icon: '⚔️' },
                { value: '2', label: 'Modes de jeu', icon: '🎮' },
                { value: '12', label: 'Classes jouables', icon: '🧙' },
                { value: '9', label: 'Races disponibles', icon: '🧝' },
                { value: '∞', label: 'Aventures possibles', icon: '📖' },
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{stat.icon}</div>
                  <div className="text-glow-gold" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.4rem', letterSpacing: '0.06em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── FAQ ── */}
        <section style={{ padding: '6rem 2rem' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <FadeIn>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <p style={sectionLabel}>Questions fréquentes</p>
                <h2 style={sectionTitle}>Tout ce que vous voulez savoir</h2>
              </div>
            </FadeIn>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {FAQ_ITEMS.map((item, i) => (
                <FAQItem key={item.q} item={item} delay={i * 0.06} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding: '6rem 2rem', textAlign: 'center' }}>
          <FadeIn>
            <div style={{
              maxWidth: '700px',
              margin: '0 auto',
              padding: '4.5rem 2.5rem',
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
              <h2 className="text-glow-gold" style={{ ...sectionTitle, marginBottom: '1rem' }}>
                Votre légende commence ici
              </h2>
              <p style={{ color: 'var(--text)', opacity: 0.78, lineHeight: 1.7, maxWidth: '460px', margin: '0 auto 0.75rem', fontSize: '0.98rem' }}>
                Choisissez le DM IA pour jouer maintenant, ou invitez vos amis pour une session avec un MJ humain. L'aventure vous attend.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '2.25rem' }}>
                Gratuit · Sans installation · Prêt en 2 minutes
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/register" className="btn btn-gold" style={{ fontSize: '1.1rem', padding: '0.9rem 2.5rem' }}>
                    ⚔️ Commencer gratuitement
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                  <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize: '1.1rem', padding: '0.9rem 2.2rem' }}>
                    Se connecter
                  </Link>
                </motion.div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '2.5rem 2rem',
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
              <span>— Jeu de rôle en ligne, gratuit</span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth/register" style={{ color: 'var(--muted)', textDecoration: 'none' }}>S'inscrire</Link>
              <Link href="/auth/login" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Se connecter</Link>
              <span>Propulsé par <strong style={{ color: 'var(--accent)' }}>Claude</strong> &amp; Supabase</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
