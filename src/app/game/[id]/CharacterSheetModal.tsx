'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { TfCharacter, TfCharacterItem, TfItem, ItemRarity } from '@/lib/types'
import { RARITY_COLORS, BONUS_LABELS, calcLevel, xpForNextLevel } from '@/lib/types'

interface Props {
  character: TfCharacter
  onClose: () => void
}

function mod(v: number) {
  const m = Math.floor((v - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

const STATS: [string, keyof TfCharacter][] = [
  ['FOR', 'strength'], ['DEX', 'dexterity'], ['CON', 'constitution'],
  ['INT', 'intelligence'], ['SAG', 'wisdom'], ['CHA', 'charisma'],
]

export default function CharacterSheetModal({ character: char, onClose }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState<(TfCharacterItem & { item: TfItem })[]>([])

  useEffect(() => {
    supabase.from('tf_character_items').select('*, item:tf_items(*)').eq('character_id', char.id)
      .then(({ data }) => setItems((data || []) as (TfCharacterItem & { item: TfItem })[]))
  }, [char.id])

  const hpPct  = Math.max(0, Math.min(100, (char.hp_current / char.hp_max) * 100))
  const nextXp = xpForNextLevel(char.level)
  const prevXp = xpForNextLevel(char.level - 1) || 0
  const xpPct  = nextXp > prevXp ? Math.min(100, ((char.experience - prevXp) / (nextXp - prevXp)) * 100) : 100
  const equipped   = items.filter(i => i.equipped)
  const unequipped = items.filter(i => !i.equipped)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', padding: '1rem' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="card"
          style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#1a0a2e,#2d1060)', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 'bold' }}>{char.name}</span>
                {!char.is_alive && <span style={{ fontSize: '0.72rem', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>☠️ Mort</span>}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{char.race} · {char.class} · Niveau {char.level}</div>
            </div>
            <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', flexShrink: 0 }}>✕</button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* HP + XP */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                  <span>❤️ Points de vie</span>
                  <span style={{ fontWeight: 'bold', color: hpPct > 60 ? 'var(--green)' : hpPct > 30 ? 'var(--gold)' : 'var(--red)' }}>{char.hp_current} / {char.hp_max}</span>
                </div>
                <div style={{ height: '8px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 60 ? 'var(--green)' : hpPct > 30 ? 'var(--gold)' : 'var(--red)', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                  <span>⭐ XP (Niv.{char.level})</span>
                  <span>{char.experience.toLocaleString()} / {nextXp.toLocaleString()}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: '3px' }} />
                </div>
              </div>
            </div>

            {/* Combat stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.6rem' }}>
              {([['🛡️ CA', char.armor_class], ['⚡ Initiative', char.initiative >= 0 ? `+${char.initiative}` : char.initiative], ['💨 Vitesse', `${char.speed}m`]] as [string, string|number][]).map(([label, val]) => (
                <div key={label} style={{ background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text)' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Ability scores */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.55rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caractéristiques</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '0.5rem' }}>
                {STATS.map(([label, key]) => {
                  const val = char[key] as number
                  return (
                    <div key={label} style={{ background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '0.55rem 0.25rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>{label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text)' }}>{val}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>{mod(val)}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Items */}
            {items.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.55rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Équipement ({items.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[...equipped, ...unequipped].map(ci => (
                    <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.8rem', background: 'var(--surface2)', borderRadius: '8px', border: `1px solid ${ci.equipped ? 'rgba(124,58,237,0.4)' : 'var(--border)'}` }}>
                      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{ci.item?.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', color: RARITY_COLORS[ci.item?.rarity as ItemRarity] || 'var(--text)', fontWeight: 500 }}>{ci.item?.name}</div>
                        {ci.item?.description && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{ci.item.description}</div>}
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.15rem' }}>
                          {Object.entries(ci.item?.bonuses || {}).map(([k, v]) => `+${v} ${BONUS_LABELS[k] || k}`).join(' · ')}
                        </div>
                      </div>
                      {ci.equipped && <span style={{ fontSize: '0.68rem', color: '#a78bfa', border: '1px solid #a78bfa', borderRadius: '4px', padding: '0.1rem 0.3rem', flexShrink: 0 }}>Équipé</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Backstory */}
            {char.backstory && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Histoire</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.65, fontStyle: 'italic', background: 'var(--surface2)', borderRadius: '8px', padding: '0.85rem 1rem', border: '1px solid var(--border)' }}>{char.backstory}</p>
              </div>
            )}

            {/* Notes */}
            {char.notes && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.65, background: 'var(--surface2)', borderRadius: '8px', padding: '0.85rem 1rem', border: '1px solid var(--border)' }}>{char.notes}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
