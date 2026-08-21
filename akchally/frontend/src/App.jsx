import { useState, useEffect, useRef } from 'react'

function DoneGesture({ state }){
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-[22px] h-[7px] rounded-full bg-[#7D846E] origin-left ${state==='listening'?'animate-pulse':''} ${state==='thinking'?'animate-[wiggle_1.2s_ease-in-out_infinite]':''} ${state==='speaking'?'animate-[wiggle_0.6s_ease-in-out_infinite]':''}`} style={{transform:'rotate(-12deg)'}} />
      <div className={`w-[8px] h-[8px] rounded-full bg-[#C56A4A] ${state==='listening'?'animate-ping':''} ${state==='thinking'?'animate-pulse':''} ${state==='speaking'?'animate-ping':''}`} />
    </div>
  )
}

function cleanAndPick(haveText){
  const raw = haveText.toLowerCase()
  // Split by comma, and, plus, with, for, &, +, ·
  let parts = raw.split(/,| and | plus | with | & | \+ | for | · |\n/).map(s=>s.trim()).filter(Boolean)
  
  const cleaned = parts.map(p=>{
    return p
      .replace(/\d+/g,'')
      .replace(/three|two|one|some|slices|slice|pieces|piece|handful|leftover|left over|old|about to die|thats|that's/g,'')
      .replace(/slices of a|slices of|of a|of/g,'')
      .replace(/\s+/g,' ')
      .trim()
  }).filter(s=>s.length>2)

  // Categorize
  const is = (word, list)=> list.some(k=> word.includes(k))
  const buckets = { protein:[], carb:[], veg:[], dairy:[], ignore:[] }

  cleaned.forEach(w=>{
    if(is(w, ['juice','coke','milkshake','water','soda','beer'])){ buckets.ignore.push(w); return }
    if(is(w, ['chicken','ham','egg','bacon','sausage','beef','pork','fish','basha','steak','turkey'])) buckets.protein.push(w)
    else if(is(w, ['potato','pizza','pasta','rice','bread','noodle','tortilla','couscous'])) buckets.carb.push(w)
    else if(is(w, ['tomato','mushroom','garlic','onion','spinach','pepper','capsicum','zucchini','courgette','broccoli','peas','carrot','herb','parsley','coriander'])) buckets.veg.push(w)
    else if(is(w, ['cheese','butter','cream','yogurt','yoghurt','mozzarella','cheddar'])) buckets.dairy.push(w)
    else if(is(w, ['spice','spices','chilli','chili','salt','pepper','curry','masala'])) buckets.veg.push(w) // treat as flavour
    else buckets.veg.push(w) // default to usable
  })

  // Pick best combo - max 4 ingredients that make sense together
  const protein = buckets.protein[0] || null
  const carb = buckets.carb[0] || null
  const veg1 = buckets.veg[0] || null
  const veg2 = buckets.veg[1] || null
  const dairy = buckets.dairy[0] || null

  const picks = [protein, carb, veg1, dairy].filter(Boolean).slice(0,4)
  if(picks.length<2) picks.push(...buckets.veg.slice(0,2))

  const leftovers = cleaned.filter(c=> !picks.some(p=> c.includes(p) || p.includes(c)) && !buckets.ignore.includes(c))

  return { picks, leftovers, buckets, cleaned }
}

function makeDelicious(haveText, effort){
  const { picks, leftovers, buckets } = cleanAndPick(haveText)
  const has = (k)=> haveText.toLowerCase().includes(k)

  let title, meta, steps, speak

  const protein = buckets.protein[0] || 'egg'
  const carb = buckets.carb[0] || ''
  const veg = buckets.veg.slice(0,2).join(' & ')
  const cheese = buckets.dairy.find(d=>d.includes('cheese'))

  // SMART TITLE - not concatenation
  if(carb && carb.includes('pizza')){
    const topping = [protein, buckets.veg[0]].filter(Boolean).join(' & ')
    title = topping ? `Loaded pizza with ${topping}${cheese ? ' & cheese' : ''}` : `Crispy leftover pizza pan`
  } else if(carb && carb.includes('potato')){
    if(protein && has('chicken')) title = `Crispy chicken, potato & mushroom hash${cheese ? ' with cheese' : ''}`
    else if(protein) title = `Potato & ${protein} hash with ${veg || 'garlic'}`
    else title = `Crispy garlicky potatoes with ${veg || 'herbs'}`
  } else if(carb && carb.includes('pasta')){
    title = protein ? `${protein} pasta with ${veg || 'garlic'}` : `Garlic ${veg ? veg + ' ' : ''}pasta`
  } else if(protein){
    if(buckets.carb.length) title = `${protein} + ${buckets.carb[0]} — sorted`
    else title = `One-pan ${protein} with ${veg || 'tomatoes'}`
  } else {
    title = `${picks.slice(0,2).join(' & ')} — sorted`
  }

  title = title.replace(/\b\w/g, l=>l.toUpperCase()).replace(' & ',' & ').trim()
  if(title.length>45) title = title.split(' With ')[0]

  meta = `${effort===0?'12 min':'22 min'} · one pan · uses ${picks.join(', ')}`
  
  // STEPS that only use picks, mention leftovers as optional
  steps = [
    `You said: ${haveText}. We're using: ${picks.join(', ')}${leftovers.length?` — saving ${leftovers.slice(0,2).join(', ')} for next time.`:'.'}`,
    `Hot pan, ${has('butter')?'butter':'oil'}. ${carb ? `Crisp ${carb} first 4 min.` : `${protein ? `Brown ${protein} hard 4 min.` : 'Veg in first.'}`}`,
    `${veg ? `Add ${veg} + ${has('garlic')?'garlic':''} — 3 min until soft.` : 'Add veg — 3 min.'} ${cheese ? `Then ${cheese} to melt.` : ''}`,
    `Season — ${has('spice')||has('spices')?'use your spices':'salt, pepper, lemon if you have'}. Toss.`,
    `Done. Not the whole fridge, just the good bits.`
  ]

  speak = `We're making ${title}. Uses ${picks.join(', ')}. ${leftovers.length?`I'm leaving ${leftovers.slice(0,2).join(' and ')} out — that would be too much.`:''} ${effort===0?'Bare minimum, 12 minutes, one pan.':''} Want to cook it?`

  return { title, meta, steps, speak, picks, leftovers, used: picks.join(', ') }
}

export default function App(){
  const [isAppView, setIsAppView] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [platform, setPlatform] = useState('android')
  const [have, setHave] = useState("")
  const [effort, setEffort] = useState(0)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [result, setResult] = useState(null)
  const [cookStep, setCookStep] = useState(0)
  const [cookMode, setCookMode] = useState(false)
  const recRef = useRef(null)
  const isListeningRef = useRef(false)

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
    try{ await navigator.mediaDevices.getUserMedia({audio:true}) }catch(e){ alert('Mic blocked — Chrome → lock → Allow'); return }
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
    rec.onerror=(e)=>{ if(e.error==='no-speech') return; isListeningRef.current=false; setListening(false) }
    recRef.current=rec; try{rec.start()}catch{}
  }

  const sortDinner = async ()=>{
    window.speechSynthesis.cancel()
    if(!have.trim()){ alert('Tell me what you got first'); return }
    setThinking(true)
    const API = import.meta.env.VITE_API_URL
    if(API){
      try{
        const r = await fetch(`${API}/api/recipe`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({transcript:have, timeVibe: effort===0?'bare minimum':effort===1?'normal':'feel like cooking'})})
        const data = await r.json()
        if(data.recipes?.[0]){
          const f=data.recipes[0]
          const real={title:f.title, meta:`${f.time||'15 min'} · uses ${f.ingredients_used?.slice(0,3).join(', ')||'some of what you have'}`, speak:data.spoken_response||`We're making ${f.title}`, steps:f.steps, used:f.ingredients_used?.join(', ')||have, leftovers:[]}
          setResult(real); setThinking(false); speak(real.speak); return
        }
      }catch{}
    }
    setTimeout(()=>{
      const r = makeDelicious(have, effort)
      setResult(r); setThinking(false); setCookStep(0)
      setTimeout(()=>speak(r.speak), 200)
    }, 600)
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
              <button onClick={startVoice} className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${listening?'bg-[#C56A4A] text-white animate-pulse scale-110':'bg-white border border-black/10'}`}>{listening?'■':'🎙'}</button>
            </div>
            <div className={`mt-3 flex items-center gap-2 text-[12px] font-medium ${listening?'text-[#C56A4A]':'text-[#7D846E]'}`}>
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${listening?'bg-[#C56A4A] text-white animate-pulse':''}`}>{listening?'■':'🎙'}</span>
              {listening?'Standby — keep talking, tap ■ to stop':'or just tell me — tap mic'}
            </div>
            <div className="mt-10">
              <p className="text-[11px] tracking-[0.14em] font-bold opacity-40">HOW MUCH EFFORT?</p>
              <div className="mt-3 p-1 rounded-full bg-[#EDE8DF] border border-black/5 flex">
                {[{k:0,l:'Bare minimum'},{k:1,l:'Normal'},{k:2,l:'Feel like cooking'}].map(o=>(
                  <button key={o.k} onClick={()=>setEffort(o.k)} className={`flex-1 h-[36px] rounded-full text-[12.5px] font-semibold transition-all ${effort===o.k?'bg-[#1A1A1A] text-white shadow-sm':'text-black/60'}`}>{o.l}</button>
                ))}
              </div>
            </div>
            <button onClick={sortDinner} className="mt-10 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold text-[15px] flex items-center justify-center gap-2">
              {thinking? <><DoneGesture state="thinking"/><span className="ml-2">Sorting...</span></> : <>Sort dinner out →</>}
            </button>
          </main>
        ) : !cookMode && result ? (
          <main className="px-6 pt-12 pb-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="text-[11px] tracking-[0.14em] font-bold opacity-40">WE'RE MAKING THIS</span></div>
              <button onClick={()=>speak(result.speak)} className={`w-8 h-8 rounded-full flex items-center justify-center border ${speaking?'bg-[#C56A4A] text-white animate-pulse':'bg-white'}`}>🔊</button>
            </div>
            <h2 className="text-[28px] font-bold leading-[0.95] tracking-tight">{result.title}</h2>
            <p className="mt-3 text-[13px] text-[#7D846E]">{result.meta}</p>
            <div className="mt-2 text-[11px] leading-[1.4]"><span className="font-bold opacity-60">Uses:</span> <span className="opacity-70">{result.used}</span>{result.leftovers?.length ? <span className="opacity-40"> · Saving {result.leftovers.slice(0,2).join(', ')} for later</span>:null}</div>
            <div className="mt-6 rounded-[20px] bg-white border p-5">
              {result.steps.slice(0,2).map((s,i)=><p key={i} className="text-[14px] leading-[1.4] py-2 border-b last:border-0 border-black/5"><span className="font-bold mr-2">{i+1}.</span>{s}</p>)}
              <p className="text-[11px] opacity-40 mt-3">+ {result.steps.length-2} more steps in cook mode</p>
            </div>
            <button onClick={()=>{speak(`Let's cook ${result.title}. Step 1: ${result.steps[0]}`); setCookMode(true)}} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">Cook this →</button>
            <button onClick={()=>{window.speechSynthesis.cancel(); setResult(null)}} className="mt-3 w-full text-[12px] opacity-50">Not feeling it? Give me another (picks different combo)</button>
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
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button disabled={cookStep===0} onClick={()=>setCookStep(s=>Math.max(0,s-1))} className="h-12 rounded-full border bg-white disabled:opacity-30">Prev</button>
                <button onClick={()=>{if(cookStep<result.steps.length-1){const n=cookStep+1; setCookStep(n); speak(result.steps[n])} else {speak('Done!'); setResult(null); setCookMode(false)}}} className="h-12 rounded-full bg-[#1A1A1A] text-white font-bold">{cookStep===result.steps.length-1?'Done ✓':'Next →'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes wiggle{0%,100%{transform:rotate(-12deg) translateX(0)}50%{transform:rotate(-12deg) translateX(4px)}}`}</style>
    </div>
  )
}
