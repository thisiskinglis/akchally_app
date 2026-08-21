import { useState, useEffect, useRef } from 'react'

export default function App(){
  // --- PWA DOWNLOAD LOGIC ---
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [platform, setPlatform] = useState('android')
  const [isAppView, setIsAppView] = useState(false)

  useEffect(()=>{
    const ua = navigator.userAgent
    if(/iPad|iPhone|iPod/.test(ua)) setPlatform('ios')
    else if(/Android/.test(ua)) setPlatform('android')
    else setPlatform('desktop')

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if(isStandalone){
      setIsAppView(true); setIsInstalled(true)
    } else {
      if(localStorage.getItem('akchally_installed')==='true') setIsAppView(true)
    }

    const handler = (e)=>{ e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', ()=>{
      setIsInstalled(true); setIsAppView(true); localStorage.setItem('akchally_installed','true')
    })
    return ()=>window.removeEventListener('beforeinstallprompt', handler)
  },[])

  const handleDownload = async ()=>{
    if(deferredPrompt){
      deferredPrompt.prompt()
      const {outcome} = await deferredPrompt.userChoice
      if(outcome==='accepted'){ setIsAppView(true); localStorage.setItem('akchally_installed','true') }
    } else {
      setShowInstructions(true)
    }
  }

  // --- YOUR SORT DINNER OUT APP LOGIC (from your vision) ---
  const [have,setHave]=useState("eggs, butter, garlic, pasta, spinach that's about to die, parmesan")
  const [effort,setEffort]=useState(0)
  const [time,setTime]=useState(30)
  const [onePan,setOnePan]=useState(true)
  const [result,setResult]=useState(null)
  const [cookMode,setCookMode]=useState(false)
  const [cookStep,setCookStep]=useState(0)
  const [showRescue,setShowRescue]=useState(false)

  const sortDinner = ()=>{
    const map = {
      0:{title:"Garlic butter pasta + whatever greens", tag:"Uses what you listed. One pan, no decisions.", total:18, active:9, pan:"One pan", steps:["Boil water heavily salted. Pasta in. 9 min.","Pan: butter low, sliced garlic, don't burn.","2 ladles pasta water into butter — emulsify.","Drain pasta, toss, greens in, cover 1 min.","Cheese, pepper. Done."]},
      1:{title:"Sheet pan chicken + veg", tag:"Chop, tray, oven. You get 20 mins back.", total:32, active:12, pan:"One tray", steps:["Oven 220C. Tray oil paprika — veg first chicken on top 25 min.","Shake tray at 15 min.","Rest 3 min lemon on top."]},
      2:{title:"Miso butter noodles", tag:"A bit of cooking big payoff.", total:28, active:16, pan:"Two pans", steps:["Boil noodles save 1 cup water.","Butter miso garlic melt no colour.","Noodles in toss splash water glossy.","Fry egg greens.","Bowl noodles greens egg chili."]}
    }
    setResult(map[effort]); setCookMode(false); setCookStep(0)
  }

  // --- LANDING VIEW ---
  if(!isAppView){
    return (
      <div className="min-h-screen bg-[#FAF7F1] flex justify-center">
        <div className="w-full max-w- px-6 py-10 flex flex-col min-h-screen">
          <header className="flex items-center gap-3"><img src="/akchally_mark_transparent.png" className="w-9 h-9" alt=""/><div><div className="font-bold">akchally</div><div className="text- text-[#7D846E]">gets dinner handled</div></div></header>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w- h- rounded- bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex items-center justify-center border border-black/5">
              <div className="w-16 h-2 bg-[#7D846E] rounded-full rotate-[-12deg]"></div><div className="w-4 h-4 bg-[#C56A4A] rounded-full ml-3 mt-6"></div>
            </div>
            <h1 className="mt-8 text- font-bold leading-[0.9] tracking-tight">Gets dinner<br/>handled.</h1>
            <p className="mt-4 text- leading-[1.4] text-[#7D846E] max-w-">Not another recipe app. Tell me what you’ve got, I sort dinner out.</p>
            <button onClick={handleDownload} className="mt-8 w-full h- rounded-full bg-black text-white font-bold tracking-widest text-">DOWNLOAD</button>
            <p className="mt-3 text- text-black/40">Free • No App Store • Works offline • Voice-first</p>
            <div className="mt-8 flex gap-2 flex-wrap justify-center"><span className="px-3 py-1.5 rounded-full bg-white border text-">One decision not ten</span><span className="px-3 py-1.5 rounded-full bg-white border text-">One pan only option</span><span className="px-3 py-1.5 rounded-full bg-white border text-">Rescue when it goes wrong</span></div>
            <button onClick={()=>setIsAppView(true)} className="mt-10 text- underline text-black/50">Already have it? Open app →</button>
          </div>

          {showInstructions && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-end justify-center p-4">
              <div className="w-full max-w- bg-white rounded- p-6">
                <h3 className="font-bold text-">Install Akchally</h3>
                {platform==='ios'? (
                  <div className="mt-4 text- leading-snug"><p>1. Tap the <b>Share</b> button (square with arrow) in Safari</p><p className="mt-2">2. Tap <b>Add to Home Screen</b></p><p className="mt-2">Your sage icon will land on your home screen.</p></div>
                ) : (
                  <div className="mt-4 text-"><p>Tap <b>Add to Home Screen</b> or <b>Install</b> when prompted. Your icon lands on your phone.</p></div>
                )}
                <button onClick={()=>{setShowInstructions(false); setIsAppView(true)}} className="mt-6 w-full h-12 rounded-full bg-black text-white font-semibold">Got it, open app</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- MAIN APP VIEW (after download) ---
  return (
    <div className="min-h-screen bg-[#FAF7F1] flex justify-center">
      <div className="w-full max-w- min-h-screen flex flex-col">
        <header className="px-5 py-4 flex justify-between items-center bg-[#FAF7F1] sticky top-0 z-10 border-b border-black/5">
          <div className="flex items-center gap-2"><img src="/akchally_mark_transparent.png" className="w-7 h-7" alt=""/><span className="font-bold">akchally</span></div>
          <button onClick={()=>setIsAppView(false)} className="text- px-2 py-1 rounded-full bg-black text-white">DOWNLOAD PAGE</button>
        </header>

        {!cookMode? (
          <div className="px-5 py-6 space-y-5">
            <div className="bg-white rounded- p-5 border">
              <p className="text- tracking-widest font-bold opacity-40">WHAT HAVE YOU GOT?</p>
              <textarea value={have} onChange={e=>setHave(e.target.value)} className="w-full mt-3 p-3 bg-[#FAF7F1] rounded-xl border text- min-h-" />
              <div className="mt-4"><p className="text- tracking-widest font-bold opacity-40">HOW MUCH EFFORT?</p>
                <div className="mt-2 grid grid-cols-3 gap-2">{[
                  {k:0,l:'Bare minimum'},{k:1,l:'Normal'},{k:2,l:'Feel like cooking'}].map(o=><button key={o.k} onClick={()=>setEffort(o.k)} className={`p-3 rounded-xl border text- font-semibold ${effort===o.k?'bg-black text-white':'bg-[#FAF7F1]'}`}>{o.l}</button>)}</div>
              </div>
              <button onClick={sortDinner} className="mt-5 w-full h-12 rounded-full bg-black text-white font-bold">Sort dinner out →</button>
            </div>

            {result && (
              <div className="bg-black text-white rounded- p-6">
                <p className="text- tracking-widest opacity-50">AKCHALLY SAYS</p>
                <h2 className="text- font-bold mt-2 leading-tight">{result.title}</h2>
                <p className="text- opacity-70 mt-2">{result.tag}</p>
                <div className="mt-3 flex gap-2 text-"><span className="px-2 py-1 rounded-full bg-white/10">{result.total} min total</span><span className="px-2 py-1 rounded-full bg-white/10">{result.pan}</span></div>
                <button onClick={()=>setCookMode(true)} className="mt-5 w-full h-12 rounded-full bg-white text-black font-bold">Cook this — hands-free →</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="px-5 py-4 flex justify-between items-center border-b bg-white sticky top-"><button onClick={()=>setCookMode(false)} className="text-">← Back</button><span className="text- font-bold uppercase">Cook mode</span><button onClick={()=>setShowRescue(true)} className="px-3 py-1 rounded-full bg-[#C56A4A] text-white text- font-bold">HELP</button></div>
            <div className="p-6 space-y-4">
              <div className="rounded- bg-black text-white p-6"><p className="text- opacity-50 uppercase">Now • Step {cookStep+1}</p><p className="mt-3 text- font-semibold">{result.steps[cookStep]}</p></div>
              <div className="grid grid-cols-2 gap-3"><button disabled={cookStep===0} onClick={()=>setCookStep(s=>Math.max(0,s-1))} className="h-12 rounded-full border bg-white disabled:opacity-30">← Prev</button><button onClick={()=>{if(cookStep<result.steps.length-1)setCookStep(s=>s+1); else setCookMode(false)}} className="h-12 rounded-full bg-black text-white">{cookStep===result.steps.length-1?'Done ✓':'Next →'}</button></div>
            </div>
            {showRescue && <div className="fixed inset-0 bg-black/40 backdrop-blur flex items-end p-4 z-50"><div className="w-full max-w- mx-auto bg-white rounded-t- p-6"><h3 className="font-bold">Rescue</h3><p className="text- mt-3">Too salty? Lemon/vinegar. Split? Off heat cold yoghurt whisk. Bland? Acid before salt.</p><button onClick={()=>setShowRescue(false)} className="mt-6 w-full h-12 rounded-full bg-black text-white">Back</button></div></div>}
          </div>
        )}
      </div>
    </div>
  )
}
