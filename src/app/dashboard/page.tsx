import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get or create user profile
  let { data: profile } = await supabase.from('tf_users').select('*').eq('id', user.id).single()
  if (!profile) {
    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Aventurier'
    await supabase.from('tf_users').upsert({ id: user.id, username })
    profile = { id: user.id, username, avatar_url: null, created_at: new Date().toISOString() }
  }

  // Get user's characters with their equipped items
  const { data: characters } = await supabase
    .from('tf_characters')
    .select('*, items:tf_character_items(*, item:tf_items(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get games list
  const { data: games } = await supabase
    .from('tf_games')
    .select('*, host:tf_users!host_id(username)')
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(20)

  // Get player counts
  const { data: playerCounts } = await supabase
    .from('tf_game_players')
    .select('game_id')

  const countMap: Record<string, number> = {}
  playerCounts?.forEach(p => {
    countMap[p.game_id] = (countMap[p.game_id] || 0) + 1
  })

  // Strip password_hash from client data, expose only has_password boolean
  const gamesWithCount = (games || []).map(({ password_hash, ...g }) => ({
    ...g,
    has_password: !!password_hash,
    player_count: countMap[g.id] || 0,
  }))

  return <DashboardClient user={profile} games={gamesWithCount} characters={characters || []} />
}
