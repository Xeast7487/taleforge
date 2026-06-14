'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import type { TfGame, TfUser, TfCharacter, TfMessage } from '@/lib/types'

interface Props {
  game: TfGame & { host?: { username: string } }
  user: TfUser; character: TfCharacter | null
  initialMessages: TfMessage[]; isHost: boolean
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
  if(msg.type==='system') return <div className="msg-system" style={{padding:'0.4rem',margin:'0.25rem 0'}}>— {msg.content} —</div>
  if(msg.type==='dm') return <div className="msg-dm fade-in" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{fontSize:'0.75rem',color:'#a78bfa',marginBottom:'0.4rem',fontWeight:'bold'}}>🎭 Maître du Jeu</div><div style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{msg.content}</div><div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.4rem',textAlign:'right'}}>{time}</div></div>
  if(msg.type==='roll') return <div className="msg-roll fade-in" style={{padding:'0.6rem 1rem',margin:'0.4rem 0'}}><span style={{color:'var(--gold)'}}>{msg.content}</span><span style={{color:'var(--muted)',fontSize:'0.75rem',marginLeft:'0.5rem'}}>{time}</span></div>
  if(msg.type==='narration') return <div className="msg-narration fade-in" style={{padding:'0.75rem 1rem',margin:'0.5rem 0'}}><div style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{msg.content}</div><div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.4rem',textAlign:'right'}}>{time}</div></div>
  const isAction=msg.type==='action', isOwn=msg.user_id===uid
  return <div className={isAction?'msg-action fade-in':'fade-in'} style={{padding:'0.5rem 0.75rem',margin:'0.25rem 0',borderRadius:isAction?undefined:'8px',background:isAction?undefined:(isOwn?'rgba(124,58,237,0.15)':'var(--surface2)')}}><div style={{fontSize:'0.75rem',color:'var(--muted)',marginBottom:'0.2rem'}}>{isAction?'⚔️ ':''}<strong>{(msg.user as {username?:string}|null)?.username||'Joueur'}</strong>{isAction?' tente...':''}<span style={{marginLeft:'0.5rem'}}>{time}</span></div><div style={{whiteSpace:'pre-wrap'}}>{msg.content}</div></div>
}

export default function GameClient({game,user,character,initialMessages,isHost}:Props) {
  const [messages,setMessages]=useState<(TfMessage&{user?:{username:string}})[]>(initialMessages)
  const [input,setInput]=useState('')
  const [msgType,setMsgType]=useState<'chat'|'action'>('chat')
  const [thinking,setThinking]=useState(false)
  const [dmHistory,setDmHistory]=useState<{role:'user'|'assistant';content:string}[]>([])
  const [pendingDice,setPendingDice]=useState<{purpose?:string;modifier?:number}|null>(null)
  const chatEndRef=useRef<HTMLDivElement>(null)
  const supabase=createClient()

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  useEffect(()=>{
    const ch=supabase.channel(`game-${game.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'tf_messages',filter:`game_id=eq.${game.id}`},async payload=>{
      const m=payload.new as TfMessage
      if(m.user_id){const{data:u}=await supabase.from('tf_users').select('*').eq('id',m.user_id).single() as {data:TfUser|null};setMessages(p=>[...p,{...m,user:u??undefined}])}
      else setMessages(p=>[...p,m])
    }).subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[game.id,supabase])

  const sendToDM=useCallback(async(action:string)=>{
    setThinking(true)
    try{
      const res=await fetch('/api/dm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameId:game.id,action,history:dmHistory,character,scene:game.current_scene})})
      const data=await res.json()
      if(data.content){setDmHistory(h=>[...h,{role:'user',content:action},{role:'assistant',content:data.content}]);if(data.diceRequest)setPendingDice(data.diceRequest)}
    }catch{} finally{setThinking(false)}
  },[game.id,game.current_scene,character,dmHistory,supabase])

  async function sendMessage(e:React.FormEvent){
    e.preventDefault();if(!input.trim()||thinking)return
    const content=input.trim();setInput('')
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:user.id,character_id:character?.id||null,type:msgType,content})
    if(msgType==='action'){const txt=character?`${character.name} (${character.race} ${character.class}): ${content}`:content;await sendToDM(txt)}
  }

  async function rollDice(type:DiceType,result:number){
    const mod=pendingDice?.modifier||0,total=result+mod,purpose=pendingDice?.purpose
    const rc=`🎲 ${user.username} lance ${type}: ${result}${mod?` + ${mod}`:''}= **${total}**${purpose?` (${purpose})`:''}`
    await supabase.from('tf_messages').insert({game_id:game.id,user_id:user.id,type:'roll',content:rc})
    await supabase.from('tf_dice_rolls').insert({game_id:game.id,user_id:user.id,character_id:character?.id||null,dice_type:type,dice_count:1,results:[result],modifier:mod,total,purpose:purpose||null})
    setPendingDice(null)
    await sendToDM(`Résultat du jet: ${type} = ${result}${mod?` + ${mod} = ${total}`:''} pour ${purpose||'une action'}`)
  }

  async function startGame(){
    await supabase.from('tf_games').update({status:'active'}).eq('id',game.id)
    await sendToDM('Commence la partie. Décris la scène d\'ouverture et accueille les aventuriers dans leur aventure.')
  }

  const hpPct=character?(character.hp_current/character.hp_max)*100:0

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <nav style={{borderBottom:'1px solid var(--border)',padding:'0.6rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',background:'var(--surface)',flexShrink:0}}>
        <Link href="/dashboard" style={{color:'var(--muted)',fontSize:'0.85rem'}}>← Lobby</Link>
        <span style={{color:'var(--border)'}}>|</span>
        <span style={{color:'var(--gold)',fontWeight:'bold'}}>{game.name}</span>
        <span style={{fontSize:'0.75rem',padding:'0.15rem 0.5rem',borderRadius:'999px',background:game.status==='active'?'rgba(34,197,94,0.15)':'rgba(245,158,11,0.15)',color:game.status==='active'?'var(--green)':'var(--gold)',border:`1px solid ${game.status==='active'?'var(--green)':'var(--gold)'}`}}>
          {game.status==='active'?'⚔️ En cours':'⏳ En attente'}
        </span>
        <div style={{flex:1}}/>
        {character&&<div style={{display:'flex',alignItems:'center',gap:'0.75rem',fontSize:'0.85rem'}}>
          <span style={{color:'var(--muted)'}}>🧙 {character.name}</span>
          <span style={{color:'var(--red)',fontSize:'0.8rem'}}>❤️ {character.hp_current}/{character.hp_max}</span>
          <div className="hp-bar" style={{width:'60px'}}><div className="hp-fill" style={{width:`${hpPct}%`,background:hpPct>60?'var(--green)':hpPct>30?'var(--gold)':'var(--red)'}}/></div>
        </div>}
        {!character&&<Link href="/character/new" className="btn btn-ghost" style={{fontSize:'0.8rem',padding:'0.3rem 0.75rem'}}>+ Personnage</Link>}
      </nav>

      <div style={{flex:1,overflowY:'auto',padding:'1rem',display:'flex',flexDirection:'column'}}>
        {messages.length===0&&(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--muted)',textAlign:'center',gap:'1rem'}}>
            <div style={{fontSize:'3rem'}}>🏰</div>
            <p>{isHost?'Lance la partie pour commencer l\'aventure !':'En attente que le MJ commence...'}</p>
            {isHost&&game.status==='waiting'&&<button onClick={startGame} className="btn btn-gold" style={{fontSize:'1rem'}}>⚔️ Commencer l&apos;aventure</button>}
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
          <input className="input" value={input} onChange={e=>setInput(e.target.value)} placeholder={msgType==='action'?'⚔️ Décrivez votre action... (déclenche le MJ)':'💬 Chat libre...'} disabled={thinking} style={{borderColor:msgType==='action'?'rgba(34,197,94,0.5)':undefined}}/>
          <button type="submit" className="btn btn-primary" disabled={!input.trim()||thinking} style={{whiteSpace:'nowrap'}}>{thinking?'⏳':'→ Envoyer'}</button>
        </form>
      </div>
    </div>
  )
}
