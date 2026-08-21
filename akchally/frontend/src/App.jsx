import { useState, useRef, useEffect } from 'react'

const C = { cream:'#FAF7F1', charcoal:'#1A1A1A', sage:'#7D846E', terracotta:'#C56A4A', orange:'#D97941', stone:'#E8E2D9' }

function sortDinnerOut(transcript, constraints){
  const lower = transcript.toLowerCase()
  const urgency = lower.includes('funny') || lower.includes('open') || lower.includes('sad')
  const effortLabel = ['Bare minimum','Normal','I feel like cooking'][constraints.effort]
  const cleanup = constraints.pans === 1? 'low' : constraints.pans === 2? 'medium' : 'higher'
  const main = {
    id: 'main', title: lower.includes('chicken')? 'Chicken, butternut & feta — one pan, barely any chopping' : 'Tomato, spinach & feta — 20 minute pan',
    headline: `You’ve got ${lower.includes('chicken')? 'chicken, butternut' : 'tomatoes, spinach'} and feta. I’d make this. It’ll take ${constraints.time <=20? '18' : '32'} minutes.`,
    time: { total: constraints.time <=20? 18 : 32, active: constraints.effort===0? 8 : 14 },
    pans: constraints.pans===99?2:constraints.pans, cleanup, effort: effortLabel,
    why: urgency? 'Uses the mushrooms first — going funny — and keeps it to one pan.' : 'Least effort, most flavour, one pan. No blender, no tray.',
    steps: [
      { text:'Get butternut in first — 1.5cm cubes, salt, oil, hot pan. Leave it alone.', timer:10, parallel:'While that gets colour, slice chicken.', canLeave:true },
      { text:'Add chicken thighs to same pan, 6 min. Don’t wash anything.', timer:6, parallel:null, canLeave:false },
      { text:'Rice in — same pan juices. 1 cup rice, 1.5 cups water. Lid on.', timer:12, parallel:'Now you can shower — I’ll tell you when to check.', canLeave:true },
      { text:'Feta in last 2 min, spinach to wilt. Taste.', timer:2, parallel:null, canLeave:false },
    ]
  }
  return { main, alts:[
    {tag:'EASIEST', title:'Bare minimum chicken & rice', time:{total:20, active:6}, pans:1, note:'One pan. Almost no chopping.'},
    {tag:'FASTEST', title:'15-min tomato feta pan', time:{total:15, active:10}, pans:1, note:'Flat out fastest.'},
    {tag:'NICEST', title:'Oven-roasted chicken, butternut, feta', time:{total:42, active:12}, pans:2, note:'Best version if you’ve got more in you.'},
  ], parsed:{urgency} }
}

export default function App(){
  const [transcript,setTranscript]=useState("I've got two sad tomatoes, half an onion, chicken thighs, yoghurt and spinach. The mushrooms are going funny.")
  const [isListening,setIsListening]=useState(false)
  const [constraints,setConstraints]=useState({effort:1,time:30,pans:1,shopping:'nothing',equipment:['oven','pan']})
  const [sorted,setSorted]=useState(null)
  const [selected,setSelected]=useState(null)
  const [stepIdx,setStepIdx]=useState(0)
  const [isStandby,setIsStandby]=useState(false)
  const [standbyText,setStandbyText]=useState('')
  const [helpOpen,setHelpOpen]=useState(false)
  const [helpQ,setHelpQ]=useState('')
  const [tasteFeedback,setTasteFeedback]=useState('')
  const recRef=useRef(null)
  const speak=(t)=>{ if(!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); u.rate=0.96; window.speechSynthesis.speak(u); }
  const startListening=(mode='main')=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return; const rec=new SR(); rec.lang='en-ZA'; rec.continuous=mode!=='main'; rec.interimResults=true;
    rec.onstart=()=>mode==='main'&&setIsListening(true); rec.onend=()=>{ if(mode==='main') setIsListening(false); if((mode==='standby'||mode==='help')&&(isStandby||helpOpen)){ try{rec.start()}catch{} } }
    rec.onresult=(e)=>{ const text=Array.from(e.results).map(r=>r[0].transcript).join(''); if(mode==='main') setTranscript(text); if(mode==='standby'){ setStandbyText(text); if(e.results[0].isFinal){ const l=text.toLowerCase(); let a=l.includes('next')?`Next: ${selected?.steps[stepIdx+1]?.text||'Done'}`:l.includes('leave')||l.includes('shower')?selected?.steps[stepIdx]?.canLeave?`Yes — leave it ${selected.steps[stepIdx].timer} min`:'Stay close ~2 min':'Got it'; setStandbyText(a); speak(a);} } if(mode==='help'){ setHelpQ(text); if(e.results[0].isFinal){ let a=''; if(text.toLowerCase().includes('salty')) a='Too salty? Lemon/vinegar, not water. Potato trick 5 min.'; else if(text.toLowerCase().includes('split')) a='Split — off heat, whisk cold yoghurt slowly.'; else if(text.toLowerCase().includes('bland')||text.toLowerCase().includes('flat')) a='Flat? 1/2 tsp vinegar/lemon before salt. Taste again — better?'; else a=`Ok — ${text}. Tell me what you see/smell/taste.`; setTasteFeedback(a); speak(a);} } }
    recRef.current=rec; rec.start();
  }
  const handleSort=()=>{ const r=sortDinnerOut(transcript,constraints); setSorted(r); speak(`${r.main.headline} ${r.main.why}`); }
  useEffect(()=>{ if(isStandby&&selected) startListening('standby'); },[isStandby,selected])
  useEffect(()=>{ if(helpOpen) startListening('help'); },[helpOpen])

  return (
    <div className="min-h-screen w-full bg-[#FAF7F1] text-[#1A1A1A] flex justify-center">
      <div className="w-full max-w- flex flex-col min-h-screen">
        <header className="px-5 pt-6 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3"><img src="/akchally_mark_transparent.png" className="w-9 h-9" alt=""/><div><div className="font-bold text- leading-none">akchally</div><div className="text- text-[#7D846E] font-medium">gets dinner handled</div></div></div>
          <div className="text- px-2.5 py-1 rounded-full bg-black text-white">PWA • SORT DINNER MODE</div>
        </header>
        {!selected? (
          <main className="px-5 pb-10 space-y-5">
            <div className="bg-white rounded- p-6 border border-[#E8E2D9] shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
              <h1 className="text- font-bold leading-[0.95] tracking-tight">What have you got?</h1>
              <p className="text- text-[#7D846E] mt-2">Speak like a human. Sad tomatoes, half an onion, “going funny” — I get it.</p>
              <div className="mt-5 flex flex-col items-center">
                <button onClick={()=>isListening?recRef.current?.stop():startListening('main')} className={`w- h- rounded-full flex items-center justify-center text- ${isListening?'bg-[#C56A4A] text-white animate-pulse':'bg-black text-white'}`}>{isListening?'●':'🎙️'}</button>
              </div>
              <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} className="w-full mt-6 p-4 bg-[#FAF7F1] rounded-2xl border border-[#E8E2D9] text- min-h- outline-none focus:border-[#7D846E]" />
              {transcript.toLowerCase().includes('funny')&&<div className="mt-3 text- px-3 py-2 rounded-full bg-[#C56A4A]/10 border border-[#C56A4A]/20 text-[#C56A4A]">⚠️ Using up first: mushrooms going funny</div>}
              <div className="mt-6"><div className="flex justify-between"><span className="text- tracking-widest text-[#7D846E] font-semibold">HOW MUCH EFFORT HAVE YOU GOT?</span><span className="text- px-2 py-1 rounded-full bg-[#FAF7F1] border">{['Bare minimum','Normal','Feel like cooking'][constraints.effort]}</span></div>
                <div className="mt-3 grid grid-cols-3 gap-2">{[{k:0,l:'Bare minimum',d:'1 pan, 8 min'},{k:1,l:'Normal',d:'Balanced'},{k:2,l:'Feel like cooking',d:'Nicer result'}].map(o=><button key={o.k} onClick={()=>setConstraints({...constraints,effort:o.k})} className={`text-left rounded-2xl p-3 border ${constraints.effort===o.k?'bg-black text-white border-black':'bg-[#FAF7F1] border-[#E8E2D9]'}`}><div className="text- font-semibold">{o.l}</div><div className="text- mt-1 opacity-70">{o.d}</div></button>)}</div>
              </div>
              <div className="mt-6 space-y-4">
                <div><div className="text- tracking-widest text-[#7D846E] font-semibold mb-2">TIME • HARD LIMIT</div><div className="flex gap-2 flex-wrap">{[15,20,30,45,60].map(t=><button key={t} onClick={()=>setConstraints({...constraints,time:t})} className={`px-3.5 py-2 rounded-full text- border ${constraints.time===t?'bg-[#7D846E] text-white border-[#7D846E]':'bg-white border-[#E8E2D9]'}`}>{t===60?'60+':`${t} min`}</button>)}</div></div>
                <div><div className="text- tracking-widest text-[#7D846E] font-semibold mb-2">CLEANUP COST</div><div className="flex gap-2">{[{v:1,l:'One pan only'},{v:2,l:'Two pans max'},{v:99,l:'Whatever'}].map(o=><button key={o.v} onClick={()=>setConstraints({...constraints,pans:o.v})} className={`px-3.5 py-2 rounded-full text- border ${constraints.pans===o.v?'bg-black text-white border-black':'bg-white border-[#E8E2D9]'}`}>{o.l}</button>)}</div></div>
              </div>
              <button onClick={handleSort} className="w-full mt-7 bg-black text-white py-4 rounded-2xl font-semibold">Sort dinner out →</button>
            </div>
            {sorted&&<div className="space-y-4">
              <div className="bg-black text-[#FAF7F1] rounded- p-6"><div className="text- tracking-widest text-[#7D846E]">AKCHALLY SAYS</div><h2 className="text- font-bold leading-[1.05] mt-2">{sorted.main.headline}</h2><p className="text- text-white/70 mt-3">{sorted.main.why}</p><div className="flex gap-2 mt-4 flex-wrap"><span className="text- px-2.5 py-1 rounded-full bg-white/10 border-white/10">{sorted.main.time.total} min total • {sorted.main.time.active} min from you</span><span className="text- px-2.5 py-1 rounded-full bg-white/10">{sorted.main.pans} pan • cleanup {sorted.main.cleanup}</span></div><button onClick={()=>{setSelected(sorted.main); setStepIdx(0); speak(sorted.main.steps[0].text)}} className="mt-5 w-full py-3.5 rounded-full bg-[#FAF7F1] text-black font-semibold">Cook this — hands-free →</button></div>
              <div className="grid grid-cols-3 gap-2">{sorted.alts.map(a=><div key={a.tag} className="bg-white rounded-2xl p-3 border border-[#E8E2D9]"><div className="text- tracking-widest text-[#C56A4A] font-bold">{a.tag}</div><div className="text- font-semibold mt-1 leading-tight">{a.title}</div><div className="text- text-[#7D846E] mt-1">{a.time.total} min</div></div>)}</div>
            </div>}
          </main>
        ):(
          <div className="flex-1 flex flex-col">
            <div className="px-5 pt-2 pb-4"><button onClick={()=>setSelected(null)} className="text- text-[#7D846E]">← Back</button><h2 className="text- font-bold mt-2">{selected.title}</h2><div className="mt-3 h-1.5 bg-[#E8E2D9] rounded-full overflow-hidden"><div className="h-full bg-black" style={{width:`${((stepIdx+1)/selected.steps.length)*100}%`}} /></div></div>
            <div className="flex-1 px-5 space-y-4 pb-10">
              <div className="bg-white rounded- p-6 border border-[#E8E2D9]"><div className="text- tracking-widest text-[#A8A29A]">STEP {stepIdx+1} / {selected.steps.length}</div><p className="text- font-medium mt-3 leading-snug">{selected.steps[stepIdx].text}</p>{selected.steps[stepIdx].parallel&&<div className="mt-3 p-3 rounded-xl bg-[#FAF7F1] border text-">↳ While that cooks: {selected.steps[stepIdx].parallel}</div>}<div className="flex gap-2 mt-5"><button onClick={()=>speak(selected.steps[stepIdx].text)} className="px-4 py-2.5 bg-[#FAF7F1] border rounded-full">🔊</button><button onClick={()=>setStepIdx(s=>Math.max(0,s-1))} className="px-4 py-2.5 bg-[#E8E2D9] rounded-full">Prev</button><button onClick={()=>{if(stepIdx<selected.steps.length-1){setStepIdx(s=>s+1); speak(selected.steps[stepIdx+1].text)}}} className="flex-1 py-2.5 bg-black text-white rounded-full">Next →</button></div></div>
              <div className="bg-[#7D846E] text-white rounded- p-5"><div className="flex justify-between"><div className="font-semibold text-">Intelligent timers</div><div className="text- px-2 py-1 rounded-full bg-white/20">{selected.steps[stepIdx].timer} min</div></div><button onClick={()=>{const msg=selected.steps[stepIdx].canLeave?`Yes — leave it ${selected.steps[stepIdx].timer} min`:'Stay close ~2 min'; setStandbyText(msg); speak(msg);}} className="mt-3 w-full py-2.5 rounded-full bg-[#FAF7F1] text-black text- font-medium">Can I leave this alone?</button>{standbyText&&<div className="mt-3 p-3 bg-black/20 rounded-xl text-">{standbyText}</div>}</div>
              <div className="bg-black text-white rounded- p-5"><div className="flex justify-between"><div className="font-semibold text-">Standby Chef {isStandby?'● ON':'○ OFF'}</div><button onClick={()=>setIsStandby(!isStandby)} className={`px-3 py-1.5 rounded-full text- ${isStandby?'bg-[#C56A4A]':'bg-white text-black'}`}>{isStandby?'Stop':'Start'}</button></div></div>
              <div className="bg-white rounded- p-5 border border-[#C56A4A]/30"><div className="flex justify-between"><div className="font-bold text-">Rescue — HELP</div><button onClick={()=>setHelpOpen(!helpOpen)} className={`px-3 py-1.5 rounded-full text- ${helpOpen?'bg-[#C56A4A] text-white':'bg-[#C56A4A]/10 text-[#C56A4A] border'}`}>{helpOpen?'Listening...':'HELP'}</button></div><input value={helpQ} onChange={e=>setHelpQ(e.target.value)} placeholder="Too salty / split / bland..." className="w-full mt-3 p-3 bg-[#FAF7F1] rounded-xl border text-" /><button onClick={()=>{let a=''; const l=helpQ.toLowerCase(); if(l.includes('salty')) a='Too salty? Lemon/vinegar.'; else if(l.includes('bland')||l.includes('flat')) a='Flat? 1/2 tsp vinegar/lemon before salt.'; else a=`Ok — ${helpQ}. I fix without restart.`; setTasteFeedback(a); speak(a);}} className="mt-2 w-full py-2.5 rounded-full bg-[#C56A4A] text-white">Fix it</button>{tasteFeedback&&<div className="mt-4 p-4 rounded-xl bg-[#FAF7F1] border"><div className="text-">{tasteFeedback}</div></div>}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
