export type GameStatus = 'waiting' | 'active' | 'paused' | 'ended'
export type MessageType = 'chat' | 'action' | 'narration' | 'dm' | 'system' | 'whisper' | 'roll'
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'misc'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

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
  dm_type: 'ai' | 'human'
  password_hash?: string | null
  created_at: string
  updated_at: string
  host?: TfUser
  player_count?: number
  has_password?: boolean
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

export interface TfItem {
  id: string
  name: string
  description: string | null
  type: ItemType
  rarity: ItemRarity
  bonuses: Record<string, number>
  icon: string
  created_at: string
}

export interface TfCharacterItem {
  id: string
  character_id: string
  item_id: string
  equipped: boolean
  quantity: number
  obtained_from: string | null
  obtained_at: string
  item?: TfItem
}

// XP thresholds per level (D&D 5e)
export const XP_THRESHOLDS = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]

export function calcLevel(xp: number): number {
  for (let i = 20; i >= 1; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i
  }
  return 1
}

export function xpForNextLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level + 1, 20)]
}

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
}

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
}

export const BONUS_LABELS: Record<string, string> = {
  strength: 'FOR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'SAG',
  charisma: 'CHA',
  armor_class: 'CA',
  hp_max: 'PV max',
  hp_current: 'PV',
  initiative: 'Init',
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
