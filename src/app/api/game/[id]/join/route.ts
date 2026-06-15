import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function hashPassword(password: string): string {
  return createHash('sha256').update('taleforge-v1:' + password).digest('hex')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { password } = await req.json()

  const { data: game } = await supabase
    .from('tf_games')
    .select('id, password_hash, status')
    .eq('id', id)
    .single()

  if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
  if (game.status === 'ended') return NextResponse.json({ error: 'Cette partie est terminée' }, { status: 403 })

  if (game.password_hash) {
    if (!password) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 403 })
    if (hashPassword(password) !== game.password_hash) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 403 })
    }
  }

  const { data: existing } = await supabase
    .from('tf_game_players')
    .select('game_id')
    .eq('game_id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('tf_game_players').insert({ game_id: id, user_id: user.id })
  }

  return NextResponse.json({ ok: true })
}
