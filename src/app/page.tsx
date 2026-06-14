'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a0f 60%)' }}>
      {/* Stars background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            borderRadius: '50%',
            background: 'white',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.7 + 0.1,
            animation: `pulse-slow ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ textAlign: 'center', maxWidth: '680px', position: 'relative', zIndex: 1 }}
      >
        {/* Logo / Icon */}
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: '5rem', marginBottom: '1.5rem', display: 'block' }}
        >
          🎲
        </motion.div>

        {/* Title */}
        <h1 className="text-glow-gold" style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 'bold',
          color: 'var(--gold)',
          letterSpacing: '0.05em',
          marginBottom: '0.5rem',
          lineHeight: 1.1,
        }}>
          Taleforge
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: '2rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Donjons & Dragons avec IA
        </p>

        {/* Description */}
        <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2.5rem', opacity: 0.85 }}>
          Plongez dans des aventures épiques guidées par <strong style={{ color: 'var(--accent)' }}>Claude</strong> comme Maître du Jeu.
          Créez votre personnage, rejoignez des parties avec vos amis, lancez les dés et écrivez votre légende.
        </p>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { icon: '🧙', label: 'Claude DM', desc: 'IA comme Maître du Jeu' },
            { icon: '⚔️', label: 'Multijoueur', desc: 'Jusqu\'à 6 aventuriers' },
            { icon: '🎲', label: 'Dés animés', desc: 'd4 à d20, tous les dés' },
          ].map(f => (
            <motion.div
              key={f.label}
              whileHover={{ scale: 1.05, borderColor: 'var(--accent)' }}
              className="card"
              style={{ padding: '1.25rem 1rem', borderColor: 'var(--border)', cursor: 'default' }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{f.label}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link href="/auth/register" className="btn btn-gold" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
              ⚔️ Commencer l&apos;aventure
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
              Se connecter
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
