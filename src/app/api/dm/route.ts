import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { gameId, action, history = [], character, scene } = body

  if (!gameId || !action) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  // Build system prompt
  const systemPrompt = `Tu es un Maître du Jeu pour un jeu de rôle de style Donjons & Dragons, basé en fantasy médiévale. Tu joues le rôle d'un MJ expert, créatif, immersif et équitable.

RÈGLES:
- Tu narres en français, avec un style vivant et évocateur
- Tu respectes les règles D&D 5e de manière simplifiée
- Tu demandes des jets de dés quand nécessaire (attaque, compétence, sauvegarde)
- Tu gardes trace de l'état du jeu et des PNJ
- Tu adaptes la difficulté au groupe
- Tes réponses font entre 100 et 400 mots, en prose narrative
- Quand tu demandes un jet, indique clairement: [JET DE DÉS: d20 + <modificateur> pour <compétence>]
- Si l'action est impossible ou ridicule, tu l'expliques avec humour
- Tu gardes le jeu fun et engageant

SCÈNE ACTUELLE: ${scene || 'Une taverne animée à l\'entrée du village.'}

PERSONNAGE: ${character ? `${character.name}, ${character.race} ${character.class} niv.${character.level}, PV: ${character.hp_current}/${character.hp_max}, CA: ${character.armor_class}` : 'Aventurier'}${character?.backstory ? `\nHistoire: ${character.backstory}` : ''}

Commence chaque réponse par continuer l'aventure de façon naturelle. Ne dis jamais "En tant que MJ..." ou ne brise pas le 4ème mur sauf pour les règles.`

  // Build conversation history for Claude
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = history.slice(-10).map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  messages.push({ role: 'user', content: action })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Check if DM is asking for a dice roll
    const diceMatch = content.match(/\[JET DE DÉS:\s*(d\d+)\s*(?:\+\s*(\d+))?\s*pour\s*([^\]]+)\]/i)
    const diceRequest = diceMatch ? {
      dice: diceMatch[1],
      modifier: diceMatch[2] ? parseInt(diceMatch[2]) : 0,
      purpose: diceMatch[3]?.trim(),
    } : null

    // Save DM message to Supabase
    await supabase.from('tf_messages').insert({
      game_id: gameId,
      user_id: null,
      type: 'dm',
      content,
      metadata: { diceRequest },
    })

    return NextResponse.json({ content, diceRequest })
  } catch (err) {
    console.error('DM API error:', err)
    return NextResponse.json({ error: 'Erreur du Maître du Jeu' }, { status: 500 })
  }
}
