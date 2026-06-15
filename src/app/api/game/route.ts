import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function hashPassword(password: string): string {
  return createHash('sha256').update('taleforge-v1:' + password).digest('hex')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { name, description, dm_type, password } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const insertData: Record<string, unknown> = {
    name: name.trim(),
    description: description?.trim() || null,
    host_id: user.id,
    status: 'waiting',
    dm_type: dm_type || 'ai',
  }

  if (password?.trim()) {
    insertData.password_hash = hashPassword(password.trim())
  }

  const { data: game, error } = await supabase
    .from('tf_games')
    .insert(insertData)
    .select()
    .single()

  if (error || !game) return NextResponse.json({ error: error?.message || 'Erreur création' }, { status: 500 })

  await supabase.from('tf_game_players').insert({ game_id: game.id, user_id: user.id })

  return NextResponse.json({ id: game.id })
}
