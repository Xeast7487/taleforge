'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import type { TfUser, TfGame, TfCharacter, TfCharacterItem, TfItem } from '@/lib/types'
import { calcLevel, xpForNextLevel, RARITY_COLORS, RARITY_LABELS, BONUS_LABELS } from '@/lib/types'

type CharacterWithItems = TfCharacter & {
  items: (TfCharacterItem & { item: TfItem })[]
}

interface Props {
  user: TfUser
  games: (TfGame & { player_count: number })[]
  characters: CharacterWithItems[]
}

const CLASS_ICONS: Record<string, string> = {
  Barbare:'💪',Barde:'🎵',Clerc:'✝️',Druide:'🌿',Guerrier:'⚔️',Moine:'👊',
  Paladin:'⚜️',Rôdeur:'🏹',Roublard:'🗡️',Ensorceleur:'✨',Occultiste:'👁️',Magicien:'🧙',
}

function BonusTag({ stat, val }: { stat: string; val: number }) {
  return (
    <span style={{ fontSize: '0.7rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '4px', padding: '0.1rem 0.35rem', color: '#a78bfa' }}>
      +{val} {BONUS_LABELS[stat] || stat}
    </span>
  )
}

function CharacterCard({ char }: { char: CharacterWithItems }) {
  const equipped = char.items.filter(i => i.equipped)
  const hpPct = Math.max(0, Math.min(100, (char.hp_current / char.hp_max) * 100))
  const currentXp = char.experience
  const nextLevelXp = xpForNextLevel(char.level)
  const prevLevelXp = xpForNextLevel(char.level - 1) || 0
  const xpPct = nextLevelXp > prevLevelXp
    ? Math.min(100, ((currentXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
    : 100
  const icon = CLASS_ICONS[char.class] || '🧙'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', borderRadius: '10px' }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: 'var(--gold)', fontSize: '1.05rem' }}>{char.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{char.race} · {char.class} · Niv. {char.level}</div>
        </div>
        {!char.is_alive && <span style={{ fontSize: '0.75rem', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>☠️ Mort</span>}
      </div>

      {/* HP bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
          <span>❤️ PV</span>
          <span>{char.hp_current}/{char.hp_max}</span>
        </div>
        <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 60 ? 'var(--green)' : hpPct > 30 ? 'var(--gold)' : 'var(--red)', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
          <span>⭐ XP</span>
          <span>{currentXp.toLocaleString()} / {nextLevelXp.toLocaleString()}</span>
        </div>
        <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Equipped items */}
      {equipped.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>Items équipés</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {equipped.map(ci => (
              <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                <span>{ci.item.icon}</span>
                <span style={{ color: RARITY_COLORS[ci.item.rarity], fontWeight: 500 }}>{ci.item.name}</span>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {Object.entries(ci.item.bonuses).map(([stat, val]) => (
                    <BonusTag key={stat} stat={stat} val={val as number} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {equipped.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>Aucun item équipé</div>
      )}
    </motion.div>
  )
}

export default function DashboardClient({ user, games, characters }: Props) {
  const [creating, setCreating] = useState(false)
  const [newGameName, setNewGameName] = useState('')
  const [newGameDesc, setNewGameDesc] = useState('')
  const [newGamePassword, setNewGamePassword] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [dmType, setDmType] = useState<'ai' | 'human'>('ai')
  const [joinModal, setJoinModal] = useState<{ id: string; name: string } | null>(null)
  const [joinPassword, setJoinPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function createGame(e: React.FormEvent) {
    e.preventDefault()
    if (!newGameName.trim()) return
    setCreating(true)

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newGameName.trim(),
        description: newGameDesc.trim() || null,
        dm_type: dmType,
        password: newGamePassword.trim() || null,
      }),
    })
    const data = await res.json()

    if (!res.ok || !data.id) {
      alert('Erreur: ' + (data.error || 'inconnue'))
      setCreating(false)
      return
    }

    router.push(`/game/${data.id}`)
  }

  async function handleJoin(gameId: string, password?: string) {
    setJoining(true)
    setJoinError('')
    const res = await fetch(`/api/game/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password || '' }),
    })
    const data = await res.json()
    setJoining(false)
    if (!res.ok) {
      setJoinError(data.error || 'Erreur')
      return
    }
    setJoinModal(null)
    setJoinPassword('')
    router.push(`/game/${gameId}`)
  }

  const statusLabel: Record<string, string> = {
    waiting: '⏳ En attente',
    active: '⚔️ En cours',
    paused: '⏸️ En pause',
    ended: '✅ Terminée',
  }
  const statusColor: Record<string, string> = {
    waiting: '#f59e0b',
    active: '#22c55e',
    paused: '#94a3b8',
    ended: '#64748b',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a0f 70%)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🎲</span>
          <span style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>Taleforge</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>⚔️ {user.username}</span>
          <button onClick={logout} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--gold)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Taverne des Aventuriers
          </h1>
          <p style={{ color: 'var(--muted)' }}>Rejoignez une partie ou créez la vôtre</p>
        </motion.div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-gold">
            ➕ Créer une partie
          </button>
          <Link href="/character/new" className="btn btn-ghost">
            🧙 Créer un personnage
          </Link>
        </div>

        {/* Create game form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="card"
            style={{ padding: '1.5rem', marginBottom: '2rem', borderColor: 'var(--accent)' }}
          >
            <h3 style={{ color: 'var(--accent)', marginBottom: '1rem', fontWeight: 'bold' }}>🗡️ Nouvelle aventure</h3>
            <form onSubmit={createGame} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                className="input"
                placeholder="Nom de la partie (ex: La Crypte des Morts)"
                value={newGameName}
                onChange={e => setNewGameName(e.target.value)}
                required
                autoFocus
              />
              <textarea
                className="input"
                placeholder="Description de l'aventure (optionnel)..."
                value={newGameDesc}
                onChange={e => setNewGameDesc(e.target.value)}
                rows={2}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Maître du Jeu :</span>
                <button type="button" onClick={() => setDmType('ai')} className="btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem', background: dmType === 'ai' ? 'var(--surface2)' : 'transparent', border: `1px solid ${dmType === 'ai' ? 'var(--accent)' : 'var(--border)'}`, color: dmType === 'ai' ? 'var(--accent)' : 'var(--muted)' }}>🤖 Aelindra</button>
                <button type="button" onClick={() => setDmType('human')} className="btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem', background: dmType === 'human' ? 'var(--surface2)' : 'transparent', border: `1px solid ${dmType === 'human' ? '#a78bfa' : 'var(--border)'}`, color: dmType === 'human' ? '#a78bfa' : 'var(--muted)' }}>🎭 Humain</button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="🔒 Mot de passe (optionnel — laissez vide pour une partie publique)"
                  value={newGamePassword}
                  onChange={e => setNewGamePassword(e.target.value)}
                  style={{ paddingRight: newGamePassword ? '2.5rem' : undefined }}
                />
                {newGamePassword && (
                  <button
                    type="button"
                    onClick={() => setNewGamePassword('')}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}
                  >✕</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-gold" disabled={creating}>
                  {creating ? '⏳ Création...' : '⚔️ Créer la partie'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">
                  Annuler
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Characters section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '1.1rem' }}>
              🧙 Mes personnages ({characters.length})
            </h2>
            <Link href="/character/new" style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
              + Nouveau
            </Link>
          </div>

          {characters.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧙</div>
              <p style={{ marginBottom: '1rem' }}>Vous n&apos;avez pas encore de personnage.</p>
              <Link href="/character/new" className="btn btn-gold" style={{ display: 'inline-flex' }}>
                Créer mon premier personnage
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {characters.map(char => (
                <CharacterCard key={char.id} char={char} />
              ))}
            </div>
          )}
        </div>

        {/* Games list */}
        <h2 style={{ color: 'var(--text)', fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem' }}>
          ⚔️ Parties disponibles ({games.length})
        </h2>

        {games.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏰</div>
            <p>Aucune partie en cours. Soyez le premier à créer une aventure !</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card"
                style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text)' }}>{game.name}</span>
                    <span style={{ fontSize: '0.8rem', color: statusColor[game.status] || 'var(--muted)', background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: `1px solid ${statusColor[game.status] || 'var(--muted)'}` }}>
                      {statusLabel[game.status] || game.status}
                    </span>
                    {game.dm_type === 'human' && <span style={{ fontSize: '0.75rem', color: '#a78bfa', border: '1px solid #a78bfa', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>🎭 MJ Humain</span>}
                    {game.has_password && <span style={{ fontSize: '0.75rem', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>🔒 Privée</span>}
                  </div>
                  {game.description && <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{game.description}</p>}
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem', display: 'flex', gap: '1rem' }}>
                    <span>👥 {game.player_count}/{game.max_players} joueurs</span>
                    {game.host && <span>🎭 MJ: {(game.host as { username?: string })?.username || 'Inconnu'}</span>}
                  </div>
                </div>
                {game.host_id === user.id ? (
                  <Link href={`/game/${game.id}`} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                    🔧 Gérer
                  </Link>
                ) : game.has_password ? (
                  <button
                    onClick={() => { setJoinModal({ id: game.id, name: game.name }); setJoinPassword(''); setJoinError('') }}
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    🔒 Rejoindre
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoin(game.id)}
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    ⚔️ Rejoindre
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Join password modal */}
      {joinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ padding: '2rem', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
              <h3 style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '0.25rem' }}>Partie protégée</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                &ldquo;{joinModal.name}&rdquo; est verrouillée. Entrez le mot de passe pour rejoindre.
              </p>
            </div>
            <form
              onSubmit={e => { e.preventDefault(); handleJoin(joinModal.id, joinPassword) }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <input
                className="input"
                type="text"
                placeholder="Mot de passe de la partie..."
                value={joinPassword}
                onChange={e => { setJoinPassword(e.target.value); setJoinError('') }}
                autoFocus
              />
              {joinError && (
                <p style={{ color: 'var(--red)', fontSize: '0.85rem', textAlign: 'center' }}>❌ {joinError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-gold" disabled={joining || !joinPassword.trim()} style={{ flex: 1 }}>
                  {joining ? '⏳...' : '⚔️ Rejoindre'}
                </button>
                <button type="button" onClick={() => setJoinModal(null)} className="btn btn-ghost">
                  Annuler
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
