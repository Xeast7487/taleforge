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

  const gamesWithCount = (games || []).map(g => ({ ...g, player_count: countMap[g.id] || 0 }))

  return <DashboardClient user={profile} games={gamesWithCount} />
}
