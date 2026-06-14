'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { TfUser, TfCharacter, TfItem, TfGame, TfCharacterItem, ItemType, ItemRarity } from '@/lib/types'
import { RARITY_COLORS, RARITY_LABELS, BONUS_LABELS, calcLevel } from '@/lib/types'

type Tab = 'users' | 'characters' | 'items' | 'games'

const BONUS_FIELDS = ['strength','dexterity','constitution','intelligence','wisdom','charisma','armor_class','hp_max','hp_current','initiative']
const ITEM_TYPES: ItemType[] = ['weapon','armor','accessory','consumable','misc']
const ITEM_RARITIES: ItemRarity[] = ['common','uncommon','rare','epic','legendary']

const supabase = createClient()

// ─── Users ───────────────────────────────────────────────────
function UsersSection() {
  const [users, setUsers] = useState<(TfUser & {email?: string; char_count?: number})[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tf_users').select('*').order('created_at', { ascending: false })
    const { data: chars } = await supabase.from('tf_characters').select('user_id')
    const countMap: Record<string, number> = {}
    chars?.forEach(c => { countMap[c.user_id] = (countMap[c.user_id] || 0) + 1 })
    setUsers((data || []).map(u => ({ ...u, char_count: countMap[u.id] || 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveUsername(id: string) {
    await supabase.from('tf_users').update({ username: editVal }).eq('id', id)
    setEditing(null)
    load()
  }

  async function deleteUser(id: string) {
    if (!confirm('Supprimer cet utilisateur et tous ses personnages ?')) return
    await supabase.from('tf_characters').delete().eq('user_id', id)
    await supabase.from('tf_users').delete().eq('id', id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ marginBottom: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>{users.length} compte(s)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {users.map(u => (
          <div key={u.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              {editing === u.id ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="input" value={editVal} onChange={e => setEditVal(e.target.value)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.9rem' }} onKeyDown={e => e.key === 'Enter' && saveUsername(u.id)} autoFocus />
                  <button className="btn btn-gold" onClick={() => saveUsername(u.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>✓</button>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>✕</button>
                </div>
              ) : (
                <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{u.username}</span>
              )}
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.1rem' }}>
                ID: {u.id.slice(0, 8)}… · {u.char_count} personnage(s) · {new Date(u.created_at).toLocaleDateString('fr-CA')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn btn-ghost" onClick={() => { setEditing(u.id); setEditVal(u.username) }} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>✏️</button>
              <button className="btn btn-ghost" onClick={() => deleteUser(u.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--red)', borderColor: 'var(--red)' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Characters ──────────────────────────────────────────────
type FullChar = TfCharacter & { user?: { username: string }; items?: (TfCharacterItem & { item: TfItem })[] }

function CharactersSection() {
  const [chars, setChars] = useState<FullChar[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Partial<TfCharacter>>({})
  const [xpGrant, setXpGrant] = useState<Record<string, number>>({})
  const [allItems, setAllItems] = useState<TfItem[]>([])
  const [giveItem, setGiveItem] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tf_characters')
      .select('*, user:tf_users(username), items:tf_character_items(*, item:tf_items(*))')
      .order('created_at', { ascending: false })
    const { data: items } = await supabase.from('tf_items').select('*').order('name')
    setChars(data as FullChar[] || [])
    setAllItems(items || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveChar(id: string) {
    await supabase.from('tf_characters').update(editing).eq('id', id)
    setExpanded(null)
    setEditing({})
    load()
  }

  async function grantXp(char: FullChar) {
    const amount = xpGrant[char.id] || 0
    if (amount <= 0) return
    const newXp = char.experience + amount
    const newLevel = calcLevel(newXp)
    await supabase.from('tf_characters').update({ experience: newXp, level: newLevel }).eq('id', char.id)
    setXpGrant(x => ({ ...x, [char.id]: 0 }))
    load()
  }

  async function giveItemToChar(charId: string) {
    const itemId = giveItem[charId]
    if (!itemId) return
    await supabase.from('tf_character_items').insert({ character_id: charId, item_id: itemId, equipped: false })
    setGiveItem(g => ({ ...g, [charId]: '' }))
    load()
  }

  async function toggleEquip(ciId: string, equipped: boolean) {
    await supabase.from('tf_character_items').update({ equipped: !equipped }).eq('id', ciId)
    load()
  }

  async function removeItem(ciId: string) {
    await supabase.from('tf_character_items').delete().eq('id', ciId)
    load()
  }

  async function deleteChar(id: string) {
    if (!confirm('Supprimer ce personnage ?')) return
    await supabase.from('tf_character_items').delete().eq('character_id', id)
    await supabase.from('tf_characters').delete().eq('id', id)
    load()
  }

  const filtered = chars.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.user as {username?:string})?.username?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input className="input" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '260px' }} />
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{filtered.length} personnage(s)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map(char => (
          <div key={char.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Row */}
            <div
              style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
              onClick={() => {
                if (expanded === char.id) { setExpanded(null); setEditing({}) }
                else { setExpanded(char.id); setEditing({ ...char }) }
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{char.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                  {char.race} {char.class} · Niv.{char.level} · {char.experience} XP · PV {char.hp_current}/{char.hp_max}
                  {char.user && <> · <span style={{ color: 'var(--accent)' }}>@{(char.user as {username?:string}).username}</span></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-ghost" onClick={() => deleteChar(char.id)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--red)', borderColor: 'var(--red)' }}>🗑</button>
              </div>
              <span style={{ color: 'var(--muted)' }}>{expanded === char.id ? '▲' : '▼'}</span>
            </div>

            {/* Expanded */}
            {expanded === char.id && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Stats grid */}
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>STATISTIQUES</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                    {[
                      ['Niveau', 'level'], ['XP', 'experience'],
                      ['PV actuels', 'hp_current'], ['PV max', 'hp_max'],
                      ['CA', 'armor_class'], ['Initiative', 'initiative'],
                      ['Force', 'strength'], ['Dextérité', 'dexterity'],
                      ['Constitution', 'constitution'], ['Intelligence', 'intelligence'],
                      ['Sagesse', 'wisdom'], ['Charisme', 'charisma'],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
                        <input
                          type="number"
                          className="input"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.9rem' }}
                          value={(editing as Record<string, number>)[key] ?? 0}
                          onChange={e => setEditing(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick XP grant */}
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>AJOUTER XP RAPIDEMENT</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="number" className="input" style={{ width: '100px', padding: '0.3rem 0.5rem' }}
                      value={xpGrant[char.id] || ''} onChange={e => setXpGrant(x => ({ ...x, [char.id]: parseInt(e.target.value) || 0 }))} placeholder="XP" />
                    {[50,100,250,500,1000].map(v => (
                      <button key={v} className="btn btn-ghost" onClick={() => setXpGrant(x => ({ ...x, [char.id]: v }))} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>{v}</button>
                    ))}
                    <button className="btn btn-gold" onClick={() => grantXp(char)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>⭐ Attribuer</button>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>ITEMS ({char.items?.length || 0})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                    {(char.items || []).map(ci => (
                      <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', background: 'var(--surface2)', borderRadius: '6px', padding: '0.3rem 0.6rem' }}>
                        <span>{ci.item?.icon}</span>
                        <span style={{ color: RARITY_COLORS[ci.item?.rarity || 'common'], flex: 1 }}>{ci.item?.name}</span>
                        <button className="btn btn-ghost" onClick={() => toggleEquip(ci.id, ci.equipped)}
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', borderColor: ci.equipped ? 'var(--green)' : 'var(--border)', color: ci.equipped ? 'var(--green)' : 'var(--muted)' }}>
                          {ci.equipped ? '✅ Équipé' : 'Équiper'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => removeItem(ci.id)} style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', color: 'var(--red)' }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select className="input" style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                      value={giveItem[char.id] || ''} onChange={e => setGiveItem(g => ({ ...g, [char.id]: e.target.value }))}>
                      <option value="">— Choisir un item —</option>
                      {allItems.map(item => <option key={item.id} value={item.id}>{item.icon} {item.name} ({RARITY_LABELS[item.rarity]})</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => giveItemToChar(char.id)} disabled={!giveItem[char.id]} style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>🎁 Donner</button>
                  </div>
                </div>

                {/* Save */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-gold" onClick={() => saveChar(char.id)} style={{ justifyContent: 'center' }}>💾 Sauvegarder les stats</button>
                  <button className="btn btn-ghost" onClick={() => { setExpanded(null); setEditing({}) }}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Items ───────────────────────────────────────────────────
const EMPTY_ITEM = { name: '', description: '', type: 'misc' as ItemType, rarity: 'common' as ItemRarity, icon: '📦', bonuses: {} as Record<string, number> }

function ItemsSection() {
  const [items, setItems] = useState<TfItem[]>([])
  const [editing, setEditing] = useState<Partial<TfItem> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tf_items').select('*').order('rarity').order('name')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveItem() {
    if (!editing?.name) return
    if (isNew) {
      await supabase.from('tf_items').insert({ ...EMPTY_ITEM, ...editing })
    } else {
      await supabase.from('tf_items').update(editing).eq('id', editing.id)
    }
    setEditing(null)
    setIsNew(false)
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm('Supprimer cet item du catalogue ? Il sera retiré de tous les personnages.')) return
    await supabase.from('tf_character_items').delete().eq('item_id', id)
    await supabase.from('tf_items').delete().eq('id', id)
    load()
  }

  function BonusEditor({ bonuses, onChange }: { bonuses: Record<string, number>; onChange: (b: Record<string, number>) => void }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.4rem' }}>
        {BONUS_FIELDS.map(f => (
          <div key={f}>
            <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>{BONUS_LABELS[f] || f}</label>
            <input type="number" className="input" style={{ padding: '0.25rem 0.4rem', fontSize: '0.85rem' }}
              value={bonuses[f] || 0}
              onChange={e => {
                const v = parseInt(e.target.value) || 0
                const next = { ...bonuses }
                if (v === 0) delete next[f]; else next[f] = v
                onChange(next)
              }} />
          </div>
        ))}
      </div>
    )
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{items.length} item(s)</span>
        <button className="btn btn-gold" onClick={() => { setEditing({ ...EMPTY_ITEM }); setIsNew(true) }}>➕ Nouvel item</button>
      </div>

      {/* Form */}
      {editing && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', borderColor: 'var(--accent)' }}>
          <h4 style={{ color: 'var(--gold)', marginBottom: '1rem', fontWeight: 'bold' }}>{isNew ? 'Créer un item' : `Modifier — ${editing.name}`}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.2rem' }}>Nom *</label>
              <input className="input" value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.2rem' }}>Icône</label>
              <input className="input" value={editing.icon || ''} onChange={e => setEditing(p => ({ ...p, icon: e.target.value }))} style={{ width: '80px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.2rem' }}>Type</label>
              <select className="input" value={editing.type || 'misc'} onChange={e => setEditing(p => ({ ...p, type: e.target.value as ItemType }))}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.2rem' }}>Rareté</label>
              <select className="input" value={editing.rarity || 'common'} onChange={e => setEditing(p => ({ ...p, rarity: e.target.value as ItemRarity }))}>
                {ITEM_RARITIES.map(r => <option key={r} value={r} style={{ color: RARITY_COLORS[r] }}>{RARITY_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.2rem' }}>Description</label>
            <input className="input" value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Bonus</label>
            <BonusEditor bonuses={editing.bonuses || {}} onChange={b => setEditing(p => ({ ...p, bonuses: b }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-gold" onClick={saveItem}>💾 Sauvegarder</button>
            <button className="btn btn-ghost" onClick={() => { setEditing(null); setIsNew(false) }}>Annuler</button>
          </div>
        </div>
      )}

      {/* List grouped by rarity */}
      {ITEM_RARITIES.map(rarity => {
        const group = items.filter(i => i.rarity === rarity)
        if (group.length === 0) return null
        return (
          <div key={rarity} style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: RARITY_COLORS[rarity], textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              {RARITY_LABELS[rarity]} ({group.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {group.map(item => (
                <div key={item.id} className="card" style={{ padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: RARITY_COLORS[item.rarity], fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                      {Object.entries(item.bonuses).map(([k, v]) => `+${v} ${BONUS_LABELS[k] || k}`).join(' · ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-ghost" onClick={() => { setEditing({ ...item }); setIsNew(false) }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>✏️</button>
                    <button className="btn btn-ghost" onClick={() => deleteItem(item.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--red)' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Games ───────────────────────────────────────────────────
function GamesSection() {
  const [games, setGames] = useState<(TfGame & { host?: { username: string }; player_count?: number })[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tf_games').select('*, host:tf_users!host_id(username)').order('created_at', { ascending: false })
    const { data: players } = await supabase.from('tf_game_players').select('game_id')
    const countMap: Record<string, number> = {}
    players?.forEach(p => { countMap[p.game_id] = (countMap[p.game_id] || 0) + 1 })
    setGames((data || []).map(g => ({ ...g, player_count: countMap[g.id] || 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(id: string, status: string) {
    await supabase.from('tf_games').update({ status }).eq('id', id)
    load()
  }

  async function deleteGame(id: string) {
    if (!confirm('Supprimer cette partie et tous ses messages ?')) return
    await supabase.from('tf_messages').delete().eq('game_id', id)
    await supabase.from('tf_dice_rolls').delete().eq('game_id', id)
    await supabase.from('tf_game_players').delete().eq('game_id', id)
    await supabase.from('tf_games').delete().eq('id', id)
    load()
  }

  const STATUS_OPTIONS = ['waiting', 'active', 'paused', 'ended']
  const statusColor: Record<string, string> = { waiting: '#f59e0b', active: '#22c55e', paused: '#94a3b8', ended: '#64748b' }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ marginBottom: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>{games.length} partie(s)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {games.map(game => (
          <div key={game.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>{game.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                MJ: {(game.host as {username?:string})?.username || '?'} · {game.player_count} joueur(s) · {new Date(game.created_at).toLocaleDateString('fr-CA')}
              </div>
            </div>
            <select
              className="input"
              value={game.status}
              onChange={e => setStatus(game.id, e.target.value)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', color: statusColor[game.status], borderColor: statusColor[game.status], width: 'auto' }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Link href={`/game/${game.id}`} className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>→</Link>
            <button className="btn btn-ghost" onClick={() => deleteGame(game.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--red)' }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Spinner() {
  return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>⏳ Chargement...</div>
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminClient() {
  const [tab, setTab] = useState<Tab>('users')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: '👥 Comptes' },
    { id: 'characters', label: '🧙 Personnages' },
    { id: 'items', label: '🎒 Items' },
    { id: 'games', label: '🎮 Parties' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a0f 70%)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.9)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🔐</span>
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Panel Admin</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Taleforge</span>
        </div>
        <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="btn"
              style={{
                padding: '0.6rem 1.1rem', fontSize: '0.9rem', borderRadius: '8px 8px 0 0', border: 'none',
                background: tab === t.id ? 'var(--surface)' : 'transparent',
                color: tab === t.id ? 'var(--gold)' : 'var(--muted)',
                borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersSection />}
        {tab === 'characters' && <CharactersSection />}
        {tab === 'items' && <ItemsSection />}
        {tab === 'games' && <GamesSection />}
      </div>
    </div>
  )
}
