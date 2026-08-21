import { useState, useEffect, useRef } from 'react'

function DoneGesture({ state }){
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-[22px] h-[7px] rounded-full bg-[#7D846E] origin-left transition-all ${state==='listening'?'animate-pulse':''} ${state==='thinking'?'animate-[wiggle_1.2s_ease-in-out_infinite]':''} ${state==='speaking'?'animate-[wiggle_0.6s_ease-in-out_infinite]':''}`} style={{transform:'rotate(-12deg)'}} />
      <div className={`w-[8px] h-[8px] rounded-full bg-[#C56A4A] transition-all ${state==='listening'?'animate-ping':''} ${state==='thinking'?'animate-pulse':''} ${state==='speaking'?'animate-ping':''}`} />
    </div>
  )
}

export default function App(){
  const [isAppView, setIsAppView] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [platform, setPlatform] = useState('android')
  const [have, setHave] = useState("eggs, butter, garlic, pasta, spinach that's about to die")
  const [effort, setEffort] = useState(0)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [result, setResult] = useState(null)
  const [cookStep, setCookStep] = useState(0)
  const [cookMode, setCookMode] = useState(false)
  const recRef = useRef(null)

  useEffect(()=>{
    if(/iPhone|iPad|iPod/.test(navigator.userAgent)) setPlatform('ios')
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if(standalone || localStorage.getItem('akchally_installed')==='true') setIsAppView(true)
    const handler = (e)=>{ e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', ()=>{ localStorage.setItem('akchally_installed','true'); setIsAppView(true) })
    return ()=>window.removeEventListener('beforeinstallprompt', handler)
  },[])

  const handleDownload = async ()=>{
    if(deferredPrompt){ deferredPrompt.prompt(); const {outcome}=await deferredPrompt.userChoice; if(outcome==='accepted'){ setIsAppView(true); localStorage.setItem('akchally_installed','true') } }
    else setShowInstallHelp(true)
  }

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
    try{ await navigator.mediaDevices.getUserMedia({audio:true}) }catch(e){ alert('Mic blocked — Chrome → lock → Allow microphone'); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){ alert('Use CHROME for voice'); return }
    if(listening){ recRef.current?.stop(); setListening(false); return }
    const rec = new SR(); rec.lang='en-US'; rec.interimResults=true; rec.continuous=false
    rec.onstart=()=>{ setListening(true); setHave('Listening...') }
    rec.onresult=(e)=>{ let t=''; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript+' '; setHave(t.trim()) }
    rec.onend=()=>setListening(false)
    recRef.current=rec; rec.start()
  }

  // REAL LOGIC - USES ONLY WHAT YOU TYPED, NO HALLUCINATED SPINACH
  const sortDinner = async ()=>{
    window.speechSynthesis.cancel()
    if(!have.trim()){ alert('Tell me what you got first'); return }
    setThinking(true)

    // Try real backend if you have it deployed (set VITE_API_URL in Vercel env)
    const API = import.meta.env.VITE_API_URL
    if(API){
      try{
        const r = await fetch(`${API}/api/recipe`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({transcript:have, timeVibe: effort===0?'bare minimum':effort===1?'normal':'feel like cooking'})})
        const data = await r.json()
        if(data.recipes && data.recipes[0]){
          const first = data.recipes[0]
          const real = {
            title: first.title,
            meta: `${first.time || '20 min'} · using ${have.split(',').slice(0,2).join(' + ')}`,
            speak: data.spoken_response || `We're making ${first.title}. ${first.time || ''}`,
            steps: first.steps,
            used: first.ingredients_used || have
          }
          setResult(real); setThinking(false); speak(real.speak); return
        }
      }catch(e){ console.log('backend fail, falling back to local', e) }
    }

    // LOCAL FALLBACK THAT RESPECTS INGREDIENTS - NO LIES
    setTimeout(()=>{
      const raw = have.toLowerCase()
      const has = (w)=> raw.includes(w)
      const ingredients = have.split(',').map(s=>s.trim()).filter(Boolean)
      const main = ingredients[0] || 'what you got'
      const second = ingredients[1] || ''

      let title, meta, steps, speakText

      if(has('pasta') || has('noodle')){
        if(has('garlic') && (has('spinach') || has('greens'))){
          title = `Creamy garlic ${has('spinach')?'spinach':''} pasta`.replace('  ',' ').trim()
        } else if(has('egg')){
          title = has('butter') ? 'Garlic butter pasta with egg' : 'Pasta with egg'
        } else {
          title = `${main} garlic pasta`
        }
        meta = `${effort===0?'20 min':'28 min'} · one pan · using ${ingredients.slice(0,2).join(' + ')}`
        steps = [
          `Boil water, salt it hard. Cook ${has('pasta')?'pasta':'noodles'} — 9 min.`,
          `Low heat, melt ${has('butter')?'butter':'oil'}, add ${has('garlic')?'garlic, sliced':''} ${has('onion')?'and onion':''} — don't burn.`,
          `Scoop 2 ladles starchy water into pan — that's your sauce from what you've got.`,
          `Drain, toss everything: ${have}. ${has('spinach') || has('greens') ? 'Wilt greens last 60 seconds.' : 'Toss until glossy.'}`,
          `Taste. Pepper, maybe lemon if you have. Done.`
        ]
      } else if(has('egg')){
        title = second ? `${main} + ${second} eggs` : `Eggs with ${main}`
        meta = `${effort===0?'12 min':'22 min'} · one pan · using only what you typed`
        steps = [
          `Heat pan, ${has('butter')?'butter':'oil'} medium.`,
          `Add ${ingredients.filter(i=>!i.toLowerCase().includes('egg')).join(', ')} — soften 3-4 min.`,
          `Crack ${has('egg')?'eggs':'eggs if you have'} on top, lid on 4 min.`,
          `Season. Eat straight from pan.`
        ]
      } else if(has('chicken') || has('beef') || has('bangers') || has('sausage')){
        const protein = has('bangers')?'bangers':has('chicken')?'chicken':has('beef')?'beef':'protein'
        title = `${protein} + ${second || 'what you have'} pan`
        meta = `${effort===0?'18 min':'30 min'} · using ${have}`
        steps = [
          `Hot pan, oil, ${protein} in — brown hard 5 min.`,
          `Add ${ingredients.filter(i=>!i.toLowerCase().includes(protein)).join(', ') || 'everything else'} — toss.`,
          `Splash water, lid 3 min to steam through.`,
          `Season. Done.`
        ]
      } else {
        title = `${main} ${second?'+ '+second:''} — sorted`
        meta = `Using ONLY: ${have} · ${effort===0?'bare minimum':effort===1?'normal':'feel like cooking'}`
        steps = [
          `You have: ${have}.`,
          `Heat ${has('butter')?'butter':'oil'} in pan, add hardest veg first.`,
          `Add rest in order of time it needs.`,
          `Season as you go. Water is your friend for sauce.`,
          `Taste and stop. That's dinner handled.`
        ]
      }

      speakText = `We're making ${title}. ${meta}. Using only what you said — ${have}. Want to cook it?`

      setResult({title, meta, steps, speak: speakText, used: have})
      setThinking(false)
      setCookStep(0)
      setTimeout(()=>speak(speakText), 200)
    }, 700)
  }

  const gestureState = listening? 'listening' : thinking? 'thinking' : speaking? 'speaking' : result? 'done' : 'idle'

  if(!isAppView){
    return (
      <div className="min-h-screen bg-[#FAF7F1] flex justify-center">
        <div className="w-full max-w-[440px] px-6 py-10 flex flex-col min-h-screen">
          <header className="flex items-center gap-2"><DoneGesture state="idle"/><span className="font-bold ml-1 tracking-tight">akchally</span></header>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-[112px] h-[112px] rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-black/5 flex items-center justify-center"><DoneGesture state="idle"/></div>
            <h1 className="mt-8 text-[46px] font-bold leading-[0.9] tracking-tight text-[#1A1A1A]">Gets dinner<br/>handled.</h1>
            <p className="mt-4 text-[16px] text-[#7D846E] max-w-[280px]">Not another recipe app. Tell me what you've got, I sort dinner out.</p>
            <button onClick={handleDownload} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold tracking-widest">DOWNLOAD</button>
            <button onClick={()=>setIsAppView(true)} className="mt-4 text-[12px] underline opacity-40">Already have it? Open app</button>
          </div>
          {showInstallHelp && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur flex items-end p-4 z-50">
              <div className="w-full bg-white rounded-[28px] p-6 max-w-[400px] mx-auto">
                <h3 className="font-bold">Install Akchally</h3>
                <p className="mt-3 text-[14px]">{platform==='ios'?'Tap Share → Add to Home Screen':'Tap Add to Home Screen when prompted.'}</p>
                <button onClick={()=>{setShowInstallHelp(false); setIsAppView(true)}} className="mt-5 w-full h-12 rounded-full bg-black text-white font-bold">Got it</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1A1A1A] flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col">
        <header className="px-6 pt-10 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="font-bold tracking-tight text-[15px] ml-1">akchally</span></div>
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center text-[14px]">○</div>
        </header>

        {!cookMode && !result ? (
          <main className="px-6 pt-8 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.95] tracking-tight">What are we<br/>making?</h1>
            <p className="mt-3 text-[15px] leading-[1.4] text-[#7D846E]">Tell me what you've got.<br/>I'll sort the rest.</p>
            <div className="mt-8 relative">
              <textarea value={have} onChange={e=>setHave(e.target.value)} placeholder="eggs, butter, garlic, pasta, spinach that's about to die" className={`w-full min-h-[112px] p-5 pr-12 rounded-[20px] bg-[#EDE8DF] border text-[16px] leading-[1.4] outline-none transition-all ${listening?'border-[#C56A4A] bg-white shadow-[0_0_0_3px_rgba(197,106,74,0.15)]':'border-black/[0.06]'}`} />
              <button onClick={startVoice} className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${listening?'bg-[#C56A4A] text-white animate-pulse scale-110':'bg-white border border-black/10'}`}>{listening?'●':'🎙'}</button>
            </div>
            <div className={`mt-3 flex items-center gap-2 text-[12px] font-medium ${listening?'text-[#C56A4A]':'text-[#7D846E]'}`}>
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${listening?'bg-[#C56A4A] text-white animate-pulse':''}`}>{listening?'●':'🎙'}</span>
              {listening?'Listening... speak now':'or just tell me — tap mic'}
            </div>
            <div className="mt-10">
              <p className="text-[11px] tracking-[0.14em] font-bold opacity-40">HOW MUCH EFFORT?</p>
              <div className="mt-3 p-1 rounded-full bg-[#EDE8DF] border border-black/5 flex">
                {[{k:0,l:'Bare minimum'},{k:1,l:'Normal'},{k:2,l:'Feel like cooking'}].map(o=>(
                  <button key={o.k} onClick={()=>setEffort(o.k)} className={`flex-1 h-[36px] rounded-full text-[12.5px] font-semibold transition-all ${effort===o.k?'bg-[#1A1A1A] text-white shadow-sm':'text-black/60'}`}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex gap-2 flex-wrap">
              <button className="px-3 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-medium">Tonight · Any time</button>
              <button className="px-3 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-medium">Use what's here</button>
              <button className="px-3 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-medium">2 people</button>
            </div>
            <button onClick={sortDinner} className="mt-10 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold text-[15px] flex items-center justify-center gap-2">
              {thinking? <><DoneGesture state="thinking"/><span className="ml-2">Sorting...</span></> : <>Sort dinner out →</>}
            </button>
            <div className="mt-10 flex flex-col items-center gap-3">
              <button className="flex items-center gap-2 text-[12px] text-black/50"><DoneGesture state="idle"/> Take a fridge photo</button>
              <p className="text-[11px] opacity-30">Last time · {have.slice(0,30)} →</p>
            </div>
          </main>
        ) : !cookMode && result ? (
          <main className="px-6 pt-12 pb-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="text-[11px] tracking-[0.14em] font-bold opacity-40">WE'RE MAKING THIS</span></div>
              <button onClick={()=>speak(result.speak)} className={`w-8 h-8 rounded-full flex items-center justify-center border ${speaking?'bg-[#C56A4A] text-white animate-pulse':'bg-white'}`}>🔊</button>
            </div>
            <h2 className="text-[30px] font-bold leading-[0.95] tracking-tight">{result.title}</h2>
            <p className="mt-3 text-[13px] text-[#7D846E]">{result.meta}</p>
            <div className="mt-2 text-[11px] opacity-40">Using: {result.used}</div>
            <div className="mt-6 rounded-[20px] bg-white border p-5">
              {result.steps.slice(0,2).map((s,i)=><p key={i} className="text-[14px] leading-[1.4] py-2 border-b last:border-0 border-black/5"><span className="font-bold mr-2">{i+1}.</span>{s}</p>)}
              <p className="text-[11px] opacity-40 mt-3">+ {result.steps.length-2} more steps in cook mode</p>
            </div>
            <button onClick={()=>{speak(`Let's cook ${result.title}. Step 1: ${result.steps[0]}`); setCookMode(true)}} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">Cook this →</button>
            <button onClick={()=>{window.speechSynthesis.cancel(); setResult(null)}} className="mt-3 w-full text-[12px] opacity-50">Not feeling it? Give me another</button>
          </main>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center">
              <button onClick={()=>{window.speechSynthesis.cancel(); setCookMode(false)}} className="text-[12px]">← Back</button>
              <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="text-[11px] font-bold tracking-widest">{cookStep+1}/{result.steps.length}</span></div>
              <button onClick={()=>speak(result.steps[cookStep])} className={`px-3 py-1 rounded-full text-[11px] font-bold ${speaking?'bg-[#C56A4A] text-white':'bg-white border'}`}>🔊 Speak</button>
            </div>
            <div className="px-6 pt-6">
              <div className="rounded-[28px] bg-[#1A1A1A] text-white p-6 min-h-[160px]">
                <p className="text-[11px] opacity-50 tracking-widest">NOW</p>
                <p className="text-[22px] font-semibold leading-[1.2] mt-3">{result.steps[cookStep]}</p>
                <button onClick={()=>speak(result.steps[cookStep])} className="mt-4 text-[11px] opacity-60 underline">Replay step 🔊</button>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button disabled={cookStep===0} onClick={()=>setCookStep(s=>Math.max(0,s-1))} className="h-12 rounded-full border bg-white disabled:opacity-30">Prev</button>
                <button onClick={()=>{if(cookStep<result.steps.length-1){const n=cookStep+1; setCookStep(n); speak(result.steps[n])} else {speak('Done! You did it.'); setResult(null); setCookMode(false)}}} className="h-12 rounded-full bg-[#1A1A1A] text-white font-bold">{cookStep===result.steps.length-1?'Done ✓':'Next →'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes wiggle{0%,100%{transform:rotate(-12deg) translateX(0)}50%{transform:rotate(-12deg) translateX(4px)}}`}</style>
    </div>
  )
}
