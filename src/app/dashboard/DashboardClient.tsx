'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import type { TfUser, TfGame } from '@/lib/types'

interface Props {
  user: TfUser
  games: (TfGame & { player_count: number })[]
}

export default function DashboardClient({ user, games }: Props) {
  const [creating, setCreating] = useState(false)
  const [newGameName, setNewGameName] = useState('')
  const [newGameDesc, setNewGameDesc] = useState('')
  const [showCreate, setShowCreate] = useState(false)
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

    const { data: game, error } = await supabase.from('tf_games').insert({
      name: newGameName.trim(),
      description: newGameDesc.trim() || null,
      host_id: user.id,
      status: 'waiting',
    }).select().single()

    if (error || !game) {
      alert('Erreur: ' + (error?.message || 'inconnue'))
      setCreating(false)
      return
    }

    // Join as host
    await supabase.from('tf_game_players').insert({ game_id: game.id, user_id: user.id })

    router.push(`/game/${game.id}`)
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

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
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

        {/* Games list */}
        <h2 style={{ color: 'var(--text)', fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem' }}>
          Parties disponibles ({games.length})
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
                  </div>
                  {game.description && <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{game.description}</p>}
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem', display: 'flex', gap: '1rem' }}>
                    <span>👥 {game.player_count}/{game.max_players} joueurs</span>
                    {game.host && <span>🎭 MJ: {(game.host as { username?: string })?.username || 'Inconnu'}</span>}
                  </div>
                </div>
                <Link href={`/game/${game.id}`} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  {game.host_id === user.id ? '🔧 Gérer' : '⚔️ Rejoindre'}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
