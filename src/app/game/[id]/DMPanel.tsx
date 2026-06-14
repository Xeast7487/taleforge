'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { TfGame, TfUser, TfCharacter, TfMessage, TfItem, TfCharacterItem, GameStatus, ItemRarity } from '@/lib/types'
import { RARITY_COLORS, BONUS_LABELS, xpForNextLevel, calcLevel } from '@/lib/types'

interface Props {
  game: TfGame & { host?: { username: string } }
  user: TfUser
  initialMessages: TfMessage[]
}

interface PlayerInfo {
  user: TfUser
  character: (TfCharacter & { items: (TfCharacterItem & { item: TfItem })[] }) | null
}

type DMMode = 'narration' | 'chat' | 'npc' | 'dice'
type DiceT = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'

// ── Rewards panel (inline) ──────────────────────────────────────
function RewardsPanel({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const supabase = createClient()
  const [tab, setTab] = useState<'xp' | 'item'>('xp')
  const [xpAmount, setXpAmount] = useState(100)
  const [items, setItems] = useState<TfItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<TfItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [characters, setCharacters] = useState<TfCharacter[]>([])
  const [targetCharId, setTargetCharId] = useState('')

  useEffect(() => {
    supabase.from('tf_items').select('*').order('rarity').then(({ data }) => setItems(data || []))
    supabase.from('tf_game_players').select('user_id').eq('game_id', gameId).then(async ({ data: gps }) => {
      if (!gps) return
      const userIds = gps.map(p => p.user_id)
      const { data: chars } = await supabase.from('tf_characters').select('*').in('user_id', userIds)
      setCharacters(chars || [])
      if (chars?.[0]) setTargetCharId(chars[0].id)
    })
  }, [gameId, supabase])

  async function awardXp() {
    if (!targetCharId || xpAmount <= 0) return
    setLoading(true)
    const { data: char } = await supabase.from('tf_characters').select('experience, level, name').eq('id', targetCharId).single()
    if (!char) { setLoading(false); return }
    const newXp = char.experience + xpAmount
    const newLevel = calcLevel(newXp)
    const leveledUp = newLevel > char.level
    await supabase.from('tf_characters').update({ experience: newXp, level: newLevel }).eq('id', targetCharId)
    await supabase.from('tf_messages').insert({
      game_id: gameId, user_id: null, type: 'system',
      content: leveledUp
        ? `🌟 ${char.name} gagne ${xpAmount} XP et passe au niveau ${newLevel} !`
        : `⭐ ${char.name} gagne ${xpAmount} XP. (Total: ${newXp.toLocaleString()} / ${xpForNextLevel(newLevel).toLocaleString()})`,
    })
    setNotice(leveledUp ? `🎉 Niveau ${newLevel} !` : `✅ +${xpAmount} XP`)
    setLoading(false)
  }

  async function giveItem() {
    if (!targetCharId || !selectedItem) return
    setLoading(true)
    const { data: char } = await supabase.from('tf_characters').select('name').eq('id', targetCharId).single()
    await supabase.from('tf_character_items').insert({ character_id: targetCharId, item_id: selectedItem.id, equipped: false, obtained_from: gameId })
    await supabase.from('tf_messages').insert({
      game_id: gameId, user_id: null, type: 'system',
      content: `🎁 ${char?.name || 'Un aventurier'} reçoit : ${selectedItem.icon} ${selectedItem.name} !`,
    })
    setNotice(`✅ ${selectedItem.name} donné !`)
    setSelectedItem(null)
    setLoading(false)
  }

  const rarityOrder: Record<ItemRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--gold)', fontWeight: 'bold' }}>🏆 Récompenses</h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>✕</button>
        </div>
        {characters.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>Personnage cible</label>
            <select className="input" value={targetCharId} onChange={e => setTargetCharId(e.target.value)} style={{ padding: '0.4rem 0.6rem' }}>
              {characters.map(c => <option key={c.id} value={c.id}>{c.name} (Niv.{c.level})</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setTab('xp')} className="btn" style={{ flex: 1, justifyContent: 'center', border: `1px solid ${tab === 'xp' ? 'var(--gold)' : 'var(--border)'}`, color: tab === 'xp' ? 'var(--gold)' : 'var(--muted)', background: tab === 'xp' ? 'var(--surface2)' : 'transparent' }}>⭐ XP</button>
          <button onClick={() => setTab('item')} className="btn" style={{ flex: 1, justifyContent: 'center', border: `1px solid ${tab === 'item' ? 'var(--accent)' : 'var(--border)'}`, color: tab === 'item' ? 'var(--accent)' : 'var(--muted)', background: tab === 'item' ? 'var(--surface2)' : 'transparent' }}>🎒 Item</button>
        </div>
        {notice && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--green)', fontSize: '0.85rem', marginBottom: '0.75rem', textAlign: 'center' }}>{notice}</div>}
        {tab === 'xp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input type="number" className="input" min={1} value={xpAmount} onChange={e => setXpAmount(Math.max(1, parseInt(e.target.value) || 0))} style={{ width: '100px' }} />
              {[50, 100, 200, 500].map(v => <button key={v} onClick={() => setXpAmount(v)} className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderColor: xpAmount === v ? 'var(--gold)' : undefined, color: xpAmount === v ? 'var(--gold)' : undefined }}>{v}</button>)}
            </div>
            <button onClick={awardXp} className="btn btn-gold" disabled={loading || !targetCharId} style={{ justifyContent: 'center' }}>{loading ? '⏳...' : `⭐ Attribuer ${xpAmount} XP`}</button>
          </div>
        )}
        {tab === 'item' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
            <input className="input" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ overflowY: 'auto', maxHeight: '280px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[...filtered].sort((a, b) => rarityOrder[a.rarity as ItemRarity] - rarityOrder[b.rarity as ItemRarity]).map(item => (
                <button key={item.id} onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)} className="btn"
                  style={{ justifyContent: 'flex-start', gap: '0.5rem', padding: '0.4rem 0.75rem', background: selectedItem?.id === item.id ? 'rgba(124,58,237,0.2)' : 'var(--surface2)', border: `1px solid ${selectedItem?.id === item.id ? 'var(--accent)' : 'var(--border)'}` }}>
                  <span>{item.icon}</span>
                  <span style={{ color: RARITY_COLORS[item.rarity], fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{Object.entries(item.bonuses).map(([k, v]) => `+${v} ${BONUS_LABELS[k] || k}`).join(' · ')}</span>
                </button>
              ))}
            </div>
            {selectedItem && <button onClick={giveItem} className="btn btn-primary" disabled={loading || !targetCharId} style={{ justifyContent: 'center' }}>{loading ? '⏳...' : `🎁 Donner ${selectedItem.icon} ${selectedItem.name}`}</button>}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Player card (sidebar) ──────────────────────────────────────
function PlayerCard({ player }: { player: PlayerInfo }) {
  const char = player.character
  if (!char) return (
    <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '0.88rem' }}>{player.user.username}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>Sans personnage</div>
    </div>
  )
  const hpPct = Math.min(100, (char.hp_current / char.hp_max) * 100)
  const equipped = char.items?.filter(i => i.equipped) || []
  return (
    <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 'bold', color: 'var(--gold)', fontSize: '0.88rem' }}>{char.name}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>{char.race} {char.class} · Niv.{char.level} · @{player.user.username}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <span style={{ color: 'var(--red)', fontSize: '0.72rem' }}>❤️</span>
        <div style={{ flex: 1, height: '4px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 60 ? 'var(--green)' : hpPct > 30 ? 'var(--gold)' : 'var(--red)' }} />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{char.hp_current}/{char.hp_max}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
        {[['FOR', char.strength], ['DEX', char.dexterity], ['CON', char.constitution], ['INT', char.intelligence], ['CA', char.armor_class]].map(([k, v]) => (
          <span key={String(k)} style={{ fontSize: '0.68rem', color: 'var(--muted)', background: 'var(--surface2)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{k}:{v}</span>
        ))}
      </div>
      {equipped.map(ci => (
        <div key={ci.id} style={{ fontSize: '0.7rem', color: RARITY_COLORS[ci.item?.rarity as ItemRarity] || 'var(--muted)' }}>
          {ci.item?.icon} {ci.item?.name}
        </div>
      ))}
    </div>
  )
}

// ── Chat message ───────────────────────────────────────────────
function ChatMsg({ msg }: { msg: TfMessage & { user?: { username: string } } }) {
  const time = new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
  const username = (msg.user as { username?: string } | null)?.username || 'Joueur'
  if (msg.type === 'system') return <div className="msg-system" style={{ padding: '0.4rem', margin: '0.25rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>— {msg.content} —</div>
  if (msg.type === 'dm') return (
    <div className="msg-dm fade-in" style={{ padding: '0.75rem 1rem', margin: '0.5rem 0' }}>
      <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginBottom: '0.4rem', fontWeight: 'bold' }}>🎭 {msg.user_id ? username : 'Maître du Jeu (IA)'}</div>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.4rem', textAlign: 'right' }}>{time}</div>
    </div>
  )
  if (msg.type === 'roll') return <div className="msg-roll fade-in" style={{ padding: '0.6rem 1rem', margin: '0.4rem 0' }}><span style={{ color: 'var(--gold)' }}>{msg.content}</span><span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{time}</span></div>
  if (msg.type === 'narration') return <div className="msg-narration fade-in" style={{ padding: '0.75rem 1rem', margin: '0.5rem 0' }}><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontStyle: 'italic' }}>{msg.content}</div><div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.4rem', textAlign: 'right' }}>{time}</div></div>
  const isAction = msg.type === 'action'
  return (
    <div className={isAction ? 'msg-action fade-in' : 'fade-in'} style={{ padding: '0.5rem 0.75rem', margin: '0.25rem 0', borderRadius: '8px', background: 'var(--surface2)' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>{isAction ? '⚔️ ' : ''}<strong>{username}</strong>{isAction ? ' tente...' : ''}<span style={{ marginLeft: '0.5rem' }}>{time}</span></div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
    </div>
  )
}

// ── Main DM Panel ──────────────────────────────────────────────
export default function DMPanel({ game, user, initialMessages }: Props) {
  const [messages, setMessages] = useState<(TfMessage & { user?: { username: string } })[]>(initialMessages)
  const [gameStatus, setGameStatus] = useState<GameStatus>(game.status)
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [input, setInput] = useState('')
  const [msgMode, setMsgMode] = useState<DMMode>('narration')
  const [npcName, setNpcName] = useState('Inconnu')
  const [diceType, setDiceType] = useState<DiceT>('d20')
  const [dicePurpose, setDicePurpose] = useState('')
  const [diceTarget, setDiceTarget] = useState('all')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [showPlayers, setShowPlayers] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadPlayers = useCallback(async () => {
    const { data: gps } = await supabase.from('tf_game_players').select('user_id, user:tf_users(id, username, avatar_url, created_at)').eq('game_id', game.id)
    if (!gps) return
    const list: PlayerInfo[] = []
    for (const gp of gps) {
      const { data: char } = await supabase.from('tf_characters').select('*, items:tf_character_items(*, item:tf_items(*))').eq('user_id', gp.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      const u = Array.isArray(gp.user) ? gp.user[0] : gp.user
      list.push({ user: u as unknown as TfUser, character: char as PlayerInfo['character'] })
    }
    setPlayers(list)
  }, [game.id, supabase])

  useEffect(() => { loadPlayers() }, [loadPlayers])

  useEffect(() => {
    const ch = supabase.channel(`dm-panel-${game.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tf_messages', filter: `game_id=eq.${game.id}` }, async payload => {
        const m = payload.new as TfMessage
        if (m.user_id) {
          const { data: u } = await supabase.from('tf_users').select('*').eq('id', m.user_id).single()
          setMessages(p => [...p, { ...m, user: (u as TfUser) ?? undefined }])
        } else {
          setMessages(p => [...p, m])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tf_games', filter: `id=eq.${game.id}` }, payload => {
        setGameStatus((payload.new as TfGame).status)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tf_game_players', filter: `game_id=eq.${game.id}` }, () => {
        loadPlayers()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [game.id, supabase, loadPlayers])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    if (msgMode === 'narration') {
      await supabase.from('tf_messages').insert({ game_id: game.id, user_id: user.id, type: 'dm', content })
    } else if (msgMode === 'chat') {
      await supabase.from('tf_messages').insert({ game_id: game.id, user_id: user.id, type: 'chat', content })
    } else if (msgMode === 'npc') {
      await supabase.from('tf_messages').insert({ game_id: game.id, user_id: user.id, type: 'narration', content: `**${npcName}** : ${content}` })
    }
  }

  async function requestDice() {
    if (!dicePurpose.trim()) return
    const targetUserId = diceTarget === 'all' ? null : diceTarget
    const targetName = diceTarget === 'all' ? 'tous les joueurs' : (players.find(p => p.user.id === diceTarget)?.character?.name || players.find(p => p.user.id === diceTarget)?.user.username || 'le joueur')
    await supabase.from('tf_messages').insert({
      game_id: game.id, user_id: null, type: 'system',
      content: `🎲 Le MJ demande un jet de ${diceType} à ${targetName} — ${dicePurpose}`,
      metadata: { dice_request: { dice: diceType, purpose: dicePurpose, target_user_id: targetUserId } },
    })
    setDicePurpose('')
  }

  async function updateStatus(newStatus: GameStatus, msg?: string) {
    setStatusLoading(true)
    await supabase.from('tf_games').update({ status: newStatus }).eq('id', game.id)
    setGameStatus(newStatus)
    if (msg) await supabase.from('tf_messages').insert({ game_id: game.id, user_id: null, type: 'system', content: msg })
    setStatusLoading(false)
  }

  const DICE: DiceT[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']
  const statusColor: Record<string, string> = { waiting: 'var(--gold)', active: 'var(--green)', paused: 'var(--muted)', ended: 'var(--muted)' }
  const statusLabel: Record<string, string> = { waiting: '⏳ En attente', active: '⚔️ En cours', paused: '⏸️ En pause', ended: '✅ Terminée' }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'linear-gradient(135deg,#1a0a2e,#0d0718)', flexShrink: 0, flexWrap: 'wrap' }}>
        <Link href="/dashboard" style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>← Lobby</Link>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ fontSize: '1rem' }}>🎭</span>
        <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{game.name}</span>
        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: `${statusColor[gameStatus]}22`, color: statusColor[gameStatus], border: `1px solid ${statusColor[gameStatus]}` }}>{statusLabel[gameStatus]}</span>
        {gameStatus !== 'ended' && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {gameStatus === 'waiting' && <button onClick={() => updateStatus('active', '🎭 Le Maître du Jeu commence la partie !')} disabled={statusLoading} className="btn btn-gold" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>▶ Commencer</button>}
            {gameStatus === 'active' && <button onClick={() => updateStatus('paused', '⏸️ Partie mise en pause par le MJ.')} disabled={statusLoading} className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}>⏸ Pause</button>}
            {gameStatus === 'paused' && <button onClick={() => updateStatus('active', '▶️ La partie reprend !')} disabled={statusLoading} className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderColor: 'var(--green)', color: 'var(--green)' }}>▶ Reprendre</button>}
            {(gameStatus === 'active' || gameStatus === 'paused') && <>
              <button onClick={() => setShowRewards(true)} className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}>🏆 Récomp.</button>
              <button onClick={() => updateStatus('ended', '✅ La partie est terminée !')} disabled={statusLoading} className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderColor: 'var(--red)', color: 'var(--red)' }}>■ Fin</button>
            </>}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowNotes(!showNotes)} className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderColor: showNotes ? 'var(--accent)' : undefined, color: showNotes ? 'var(--accent)' : undefined }}>📝 Notes</button>
        <button onClick={() => setShowPlayers(!showPlayers)} className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>{showPlayers ? '◀' : '▶'} Joueurs</button>
      </nav>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Player sidebar */}
        {showPlayers && (
          <div style={{ width: '230px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'rgba(10,10,20,0.7)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
              👥 Joueurs ({players.length})
            </div>
            {players.length === 0 && <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic' }}>En attente...</div>}
            {players.map(p => <PlayerCard key={p.user.id} player={p} />)}
          </div>
        )}

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '3rem' }}>🎭</div>
                <p>Vous êtes le Maître du Jeu. Commencez et narrez l&apos;aventure !</p>
              </div>
            )}
            {messages.map(m => <ChatMsg key={m.id} msg={m} />)}
            <div ref={chatEndRef} />
          </div>

          {/* DM input */}
          {gameStatus !== 'ended' ? (
            <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', background: 'linear-gradient(180deg,rgba(26,10,46,0.97),rgba(10,10,15,0.99))', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                {([['narration', '📜 Narration'], ['chat', '💬 Chat'], ['npc', '🗣️ NPC'], ['dice', '🎲 Jet']] as [DMMode, string][]).map(([mode, label]) => (
                  <button key={mode} onClick={() => setMsgMode(mode)} className="btn" style={{ padding: '0.28rem 0.65rem', fontSize: '0.8rem', background: msgMode === mode ? 'var(--surface2)' : 'transparent', border: `1px solid ${msgMode === mode ? 'var(--accent)' : 'var(--border)'}`, color: msgMode === mode ? 'var(--accent)' : 'var(--muted)' }}>{label}</button>
                ))}
              </div>

              {msgMode === 'npc' && (
                <input className="input" value={npcName} onChange={e => setNpcName(e.target.value)} placeholder="Nom du PNJ..." style={{ marginBottom: '0.5rem', width: '200px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} />
              )}

              {msgMode !== 'dice' ? (
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                  <textarea className="input" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
                    placeholder={msgMode === 'narration' ? '📜 Narrez la scène...' : msgMode === 'npc' ? `🗣️ ${npcName} dit...` : '💬 Chat hors-jeu...'}
                    rows={2} disabled={gameStatus === 'paused'}
                    style={{ resize: 'none', borderColor: msgMode === 'narration' ? 'rgba(139,92,246,0.4)' : msgMode === 'npc' ? 'rgba(245,158,11,0.4)' : undefined }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!input.trim() || gameStatus === 'paused'} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>
                    {msgMode === 'narration' ? '📜 Narrer' : msgMode === 'npc' ? '🗣️ Parler' : '→ Envoyer'}
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {DICE.map(d => (
                        <button key={d} onClick={() => setDiceType(d)} className="btn" style={{ padding: '0.28rem 0.55rem', fontSize: '0.8rem', background: diceType === d ? 'var(--accent)' : 'var(--surface2)', border: `1px solid ${diceType === d ? 'var(--accent)' : 'var(--border)'}`, color: diceType === d ? 'white' : 'var(--muted)' }}>{d}</button>
                      ))}
                    </div>
                    <select className="input" value={diceTarget} onChange={e => setDiceTarget(e.target.value)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', width: 'auto' }}>
                      <option value="all">Tous les joueurs</option>
                      {players.map(p => <option key={p.user.id} value={p.user.id}>{p.character?.name || p.user.username}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" value={dicePurpose} onChange={e => setDicePurpose(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestDice()} placeholder="Ex: Perception, Attaque d'épée, Sauvegarde de CON..." disabled={gameStatus === 'paused'} />
                    <button onClick={requestDice} className="btn btn-gold" disabled={!dicePurpose.trim() || gameStatus === 'paused'} style={{ whiteSpace: 'nowrap' }}>🎲 Demander</button>
                  </div>
                </div>
              )}
              {gameStatus === 'paused' && <p style={{ color: 'var(--gold)', fontSize: '0.8rem', marginTop: '0.4rem', textAlign: 'center' }}>⏸️ Partie en pause</p>}
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', background: 'var(--surface)', textAlign: 'center', color: 'var(--muted)' }}>
              ✅ Partie terminée. <Link href="/dashboard" style={{ color: 'var(--accent)' }}>Retourner au lobby</Link>
            </div>
          )}
        </div>

        {/* Notes panel */}
        {showNotes && (
          <div style={{ width: '220px', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'rgba(10,10,20,0.7)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📝 Notes MJ (privé)
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notes visibles uniquement par vous..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '0.75rem', color: 'var(--text)', fontSize: '0.83rem', resize: 'none', lineHeight: 1.6 }}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showRewards && <RewardsPanel gameId={game.id} onClose={() => setShowRewards(false)} />}
      </AnimatePresence>
    </div>
  )
}
