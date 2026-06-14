export type GameStatus = 'waiting' | 'active' | 'paused' | 'ended'
export type MessageType = 'chat' | 'action' | 'narration' | 'dm' | 'system' | 'whisper' | 'roll'
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

export interface TfUser {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export interface TfGame {
  id: string
  name: string
  description: string | null
  host_id: string | null
  status: GameStatus
  max_players: number
  current_scene: string
  map_state: { tiles: unknown[]; tokens: unknown[]; fog: boolean }
  ai_model: string
  created_at: string
  updated_at: string
  host?: TfUser
  player_count?: number
}

export interface TfCharacter {
  id: string
  user_id: string
  game_id: string | null
  name: string
  race: string
  class: string
  level: number
  experience: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  hp_max: number
  hp_current: number
  armor_class: number
  initiative: number
  speed: number
  spell_slots: Record<string, number>
  inventory: unknown[]
  spells_known: unknown[]
  features: unknown[]
  avatar_config: Record<string, unknown>
  backstory: string | null
  notes: string | null
  is_alive: boolean
  created_at: string
  updated_at: string
  user?: TfUser
}

export interface TfMessage {
  id: string
  game_id: string
  user_id: string | null
  character_id: string | null
  type: MessageType
  content: string
  metadata: Record<string, unknown>
  created_at: string
  user?: TfUser
  character?: TfCharacter
}

export interface TfDiceRoll {
  id: string
  game_id: string
  user_id: string | null
  character_id: string | null
  dice_type: DiceType
  dice_count: number
  results: number[]
  modifier: number
  total: number
  purpose: string | null
  created_at: string
  user?: TfUser
}

export const RACES = ['Humain', 'Elfe', 'Nain', 'Halfelin', 'Gnome', 'Semi-Elfe', 'Semi-Orque', 'Tieffelin', 'Draconide'] as const
export const CLASSES = ['Barbare', 'Barde', 'Clerc', 'Druide', 'Guerrier', 'Moine', 'Paladin', 'Rôdeur', 'Roublard', 'Ensorceleur', 'Occultiste', 'Magicien'] as const
export type Race = typeof RACES[number]
export type Class = typeof CLASSES[number]

export const CLASS_HIT_DICE: Record<string, number> = {
  'Barbare': 12, 'Guerrier': 10, 'Paladin': 10, 'Rôdeur': 10,
  'Barde': 8, 'Clerc': 8, 'Druide': 8, 'Moine': 8, 'Roublard': 8,
  'Ensorceleur': 6, 'Occultiste': 8, 'Magicien': 6,
}
