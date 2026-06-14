'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import type { TfGame, TfUser, TfCharacter, TfMessage, GameStatus } from '@/lib/types'

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

function ChatMsg({msg,uid}:{msg:TfMessage&{user?:{username:string}};uid:string}) {
  const time=new Date(msg.created_at).toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'})
  const username=(msg.user as {username?:string}|null)?.username||'Joueur'
  if(msg.type==='system') return <div className="msg-system" style={{padding:'0.4rem',margin:'0.25rem 0'}}>— {msg.content} —</div>
  if(msg.type==='dm') return <div className="msg-dm fade-in" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{fontSize:'0.75rem',color:'#a78bfa',marginBottom:'0.4rem',fontWeight:'bold'}}>🎭 Maître du Jeu</div><div style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{msg.content}</div><div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.4rem',textAlign:'right'}}>{time}</div></div>
  if(msg.type==='roll') return <div className="msg-roll fade-in" style={{padding:'0.6rem 1rem',margin:'0.4rem 0'}}><span style={{color:'var(--gold)'}}>{msg.content}</span><span style={{color:'var(--muted)',fontSize:'0.75rem',marginLeft:'0.5rem'}}>{time}</span></div>
  if(msg.type==='narration') return <div className="msg-narration fade-in" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{msg.content}</div><div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.4rem',textAlign:'right'}}>{time}</div></div>
  const isAction=msg.type==='action', isOwn=msg.user_id===uid
  return <div className={isAction?'msg-action fade-in':'fade-in'} style={{padding:'0.5rem 0.75rem',margin:'0.25rem 0',borderRadius:isAction?undefined:'8px',background:isAction?undefined:(isOwn?'rgba(124,58,237,0.15)':'var(--surface2)')}}><div style={{fontSize:'0.75rem',color:'var(--muted)',marginBottom:'0.2rem'}}>{isAction?'⚔️ ':''}<strong>{username}</strong>{isAction?' tente...':''}<span style={{marginLeft:'0.5rem'}}>{time}</span></div><div style={{whiteSpace:'pre-wrap'}}>{msg.content}</div></div>
}

export default function GameClient({game,user,character,initialMessages,isHost}:Props) {
  const [messages,setMessages]=useState<(TfMessage&{user?:{username:string}})[]>(initialMessages)
  const [gameStatus,setGameStatus]=useState<GameStatus>(game.status)
  const [input,setInput]=useState('')
  const [msgType,setMsgType]=useState<'chat'|'action'>('chat')
  const [thinking,setThinking]=useState(false)
  const [statusLoading,setStatusLoading]=useState(false)
  const [dmHistory,setDmHistory]=useState<{role:'user'|'assistant';content:string}[]>([])
  const [pendingDice,setPendingDice]=useState<{purpose?:string;modifier?:number}|null>(null)
  const chatEndRef=useRef<HTMLDivElement>(null)
  const supabase=createClient()

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  // Subscribe to messages
  useEffect(()=>{
    const ch=supabase.channel(`game-${game.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tf_messages',filter:`game_id=eq.${game.id}`},async payload=>{
        const m=payload.new as TfMessage
        if(m.user_id){
          const{data:u}=await supabase.from('tf_users').select('*').eq('id',m.user_id).single()
          setMessages(p=>[...p,{...m,user:(u as TfUser)??undefined}])
        } else {
          setMessages(p=>[...p,m])
        }
      })
      // Subscribe to game status changes
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'tf_games',filter:`id=eq.${game.id}`},payload=>{
        const updated=payload.new as TfGame
        setGameStatus(updated.status)
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
    }catch{} finally{setThinking(false)}
  },[game.id,game.current_scene,character,dmHistory])

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
    const rc=`🎲 ${user.username} lance ${type}: ${result}${mod?` + ${mod}`:''}= **${total}**${purpose?` (${purpose})`:''}`
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:user.id,type:'roll',content:rc})
    await supabase.from('tf_dice_rolls').insert({game_id:game.id,user_id:user.id,character_id:character?.id||null,dice_type:type,dice_count:1,results:[result],modifier:mod,total,purpose:purpose||null})
    setPendingDice(null)
    await sendToDM(`Résultat du jet: ${type} = ${result}${mod?` + ${mod} = ${total}`:''} pour ${purpose||'une action'}`)
  }

  async function updateStatus(newStatus: GameStatus, dmPrompt?: string) {
    setStatusLoading(true)
    await supabase.from('tf_games').update({status: newStatus}).eq('id', game.id)
    setGameStatus(newStatus)
    if(dmPrompt) await sendToDM(dmPrompt)
    setStatusLoading(false)
  }

  async function startGame(){
    await updateStatus('active', "Commence la partie. Décris la scène d'ouverture et accueille les aventuriers dans leur aventure.")
  }
  async function pauseGame(){
    await updateStatus('paused')
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:null,type:'system',content:'⏸️ La partie a été mise en pause par le MJ.'})
  }
  async function resumeGame(){
    await updateStatus('active', "La partie reprend. Rappelle brièvement la situation et invite les joueurs à continuer.")
  }
  async function endGame(){
    if(!confirm('Terminer définitivement cette partie ?')) return
    await updateStatus('ended')
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:null,type:'system',content:'✅ La partie est terminée. Merci à tous les aventuriers !'})
  }

  const hpPct=character?(character.hp_current/character.hp_max)*100:0

  const statusLabel: Record<string,string> = {waiting:'⏳ En attente',active:'⚔️ En cours',paused:'⏸️ En pause',ended:'✅ Terminée'}
  const statusColor: Record<string,string> = {waiting:'var(--gold)',active:'var(--green)',paused:'var(--muted)',ended:'var(--muted)'}

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Nav */}
      <nav style={{borderBottom:'1px solid var(--border)',padding:'0.6rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',background:'var(--surface)',flexShrink:0,flexWrap:'wrap'}}>
        <Link href="/dashboard" style={{color:'var(--muted)',fontSize:'0.85rem'}}>← Lobby</Link>
        <span style={{color:'var(--border)'}}>|</span>
        <span style={{color:'var(--gold)',fontWeight:'bold'}}>{game.name}</span>
        <span style={{fontSize:'0.75rem',padding:'0.15rem 0.5rem',borderRadius:'999px',background:`${statusColor[gameStatus]}22`,color:statusColor[gameStatus],border:`1px solid ${statusColor[gameStatus]}`}}>
          {statusLabel[gameStatus]||gameStatus}
        </span>

        {/* Host controls */}
        {isHost && gameStatus !== 'ended' && (
          <div style={{display:'flex',gap:'0.4rem',marginLeft:'0.25rem'}}>
            {gameStatus === 'waiting' && (
              <button onClick={startGame} disabled={statusLoading||thinking} className="btn btn-gold" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem'}}>
                ▶ Commencer
              </button>
            )}
            {gameStatus === 'active' && (
              <button onClick={pauseGame} disabled={statusLoading} className="btn btn-ghost" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem',borderColor:'var(--gold)',color:'var(--gold)'}}>
                ⏸ Pause
              </button>
            )}
            {gameStatus === 'paused' && (
              <button onClick={resumeGame} disabled={statusLoading||thinking} className="btn btn-ghost" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem',borderColor:'var(--green)',color:'var(--green)'}}>
                ▶ Reprendre
              </button>
            )}
            {(gameStatus === 'active' || gameStatus === 'paused') && (
              <button onClick={endGame} disabled={statusLoading} className="btn btn-ghost" style={{padding:'0.25rem 0.6rem',fontSize:'0.8rem',borderColor:'var(--red)',color:'var(--red)'}}>
                ■ Terminer
              </button>
            )}
          </div>
        )}

        <div style={{flex:1}}/>

        {character && (
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',fontSize:'0.85rem'}}>
            <span style={{color:'var(--muted)'}}>🧙 {character.name}</span>
            <span style={{color:'var(--red)',fontSize:'0.8rem'}}>❤️ {character.hp_current}/{character.hp_max}</span>
            <div className="hp-bar" style={{width:'60px'}}>
              <div className="hp-fill" style={{width:`${hpPct}%`,background:hpPct>60?'var(--green)':hpPct>30?'var(--gold)':'var(--red)'}}/>
            </div>
          </div>
        )}
        {!character && <Link href="/character/new" className="btn btn-ghost" style={{fontSize:'0.8rem',padding:'0.3rem 0.75rem'}}>+ Personnage</Link>}
      </nav>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'1rem',display:'flex',flexDirection:'column'}}>
        {messages.length===0 && (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--muted)',textAlign:'center',gap:'1rem'}}>
            <div style={{fontSize:'3rem'}}>🏰</div>
            <p>{isHost ? "Utilise le bouton ▶ Commencer dans la barre du haut pour lancer l'aventure !" : 'En attente que le MJ commence...'}</p>
          </div>
        )}
        {messages.map(m=><ChatMsg key={m.id} msg={m} uid={user.id}/>)}
        {thinking && (
          <div className="msg-dm pulse-slow" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}>
            <div style={{fontSize:'0.75rem',color:'#a78bfa',marginBottom:'0.4rem'}}>🎭 Maître du Jeu</div>
            <div style={{color:'var(--muted)'}}>réfléchit...</div>
          </div>
        )}
        <div ref={chatEndRef}/>
      </div>

      {/* Pending dice */}
      <AnimatePresence>
        {pendingDice && (
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

      {/* Input */}
      {gameStatus !== 'ended' && (
        <div style={{borderTop:'1px solid var(--border)',padding:'0.75rem 1rem',background:'var(--surface)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <button onClick={()=>setMsgType('chat')} className="btn" style={{padding:'0.3rem 0.75rem',fontSize:'0.8rem',background:msgType==='chat'?'var(--surface2)':'transparent',border:`1px solid ${msgType==='chat'?'var(--accent)':'var(--border)'}`,color:msgType==='chat'?'var(--accent)':'var(--muted)'}}>💬 Chat</button>
            <button onClick={()=>setMsgType('action')} className="btn" style={{padding:'0.3rem 0.75rem',fontSize:'0.8rem',background:msgType==='action'?'var(--surface2)':'transparent',border:`1px solid ${msgType==='action'?'var(--green)':'var(--border)'}`,color:msgType==='action'?'var(--green)':'var(--muted)'}}>⚔️ Action</button>
            <div style={{flex:1}}/>
            <span style={{color:'var(--muted)',fontSize:'0.75rem'}}>Dés libres:</span>
            {DICE.map(d=><DiceButton key={d.type} {...d} onRoll={async(type,result)=>{
              const c=`🎲 ${user.username} lance ${type}: **${result}**`
              await supabase.from('tf_messages').insert({game_id:game.id,user_id:user.id,type:'roll',content:c})
              await supabase.from('tf_dice_rolls').insert({game_id:game.id,user_id:user.id,character_id:character?.id||null,dice_type:type,dice_count:1,results:[result],modifier:0,total:result})
            }}/>)}
          </div>
          <form onSubmit={sendMessage} style={{display:'flex',gap:'0.5rem'}}>
            <input
              className="input"
              value={input}
              onChange={e=>setInput(e.target.value)}
              placeholder={msgType==='action'?'⚔️ Décrivez votre action... (déclenche le MJ)':'💬 Chat libre...'}
              disabled={thinking||gameStatus==='paused'}
              style={{borderColor:msgType==='action'?'rgba(34,197,94,0.5)':undefined}}
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim()||thinking||gameStatus==='paused'} style={{whiteSpace:'nowrap'}}>
              {thinking?'⏳':'→ Envoyer'}
            </button>
          </form>
          {gameStatus==='paused' && <p style={{color:'var(--gold)',fontSize:'0.8rem',marginTop:'0.4rem',textAlign:'center'}}>⏸️ Partie en pause — le MJ doit la reprendre</p>}
        </div>
      )}

      {gameStatus==='ended' && (
        <div style={{borderTop:'1px solid var(--border)',padding:'1rem',background:'var(--surface)',textAlign:'center',color:'var(--muted)'}}>
          ✅ Cette partie est terminée. <Link href="/dashboard" style={{color:'var(--accent)'}}>Retourner au lobby</Link>
        </div>
      )}
    </div>
  )
}
