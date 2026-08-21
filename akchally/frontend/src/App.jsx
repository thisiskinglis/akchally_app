import { useState, useEffect, useRef } from 'react'

function DoneGesture({ state }){
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-[22px] h-[7px] rounded-full bg-[#7D846E] origin-left ${state==='listening'?'animate-pulse':''} ${state==='thinking'?'animate-[wiggle_1.2s_ease-in-out_infinite]':''} ${state==='speaking'?'animate-[wiggle_0.6s_ease-in-out_infinite]':''}`} style={{transform:'rotate(-12deg)'}} />
      <div className={`w-[8px] h-[8px] rounded-full bg-[#C56A4A] ${state==='listening'?'animate-ping':''} ${state==='thinking'?'animate-pulse':''} ${state==='speaking'?'animate-ping':''}`} />
    </div>
  )
}

export default function App(){
  const [isAppView, setIsAppView] = useState(false)
  const [step, setStep] = useState('inventory')
  const [have, setHave] = useState("")
  const [mode, setMode] = useState(null)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [v1, setV1] = useState(null)
  const [cookStep, setCookStep] = useState(0)
  const [cookSession, setCookSession] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpQ, setHelpQ] = useState("")
  const [helpListening, setHelpListening] = useState(false)
  const [helpThinking, setHelpThinking] = useState(false)
  const [helpAnswer, setHelpAnswer] = useState(null)

  const recRef = useRef(null)
  const isListeningRef = useRef(false)
  const helpRecRef = useRef(null)
  const helpIsListeningRef = useRef(false)

  useEffect(()=>{
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if(standalone || localStorage.getItem('akchally_installed')==='true') setIsAppView(true)
  },[])

  const speak = (text)=>{
    if(!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.96; u.pitch = 1.02; u.lang = 'en-US'
    u.onstart = ()=> setSpeaking(true)
    u.onend = ()=> setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const startVoice = async ()=>{
    try{ await navigator.mediaDevices.getUserMedia({audio:true}) }catch{ alert('Mic blocked'); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){ alert('Use CHROME'); return }
    if(isListeningRef.current){ isListeningRef.current=false; recRef.current?.stop(); setListening(false); return }
    const rec = new SR(); rec.lang='en-US'; rec.interimResults=true; rec.continuous=true
    let finalText = have
    rec.onstart=()=>{ isListeningRef.current=true; setListening(true); if(!finalText) setHave('Listening... keep talking, tap ■ to stop') }
    rec.onresult=(e)=>{
      let interim='', finalChunk=''
      for(let i=e.resultIndex;i<e.results.length;i++){ const t=e.results[i][0].transcript; if(e.results[i].isFinal) finalChunk+=t+' '; else interim+=t }
      if(finalChunk) finalText=(finalText+' '+finalChunk).trim()
      const display=(finalText+' '+interim).replace('Listening... keep talking, tap ■ to stop','').trim()
      if(display) setHave(display)
    }
    rec.onend=()=>{ if(isListeningRef.current){ try{rec.start()}catch{}}else{ setListening(false); setHave(prev=>prev.replace('Listening... keep talking, tap ■ to stop','').trim()) } }
    recRef.current=rec; try{rec.start()}catch{}
  }

  const startHelpVoice = async ()=>{
    try{ await navigator.mediaDevices.getUserMedia({audio:true}) }catch{ alert('Mic blocked'); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR) return
    if(helpIsListeningRef.current){ helpIsListeningRef.current=false; helpRecRef.current?.stop(); setHelpListening(false); return }
    const rec = new SR(); rec.lang='en-US'; rec.interimResults=true; rec.continuous=true
    let finalText = helpQ
    rec.onstart=()=>{ helpIsListeningRef.current=true; setHelpListening(true) }
    rec.onresult=(e)=>{
      let interim='', finalChunk=''
      for(let i=e.resultIndex;i<e.results.length;i++){ const t=e.results[i][0].transcript; if(e.results[i].isFinal) finalChunk+=t+' '; else interim+=t }
      if(finalChunk) finalText=(finalText+' '+finalChunk).trim()
      const display=(finalText+' '+interim).trim()
      if(display) setHelpQ(display)
    }
    rec.onend=()=>{ if(helpIsListeningRef.current){ try{rec.start()}catch{}}else setHelpListening(false) }
    helpRecRef.current=rec; try{rec.start()}catch{}
  }

  const goToMode = ()=>{
    if(!have.trim()){ alert('Tell me what you got first'); return }
    setStep('mode')
  }

  const chooseMode = async (selectedMode)=>{
    setMode(selectedMode)
    setStep('thinking')
    setThinking(true)
    const API = import.meta.env.VITE_API_URL
    try{
      let data
      if(API){
        const r = await fetch(`${API}/api/think`,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({transcript: have, mode: selectedMode})})
        data = await r.json()
      }else{
        await new Promise(res=>setTimeout(res, 1800))
        data = {
          winner: {selected_dish:"Crispy Garlic Chicken & Mushroom Potatoes", family:"hash / skillet", use: have.split(',').slice(0,4), optional:[], leave_out:[], selection_reason:"local fallback"},
          recipe: {title:"Crispy Garlic Chicken & Mushroom Potatoes", time:"22 min", effort:"one pan", meta:"22 min · one pan", uses: have.split(',').slice(0,4), saves_for_later: have.split(',').slice(4), spoken_intro:"We're making crispy chicken and mushroom potatoes.", steps:["Cut potatoes small, fry 6-7 min","Add mushrooms, brown hard","Add garlic and chicken","Cheese, lid 2 min"]},
          public: {title:"Crispy Garlic Chicken & Mushroom Potatoes", time:"22 min", effort:"one pan", meta:"22 min", uses: have.split(',').slice(0,4), saves_for_later: have.split(',').slice(4), spoken_intro:"We're making crispy chicken and mushroom potatoes.", steps:["Cut potatoes small","Add mushrooms","Add garlic and chicken","Cheese"]},
          candidates: [], scored: [], culinary_check: {texture:"crispy+soft", fat:"oil", acid:"optional tomato"}
        }
      }
      setV1(data)
      // Build cook session
      setCookSession({
        recipe_title: data.public?.title || data.recipe?.title,
        selected_ingredients: data.winner?.use || data.public?.uses || [],
        current_step: 0,
        completed_steps: [],
        active_step_text: data.public?.steps?.[0] || data.recipe?.steps?.[0],
        substitutions: [],
        active_timers: [],
        all_steps: data.public?.steps || data.recipe?.steps,
        winner: data.winner,
        recipe: data.public || data.recipe
      })
      setThinking(false)
      setStep('result')
      setTimeout(()=> speak(data.public?.spoken_intro || data.recipe?.spoken_intro), 300)
    }catch(e){
      console.log(e); setThinking(false); setStep('mode')
    }
  }

  const startCook = ()=>{
    if(!v1) return
    setCookStep(0)
    setCookSession(prev=> prev ? {...prev, current_step:0, active_step_text: prev.all_steps[0]} : prev)
    setStep('cook')
    speak(`Let's cook ${v1.public?.title || v1.recipe?.title}. Step 1: ${v1.public?.steps?.[0] || v1.recipe?.steps?.[0]}`)
  }

  const nextCookStep = ()=>{
    if(!cookSession) return
    const next = cookStep+1
    if(next < cookSession.all_steps.length){
      setCookStep(next)
      setCookSession(prev=> ({...prev, current_step: next, completed_steps: [...prev.completed_steps, cookStep], active_step_text: prev.all_steps[next]}))
      speak(cookSession.all_steps[next])
    }else{
      speak('Done! Dinner handled.')
      setStep('result')
    }
  }

  const askHelp = async (questionText)=>{
    const q = questionText || helpQ
    if(!q.trim() || !cookSession) return
    setHelpThinking(true)
    setHelpAnswer(null)
    const API = import.meta.env.VITE_API_URL
    try{
      if(API){
        const r = await fetch(`${API}/api/cook/help`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ session: cookSession, question: q })
        })
        const data = await r.json()
        setHelpAnswer(data)
        speak(data.spoken_response)
        // Update session
        setCookSession(prev=> ({
          ...prev,
          substitutions: [...prev.substitutions, ...(data.session_updates?.substitutions||[])],
          active_timers: [...(prev.active_timers||[]), ...(data.session_updates?.active_timers||[])],
          ...(data.updated_current_step ? {active_step_text: data.updated_current_step, all_steps: prev.all_steps.map((s,i)=> i===prev.current_step ? data.updated_current_step : s)} : {}),
          ...(data.updated_future_steps ? {all_steps: data.updated_future_steps} : {})
        }))
      }else{
        // local demo
        const demo = {
          type:"rescue",
          spoken_response:"Turn the heat down now and add a small splash of water. Stir and give it 30 seconds.",
          quick_action:"Turn heat down, splash water",
          session_updates:{substitutions:[], active_timers:[]},
          recipe_changed:false
        }
        setHelpAnswer(demo)
        speak(demo.spoken_response)
      }
    }catch(e){
      console.log(e)
      setHelpAnswer({type:"general", spoken_response:"Could not reach help brain. Keep heat medium, add splash water if thick, taste as you go.", quick_action:"Medium heat, splash water", session_updates:{substitutions:[], active_timers:[]}, recipe_changed:false})
    }finally{
      setHelpThinking(false)
    }
  }

  const gestureState = listening || helpListening ? 'listening' : thinking || helpThinking ? 'thinking' : speaking? 'speaking' : v1? 'done' : 'idle'

  if(!isAppView){
    return (
      <div className="min-h-screen bg-[#FAF7F1] flex justify-center">
        <div className="w-full max-w-[440px] px-6 py-10 flex flex-col min-h-screen">
          <header className="flex items-center gap-2"><DoneGesture state="idle"/><span className="font-bold ml-1">akchally</span></header>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h1 className="text-[46px] font-bold leading-[0.9]">Gets dinner<br/>handled.</h1>
            <button onClick={()=>setIsAppView(true)} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">OPEN APP</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1A1A1A] flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative">
        <header className="px-6 pt-10 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="font-bold text-[15px] ml-1">akchally</span></div>
          <div className="text-[11px] opacity-40 tracking-widest">
            {step==='inventory'&&'1 · WHAT HAVE YOU GOT?'}
            {step==='mode'&&'2 · HOW WE COOKING?'}
            {step==='thinking'&&'3 · AKCHALLY DECIDES'}
            {step==='result'&&'4 · RECIPE'}
            {step==='cook'&&`COOK · ${cookStep+1}/${cookSession?.all_steps?.length||0}`}
          </div>
        </header>

        {step==='inventory' && (
          <main className="px-6 pt-8 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.95]">What have<br/>you got?</h1>
            <p className="mt-3 text-[15px] text-[#7D846E]">Say it messy, I'll sort it.</p>
            <div className="mt-8 relative">
              <textarea value={have} onChange={e=>setHave(e.target.value)} placeholder="I've got leftover chicken, three old pizza slices, two tomatoes, mushrooms that need using, potatoes, garlic, cheese, ham and eggs" className={`w-full min-h-[140px] p-5 pr-12 rounded-[20px] bg-[#EDE8DF] border text-[16px] outline-none ${listening?'border-[#C56A4A] bg-white':''}`} />
              <button onClick={startVoice} className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center ${listening?'bg-[#C56A4A] text-white animate-pulse':'bg-white border'}`}>{listening?'■':'🎙'}</button>
            </div>
            <button onClick={goToMode} disabled={!have.trim()} className="mt-10 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold disabled:opacity-30">Next →</button>
          </main>
        )}

        {step==='mode' && (
          <main className="px-6 pt-12 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.9]">How are we<br/>cooking tonight?</h1>
            <div className="mt-10 grid gap-4">
              <button onClick={()=>chooseMode('quick')} className="text-left rounded-[24px] bg-white border p-6">
                <p className="text-[11px] tracking-widest font-bold opacity-40">MAKE IT QUICK</p>
                <p className="text-[22px] font-bold mt-2">25 min · low effort</p>
                <p className="text-[13px] text-[#7D846E] mt-1">One pan, max flavour, minimal cleanup.</p>
              </button>
              <button onClick={()=>chooseMode('relaxed')} className="text-left rounded-[24px] bg-[#1A1A1A] text-white p-6">
                <p className="text-[11px] tracking-widest font-bold opacity-40 text-white/60">I'VE GOT TIME</p>
                <p className="text-[22px] font-bold mt-2">Up to 60 min · proper cooking</p>
                <p className="text-[13px] text-white/70 mt-1">Roasting, slow browning, deeper flavour.</p>
              </button>
            </div>
            <button onClick={()=>setStep('inventory')} className="mt-6 w-full text-[12px] opacity-40">← Back</button>
          </main>
        )}

        {step==='thinking' && (
          <main className="px-6 pt-20 pb-10 flex flex-col items-center text-center">
            <DoneGesture state="thinking"/>
            <h2 className="mt-8 text-[24px] font-bold">AKCHALLY is deciding...</h2>
            <p className="mt-2 text-[13px] text-[#7D846E]">Choosing what belongs together, not using everything.</p>
          </main>
        )}

        {step==='result' && v1 && (
          <main className="px-6 pt-8 pb-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="text-[11px] tracking-widest font-bold opacity-40">WE'RE MAKING THIS · {v1.winner?.family?.toUpperCase()}</span></div>
              <button onClick={()=>speak(v1.public?.spoken_intro || v1.recipe?.spoken_intro)} className={`w-8 h-8 rounded-full border flex items-center justify-center ${speaking?'bg-[#C56A4A] text-white':'bg-white'}`}>🔊</button>
            </div>
            <h2 className="mt-4 text-[30px] font-bold leading-[0.9]">{v1.public?.title || v1.recipe?.title}</h2>
            <p className="mt-3 text-[13px] text-[#7D846E]">{v1.public?.meta || v1.recipe?.meta}</p>
            <div className="mt-4 rounded-[16px] bg-[#EDE8DF] p-4">
              <p className="text-[10px] font-bold tracking-widest opacity-40">USES</p>
              <p className="text-[13px] font-medium mt-1">{v1.public?.uses?.join(', ') || v1.winner?.use?.join(', ')}</p>
              {(v1.public?.saves_for_later?.length>0 || v1.winner?.leave_out?.length>0) && (
                <>
                  <p className="text-[10px] font-bold tracking-widest opacity-40 mt-3">SAVING FOR LATER</p>
                  <p className="text-[11px] opacity-60 mt-1">{(v1.public?.saves_for_later || v1.winner?.leave_out || []).slice(0,4).join(', ')}</p>
                </>
              )}
            </div>
            <div className="mt-6 rounded-[20px] bg-white border p-5">
              {(v1.public?.steps || v1.recipe?.steps)?.map((s,i)=><p key={i} className="text-[14px] py-2.5 border-b last:border-0 border-black/5"><span className="font-bold mr-2">{i+1}.</span>{s}</p>)}
            </div>
            <button onClick={startCook} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">Cook this →</button>
          </main>
        )}

        {step==='cook' && cookSession && (
          <div className="flex-1 flex flex-col pb-10">
            <div className="px-6 py-4 flex justify-between items-center">
              <button onClick={()=>setStep('result')} className="text-[12px]">← Back</button>
              <div className="flex items-center gap-2">
                <button onClick={()=>speak(cookSession.active_step_text)} className={`px-3 py-1 rounded-full text-[11px] font-bold border ${speaking?'bg-[#C56A4A] text-white':'bg-white'}`}>🔊 Speak</button>
                <button onClick={()=>setHelpOpen(true)} className="px-4 py-1.5 rounded-full bg-[#C56A4A] text-white text-[11px] font-bold tracking-widest">HELP!</button>
              </div>
            </div>
            <div className="px-6 pt-2">
              <div className="rounded-[28px] bg-[#1A1A1A] text-white p-6 min-h-[160px]">
                <p className="text-[11px] opacity-50 tracking-widest">NOW · STEP {cookStep+1}</p>
                <p className="text-[22px] font-semibold mt-3 leading-[1.2]">{cookSession.active_step_text}</p>
                {cookSession.substitutions.length>0 && <p className="text-[11px] mt-4 opacity-60">Subs: {cookSession.substitutions.join(', ')}</p>}
                {cookSession.active_timers.length>0 && <div className="mt-3 flex gap-2 flex-wrap">{cookSession.active_timers.map((t,i)=><span key={i} className="px-2 py-1 rounded-full bg-white/20 text-[11px]">⏱ {t.label} {t.minutes}m</span>)}</div>}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button disabled={cookStep===0} onClick={()=>{const prev=cookStep-1; setCookStep(prev); setCookSession(s=>({...s, current_step:prev, active_step_text:s.all_steps[prev]}))}} className="h-12 rounded-full border bg-white disabled:opacity-30">Prev</button>
                <button onClick={nextCookStep} className="h-12 rounded-full bg-[#1A1A1A] text-white font-bold">{cookStep===cookSession.all_steps.length-1?'Done ✓':'Next →'}</button>
              </div>
              {helpAnswer && (
                <div className="mt-6 rounded-[20px] bg-white border border-[#C56A4A]/30 p-5">
                  <p className="text-[10px] font-bold tracking-widest text-[#C56A4A]">{helpAnswer.type?.toUpperCase()} · QUICK ACTION</p>
                  <p className="text-[14px] font-bold mt-1">{helpAnswer.quick_action}</p>
                  <p className="text-[13px] mt-2 leading-[1.4]">{helpAnswer.spoken_response}</p>
                  {helpAnswer.updated_current_step && <p className="text-[11px] mt-3 opacity-60">Updated step: {helpAnswer.updated_current_step}</p>}
                </div>
              )}
            </div>

            {/* HELP PANEL */}
            {helpOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end">
                <div className="w-full bg-[#FAF7F1] rounded-t-[28px] max-w-[480px] mx-auto p-6 pb-10 max-h-[85vh] overflow-auto">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2"><DoneGesture state={helpThinking?'thinking':helpListening?'listening':speaking?'speaking':'idle'}/><span className="font-bold">HELP!</span><span className="text-[11px] opacity-40">· {cookSession.recipe_title} · Step {cookStep+1}</span></div>
                    <button onClick={()=>setHelpOpen(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center">✕</button>
                  </div>

                  <div className="rounded-[16px] bg-[#EDE8DF] p-3 text-[11px] opacity-70">
                    <p>Context: {cookSession.recipe_title} · Step {cookStep+1}: {cookSession.active_step_text.slice(0,80)}...</p>
                    <p>Using: {cookSession.selected_ingredients.join(', ')}</p>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    {["My sauce is too thick","Can I use yoghurt instead?","Potatoes still hard","Too much salt","Can I leave this 10 minutes?","What does brown hard mean?"].map(q=>(
                      <button key={q} onClick={()=>{setHelpQ(q); askHelp(q)}} className="px-3 py-1.5 rounded-full bg-white border text-[11px]">{q}</button>
                    ))}
                  </div>

                  <div className="mt-6 relative">
                    <textarea value={helpQ} onChange={e=>setHelpQ(e.target.value)} placeholder="Ask anything — my sauce is too thick, can I use yoghurt instead..." className="w-full min-h-[80px] p-4 pr-12 rounded-[20px] bg-white border text-[14px] outline-none" />
                    <button onClick={startHelpVoice} className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center ${helpListening?'bg-[#C56A4A] text-white animate-pulse':'bg-black/5'}`}>{helpListening?'■':'🎙'}</button>
                  </div>

                  <button onClick={()=>askHelp()} disabled={!helpQ.trim() || helpThinking} className="mt-4 w-full h-12 rounded-full bg-[#1A1A1A] text-white font-bold disabled:opacity-30 flex items-center justify-center gap-2">
                    {helpThinking? <><DoneGesture state="thinking"/><span>Fixing...</span></> : <>Ask Akchally →</>}
                  </button>

                  {helpAnswer && (
                    <div className="mt-6 rounded-[20px] bg-white border p-5">
                      <p className="text-[10px] font-bold tracking-widest text-[#C56A4A]">{helpAnswer.type?.toUpperCase()}</p>
                      <p className="text-[13px] font-bold mt-2">Do this now: {helpAnswer.quick_action}</p>
                      <p className="text-[14px] mt-3 leading-[1.4]">{helpAnswer.spoken_response}</p>
                      <div className="mt-4 flex gap-2">
                        <button onClick={()=>speak(helpAnswer.spoken_response)} className="px-3 py-1.5 rounded-full bg-black text-white text-[11px]">🔊 Replay</button>
                        <button onClick={()=>{setHelpOpen(false); setHelpQ(""); setHelpAnswer(null)}} className="px-3 py-1.5 rounded-full bg-[#EDE8DF] text-[11px]">Got it, continue cooking →</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes wiggle{0%,100%{transform:rotate(-12deg) translateX(0)}50%{transform:rotate(-12deg) translateX(4px)}}`}</style>
    </div>
  )
}
