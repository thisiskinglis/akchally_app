import { useState, useEffect, useRef } from 'react'

function DoneGesture({ state }){
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-[22px] h-[7px] rounded-full bg-[#7D846E] origin-left ${state==='listening'?'animate-pulse':''} ${state==='thinking'?'animate-[wiggle_1.2s_ease-in-out_infinite]':''}`} style={{transform:'rotate(-12deg)'}} />
      <div className={`w-[8px] h-[8px] rounded-full bg-[#C56A4A] ${state==='listening'?'animate-ping':''}`} />
    </div>
  )
}

export default function App(){
  const [step, setStep] = useState('inventory')
  const [have, setHave] = useState("")
  const [mode, setMode] = useState(null)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [v1, setV1] = useState(null)
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  const recRef = useRef(null)
  const isListeningRef = useRef(false)

  const API = import.meta.env.VITE_API_URL

  // === BEFORE ALLOWING GENERATION: CHECK HEALTH ===
  useEffect(()=>{
    if(!API){
      setHealth({ok:false, hasKey:false, error:'VITE_API_URL not set'})
      return
    }
    fetch(`${API}/health`)
      .then(r=>r.json())
      .then(data=>{
        console.log('[AKCHALLY] GET /health', data)
        setHealth(data)
      })
      .catch(e=>{
        console.error('[AKCHALLY] health check failed', e)
        setHealth({ok:false, hasKey:false, error:e.message})
      })
  }, [API])

  const speak = (text)=>{
    if(!text || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.96; u.pitch = 1.02
    u.onstart=()=>setSpeaking(true)
    u.onend=()=>setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const startVoice = async ()=>{
    try{ await navigator.mediaDevices.getUserMedia({audio:true}) }catch{ alert('Mic blocked'); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR) return
    if(isListeningRef.current){ isListeningRef.current=false; recRef.current?.stop(); setListening(false); return }
    const rec = new SR(); rec.lang='en-US'; rec.interimResults=true; rec.continuous=true
    let finalText = have
    rec.onstart=()=>{ isListeningRef.current=true; setListening(true) }
    rec.onresult=(e)=>{
      let interim='', finalChunk=''
      for(let i=e.resultIndex;i<e.results.length;i++){ const t=e.results[i][0].transcript; if(e.results[i].isFinal) finalChunk+=t+' '; else interim+=t }
      if(finalChunk) finalText=(finalText+' '+finalChunk).trim()
      const display=(finalText+' '+interim).trim()
      if(display) setHave(display)
    }
    rec.onend=()=>{ if(isListeningRef.current){ try{rec.start()}catch{}}else setListening(false) }
    recRef.current=rec; try{rec.start()}catch{}
  }

  // === REAL BACKEND CALL - NO LOCAL FALLBACK ===
  const chooseMode = async (selectedMode)=>{
    const ingredientInput = have // exact textarea value
    console.log('[AKCHALLY] exact textarea value:', JSON.stringify(ingredientInput))

    if(!ingredientInput.trim()){
      alert('Tell me what you got first')
      return
    }

    if(!API){
      setError('VITE_API_URL not set. Set VITE_API_URL=https://YOUR-BACKEND-DOMAIN in Vercel env.')
      return
    }

    // Health gate
    if(!health?.ok || !health?.hasKey){
      setError(`AKCHALLY brain is unavailable — try again. Health: ${JSON.stringify(health)}`)
      return
    }

    // Clear previous recipe state BEFORE request - no stale, no cached
    setV1(null)
    setError(null)
    setMode(selectedMode)
    setStep('thinking')
    setThinking(true)

    const body = {
      transcript: ingredientInput,
      mode: selectedMode
    }
    console.log('[AKCHALLY] POST /api/think body:', body)

    try{
      const res = await fetch(`${API}/api/think`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if(!res.ok){
        const txt = await res.text()
        throw new Error(`Backend ${res.status}: ${txt}`)
      }

      const data = await res.json()
      console.log('[AKCHALLY] response.public.title:', data?.public?.title)
      console.log('[AKCHALLY] full response:', data)

      // Validate - must have public fields, no fake local generation
      if(!data?.public?.title || !data?.public?.steps){
        throw new Error('Invalid backend response - missing public.title or public.steps')
      }

      // Render ONLY from data.public.*
      setV1(data)
      setThinking(false)
      setStep('result')
      setTimeout(()=> speak(data.public.spoken_intro), 300)

    }catch(e){
      console.error('[AKCHALLY] backend failed', e)
      setThinking(false)
      setError('AKCHALLY brain is unavailable — try again.')
      setStep('mode')
      // Do NOT manufacture fake recipe locally
    }
  }

  const gestureState = listening? 'listening' : thinking? 'thinking' : speaking? 'speaking' : 'idle'

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1A1A1A] flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col">
        <header className="px-7 pt-12 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2.5"><DoneGesture state={gestureState}/><span className="font-bold text-[16px]">akchally</span></div>
          <span className="text-[11px] tracking-[0.14em] opacity-40">{step==='inventory'?'1 · WHAT HAVE YOU GOT?': step==='mode'?'2 · HOW WE COOKING?': step==='thinking'?'3 · AKCHALLY DECIDES':'4 · RECIPE'}</span>
        </header>

        {/* Health status - for builder debug */}
        <div className="px-7 py-2">
          {!API && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded">VITE_API_URL not set — set to https://YOUR-BACKEND-DOMAIN</p>}
          {API && health && !health.ok && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded">Health check failed: {JSON.stringify(health)} — backend unreachable or hasKey false</p>}
          {API && health?.ok && health?.hasKey && <p className="text-[11px] text-green-700 bg-green-50 p-2 rounded">✓ Brain connected: {API} · hasKey: true</p>}
          {API && health?.ok && !health?.hasKey && <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded">⚠ Brain reachable but OPENAI_API_KEY missing — set it on backend</p>}
        </div>

        {step==='inventory' && (
          <main className="px-7 pt-10 pb-10">
            <h1 className="text-[34px] font-bold leading-[0.92] tracking-[-0.02em]">Alright, what are we<br/>working with?</h1>
            <p className="mt-4 text-[17px] leading-[1.35] text-[#7D846E]">Tell me everything. Messy is perfect.</p>
            <div className="mt-10 relative">
              <div className={`w-full rounded-[28px] ${listening?'bg-white shadow-[0_0_0_3px_rgba(197,106,74,0.12)] border border-[#C56A4A]/20':'bg-[#E8E0D1]'}`}>
                <textarea value={have} onChange={e=>setHave(e.target.value)} placeholder="Two sad tomatoes, mushrooms that need using, leftover chicken, potatoes, garlic and some cheese..." className="w-full min-h-[152px] p-6 pb-14 rounded-[28px] bg-transparent border-0 text-[17px] leading-[1.5] placeholder:text-[#9A9590] outline-none resize-none" />
              </div>
              <button onClick={startVoice} className={`absolute bottom-4 right-4 w-[46px] h-[46px] rounded-full flex items-center justify-center ${listening?'bg-[#C56A4A] text-white animate-pulse':'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]'}`}>{listening?'■':'🎙'}</button>
            </div>
            <p className="mt-4 text-[12.5px] text-[#1A1A1A]/60">I’ll choose what’s worth using. You don’t need to use everything.</p>
            <button onClick={()=> have.trim() && setStep('mode')} disabled={!have.trim()} className={`mt-12 w-full h-[56px] rounded-full font-bold ${!have.trim()?'bg-black/20 text-black/30':'bg-[#1A1A1A] text-[#FAF7F1]'}`}>Sort this out →</button>
            {error && <p className="mt-4 text-[12px] text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
          </main>
        )}

        {step==='mode' && (
          <main className="px-7 pt-10 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.9]">How are we<br/>cooking tonight?</h1>
            <p className="mt-3 text-[12px] opacity-50">Input: {have.slice(0,80)}{have.length>80?'...':''}</p>
            <div className="mt-8 grid gap-4">
              <button onClick={()=>chooseMode('quick')} disabled={thinking} className="text-left rounded-[24px] bg-white border p-6">
                <p className="text-[11px] tracking-widest font-bold opacity-40">MAKE IT QUICK</p>
                <p className="text-[22px] font-bold mt-2">25 min · low effort</p>
                <p className="text-[11px] mt-2 opacity-50">POST transcript + mode to /api/think</p>
              </button>
              <button onClick={()=>chooseMode('relaxed')} disabled={thinking} className="text-left rounded-[24px] bg-[#1A1A1A] text-white p-6">
                <p className="text-[11px] tracking-widest font-bold opacity-40 text-white/60">I'VE GOT TIME</p>
                <p className="text-[22px] font-bold mt-2">Up to 60 min</p>
                <p className="text-[11px] mt-2 opacity-50">POST transcript + mode to /api/think</p>
              </button>
            </div>
            {error && <p className="mt-4 text-[12px] text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
            <button onClick={()=>setStep('inventory')} className="mt-6 text-[12px] opacity-40">← Back</button>
          </main>
        )}

        {step==='thinking' && (
          <main className="px-7 pt-24 flex flex-col items-center text-center">
            <DoneGesture state="thinking"/>
            <h2 className="mt-8 text-[20px] font-bold">Calling real AKCHALLY brain...</h2>
            <p className="mt-2 text-[12px] text-[#7D846E] break-all px-4">"{have}"</p>
            <p className="mt-2 text-[11px] opacity-40">POST {API}/api/think · mode {mode}</p>
          </main>
        )}

        {step==='result' && v1 && (
          <main className="px-7 pt-8 pb-10">
            {/* Render ONLY from data.public.* */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] tracking-widest font-bold opacity-40">WE'RE MAKING THIS · REAL BRAIN</span>
              <button onClick={()=>speak(v1.public.spoken_intro)} className="w-8 h-8 rounded-full bg-white border">🔊</button>
            </div>
            <h2 className="mt-3 text-[28px] font-bold leading-[0.9]">{v1.public.title}</h2>
            <p className="mt-3 text-[13px] text-[#7D846E]">{v1.public.meta}</p>
            <div className="mt-4 rounded-[16px] bg-[#EDE8DF] p-4">
              <p className="text-[10px] font-bold tracking-widest opacity-40">USES</p>
              <p className="text-[13px] mt-1 font-medium">{v1.public.uses?.join(', ')}</p>
              {v1.public.saves_for_later?.length>0 && (
                <>
                  <p className="text-[10px] font-bold tracking-widest opacity-40 mt-3">SAVING FOR LATER</p>
                  <p className="text-[11px] opacity-60 mt-1">{v1.public.saves_for_later?.join(', ')}</p>
                </>
              )}
            </div>
            <div className="mt-6 rounded-[20px] bg-white border p-5">
              {v1.public.steps?.map((s,i)=><p key={i} className="text-[14px] py-2.5 border-b last:border-0"><span className="font-bold mr-2">{i+1}.</span>{s}</p>)}
            </div>
            <p className="mt-4 text-[11px] opacity-40 italic">{v1.public.spoken_intro}</p>
            <button onClick={()=>{setStep('inventory'); setV1(null); setHave(''); setError(null)}} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">New test →</button>
            <p className="mt-3 text-[10px] opacity-30 text-center">Acceptance: eggs, mushrooms, cheddar → must hit /api/think and return different dish than chicken, potatoes, tomatoes, garlic. No frontend title/step generation.</p>
          </main>
        )}
      </div>
      <style>{`@keyframes wiggle{0%,100%{transform:rotate(-12deg) translateX(0)}50%{transform:rotate(-12deg) translateX(4px)}}`}</style>
    </div>
  )
}
