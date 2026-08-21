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
  const [step, setStep] = useState('inventory') // inventory -> mode -> thinking -> result -> cook
  const [have, setHave] = useState("")
  const [mode, setMode] = useState(null) // quick | relaxed
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [v1, setV1] = useState(null) // full V1 response
  const [cookStep, setCookStep] = useState(0)
  const recRef = useRef(null)
  const isListeningRef = useRef(false)
  const [thinkingStage, setThinkingStage] = useState(0)

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
    try{ await navigator.mediaDevices.getUserMedia({audio:true}) }catch{ alert('Mic blocked — Chrome → lock → Allow'); return }
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

  const goToMode = ()=>{
    if(!have.trim()){ alert('Tell me what you got first'); return }
    setStep('mode')
  }

  const chooseMode = async (selectedMode)=>{
    setMode(selectedMode)
    setStep('thinking')
    setThinking(true)
    setThinkingStage(0)
    // Animate through stages
    const stages = ['Interpreting pantry...', 'Finding dish families...', 'Building 3-4 candidates...', 'Scoring for deliciousness...', 'Selecting best combo...', 'Culinary balance check...']
    let idx=0
    const interval = setInterval(()=>{ idx++; if(idx<stages.length) setThinkingStage(idx); else clearInterval(interval) }, 600)

    const API = import.meta.env.VITE_API_URL
    try{
      let data
      if(API){
        const r = await fetch(`${API}/api/think`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({transcript: have, mode: selectedMode})
        })
        data = await r.json()
      }else{
        // Local fallback calls same logic as backend would
        await new Promise(res=>setTimeout(res, 2200))
        // Simulate V1 structure locally (very simplified)
        const lower = have.toLowerCase()
        const has = (k)=> lower.includes(k)
        const protein = has('chicken')?'leftover chicken': has('ham')?'ham': has('egg')?'eggs':'chicken'
        const carb = has('potato')?'potatoes': has('pizza')?'pizza': has('pasta')?'pasta':'potatoes'
        data = {
          kitchen_state: {ingredients: have.split(',').map(s=>({name:s.trim()}))},
          mode_interpretation: selectedMode==='quick'?{mode:'quick', target_total_time_minutes:25, complexity:'low'}:{mode:'relaxed', target_total_time_minutes:60, complexity:'moderate', allow_roasting:true},
          candidates: [
            {dish:`crispy ${protein} & ${carb} skillet`, family: carb.includes('pizza')?'toastie':'hash / skillet', ingredients:[protein, carb, 'mushrooms','garlic','cheese'], why:'best coherence'},
            {dish:'mushroom ham cheese frittata', family:'frittata', ingredients:['mushrooms','ham','cheese','eggs'], why:'quick'},
            {dish:'loaded pizza revival', family:'toastie', ingredients:['pizza','cheese','tomatoes'], why:'leftover revival'}
          ],
          scored: [
            {dish:`crispy ${protein} & ${carb} skillet`, scores:{deliciousness:9, time_fit:selectedMode==='quick'?8:7, use_soon:9, simplicity:8, texture:9, cleanup:9, efficiency:8}, weighted_total:8.6},
            {dish:'mushroom ham cheese frittata', scores:{deliciousness:7, time_fit:9, use_soon:7, simplicity:9, texture:7, cleanup:8, efficiency:7}, weighted_total:7.8}
          ],
          winner: {selected_dish:`crispy garlic ${protein} & mushroom ${carb}`, family: carb.includes('pizza')?'toastie':'hash / skillet', use:[protein, carb, 'mushrooms','garlic','cheese'], optional:['tomatoes'], leave_out:['pizza','ham','juice'].filter(x=>!have.toLowerCase().includes(x) ? false : true), selection_reason:'best flavour coherence, uses priority ingredients, one-pan'},
          culinary_check: {salt:'cheese + seasoning', fat:'oil + cheese', acid:'tomatoes optional for freshness', aromatics:'garlic present', moisture:'cheese melt', browning:'potatoes crisp first, mushrooms brown hard', texture:'crispy + soft + melted', fix_applied:'optional tomato for acid'},
          recipe: {
            title: has('potato')&&has('chicken') ? 'Crispy Garlic Chicken & Mushroom Potatoes' : has('pizza') ? 'Loaded Pizza with Ham & Mushrooms' : 'Crispy Chicken, Mushroom & Garlic Potato Skillet',
            time: selectedMode==='quick'?'22 min':'40 min',
            effort: 'one pan',
            meta: `${selectedMode==='quick'?'22 min':'40 min'} · ${carb.includes('pizza')?'toastie':'one pan'} · uses mushrooms first`,
            uses: [protein, carb, 'mushrooms','garlic','cheese'],
            saves_for_later: have.split(',').filter(s=> !['chicken','potato','mushroom','garlic','cheese'].some(k=>s.toLowerCase().includes(k))).slice(0,3),
            spoken_intro: `We're making ${has('potato')&&has('chicken') ? 'crispy garlic chicken and mushroom potatoes' : 'something with what you have'}. ${selectedMode==='quick'?'22 minutes, one pan':'Got time, so we can get proper browning.'} Using ${protein}, ${carb} and mushrooms. I'm leaving ${have.includes('pizza')?'the pizza':''} out — would make it stodgy.`,
            steps: [
              'Cut potatoes small so they cook quickly. Fry in oil with salt 6-7 min until browned and nearly tender.',
              'Add mushrooms, let them brown properly before stirring.',
              'Add garlic and leftover chicken, toss until hot.',
              'Scatter cheese, cover 2 min to melt. Taste, season, serve.'
            ]
          }
        }
      }
      clearInterval(interval)
      setV1(data)
      setThinking(false)
      setStep('result')
      setTimeout(()=> speak(data.recipe?.spoken_intro || data.recipe?.title), 300)
    }catch(e){
      console.log(e)
      setThinking(false)
      alert('Thinking failed, check backend')
      setStep('mode')
    }
  }

  const gestureState = listening? 'listening' : thinking? 'thinking' : speaking? 'speaking' : v1? 'done' : 'idle'

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
      <div className="w-full max-w-[480px] min-h-screen flex flex-col">
        <header className="px-6 pt-10 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="font-bold text-[15px] ml-1">akchally</span></div>
          <div className="text-[11px] opacity-40 tracking-widest">
            {step==='inventory'&&'1 · WHAT HAVE YOU GOT?'}
            {step==='mode'&&'2 · HOW WE COOKING?'}
            {step==='thinking'&&'3 · AKCHALLY DECIDES'}
            {step==='result'&&'4 · RECIPE'}
            {step==='cook'&&'COOK MODE'}
          </div>
        </header>

        {step==='inventory' && (
          <main className="px-6 pt-8 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.95]">What have<br/>you got?</h1>
            <p className="mt-3 text-[15px] text-[#7D846E]">Say it messy, I'll sort it.<br/>Pantry dump, voice is fine.</p>
            <div className="mt-8 relative">
              <textarea value={have} onChange={e=>setHave(e.target.value)} placeholder="I've got leftover chicken, three old pizza slices, two tomatoes, mushrooms that need using, potatoes, garlic, cheese, ham and eggs" className={`w-full min-h-[140px] p-5 pr-12 rounded-[20px] bg-[#EDE8DF] border text-[16px] outline-none ${listening?'border-[#C56A4A] bg-white':''}`} />
              <button onClick={startVoice} className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center ${listening?'bg-[#C56A4A] text-white animate-pulse':'bg-white border'}`}>{listening?'■':'🎙'}</button>
            </div>
            <p className="mt-3 text-[12px] text-[#7D846E]">{listening?'Standby — breath, keep talking':'or just tell me — tap mic, say your fridge'}</p>
            <button onClick={goToMode} disabled={!have.trim()} className="mt-10 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold disabled:opacity-30">Next →</button>
          </main>
        )}

        {step==='mode' && (
          <main className="px-6 pt-12 pb-10">
            <h1 className="text-[32px] font-bold leading-[0.9]">How are we<br/>cooking tonight?</h1>
            <p className="mt-3 text-[13px] text-[#7D846E]">I'll handle cuisine, method, complexity. You just pick time.</p>
            <div className="mt-10 grid gap-4">
              <button onClick={()=>chooseMode('quick')} className="text-left rounded-[24px] bg-white border p-6 hover:border-black transition-all">
                <p className="text-[11px] tracking-widest font-bold opacity-40">MAKE IT QUICK</p>
                <p className="text-[22px] font-bold mt-2">25 min · low effort</p>
                <p className="text-[13px] text-[#7D846E] mt-1">One pan, max flavour, minimal cleanup. Crispy, fast, satisfying.</p>
                <div className="mt-4 text-[11px] opacity-50">Target: 25 min · complexity low · cleanup low</div>
              </button>
              <button onClick={()=>chooseMode('relaxed')} className="text-left rounded-[24px] bg-[#1A1A1A] text-white p-6">
                <p className="text-[11px] tracking-widest font-bold opacity-40 text-white/60">I'VE GOT TIME</p>
                <p className="text-[22px] font-bold mt-2">Up to 60 min · proper cooking</p>
                <p className="text-[13px] text-white/70 mt-1">Roasting, slow browning, dough if needed. Deeper flavour.</p>
                <div className="mt-4 text-[11px] opacity-50">Target: 60 min · allows roasting & slow browning</div>
              </button>
            </div>
            <button onClick={()=>setStep('inventory')} className="mt-6 w-full text-[12px] opacity-40">← Back to ingredients</button>
          </main>
        )}

        {step==='thinking' && (
          <main className="px-6 pt-20 pb-10 flex flex-col items-center text-center">
            <DoneGesture state="thinking"/>
            <h2 className="mt-8 text-[24px] font-bold">AKCHALLY is deciding...</h2>
            <p className="mt-2 text-[13px] text-[#7D846E] max-w-[300px]">Not using everything. Finding what actually belongs together.</p>
            <div className="mt-10 w-full rounded-[20px] bg-white border p-5 text-left">
              {[
                'Interpreting pantry — leftovers, use-soon, fresh...',
                'Identifying dish families — pasta, frittata, roast tray, stir-fry, bowl...',
                'Building 3-5 candidate meals internally...',
                'Scoring: deliciousness 30% · time fit 20% · use-soon 15% · simplicity 15%...',
                'Selecting core — one protein, one starch, 1-2 veg, flavour direction...',
                'Culinary check — fat? acid? salt? aromatics? texture? browning?'
              ].map((t,i)=>(
                <div key={i} className={`flex gap-3 py-2.5 border-b last:border-0 border-black/5 ${i===thinkingStage?'opacity-100':'opacity-30'} ${i<thinkingStage?'opacity-60':''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${i<thinkingStage?'bg-[#7D846E] text-white':'bg-black/10'} ${i===thinkingStage?'bg-[#C56A4A] text-white animate-pulse':''}`}>{i<thinkingStage?'✓':i+1}</span>
                  <span className="text-[13px] leading-[1.3]">{t}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[11px] opacity-40">Pantry dump → {have.split(',').length} items → picking 3-4 that make sense</p>
          </main>
        )}

        {step==='result' && v1 && (
          <main className="px-6 pt-8 pb-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><DoneGesture state={gestureState}/><span className="text-[11px] tracking-widest font-bold opacity-40">WE'RE MAKING THIS · {v1.winner?.family?.toUpperCase() || v1.recipe?.effort?.toUpperCase()}</span></div>
              <button onClick={()=>speak(v1.recipe?.spoken_intro)} className={`w-8 h-8 rounded-full border flex items-center justify-center ${speaking?'bg-[#C56A4A] text-white animate-pulse':'bg-white'}`}>🔊</button>
            </div>
            
            <h2 className="mt-4 text-[30px] font-bold leading-[0.9] tracking-tight">{v1.recipe?.title}</h2>
            <p className="mt-3 text-[13px] text-[#7D846E]">{v1.recipe?.meta}</p>

            {/* V1 Reasoning UI */}
            <div className="mt-6 rounded-[16px] bg-[#EDE8DF] border p-4">
              <p className="text-[10px] font-bold tracking-widest opacity-40">DISH CONCEPT</p>
              <p className="text-[13px] font-medium mt-1">{v1.winner?.selected_dish || v1.recipe?.title} · {v1.mode_interpretation?.mode} mode</p>
              {v1.candidates && (
                <>
                  <p className="text-[10px] font-bold tracking-widest opacity-40 mt-4">CONSIDERED {v1.candidates.length} CANDIDATES</p>
                  <div className="mt-1">
                    {v1.candidates.slice(0,3).map((c,i)=>(
                      <p key={i} className={`text-[11px] py-1 ${c.dish===v1.winner?.selected_dish || c.dish===v1.recipe?.title ? 'font-bold opacity-100' : 'opacity-50'}`}>• {c.dish} — {c.ingredients?.slice(0,3).join(', ')}</p>
                    ))}
                  </div>
                </>
              )}
              {v1.scored && (
                <>
                  <p className="text-[10px] font-bold tracking-widest opacity-40 mt-3">TOP SCORE</p>
                  <p className="text-[11px] opacity-70">{v1.scored[0]?.dish} — {v1.scored[0]?.weighted_total}/10 · deliciousness {v1.scored[0]?.scores?.deliciousness}/10</p>
                </>
              )}
            </div>

            <div className="mt-4 rounded-[16px] bg-white border p-4">
              <p className="text-[10px] font-bold tracking-widest opacity-40">USES — earns its place</p>
              <p className="text-[13px] mt-1 font-medium">{v1.recipe?.uses?.join(', ') || v1.winner?.use?.join(', ')}</p>
              {v1.culinary_check && (
                <p className="text-[11px] opacity-50 mt-2 italic">Balance: {v1.culinary_check.texture} · fat: {v1.culinary_check.fat} · acid: {v1.culinary_check.acid}</p>
              )}
              {(v1.recipe?.saves_for_later?.length>0 || v1.winner?.leave_out?.length>0) && (
                <>
                  <p className="text-[10px] font-bold tracking-widest opacity-40 mt-4">SAVING FOR LATER — would weaken dish</p>
                  <div className="mt-1">
                    {(v1.recipe?.saves_for_later || v1.winner?.leave_out || []).slice(0,4).map((ig,i)=>{
                      const obj = typeof ig==='string'? {ingredient:ig, reason:'not needed for best flavour'} : ig
                      return <p key={i} className="text-[11px] opacity-60 leading-[1.3]">• {obj.ingredient} {obj.reason?`— ${obj.reason}`:''}</p>
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 rounded-[20px] bg-white border p-5">
              {v1.recipe?.steps?.map((s,i)=><p key={i} className="text-[14px] py-2.5 border-b last:border-0 border-black/5 leading-[1.4]"><span className="font-bold mr-2">{i+1}.</span>{s}</p>)}
            </div>

            <button onClick={()=>{speak(`Let's cook ${v1.recipe.title}. Step 1: ${v1.recipe.steps[0]}`); setStep('cook'); setCookStep(0)}} className="mt-8 w-full h-[56px] rounded-full bg-[#1A1A1A] text-white font-bold">Cook this →</button>
            <div className="mt-3 flex gap-2">
              <button onClick={()=>setStep('mode')} className="flex-1 h-10 rounded-full bg-white border text-[12px]">Change time mode</button>
              <button onClick={()=>{window.speechSynthesis.cancel(); setStep('inventory')}} className="flex-1 h-10 rounded-full bg-white border text-[12px] opacity-60">Edit ingredients</button>
            </div>
          </main>
        )}

        {step==='cook' && v1 && (
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center">
              <button onClick={()=>{window.speechSynthesis.cancel(); setStep('result')}} className="text-[12px]">← Back</button>
              <span className="text-[11px] font-bold">{cookStep+1}/{v1.recipe.steps.length}</span>
              <button onClick={()=>speak(v1.recipe.steps[cookStep])} className="px-3 py-1 rounded-full bg-white border text-[11px] font-bold">🔊 Speak</button>
            </div>
            <div className="px-6 pt-6">
              <div className="rounded-[28px] bg-[#1A1A1A] text-white p-6">
                <p className="text-[11px] opacity-50 tracking-widest">NOW · {v1.recipe.title}</p>
                <p className="text-[22px] font-semibold mt-3 leading-[1.2]">{v1.recipe.steps[cookStep]}</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button disabled={cookStep===0} onClick={()=>setCookStep(s=>Math.max(0,s-1))} className="h-12 rounded-full border bg-white disabled:opacity-30">Prev</button>
                <button onClick={()=>{if(cookStep<v1.recipe.steps.length-1){const n=cookStep+1; setCookStep(n); speak(v1.recipe.steps[n])} else {speak('Done! Dinner handled.'); setStep('result')}}} className="h-12 rounded-full bg-[#1A1A1A] text-white font-bold">{cookStep===v1.recipe.steps.length-1?'Done ✓':'Next →'}</button>
              </div>
              <div className="mt-8 rounded-[16px] bg-[#EDE8DF] p-4">
                <p className="text-[11px] font-bold opacity-40">CULINARY CHECK</p>
                <p className="text-[11px] mt-1 opacity-70">{v1.culinary_check?.texture} · {v1.culinary_check?.browning} · fat {v1.culinary_check?.fat}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes wiggle{0%,100%{transform:rotate(-12deg) translateX(0)}50%{transform:rotate(-12deg) translateX(4px)}}`}</style>
    </div>
  )
}
