import { useState, useRef, useEffect } from 'react'

const MOCK_RECIPES = (ingredients) => [
  {
    id: 'hash',
    title: 'Rustic Pork Bangers & Potato Hash with Fried Eggs',
    time: '45 min',
    vibe: 'Comfort, not in a rush',
    uses: ['pork bangers','potatoes','onions','eggs','spice'],
    description: 'Crispy potatoes, sweet onions, seared bangers, topped with runny eggs. Uses your spice for heat.',
    steps: [
      'Dice potatoes into 1.5cm cubes, slice onions, slice bangers into 2cm pieces.',
      'Heat oil in large pan, fry potatoes 12-15 min until golden. Add onions + spice.',
      'Add bangers, cook 8 min until browned. Make wells, crack in 2 eggs, cover 3-4 min.',
      'Warm tomatoes quickly in same pan. Serve with a dollop of yoghurt if you like.'
    ]
  },
  {
    id: 'flatbread',
    title: 'Spiced Yoghurt Flatbreads with Tomato-Onion Ragu',
    time: '60 min',
    vibe: 'Not in a rush - impressive',
    uses: ['flour','yoghurt','tomatoes','onions','spice'],
    description: 'Soft flatbreads from flour + yoghurt, topped with jammy spiced tomato-onion ragu. Serve bangers on side.',
    steps: [
      'Mix 1 cup flour, 1/2 cup yoghurt, pinch salt + spice to make dough. Rest 10 min.',
      'Slow cook onions 15 min, add chopped tomatoes + spice, simmer 20 min to ragu.',
      'Roll dough thin, dry-fry 2 min each side.',
      'Fry bangers separately, slice and serve on flatbreads with ragu and yoghurt drizzle.'
    ]
  },
  {
    id: 'bake',
    title: 'One-Pan Loaded Potato & Bangers Bake',
    time: '70 min',
    vibe: 'Hands-off oven bake',
    uses: ['potatoes','pork bangers','tomatoes','onions','yoghurt','spice'],
    description: 'Everything in one dish, creamy yoghurt + tomato sauce, baked until bubbling.',
    steps: [
      'Preheat oven to 200°C. Slice potatoes thin, layer in oiled dish with onions.',
      'Mix chopped tomatoes, yoghurt, spice, salt, pour over potatoes.',
      'Top with bangers, cover foil 35 min.',
      'Uncover, bake 20 min more until golden. Rest 5 min, fry eggs to top if you want.'
    ]
  }
]

export default function App(){
  const [transcript, setTranscript] = useState("I've got 2 eggs, flour, yoghurt, spice, pork bangers, tomatoes, onions and potatoes, tonight I'm not in a rush, what can I make?")
  const [isListening, setIsListening] = useState(false)
  const [isStandby, setIsStandby] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [standbyQ, setStandbyQ] = useState("")
  const recognitionRef = useRef(null)

  const speak = (text) => {
    if(!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.pitch = 1.05
    window.speechSynthesis.speak(u)
  }

  const startListening = (mode='main') => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){ alert('Web Speech not supported - use Chrome Android'); return }
    const rec = new SR()
    rec.lang = 'en-ZA'
    rec.continuous = mode==='standby'
    rec.interimResults = true
    rec.onstart = () => mode==='standby' ? null : setIsListening(true)
    rec.onend = () => {
      if(mode!=='standby') setIsListening(false)
      if(mode==='standby' && isStandby){ try{ rec.start() }catch{} }
    }
    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r=>r[0].transcript).join('')
      if(mode==='standby'){
        setStandbyQ(text)
        if(e.results[0].isFinal){
          handleStandbyQuestion(text)
        }
      } else {
        setTranscript(text)
      }
    }
    recognitionRef.current = rec
    rec.start()
  }

  const handleAsk = async () => {
    // Call your AI backend here: POST /api/recipe
    // For demo, use mock
    setRecipes(MOCK_RECIPES(transcript))
    speak(`I found 3 ideas with what you've got. First up, Rustic Pork Bangers and Potato Hash. Want to cook it?`)
  }

  const handleStandbyQuestion = async (q) => {
    if(!q.toLowerCase().trim()) return
    let answer = "I'm here! "
    if(q.includes('next')) answer += `Next is: ${selected?.steps[stepIdx+1] || 'That was the last step, you are done!' }`
    else if(q.includes('long') || q.includes('time')) answer += `This step takes about 8 to 12 minutes. You said you're not in a rush, so take your time.`
    else if(q.includes('substitute') || q.includes('yoghurt')) answer += `You can skip yoghurt or use a splash of milk. It just adds creaminess.`
    else answer += `Got it. For ${q}, keep going as described. Need me to repeat the step?`
    setStandbyQ(answer)
    speak(answer)
  }

  useEffect(()=>{
    if(isStandby && selected){ startListening('standby') }
    else { recognitionRef.current?.stop() }
  },[isStandby, selected])

  return (
    <div className="min-h-screen max-w-[480px] mx-auto bg-[#FFFBF2] text-zinc-800 flex flex-col">
      <header className="p-5 flex justify-between items-center">
        <div className="font-black text-[22px] tracking-tight">akchally<span className="text-[#D97941]">.com</span></div>
        <div className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full">PWA • VOICE ACTIVE</div>
      </header>

      {!selected ? (
        <main className="p-5 space-y-5">
          <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-zinc-100">
            <h1 className="text-[28px] font-bold leading-[1.05]">Talk to your kitchen.</h1>
            <p className="text-zinc-500 mt-2 text-[15px]">Tap mic, say what you have. Akchally will speak back and stay on standby.</p>

            <div className="mt-6 flex flex-col items-center">
              <button onClick={()=> isListening ? recognitionRef.current?.stop() : startListening('main')}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl transition-all ${isListening ? 'bg-[#D97941] pulse text-white shadow-[0_0_0_12px_rgba(217,121,65,0.2)]' : 'bg-zinc-900 text-white'}`}>
                {isListening ? '●' : '🎙️'}
              </button>
              <p className="text-[12px] mt-3 text-zinc-400">{isListening ? 'Listening... Susan style' : 'Tap to speak'}</p>
            </div>

            <textarea value={transcript} onChange={e=>setTranscript(e.target.value)}
              className="w-full mt-6 p-4 bg-[#FFFBF2] rounded-2xl border border-zinc-200 text-[15px] min-h-[90px] outline-none focus:border-[#D97941]"
              placeholder="I've got 2 eggs, flour..."
            />

            <div className="flex gap-2 mt-3 flex-wrap">
              {['Not in a rush','Quick 20 min','High protein'].map(t=>(
                <span key={t} className="text-[12px] px-3 py-1.5 rounded-full bg-zinc-100 border">{t}</span>
              ))}
            </div>

            <button onClick={handleAsk} className="w-full mt-5 bg-[#D97941] text-white py-4 rounded-2xl font-semibold text-[16px]">What can I make? →</button>
          </div>

          {recipes.length>0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-[18px] px-1">Akchally found this for you</h2>
              {recipes.map(r=>(
                <div key={r.id} className="bg-white rounded-[22px] p-5 border border-zinc-100 shadow-sm">
                  <div className="flex justify-between">
                    <h3 className="font-bold text-[16px] leading-tight w-3/4">{r.title}</h3>
                    <span className="text-[11px] h-fit bg-[#FFFBF2] border px-2 py-1 rounded-full">{r.time}</span>
                  </div>
                  <p className="text-[13px] text-zinc-500 mt-2">{r.description}</p>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {r.uses.map(u=><span key={u} className="text-[11px] bg-zinc-900 text-white px-2 py-1 rounded-full">{u}</span>)}
                  </div>
                  <button onClick={()=>{ setSelected(r); setStepIdx(0); speak(`Great choice. Let's cook ${r.title}. Step 1: ${r.steps[0]}`)}} className="mt-4 w-full py-3 rounded-xl bg-zinc-900 text-white text-[14px] font-medium">Cook this — voice guide</button>
                </div>
              ))}
            </div>
          )}
        </main>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="p-5">
            <button onClick={()=>setSelected(null)} className="text-[13px] text-zinc-500">← Back to recipes</button>
            <h2 className="text-[22px] font-bold leading-tight mt-2">{selected.title}</h2>
            <div className="mt-3 h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#D97941]" style={{width: `${((stepIdx+1)/selected.steps.length)*100}%`}} />
            </div>
          </div>

          <div className="flex-1 p-5">
            <div className="bg-white rounded-[24px] p-6 border shadow-sm min-h-[220px]">
              <div className="text-[11px] tracking-widest text-zinc-400">STEP {stepIdx+1} / {selected.steps.length}</div>
              <p className="text-[20px] font-medium leading-snug mt-3">{selected.steps[stepIdx]}</p>
              <div className="flex gap-2 mt-6">
                <button onClick={()=>speak(selected.steps[stepIdx])} className="px-4 py-2.5 bg-[#FFFBF2] border rounded-full text-[13px]">🔊 Speak step</button>
                <button onClick={()=>{ if(stepIdx>0) setStepIdx(s=>s-1)}} className="px-4 py-2.5 bg-zinc-100 rounded-full text-[13px]">Prev</button>
                <button onClick={()=>{ if(stepIdx<selected.steps.length-1){ setStepIdx(s=>s+1); speak(selected.steps[stepIdx+1]) } }} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-full text-[13px]">Next →</button>
              </div>
            </div>

            <div className="mt-5 bg-zinc-900 text-white rounded-[24px] p-5">
              <div className="flex justify-between items-center">
                <div className="font-semibold text-[14px]">Standby Chef {isStandby ? '● ON' : '○ OFF'}</div>
                <button onClick={()=>setIsStandby(!isStandby)} className={`px-3 py-1.5 rounded-full text-[12px] ${isStandby ? 'bg-[#D97941]' : 'bg-white text-black'}`}>{isStandby ? 'Stop listening' : 'Start listening'}</button>
              </div>
              <p className="text-[12px] text-zinc-400 mt-2">When ON, just say “hey akchally, what’s next?” — I’ll stay listening while you cook.</p>
              {standbyQ && <div className="mt-4 p-3 bg-white/10 rounded-xl text-[13px]">{standbyQ}</div>}
              {isStandby && <div className="mt-3 text-[11px] text-[#D97941] animate-pulse">● Listening for questions...</div>}
            </div>
          </div>
        </div>
      )}

      <footer className="p-5 text-center text-[11px] text-zinc-400">akchally.com • PWA ready • Installable on Android • Add to Home Screen</footer>
    </div>
  )
}