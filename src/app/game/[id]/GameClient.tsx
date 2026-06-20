'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import type { TfGame, TfUser, TfCharacter, TfMessage, TfItem, GameStatus } from '@/lib/types'
import { calcLevel, xpForNextLevel, RARITY_COLORS, BONUS_LABELS } from '@/lib/types'
import CharacterSheetModal from './CharacterSheetModal'

interface Props {
  game: TfGame & { host?: { username: string } }
  user: TfUser
  character: TfCharacter | null
  initialMessages: TfMessage[]
  isHost: boolean
}

type DiceType = 'd4'|'d6'|'d8'|'d10'|'d12'|'d20'
const DICE: {type:DiceType;sides:number;color:string}[] = [
  {type:'d4',sides:4,color:'#22c55e'},{type:'d6',sides:6,color:'#3b82f6'},
  {type:'d8',sides:8,color:'#8b5cf6'},{type:'d10',sides:10,color:'#f59e0b'},
  {type:'d12',sides:12,color:'#ef4444'},{type:'d20',sides:20,color:'#ec4899'},
]

function DiceButton({type,sides,color,onRoll}:{type:DiceType;sides:number;color:string;onRoll:(t:DiceType,r:number)=>void}) {
  const [rolling,setRolling]=useState(false)
  function roll(){if(rolling)return;setRolling(true);setTimeout(()=>{onRoll(type,Math.ceil(Math.random()*sides));setRolling(false)},600)}
  return <button onClick={roll} className={`dice-face ${rolling?'rolling':''}`} style={{width:'44px',height:'44px',background:color,color:'white',fontSize:'0.85rem',border:'none',boxShadow:rolling?`0 0 15px ${color}`:'none'}} title={`Lancer ${type}`}>{rolling?'⟳':type}</button>
}

function npcHue(name:string){let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))&0xffff;return h%360}

function ChatMsg({msg,uid}:{msg:TfMessage&{user?:{username:string}};uid:string}) {
  const time=new Date(msg.created_at).toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'})
  const username=(msg.user as {username?:string}|null)?.username||'Joueur'
  if(msg.type==='system') return <div className="msg-system" style={{padding:'0.4rem',margin:'0.25rem 0'}}>— {msg.content} —</div>
  if(msg.type==='dm') return <div className="msg-dm fade-in" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{fontSize:'0.75rem',color:'#a78bfa',marginBottom:'0.4rem',fontWeight:'bold'}}>🎭 Maître du Jeu</div><div style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{msg.content}</div><div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.4rem',textAlign:'right'}}>{time}</div></div>
  if(msg.type==='roll'){
    const isCrit=msg.content.startsWith('⚡')
    return <div className={`${isCrit?'msg-roll-crit':'msg-roll'} fade-in`} style={{padding:'0.6rem 1rem',margin:'0.4rem 0'}}><span style={{color:'var(--gold)',fontWeight:isCrit?'bold':undefined,fontSize:isCrit?'1rem':undefined}}>{msg.content}</span><span style={{color:'var(--muted)',fontSize:'0.75rem',marginLeft:'0.5rem'}}>{time}</span></div>
  }
  if(msg.type==='narration'){
    const npcM=msg.content.match(/^\*\*(.+?)\*\* : ([\s\S]*)$/)
    if(npcM){
      const [,nName,nText]=npcM
      return <div className="msg-narration fade-in" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.4rem'}}><div className="npc-avatar" style={{background:`hsl(${npcHue(nName)},60%,38%)`}}>{nName[0].toUpperCase()}</div><span style={{fontSize:'0.75rem',color:'var(--gold)',fontWeight:'bold'}}>{nName}</span></div><div style={{whiteSpace:'pre-wrap',lineHeight:1.6,fontStyle:'italic'}}>{nText}</div><div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.4rem',textAlign:'right'}}>{time}</div></div>
    }
    return <div className="msg-narration fade-in" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{msg.content}</div><div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.4rem',textAlign:'right'}}>{time}</div></div>
  }
  const isAction=msg.type==='action', isOwn=msg.user_id===uid
  return <div className={isAction?'msg-action fade-in':'fade-in'} style={{padding:'0.5rem 0.75rem',margin:'0.25rem 0',borderRadius:isAction?undefined:'8px',background:isAction?undefined:(isOwn?'rgba(124,58,237,0.15)':'var(--surface2)')}}><div style={{fontSize:'0.75rem',color:'var(--muted)',marginBottom:'0.2rem'}}>{isAction?'⚔️ ':''}<strong>{username}</strong>{isAction?' tente...':''}<span style={{marginLeft:'0.5rem'}}>{time}</span></div><div style={{whiteSpace:'pre-wrap'}}>{msg.content}</div></div>
}

// Rewards panel for host
function RewardsPanel({ gameId, characterId, characterName, onClose }: {
  gameId: string; characterId: string | null; characterName: string; onClose: () => void
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'xp'|'item'>('xp')
  const [xpAmount, setXpAmount] = useState(100)
  const [items, setItems] = useState<TfItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<TfItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [characters, setCharacters] = useState<TfCharacter[]>([])
  const [targetCharId, setTargetCharId] = useState(characterId || '')

  useEffect(() => {
    supabase.from('tf_items').select('*').order('rarity').then(({ data }) => setItems(data || []))
    supabase.from('tf_game_players').select('*, character:tf_characters(*)').eq('game_id', gameId)
      .then(({ data }) => {
        const chars = (data || []).map((p: {character?: TfCharacter|TfCharacter[]|null}) => {
          const c = Array.isArray(p.character) ? p.character[0] : p.character
          return c
        }).filter(Boolean) as TfCharacter[]
        setCharacters(chars)
        if (!targetCharId && chars[0]) setTargetCharId(chars[0].id)
      })
  }, [gameId, supabase, targetCharId])

  async function awardXp() {
    if (!targetCharId || xpAmount <= 0) return
    setLoading(true)
    const { data: char } = await supabase.from('tf_characters').select('experience, level').eq('id', targetCharId).single()
    if (!char) { setLoading(false); return }
    const newXp = char.experience + xpAmount
    const newLevel = calcLevel(newXp)
    const leveledUp = newLevel > char.level
    await supabase.from('tf_characters').update({ experience: newXp, level: newLevel }).eq('id', targetCharId)
    await supabase.from('tf_messages').insert({
      game_id: gameId, user_id: null, type: 'system',
      content: leveledUp
        ? `🌟 ${characterName} gagne ${xpAmount} XP et passe au niveau ${newLevel} !`
        : `⭐ ${characterName} gagne ${xpAmount} XP. (Total: ${newXp.toLocaleString()} / ${xpForNextLevel(newLevel).toLocaleString()})`,
    })
    setNotice(leveledUp ? `🎉 Niveau ${newLevel} !` : `✅ +${xpAmount} XP`)
    setLoading(false)
  }

  async function giveItem() {
    if (!targetCharId || !selectedItem) return
    setLoading(true)
    const { data: char } = await supabase.from('tf_characters').select('name').eq('id', targetCharId).single()
    await supabase.from('tf_character_items').insert({
      character_id: targetCharId,
      item_id: selectedItem.id,
      equipped: false,
      obtained_from: gameId,
    })
    await supabase.from('tf_messages').insert({
      game_id: gameId, user_id: null, type: 'system',
      content: `🎁 ${char?.name || 'Un aventurier'} reçoit : ${selectedItem.icon} ${selectedItem.name} !`,
    })
    setNotice(`✅ ${selectedItem.name} donné !`)
    setSelectedItem(null)
    setLoading(false)
  }

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.type.includes(search.toLowerCase())
  )

  const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '1rem'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '1.5rem', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--gold)', fontWeight: 'bold' }}>🏆 Récompenses de quête</h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>✕</button>
        </div>

        {/* Character selector */}
        {characters.length > 1 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>Personnage cible</label>
            <select
              className="input"
              value={targetCharId}
              onChange={e => setTargetCharId(e.target.value)}
              style={{ padding: '0.4rem 0.6rem' }}
            >
              {characters.map(c => <option key={c.id} value={c.id}>{c.name} (Niv.{c.level})</option>)}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setTab('xp')} className="btn" style={{ flex: 1, justifyContent: 'center', background: tab === 'xp' ? 'var(--surface2)' : 'transparent', border: `1px solid ${tab === 'xp' ? 'var(--gold)' : 'var(--border)'}`, color: tab === 'xp' ? 'var(--gold)' : 'var(--muted)' }}>⭐ Attribuer XP</button>
          <button onClick={() => setTab('item')} className="btn" style={{ flex: 1, justifyContent: 'center', background: tab === 'item' ? 'var(--surface2)' : 'transparent', border: `1px solid ${tab === 'item' ? 'var(--accent)' : 'var(--border)'}`, color: tab === 'item' ? 'var(--accent)' : 'var(--muted)' }}>🎒 Donner un item</button>
        </div>

        {notice && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--green)', fontSize: '0.85rem', marginBottom: '0.75rem', textAlign: 'center' }}>
            {notice}
          </div>
        )}

        {tab === 'xp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>XP à attribuer</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={xpAmount}
                  onChange={e => setXpAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  style={{ width: '120px' }}
                />
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[50, 100, 200, 500].map(v => (
                    <button key={v} onClick={() => setXpAmount(v)} className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderColor: xpAmount === v ? 'var(--gold)' : undefined, color: xpAmount === v ? 'var(--gold)' : undefined }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={awardXp} className="btn btn-gold" disabled={loading || !targetCharId} style={{ justifyContent: 'center' }}>
              {loading ? '⏳...' : `⭐ Attribuer ${xpAmount} XP`}
            </button>
          </div>
        )}

        {tab === 'item' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
            <input
              className="input"
              placeholder="🔍 Rechercher un item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {[...filteredItems].sort((a, b) => rarityOrder[a.rarity as keyof typeof rarityOrder] - rarityOrder[b.rarity as keyof typeof rarityOrder]).map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  className="btn"
                  style={{
                    justifyContent: 'flex-start', gap: '0.6rem', padding: '0.5rem 0.75rem', textAlign: 'left',
                    background: selectedItem?.id === item.id ? 'rgba(124,58,237,0.2)' : 'var(--surface2)',
                    border: `1px solid ${selectedItem?.id === item.id ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <span>{item.icon}</span>
                  <span style={{ color: RARITY_COLORS[item.rarity], fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                    {Object.entries(item.bonuses).map(([k, v]) => `+${v} ${BONUS_LABELS[k] || k}`).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
            {selectedItem && (
              <button onClick={giveItem} className="btn btn-primary" disabled={loading || !targetCharId} style={{ justifyContent: 'center' }}>
                {loading ? '⏳...' : `🎁 Donner ${selectedItem.icon} ${selectedItem.name}`}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function GameClient({game,user,character,initialMessages,isHost}:Props) {
  const [messages,setMessages]=useState<(TfMessage&{user?:{username:string}})[]>(initialMessages)
  const [gameStatus,setGameStatus]=useState<GameStatus>(game.status)
  const [input,setInput]=useState('')
  const [msgType,setMsgType]=useState<'chat'|'action'>('chat')
  const [thinking,setThinking]=useState(false)
  const [statusLoading,setStatusLoading]=useState(false)
  const [showRewards,setShowRewards]=useState(false)
  const [showSheet,setShowSheet]=useState(false)
  const [showCrit,setShowCrit]=useState(false)
  const [dmHistory,setDmHistory]=useState<{role:'user'|'assistant';content:string}[]>([])
  const [pendingDice,setPendingDice]=useState<{purpose?:string;modifier?:number}|null>(null)
  const chatEndRef=useRef<HTMLDivElement>(null)
  const critTimeoutRef=useRef<ReturnType<typeof setTimeout>|null>(null)
  const voiceEnabledRef=useRef(false)
  const recognitionRef=useRef<unknown>(null)
  const [voiceEnabled,setVoiceEnabled]=useState(false)
  const [isListening,setIsListening]=useState(false)
  const supabase=createClient()

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{voiceEnabledRef.current=voiceEnabled},[voiceEnabled])

  useEffect(()=>{
    const ch=supabase.channel(`game-${game.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tf_messages',filter:`game_id=eq.${game.id}`},async payload=>{
        const m=payload.new as TfMessage
        if(m.user_id){
          const{data:u}=await supabase.from('tf_users').select('*').eq('id',m.user_id).single()
          setMessages(p=>[...p,{...m,user:(u as TfUser)??undefined}])
        } else {
          setMessages(p=>[...p,m])
          if(m.type==='dm'&&voiceEnabledRef.current)speakDM(m.content)
        }
        if(m.type==='roll'&&m.content.startsWith('⚡')){
          if(critTimeoutRef.current)clearTimeout(critTimeoutRef.current)
          setShowCrit(true)
          critTimeoutRef.current=setTimeout(()=>setShowCrit(false),3000)
        }
        if(m.type==='system'&&m.metadata?.dice_request){
          const req=m.metadata.dice_request as{dice:string,purpose:string,target_user_id:string|null}
          if(!req.target_user_id||req.target_user_id===user.id){
            setPendingDice({purpose:req.purpose,modifier:0})
          }
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'tf_games',filter:`id=eq.${game.id}`},payload=>{
        setGameStatus((payload.new as TfGame).status)
      })
      .subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[game.id,supabase])

  const sendToDM=useCallback(async(action:string)=>{
    setThinking(true)
    try{
      const res=await fetch('/api/dm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameId:game.id,action,history:dmHistory,character,scene:game.current_scene})})
      const data=await res.json()
      if(data.content){
        setDmHistory(h=>[...h,{role:'user',content:action},{role:'assistant',content:data.content}])
        if(data.diceRequest)setPendingDice(data.diceRequest)
      }
    }catch{}finally{setThinking(false)}
  },[game.id,game.current_scene,character,dmHistory])

  function speakDM(text:string){
    if(!('speechSynthesis' in window))return
    window.speechSynthesis.cancel()
    const utt=new SpeechSynthesisUtterance(text)
    utt.lang='fr-FR'
    utt.rate=0.95
    const voices=window.speechSynthesis.getVoices()
    const frVoice=voices.find(v=>v.lang.startsWith('fr'))
    if(frVoice)utt.voice=frVoice
    window.speechSynthesis.speak(utt)
  }

  function toggleListening(){
    if(isListening){
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(recognitionRef.current as any)?.stop()
      setIsListening(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
    if(!SR)return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r=new SR() as any
    r.lang='fr-FR'
    r.continuous=false
    r.interimResults=false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult=(e:any)=>{setInput(e.results[0][0].transcript);setIsListening(false)}
    r.onerror=()=>setIsListening(false)
    r.onend=()=>setIsListening(false)
    recognitionRef.current=r
    r.start()
    setIsListening(true)
  }

  async function sendMessage(e:React.FormEvent){
    e.preventDefault();if(!input.trim()||thinking)return
    const content=input.trim();setInput('')
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:user.id,character_id:character?.id||null,type:msgType,content})
    if(msgType==='action'){
      const txt=character?`${character.name} (${character.race} ${character.class}): ${content}`:content
      await sendToDM(txt)
    }
  }

  async function rollDice(type:DiceType,result:number){
    const mod=pendingDice?.modifier||0,total=result+mod,purpose=pendingDice?.purpose
    const isCrit=type==='d20'&&result===20
    const rc=isCrit
      ?`⚡ COUP CRITIQUE ! 🎲 ${user.username} lance d20: 20 — Naturel 20 !${purpose?` (${purpose})`:''}`
      :`🎲 ${user.username} lance ${type}: ${result}${mod?` + ${mod}`:''}= **${total}**${purpose?` (${purpose})`:''}`
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:user.id,type:'roll',content:rc})
    await supabase.from('tf_dice_rolls').insert({game_id:game.id,user_id:user.id,character_id:character?.id||null,dice_type:type,dice_count:1,results:[result],modifier:mod,total,purpose:purpose||null})
    setPendingDice(null)
    await sendToDM(`Résultat du jet: ${type} = ${result}${mod?` + ${mod} = ${total}`:''} pour ${purpose||'une action'}`)
  }

  async function updateStatus(newStatus:GameStatus,dmPrompt?:string){
    setStatusLoading(true)
    await supabase.from('tf_games').update({status:newStatus}).eq('id',game.id)
    setGameStatus(newStatus)
    if(dmPrompt)await sendToDM(dmPrompt)
    setStatusLoading(false)
  }

  async function startGame(){await updateStatus('active',"Commence la partie. Décris la scène d'ouverture et accueille les aventuriers dans leur aventure.")}
  async function pauseGame(){
    await updateStatus('paused')
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:null,type:'system',content:'⏸️ La partie a été mise en pause par le MJ.'})
  }
  async function resumeGame(){await updateStatus('active',"La partie reprend. Rappelle brièvement la situation et invite les joueurs à continuer.")}
  async function endGame(){
    if(!confirm('Terminer définitivement cette partie ?'))return
    await updateStatus('ended')
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:null,type:'system',content:'✅ La partie est terminée. Merci à tous les aventuriers !'})
  }

  const hpPct=character?(character.hp_current/character.hp_max)*100:0
  const statusLabel:Record<string,string>={waiting:'⏳ En attente',active:'⚔️ En cours',paused:'⏸️ En pause',ended:'✅ Terminée'}
  const statusColor:Record<string,string>={waiting:'var(--gold)',active:'var(--green)',paused:'var(--muted)',ended:'var(--muted)'}

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <nav style={{borderBottom:'1px solid var(--border)',padding:'0.6rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',background:'var(--surface)',flexShrink:0,flexWrap:'wrap'}}>
        <Link href="/dashboard" style={{color:'var(--muted)',fontSize:'0.85rem'}}>← Lobby</Link>
        <span style={{color:'var(--border)'}}>|</span>
        <span style={{color:'var(--gold)',fontWeight:'bold'}}>{game.name}</span>
        <span style={{fontSize:'0.75rem',padding:'0.15rem 0.5rem',borderRadius:'999px',background:`${statusColor[gameStatus]}22`,color:statusColor[gameStatus],border:`1px solid ${statusColor[gameStatus]}`}}>
          {statusLabel[gameStatus]||gameStatus}
        </span>

        {isHost && gameStatus!=='ended' && (
          <div style={{display:'flex',gap:'0.4rem',marginLeft:'0.25rem'}}>
            {gameStatus==='waiting'&&<button onClick={startGame} disabled={statusLoading||thinking} className="btn btn-gold" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem'}}>▶ Commencer</button>}
            {gameStatus==='active'&&<button onClick={pauseGame} disabled={statusLoading} className="btn btn-ghost" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem',borderColor:'var(--gold)',color:'var(--gold)'}}>⏸ Pause</button>}
            {gameStatus==='paused'&&<button onClick={resumeGame} disabled={statusLoading||thinking} className="btn btn-ghost" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem',borderColor:'var(--green)',color:'var(--green)'}}>▶ Reprendre</button>}
            {(gameStatus==='active'||gameStatus==='paused')&&(
              <>
                <button onClick={()=>setShowRewards(true)} className="btn btn-ghost" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem',borderColor:'var(--gold)',color:'var(--gold)'}}>🏆 Récompenses</button>
                <button onClick={endGame} disabled={statusLoading} className="btn btn-ghost" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem',borderColor:'var(--red)',color:'var(--red)'}}>■ Terminer</button>
              </>
            )}
          </div>
        )}

        <div style={{flex:1}}/>
        {character&&(
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',fontSize:'0.85rem'}}>
            <button onClick={()=>setShowSheet(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',textDecoration:'underline dotted',padding:0,fontSize:'0.85rem'}}>🧙 {character.name} 📋</button>
            <span style={{color:'var(--red)',fontSize:'0.8rem'}}>❤️ {character.hp_current}/{character.hp_max}</span>
            <div className="hp-bar" style={{width:'60px'}}><div className="hp-fill" style={{width:`${hpPct}%`,background:hpPct>60?'var(--green)':hpPct>30?'var(--gold)':'var(--red)'}}/></div>
          </div>
        )}
        {!character&&<Link href="/character/new" className="btn btn-ghost" style={{fontSize:'0.8rem',padding:'0.3rem 0.75rem'}}>+ Personnage</Link>}
      </nav>

      <div style={{flex:1,overflowY:'auto',padding:'1rem',display:'flex',flexDirection:'column'}}>
        {messages.length===0&&(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--muted)',textAlign:'center',gap:'1rem'}}>
            <div style={{fontSize:'3rem'}}>🏰</div>
            <p>{isHost?"Utilise le bouton ▶ Commencer dans la barre du haut pour lancer l'aventure !":'En attente que le MJ commence...'}</p>
          </div>
        )}
        {messages.map(m=><ChatMsg key={m.id} msg={m} uid={user.id}/>)}
        {thinking&&<div className="msg-dm pulse-slow" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{fontSize:'0.75rem',color:'#a78bfa',marginBottom:'0.4rem'}}>🎭 Maître du Jeu</div><div style={{color:'var(--muted)'}}>réfléchit...</div></div>}
        <div ref={chatEndRef}/>
      </div>

      <AnimatePresence>
        {pendingDice&&(
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}
            style={{background:'linear-gradient(135deg,#2a1a4a,#1e1030)',border:'1px solid var(--accent)',padding:'0.75rem 1rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            <span style={{color:'#a78bfa',fontWeight:'bold',fontSize:'0.9rem'}}>🎲 Le MJ demande un jet !</span>
            <span style={{color:'var(--muted)',fontSize:'0.85rem'}}>{pendingDice.purpose}</span>
            <div style={{display:'flex',gap:'0.5rem',marginLeft:'auto'}}>
              {DICE.map(d=><DiceButton key={d.type} {...d} onRoll={rollDice}/>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameStatus!=='ended'&&(
        <div style={{borderTop:'1px solid var(--border)',padding:'0.75rem 1rem',background:'var(--surface)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <button onClick={()=>setMsgType('chat')} className="btn" style={{padding:'0.3rem 0.75rem',fontSize:'0.8rem',background:msgType==='chat'?'var(--surface2)':'transparent',border:`1px solid ${msgType==='chat'?'var(--accent)':'var(--border)'}`,color:msgType==='chat'?'var(--accent)':'var(--muted)'}}>💬 Chat</button>
            <button onClick={()=>setMsgType('action')} className="btn" style={{padding:'0.3rem 0.75rem',fontSize:'0.8rem',background:msgType==='action'?'var(--surface2)':'transparent',border:`1px solid ${msgType==='action'?'var(--green)':'var(--border)'}`,color:msgType==='action'?'var(--green)':'var(--muted)'}}>⚔️ Action</button>
            <button onClick={()=>setVoiceEnabled(v=>!v)} className="btn" title={voiceEnabled?'Désactiver la voix du MJ':'Activer la voix du MJ'} style={{padding:'0.3rem 0.6rem',fontSize:'0.9rem',background:voiceEnabled?'rgba(124,58,237,0.15)':'transparent',border:`1px solid ${voiceEnabled?'var(--accent)':'var(--border)'}`,color:voiceEnabled?'var(--accent)':'var(--muted)'}}>{voiceEnabled?'🔊':'🔇'}</button>
            <div style={{flex:1}}/>
            <span style={{color:'var(--muted)',fontSize:'0.75rem'}}>Dés libres:</span>
            {DICE.map(d=><DiceButton key={d.type} {...d} onRoll={async(type,result)=>{
              const isCrit=type==='d20'&&result===20
              const c=isCrit
                ?`⚡ COUP CRITIQUE ! 🎲 ${user.username} lance d20: 20 — Naturel 20 !`
                :`🎲 ${user.username} lance ${type}: **${result}**`
              await supabase.from('tf_messages').insert({game_id:game.id,user_id:user.id,type:'roll',content:c})
              await supabase.from('tf_dice_rolls').insert({game_id:game.id,user_id:user.id,character_id:character?.id||null,dice_type:type,dice_count:1,results:[result],modifier:0,total:result})
            }}/>)}
          </div>
          <form onSubmit={sendMessage} style={{display:'flex',gap:'0.5rem'}}>
            <input className="input" value={input} onChange={e=>setInput(e.target.value)} placeholder={msgType==='action'?'⚔️ Décrivez votre action... (déclenche le MJ)':'💬 Chat libre...'} disabled={thinking||gameStatus==='paused'} style={{borderColor:msgType==='action'?'rgba(34,197,94,0.5)':undefined}}/>
            <button type="button" onClick={toggleListening} className="btn" title={isListening?'Arrêter la dictée':'Dicter une action'} style={{padding:'0.3rem 0.75rem',fontSize:'1rem',flexShrink:0,background:isListening?'rgba(239,68,68,0.2)':'transparent',border:`1px solid ${isListening?'var(--red)':'var(--border)'}`,color:isListening?'var(--red)':'var(--muted)'}}>{isListening?'⏹':'🎤'}</button>
            <button type="submit" className="btn btn-primary" disabled={!input.trim()||thinking||gameStatus==='paused'} style={{whiteSpace:'nowrap'}}>{thinking?'⏳':'→ Envoyer'}</button>
          </form>
          {gameStatus==='paused'&&<p style={{color:'var(--gold)',fontSize:'0.8rem',marginTop:'0.4rem',textAlign:'center'}}>⏸️ Partie en pause — le MJ doit la reprendre</p>}
        </div>
      )}

      {gameStatus==='ended'&&(
        <div style={{borderTop:'1px solid var(--border)',padding:'1rem',background:'var(--surface)',textAlign:'center',color:'var(--muted)'}}>
          ✅ Cette partie est terminée. <Link href="/dashboard" style={{color:'var(--accent)'}}>Retourner au lobby</Link>
        </div>
      )}

      {showSheet&&character&&<CharacterSheetModal character={character} onClose={()=>setShowSheet(false)}/>}

      <AnimatePresence>
        {showCrit&&(
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.4}}
            style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',background:'radial-gradient(ellipse at center, rgba(245,158,11,0.18) 0%, transparent 70%)'}}
          >
            <motion.div
              initial={{scale:0.5,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:1.2,opacity:0}}
              transition={{type:'spring',stiffness:300,damping:20}}
              style={{textAlign:'center',textShadow:'0 0 40px rgba(245,158,11,0.9)'}}
            >
              <div style={{fontSize:'4rem',lineHeight:1}}>⚡</div>
              <div style={{fontSize:'2rem',fontWeight:'bold',color:'#fbbf24',letterSpacing:'0.1em',margin:'0.3rem 0'}}>COUP CRITIQUE !</div>
              <div style={{fontSize:'1.1rem',color:'#f59e0b'}}>Naturel 20 !</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRewards&&(
          <RewardsPanel
            gameId={game.id}
            characterId={character?.id||null}
            characterName={character?.name||user.username}
            onClose={()=>{setShowRewards(false)}}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
