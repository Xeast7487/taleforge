import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'
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
  const { data: character } = await supabase.from('tf_characters').select('*').eq('user_id', user.id).eq('game_id', id).single()
  const { data: anyCharacter } = character ? { data: null } : await supabase.from('tf_characters').select('*').eq('user_id', user.id).is('game_id', null).order('created_at', { ascending: false }).limit(1).single()
  const { data: isPlayer } = await supabase.from('tf_game_players').select('*').eq('game_id', id).eq('user_id', user.id).single()
  if (!isPlayer) await supabase.from('tf_game_players').insert({ game_id: id, user_id: user.id })
  const { data: messages } = await supabase.from('tf_messages').select('*, user:tf_users(username)').eq('game_id', id).order('created_at', { ascending: false }).limit(50)
  return (
    <GameClient game={game} user={profile!} character={character || anyCharacter || null}
      initialMessages={(messages || []).reverse()} isHost={game.host_id === user.id} />
  )
}
