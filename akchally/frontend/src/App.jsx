import { useState, useRef } from 'react'

function DoneGesture({ state, size='small' }){
  const isLarge = size==='large'
  return (
    <div className={`flex items-center gap-1.5 ${isLarge?'opacity-[0.02]':''}`}>
      <div className={`${isLarge?'w-[120px] h-[28px]':'w-[22px] h-[7px]'} rounded-full bg-[#7D846E] origin-left ${state==='listening'?'animate-pulse':''} ${state==='thinking'?'animate-[wiggle_1.2s_ease-in-out_infinite]':''}`} style={{transform:'rotate(-12deg)'}} />
      <div className={`${isLarge?'w-[42px] h-[42px]':'w-[8px] h-[8px]'} rounded-full bg-[#C56A4A] ${state==='listening'?'animate-ping':''}`} />
    </div>
  )
}

// === REAL DIVERSE LOCAL FALLBACK - FOLLOWS YOUR HIERARCHY ===
function cleanIngredientList(raw){
  // Remove speech artifacts like "let's just", "theater flower", etc.
  return raw.toLowerCase()
    .replace(/let's just|lets just|theater flower|theatre flower|just|i've got|i have got|i got|we have/g,'')
    .split(/,| and | plus | with | & | \+ | for | \n/)
    .map(s=> s.replace(/three|two|one|some|slices|slice|old|leftover|left over|about to die|that need using|needs using|a bit of|a little/g,'').replace(/slices of a|slices of|of a|of/g,'').replace(/\s+/g,' ').trim())
    .filter(s=> s.length>2 && !['and','the','for','with'].includes(s))
}

function localThinkDinner(transcript, mode){
  const items = cleanIngredientList(transcript)
  if(items.length===0) items.push('eggs')
  
  const has = (keys)=> items.some(i=> keys.some(k=> i.includes(k)))
  const find = (keys)=> items.find(i=> keys.some(k=> i.includes(k)))
  const findAll = (keys)=> items.filter(i=> keys.some(k=> i.includes(k)))

  // Detect intent
  const required = items.filter(i=> transcript.toLowerCase().includes(`need to use ${i}`) || transcript.toLowerCase().includes(`must use ${i}`) || transcript.toLowerCase().includes(`definitely use`))
  
  // Dish family detection - DIVERSE, not always potatoes
  let family, selected, title, steps, time

  const proteins = findAll(['chicken','ham','egg','bacon','sausage','beef','fish','pork','turkey','chickpea','beans','lentil'])
  const carbs = findAll(['pasta','rice','potato','bread','noodle','pizza','tortilla','couscous','quinoa'])
  const veg = findAll(['tomato','mushroom','garlic','onion','spinach','pepper','zucchini','broccoli','carrot','peas','yogurt','yoghurt','cheese','olive'])
  
  time = mode==='quick' ? '18 min' : '35 min'

  if(has(['pasta','noodle'])){
    const pasta = find(['pasta','noodle']) || 'pasta'
    const protein = proteins[0] || ''
    const v = veg.slice(0,2).join(' & ') || 'garlic'
    const cheese = has(['cheese','yogurt','yoghurt']) ? find(['cheese','yogurt','yoghurt']) : ''
    family = 'pasta'
    selected = [pasta, protein, ...veg.slice(0,2), cheese].filter(Boolean).slice(0,4)
    title = protein ? `${protein.charAt(0).toUpperCase()+protein.slice(1)} & ${v} ${pasta}` : `Garlic ${v} ${pasta}${cheese?` with ${cheese}`:''}`
    steps = [
      `Boil water, salt hard. Cook ${pasta} 9 min.`,
      `Low heat, oil, ${v} in — 3 min, don't burn.`,
      `${protein?`Add ${protein} to warm through. `:''}Scoop 2 ladles starchy water into pan.`,
      `Drain, toss ${pasta} with everything${cheese?` + ${cheese}`:''}. Pepper. Done.`
    ]
  } else if(has(['rice'])){
    const protein = proteins[0] || 'veg'
    const v = veg.slice(0,2).join(' & ') || 'onion'
    family = 'bowl'
    selected = ['rice', protein, ...veg.slice(0,2)].filter(Boolean).slice(0,4)
    title = `${protein.charAt(0).toUpperCase()+protein.slice(1)} & ${v} rice bowl`
    steps = [
      `Rice on — 1 cup rice, 2 cups water, salt, lid 12 min.`,
      `Hot pan, oil, ${protein} brown hard 4 min.`,
      `Add ${v}, toss 3 min.`,
      `Serve over rice, splash of vinegar/lemon if you have.`
    ]
  } else if(has(['bread','pizza','tortilla'])){
    const base = find(['bread','pizza','tortilla']) || 'bread'
    const protein = proteins[0] || ''
    const v = veg.slice(0,2).join(' & ') || 'tomato'
    family = 'sandwich / toastie'
    selected = [base, protein, ...veg.slice(0,2)].filter(Boolean).slice(0,4)
    title = base.includes('pizza') ? `Loaded ${base} with ${protein||v}` : `${protein?protein+' & ':''}${v} toastie`
    steps = [
      `${base} flat, oil both sides.`,
      `Top: ${[protein, ...veg.slice(0,2)].filter(Boolean).join(', ')} + cheese if you have.`,
      `Pan medium, press 4 min each side until crisp and melted.`,
      `Cut, eat.`
    ]
  } else if(has(['potato'])){
    const protein = proteins[0] || ''
    const v = veg.slice(0,2).join(' & ') || 'onion'
    family = 'hash / skillet'
    selected = ['potatoes', protein, ...veg.slice(0,2)].filter(Boolean).slice(0,5)
    title = protein ? `Crispy ${protein}, ${v} & potato skillet` : `Crispy ${v} potatoes`
    steps = [
      `Potatoes diced small — hot pan, oil, salt, don't move 5-6 min until browned.`,
      `Add ${v}, let brown 3 min.`,
      `${protein?`Add ${protein} to warm through. `:''}Toss.`,
      `Cheese if you have, lid 1 min to melt. Done.`
    ]
  } else if(has(['egg'])){
    const v = veg.slice(0,2).join(' & ') || 'onion'
    family = 'frittata'
    selected = ['eggs', ...veg.slice(0,3)].filter(Boolean).slice(0,4)
    title = `${v} & cheese frittata`
    steps = [
      `Beat ${find(['egg'])||'eggs'} with salt, pepper.`,
      `Pan medium, oil, ${v} soft 4 min.`,
      `Pour eggs over, low heat 6-7 min, lid on.`,
      `Cheese on top, grill or lid 2 min. Slice.`
    ]
  } else {
    // Generic bowl
    const protein = proteins[0] || items[0]
    const v = veg.slice(0,2).join(' & ') || items[1] || 'garlic'
    family = 'one-pan bowl'
    selected = [protein, ...veg.slice(0,2), ...items.slice(0,1)].filter(Boolean).slice(0,4)
    title = `${protein.charAt(0).toUpperCase()+protein.slice(1)} & ${v} pan`
    steps = [
      `Hot pan, oil, ${protein} in — brown 4 min.`,
      `Add ${v}, 3 min.`,
      `Splash water, lid 2 min to steam.`,
      `Season — salt, pepper, vinegar/lemon for acid. Done.`
    ]
  }

  // Ensure title is culinary, not list
  title = title.replace(/\b\w/g, l=>l.toUpperCase()).slice(0,55)

  const uses = selected
  const saves = items.filter(i=> !selected.some(s=> i.includes(s) || s.includes(i))).slice(0,4)

  return {
    kitchen_state: { ingredients: items.map(n=> ({name:n, state:"unknown", intent:"available", priority:"normal"})) },
    winner: { selected_dish: title.toLowerCase(), family, use: selected, optional:[], leave_out: saves, selection_reason: `Best coherence for ${family}, uses ${selected.join(', ')}` },
    recipe: {
      title,
      time,
      effort: "one pan",
      meta: `${time} · ${family} · uses ${selected.slice(0,2).join(', ')}`,
      uses,
      saves_for_later: saves,
      spoken_intro: `We're making ${title}. ${time}, one pan, using ${selected.slice(0,3).join(', ')}. ${saves.length?`Leaving ${saves.slice(0,2).join(' and ')} out — would be too much.` : ''}`,
      steps
    },
    public: {
      title, time, effort: "one pan",
      meta: `${time} · ${family} · uses ${selected.slice(0,2).join(', ')}`,
      uses, saves_for_later: saves,
      spoken_intro: `We're making ${title}. Using ${selected.slice(0,3).join(', ')}.`,
      steps, family, dish_concept: title.toLowerCase()
    },
    scored: [{dish: title, scores:{deliciousness:8,time_fit:8,use_soon:7,simplicity:8,texture:8,cleanup:8,efficiency:7}, weighted_total:7.9}],
    candidates: [{dish: title, family, ingredients: selected, why:"best coherence"}],
    culinary_check: {salt:"season", fat:"oil", acid:"tomato/vinegar", aromatics:"garlic/onion", moisture:"ok", browning:"crisp first", texture:"crispy+soft"}
  }
}

export default function App(){
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
  const [helpAnswer, setHelpAnswer] = useState(null)
  const [helpThinking, setHelpThinking] = useState(false)

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

  const chooseMode = async (m)=>{
    if(!have.trim()) return
    setMode(m); setStep('thinking'); setThinking(true)
    const API = import.meta.env.VITE_API_URL
    let data
    try{
      if(API){
        const r = await fetch(`${API}/api/think`,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({transcript: have, mode: m})})
        data = await r.json()
        // Calculate weighted totals in JS if backend didn't
        if(data.scored && data.scored[0] && !data.scored[0].weighted_total){
          const W={deliciousness:0.3,time_fit:0.2,use_soon:0.15,simplicity:0.15,texture:0.1,cleanup:0.05,efficiency:0.05}
          data.scored = data.scored.map(s=> ({...s, weighted_total: Math.round((s.scores.deliciousness*W.deliciousness + s.scores.time_fit*W.time_fit + s.scores.use_soon*W.use_soon + s.scores.simplicity*W.simplicity + s.scores.texture*W.texture + s.scores.cleanup*W.cleanup + s.scores.efficiency*W.efficiency)*10)/10})).sort((a,b)=>b.weighted_total-a.weighted_total)
        }
      }else{
        await new Promise(r=>setTimeout(r, 600))
        data = localThinkDinner(have, m)
      }
    }catch(e){
      console.log('API failed, using local diverse fallback', e)
      data = localThinkDinner(have, m)
    }
    setV1(data)
    setCookSession({
      recipe_title: data.public?.title || data.recipe?.title,
      selected_ingredients: data.winner?.use || data.public?.uses || [],
      current_step: 0,
      completed_steps: [],
      active_step_text: data.public?.steps?.[0],
      substitutions: [],
      active_timers: [],
      all_steps: data.public?.steps || data.recipe?.steps,
      winner: data.winner,
      recipe: data.public || data.recipe
    })
    setThinking(false); setStep('result')
    setTimeout(()=> speak(data.public?.spoken_intro || data.recipe?.spoken_intro), 300)
  }

  const gestureState = listening? 'listening' : thinking? 'thinking' : speaking? 'speaking' : 'idle'

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1A1A1A] flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative">
        <header className="px-7 pt-12 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-[22px] h-[7px] rounded-full bg-[#7D846E] origin-left ${gestureState==='listening'?'animate-pulse':''} ${gestureState==='thinking'?'animate-[wiggle_1.2s_ease-in-out_infinite]':''}`} style={{transform:'rotate(-12deg)'}} />
              <div className={`w-[8px] h-[8px] rounded-full bg-[#C56A4A] ${gestureState==='listening'?'animate-ping':''}`} />
            </div>
            <span className="font-bold tracking-tight text-[16px]">akchally</span>
          </div>
          <span className="text-[11px] tracking-[0.14em] opacity-40">{step==='inventory'?'1 · WHAT HAVE YOU GOT?': step==='mode'?'2 · HOW WE COOKING?': step==='thinking'?'3 · AKCHALLY DECIDES':'4 · RECIPE'}</span>
        </header>

        {step==='inventory' && (
          <main className="px-7 pt-14 pb-10">
            <h1 className="text-[34px] font-bold leading-[0.92] tracking-[-0.02em]">Alright, what are we<br/>working with?</h1>
            <p className="mt-4 text-[17px] leading-[1.35] text-[#7D846E]">Tell me everything. Messy is perfect.</p>
            <div className="mt-10 relative">
              <div className={`w-full rounded-[28px] transition-all ${listening?'bg-white shadow-[0_0_0_3px_rgba(197,106,74,0.12)] border border-[#C56A4A]/20':'bg-[#E8E0D1] border border-transparent'}`}>
                <textarea value={have} onChange={e=>setHave(e.target.value)} placeholder="Two sad tomatoes, mushrooms that need using, leftover chicken, potatoes, garlic and some cheese..." className="w-full min-h-[152px] p-6 pb-14 rounded-[28px] bg-transparent border-0 text-[17px] leading-[1.5] placeholder:text-[#9A9590] outline-none resize-none" />
              </div>
              <button onClick={startVoice} className={`absolute bottom-4 right-4 w-[46px] h-[46px] rounded-full flex items-center justify-center ${listening?'bg-[#C56A4A] text-white animate-pulse':'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-black/[0.06]'}`}>{listening?'■':'🎙'}</button>
            </div>
            <p className="mt-4 text-[12.5px] text-[#1A1A1A]/60">I’ll choose what’s worth using. You don’t need to use everything.</p>
            <button onClick={()=> have.trim() && setStep('mode')} disabled={!have.trim()} className={`mt-12 w-full h-[56px] rounded-full font-bold text-[16px] ${!have.trim()?'bg-[#1A1A1A]/20 text-[#1A1A1A]/30':'bg-[#1A1A1A] text-[#FAF7F1] shadow-[0_8px_24px_rgba(0,0,0,0.12)]'}`}>Sort this out →</button>
            <p className="mt-6 text-[11px] opacity-30 text-center">Try: "tomatoes, onion, olive, yogurt, garlic, rice, eggs" → should be rice bowl, not potatoes</p>
          </main>
        )}

        {step==='mode' && (
          <main className="px-7 pt-14 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.9]">How are we<br/>cooking tonight?</h1>
            <div className="mt-10 grid gap-4">
              <button onClick={()=>chooseMode('quick')} className="text-left rounded-[24px] bg-white border border-black/5 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
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
            <button onClick={()=>setStep('inventory')} className="mt-6 text-[12px] opacity-40">← Back</button>
          </main>
        )}

        {step==='thinking' && (
          <main className="px-7 pt-24 flex flex-col items-center text-center">
            <div className="w-[22px] h-[7px] rounded-full bg-[#7D846E] animate-[wiggle_1.2s_ease-in-out_infinite] origin-left" style={{transform:'rotate(-12deg)'}} />
            <h2 className="mt-8 text-[22px] font-bold">Choosing what's worth using...</h2>
            <p className="mt-2 text-[13px] text-[#7D846E]">Inventory → families → candidates → scoring</p>
          </main>
        )}

        {step==='result' && v1 && (
          <main className="px-7 pt-8 pb-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] tracking-widest font-bold opacity-40">WE'RE MAKING THIS · {v1.winner?.family?.toUpperCase()}</span>
              <button onClick={()=>speak(v1.public?.spoken_intro)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center">🔊</button>
            </div>
            <h2 className="mt-3 text-[28px] font-bold leading-[0.9] tracking-tight">{v1.public?.title || v1.recipe?.title}</h2>
            <p className="mt-3 text-[13px] text-[#7D846E]">{v1.public?.meta}</p>
            <div className="mt-4 rounded-[16px] bg-[#EDE8DF] p-4">
              <p className="text-[10px] font-bold tracking-widest opacity-40">USES — earns its place</p>
              <p className="text-[13px] mt-1 font-medium">{v1.public?.uses?.join(', ')}</p>
              {v1.public?.saves_for_later?.length>0 && (
                <>
                  <p className="text-[10px] font-bold tracking-widest opacity-40 mt-3">SAVING FOR LATER</p>
                  <p className="text-[11px] opacity-60 mt-1">{v1.public?.saves_for_later?.join(', ')}</p>
                </>
              )}
            </div>
            <div className="mt-6 rounded-[20px] bg-white border p-5">
              {(v1.public?.steps||[]).map((s,i)=><p key={i} className="text-[14px] py-2.5 border-b last:border-0"><span className="font-bold mr-2">{i+1}.</span>{s}</p>)}
            </div>
            <button onClick={()=>{setStep('cook'); setCookStep(0)}} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">Cook this →</button>
            <button onClick={()=>setStep('inventory')} className="mt-3 w-full text-[12px] opacity-50">Start over with different ingredients</button>
            {!import.meta.env.VITE_API_URL && <p className="mt-4 text-[10px] opacity-30 text-center">Local diverse fallback — set VITE_API_URL to your backend for full AI brain</p>}
          </main>
        )}

        {step==='cook' && cookSession && (
          <div className="px-7 pt-6">
            <div className="rounded-[28px] bg-[#1A1A1A] text-white p-6">
              <p className="text-[11px] opacity-50">NOW · STEP {cookStep+1}</p>
              <p className="text-[22px] font-semibold mt-3">{cookSession.active_step_text}</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button disabled={cookStep===0} onClick={()=>{const p=cookStep-1; setCookStep(p); setCookSession(s=>({...s, current_step:p, active_step_text:s.all_steps[p]}))}} className="h-12 rounded-full border bg-white disabled:opacity-30">Prev</button>
              <button onClick={()=>{if(cookStep<cookSession.all_steps.length-1){const n=cookStep+1; setCookStep(n); setCookSession(s=>({...s, current_step:n, active_step_text:s.all_steps[n]})); speak(cookSession.all_steps[n])}else setStep('result')}} className="h-12 rounded-full bg-[#1A1A1A] text-white font-bold">Next →</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes wiggle{0%,100%{transform:rotate(-12deg) translateX(0)}50%{transform:rotate(-12deg) translateX(4px)}}`}</style>
    </div>
  )
}
