import { useState, useRef } from 'react'

function DoneGesture({ state }){
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-[22px] h-[7px] rounded-full bg-[#7D846E] origin-left ${state==='listening'?'animate-pulse':''} ${state==='thinking'?'animate-[wiggle_1.2s_ease-in-out_infinite]':''}`} style={{transform:'rotate(-12deg)'}} />
      <div className={`w-[8px] h-[8px] rounded-full bg-[#C56A4A] ${state==='listening'?'animate-ping':''}`} />
    </div>
  )
}

export default function App(){
  const [step, setStep] = useState('inventory') // inventory -> mode -> thinking -> result
  const [have, setHave] = useState("")
  const [mode, setMode] = useState(null)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [v1, setV1] = useState(null)
  const [cookStep, setCookStep] = useState(0)
  const [error, setError] = useState(null)

  const recRef = useRef(null)
  const isListeningRef = useRef(false)

  const speak = (text)=>{
    if(!('speechSynthesis' in window)) return
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

  // === CORE FIX: Fresh POST on every Next/mode click, clear state, no fallback ===
  const chooseMode = async (selectedMode)=>{
    const exactTextareaValue = have // capture exact current value
    console.log('[AKCHALLY] exact textarea value:', JSON.stringify(exactTextareaValue))
    
    if(!exactTextareaValue.trim()){
      alert('Tell me what you got first')
      return
    }

    const API = import.meta.env.VITE_API_URL
    if(!API){
      console.error('[AKCHALLY] VITE_API_URL missing - set it in Vercel env')
      setError('Backend URL not configured. Set VITE_API_URL in Vercel → Settings → Environment Variables to https://your-backend-url')
      return
    }

    // 1. Clear previous recipe state BEFORE request (no stale, no cached)
    setV1(null)
    setCookStep(0)
    setError(null)
    setMode(selectedMode)
    setStep('thinking')
    setThinking(true)

    const requestBody = {
      transcript: exactTextareaValue,
      mode: selectedMode
    }
    console.log('[AKCHALLY] POST', `${API}/api/think`, 'body:', requestBody)

    try{
      const res = await fetch(`${API}/api/think`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if(!res.ok){
        const text = await res.text()
        throw new Error(`Backend ${res.status}: ${text}`)
      }

      const data = await res.json()
      
      // 2. Log returned title
      console.log('[AKCHALLY] response.recipe.title:', data?.recipe?.title || data?.public?.title)
      console.log('[AKCHALLY] full response:', data)

      // 3. Render exclusively from newly returned response - no demo/default/localStorage/hardcoded
      // Validate response has required fields
      if(!data?.recipe?.title || !data?.recipe?.steps){
        throw new Error('Invalid response structure - missing recipe.title or steps')
      }

      setV1(data)
      setThinking(false)
      // 4. Navigate ONLY after response succeeds
      setStep('result')
      setTimeout(()=> speak(data.public?.spoken_intro || data.recipe?.spoken_intro || data.recipe?.title), 300)

    }catch(e){
      console.error('[AKCHALLY] fetch failed:', e)
      setThinking(false)
      setError(`Failed to get recipe: ${e.message}. Check backend is deployed and VITE_API_URL is correct.`)
      setStep('mode') // stay on mode, don't show stale recipe
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

        {step==='inventory' && (
          <main className="px-7 pt-14 pb-10">
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
          <main className="px-7 pt-14 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.9]">How are we<br/>cooking tonight?</h1>
            <p className="mt-3 text-[13px] text-[#7D846E]">Current input: <span className="font-medium text-black">{have.slice(0,60)}{have.length>60?'...':''}</span></p>
            <div className="mt-8 grid gap-4">
              <button onClick={()=>chooseMode('quick')} disabled={thinking} className="text-left rounded-[24px] bg-white border border-black/5 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] disabled:opacity-50">
                <p className="text-[11px] tracking-widest font-bold opacity-40">MAKE IT QUICK</p>
                <p className="text-[22px] font-bold mt-2">25 min · low effort</p>
                <p className="text-[12px] mt-2 opacity-60">Logs textarea, POSTs fresh to /api/think, clears previous state</p>
              </button>
              <button onClick={()=>chooseMode('relaxed')} disabled={thinking} className="text-left rounded-[24px] bg-[#1A1A1A] text-white p-6 disabled:opacity-50">
                <p className="text-[11px] tracking-widest font-bold opacity-40 text-white/60">I'VE GOT TIME</p>
                <p className="text-[22px] font-bold mt-2">Up to 60 min</p>
                <p className="text-[12px] mt-2 opacity-60">Fresh POST, await response, then navigate</p>
              </button>
            </div>
            {error && <p className="mt-4 text-[12px] text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
            <button onClick={()=>setStep('inventory')} className="mt-6 text-[12px] opacity-40">← Back</button>
          </main>
        )}

        {step==='thinking' && (
          <main className="px-7 pt-24 flex flex-col items-center text-center">
            <DoneGesture state="thinking"/>
            <h2 className="mt-8 text-[20px] font-bold">Sending fresh transcript to backend...</h2>
            <p className="mt-2 text-[12px] text-[#7D846E] break-all px-4">"{have}"</p>
            <p className="mt-4 text-[11px] opacity-40">POST /api/think · mode: {mode} · cleared previous recipe</p>
          </main>
        )}

        {step==='result' && v1 && (
          <main className="px-7 pt-8 pb-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] tracking-widest font-bold opacity-40">WE'RE MAKING THIS · FRESH RESPONSE</span>
              <button onClick={()=>speak(v1.public?.spoken_intro || v1.recipe?.spoken_intro)} className="w-8 h-8 rounded-full bg-white border">🔊</button>
            </div>
            {/* Renders EXCLUSIVELY from newly returned response */}
            <h2 className="mt-3 text-[28px] font-bold leading-[0.9]">{v1.public?.title || v1.recipe?.title}</h2>
            <p className="mt-3 text-[13px] text-[#7D846E]">{v1.public?.meta || v1.recipe?.meta}</p>
            <div className="mt-4 rounded-[16px] bg-[#EDE8DF] p-4">
              <p className="text-[10px] font-bold tracking-widest opacity-40">USES — from fresh response</p>
              <p className="text-[13px] mt-1 font-medium">{v1.public?.uses?.join(', ') || v1.recipe?.uses?.join(', ')}</p>
              {v1.public?.saves_for_later?.length>0 && (
                <>
                  <p className="text-[10px] font-bold tracking-widest opacity-40 mt-3">SAVING FOR LATER</p>
                  <p className="text-[11px] opacity-60 mt-1">{v1.public?.saves_for_later?.join(', ')}</p>
                </>
              )}
              <p className="mt-3 text-[10px] opacity-30">Request was: "{v1.kitchen_state ? JSON.stringify(v1.kitchen_state.ingredients?.slice(0,3)) : have}"</p>
            </div>
            <div className="mt-6 rounded-[20px] bg-white border p-5">
              {(v1.public?.steps || v1.recipe?.steps || []).map((s,i)=><p key={i} className="text-[14px] py-2.5 border-b last:border-0"><span className="font-bold mr-2">{i+1}.</span>{s}</p>)}
            </div>
            <button onClick={()=>{setStep('inventory'); setV1(null); setHave('')}} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">New ingredients → (test different body)</button>
            <p className="mt-3 text-[10px] opacity-30 text-center">No demo, no cache, no localStorage — only backend response</p>
          </main>
        )}
      </div>
      <style>{`@keyframes wiggle{0%,100%{transform:rotate(-12deg) translateX(0)}50%{transform:rotate(-12deg) translateX(4px)}}`}</style>
    </div>
  )
}
