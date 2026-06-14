'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { RACES, CLASSES, CLASS_HIT_DICE, type Race, type Class } from '@/lib/types'

function rollStat() {
  const rolls = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6))
  rolls.sort((a, b) => a - b)
  return rolls.slice(1).reduce((a, b) => a + b, 0)
}

function modifier(score: number) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

const STAT_NAMES = ['Força', 'Dextérité', 'Constitution', 'Intelligence', 'Sagesse', 'Charisme'] as const
const STAT_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const
const STAT_ICONS = ['⚔️', '🏃', '🛡️', '📚', '🌿', '✨']

export default function CharacterCreatePage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [race, setRace] = useState<Race | ''>('')
  const [charClass, setCharClass] = useState<Class | ''>('')
  const [backstory, setBackstory] = useState('')
  const [saving, setSaving] = useState(false)

  const [stats, setStats] = useState({
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  })
  const [rolling, setRolling] = useState(false)

  function rollAllStats() {
    setRolling(true)
    setTimeout(() => {
      setStats({
        strength: rollStat(), dexterity: rollStat(), constitution: rollStat(),
        intelligence: rollStat(), wisdom: rollStat(), charisma: rollStat(),
      })
      setRolling(false)
    }, 600)
  }

  function calcHp() {
    const hd = CLASS_HIT_DICE[charClass || ''] || 8
    return hd + Math.floor((stats.constitution - 10) / 2)
  }

  function calcAc() {
    return 10 + Math.floor((stats.dexterity - 10) / 2)
  }

  async function saveCharacter() {
    if (!name || !race || !charClass) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error } = await supabase.from('tf_characters').insert({
      user_id: user.id,
      name, race, class: charClass, backstory: backstory || null,
      ...stats,
      hp_max: calcHp(), hp_current: calcHp(),
      armor_class: calcAc(),
      initiative: Math.floor((stats.dexterity - 10) / 2),
    })

    if (error) { alert('Erreur: ' + error.message); setSaving(false); return }
    router.push('/dashboard')
  }

  const steps = ['Identité', 'Stats', 'Histoire', 'Résumé']
  const canNext = [
    () => name.length >= 2 && race !== '' && charClass !== '',
    () => true,
    () => true,
    () => true,
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a0f 70%)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧙</div>
          <h1 style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '1.75rem' }}>Création de personnage</h1>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '2px', maxWidth: '80px',
              background: i <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Étape {step + 1}/{steps.length} — {steps[step]}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: '2rem' }}>
          {/* Step 0 — Identity */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Nom du personnage</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="ex: Thorin Forgebrisée" autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Race</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {RACES.map(r => (
                    <button key={r} onClick={() => setRace(r)} className="btn" style={{
                      padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center',
                      background: race === r ? 'var(--accent)' : 'var(--surface2)',
                      border: `1px solid ${race === r ? 'var(--accent)' : 'var(--border)'}`,
                      color: race === r ? 'white' : 'var(--text)',
                    }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Classe</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {CLASSES.map(c => (
                    <button key={c} onClick={() => setCharClass(c)} className="btn" style={{
                      padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center',
                      background: charClass === c ? 'var(--gold)' : 'var(--surface2)',
                      border: `1px solid ${charClass === c ? 'var(--gold)' : 'var(--border)'}`,
                      color: charClass === c ? '#1a1206' : 'var(--text)',
                    }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Stats */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Caractéristiques</h3>
                <button onClick={rollAllStats} className={`btn btn-primary ${rolling ? 'rolling' : ''}`} style={{ fontSize: '0.9rem' }}>
                  {rolling ? '🎲 Lance...' : '🎲 Lancer les dés'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {STAT_KEYS.map((key, i) => (
                  <div key={key} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{STAT_ICONS[i]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{STAT_NAMES[i]}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number" min={3} max={20}
                          className="input"
                          style={{ width: '60px', padding: '0.2rem 0.4rem', textAlign: 'center' }}
                          value={stats[key]}
                          onChange={e => setStats(s => ({ ...s, [key]: Math.min(20, Math.max(3, +e.target.value)) }))}
                        />
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: '32px', fontSize: '0.9rem' }}>
                          {modifier(stats[key])}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem', justifyContent: 'center' }}>
                <span>❤️ PV max: <strong style={{ color: 'var(--red)' }}>{calcHp()}</strong></span>
                <span>🛡️ CA: <strong style={{ color: 'var(--gold)' }}>{calcAc()}</strong></span>
                <span>⚡ Init: <strong style={{ color: 'var(--accent)' }}>{modifier(stats.dexterity)}</strong></span>
              </div>
            </div>
          )}

          {/* Step 2 — Backstory */}
          {step === 2 && (
            <div>
              <h3 style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '1rem' }}>Histoire du personnage</h3>
              <textarea
                className="input"
                value={backstory}
                onChange={e => setBackstory(e.target.value)}
                placeholder="Décrivez votre personnage, son passé, ses motivations... (optionnel — Claude le Maître du Jeu en tiendra compte)"
                rows={8}
                style={{ resize: 'vertical', minHeight: '160px' }}
              />
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Plus vous en dites, plus l&apos;aventure sera personnalisée !
              </p>
            </div>
          )}

          {/* Step 3 — Summary */}
          {step === 3 && (
            <div>
              <h3 style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
                🎭 {name}
              </h3>
              <div className="parchment" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div><span style={{ color: 'var(--muted)' }}>Race:</span> <strong>{race}</strong></div>
                  <div><span style={{ color: 'var(--muted)' }}>Classe:</span> <strong>{charClass}</strong></div>
                  <div><span style={{ color: 'var(--muted)' }}>PV:</span> <strong style={{ color: 'var(--red)' }}>{calcHp()}</strong></div>
                  <div><span style={{ color: 'var(--muted)' }}>CA:</span> <strong style={{ color: 'var(--gold)' }}>{calcAc()}</strong></div>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                  {STAT_KEYS.map((key, i) => (
                    <div key={key} style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{STAT_NAMES[i].slice(0, 3).toUpperCase()}</div>
                      <div style={{ fontWeight: 'bold' }}>{stats[key]} <span style={{ color: 'var(--accent)' }}>({modifier(stats[key])})</span></div>
                    </div>
                  ))}
                </div>
                {backstory && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', color: 'var(--muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    {backstory.slice(0, 200)}{backstory.length > 200 ? '...' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'space-between' }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost">
              ← Retour
            </button>
          ) : (
            <button onClick={() => router.push('/dashboard')} className="btn btn-ghost">
              Annuler
            </button>
          )}

          {step < steps.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary" disabled={!canNext[step]()}>
              Suivant →
            </button>
          ) : (
            <button onClick={saveCharacter} className="btn btn-gold" disabled={saving}>
              {saving ? '⏳ Sauvegarde...' : '⚔️ Créer le personnage'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
