import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'
import DMPanel from './DMPanel'

interface Props { params: Promise<{ id: string }> }

export default async function GamePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: game } = await supabase.from('tf_games').select('*, host:tf_users!host_id(username)').eq('id', id).single()
  if (!game) redirect('/dashboard')

  let { data: profile } = await supabase.from('tf_users').select('*').eq('id', user.id).single()
  if (!profile) {
    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Joueur'
    await supabase.from('tf_users').upsert({ id: user.id, username })
    profile = { id: user.id, username, avatar_url: null, created_at: new Date().toISOString() }
  }

  const isHost = game.host_id === user.id

  // Join logic: auto-join only if game has no password; otherwise redirect to dashboard
  const { data: isPlayer } = await supabase.from('tf_game_players').select('game_id').eq('game_id', id).eq('user_id', user.id).single()
  if (!isPlayer) {
    if (game.password_hash) redirect('/dashboard')
    await supabase.from('tf_game_players').insert({ game_id: id, user_id: user.id })
  }

  const { data: messages } = await supabase.from('tf_messages').select('*, user:tf_users(username)').eq('game_id', id).order('created_at', { ascending: false }).limit(50)
  const initialMessages = (messages || []).reverse()

  // Strip password_hash before passing to client components
  const { password_hash: _ph, ...safeGame } = game

  // Human DM host gets the DM panel
  if (isHost && game.dm_type === 'human') {
    return <DMPanel game={safeGame} user={profile!} initialMessages={initialMessages} />
  }

  // Players (and Aelindra host) get the regular game client
  const { data: character } = await supabase.from('tf_characters').select('*').eq('user_id', user.id).eq('game_id', id).single()
  const { data: anyCharacter } = character ? { data: null } : await supabase.from('tf_characters').select('*').eq('user_id', user.id).is('game_id', null).order('created_at', { ascending: false }).limit(1).single()

  return (
    <GameClient
      game={safeGame}
      user={profile!}
      character={character || anyCharacter || null}
      initialMessages={initialMessages}
      isHost={isHost}
    />
  )
}
