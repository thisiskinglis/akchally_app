import { useState, useEffect } from 'react'

export default function App(){
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isAppView, setIsAppView] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [platform, setPlatform] = useState('android')

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
    else { setShowHelp(true) }
  }

  const [have,setHave]=useState("eggs, butter, garlic, pasta, spinach that's about to die")
  const [effort,setEffort]=useState(0)
  const [result,setResult]=useState(null)
  const [cookMode,setCookMode]=useState(false)
  const [step,setStep]=useState(0)

  const sortDinner=()=>{
    const recipes = {
      0:{title:"Garlic butter pasta + greens", tag:"One pan, no decisions. 18 min.", steps:["Boil water heavily salted. Pasta in 9 min.","Butter low, garlic sliced, don't burn.","2 ladles pasta water into butter — emulsify.","Drain pasta toss, greens wilt 1 min.","Cheese pepper done."]},
      1:{title:"Sheet pan chicken + veg", tag:"Chop, tray, oven. 32 min total, 12 min from you.", steps:["Oven 220C. Tray oil paprika veg first chicken on top 25 min.","Shake tray at 15 min.","Rest 3 min lemon."]},
      2:{title:"Miso butter noodles", tag:"A bit more effort, big payoff. 28 min.", steps:["Boil noodles save 1 cup water.","Butter miso garlic melt.","Noodles in toss splash water glossy.","Fry egg greens.","Bowl noodles greens egg chili."]}
    }
    setResult(recipes[effort]); setCookMode(false); setStep(0)
  }

  if(!isAppView){
    return (
      <div className="min-h-screen bg-[#FAF7F1] flex justify-center">
        <div className="w-full max-w- px-6 py-10 flex flex-col min-h-screen">
          <header className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#7D846E]"></div><span className="font-bold">akchally</span><span className="text- ml-2 text-[#7D846E]">gets dinner handled</span></header>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w- h- rounded- bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] border flex items-center justify-center"><div className="w-14 h-2 bg-[#7D846E] rotate-[-12deg] rounded-full"/><div className="w-4 h-4 bg-[#C56A4A] rounded-full ml-2 mt-5"/></div>
            <h1 className="mt-8 text- font-bold leading-[0.9] tracking-tight">Gets dinner<br/>handled.</h1>
            <p className="mt-4 text- text-[#7D846E] max-w-">Not another recipe app. Tell me what you've got, I sort dinner out.</p>
            <button onClick={handleDownload} className="mt-8 w-full h- rounded-full bg-black text-white font-bold tracking-widest">DOWNLOAD</button>
            <p className="mt-3 text- opacity-40">Free • No App Store • Voice-first • One pan option</p>
            <button onClick={()=>setIsAppView(true)} className="mt-8 text- underline opacity-50">Already have it? Open app →</button>
          </div>
          {showHelp && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur flex items-end p-4 z-50">
              <div className="w-full bg-white rounded- p-6 max-w- mx-auto">
                <h3 className="font-bold text-">Install Akchally</h3>
                {platform==='ios'? <p className="mt-3 text-">1. Tap Share (square with arrow) in Safari<br/>2. Tap Add to Home Screen<br/>Your sage icon lands on home screen.</p> : <p className="mt-3 text-">Tap Add to Home Screen when prompted. Icon lands on phone.</p>}
                <button onClick={()=>{setShowHelp(false); setIsAppView(true)}} className="mt-5 w-full h-12 rounded-full bg-black text-white font-bold">Got it, open app</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F1] flex justify-center">
      <div className="w-full max-w- min-h-screen flex flex-col">
        <header className="px-5 py-4 flex justify-between items-center border-b border-black/5 bg-[#FAF7F1] sticky top-0"><div className="font-bold">akchally</div><button onClick={()=>setIsAppView(false)} className="text- px-3 py-1 rounded-full bg-black text-white">DOWNLOAD PAGE</button></header>
        {!cookMode? (
          <div className="p-5 space-y-5">
            <div className="bg-white rounded- p-5 border">
              <p className="text- font-bold tracking-widest opacity-40">WHAT HAVE YOU GOT?</p>
              <textarea value={have} onChange={e=>setHave(e.target.value)} className="w-full mt-3 p-3 bg-[#FAF7F1] rounded-xl border min-h- text-" />
              <p className="mt-4 text- font-bold tracking-widest opacity-40">HOW MUCH EFFORT?</p>
              <div className="grid grid-cols-3 gap-2 mt-2">{[{k:0,l:'Bare minimum'},{k:1,l:'Normal'},{k:2,l:'Feel like cooking'}].map(o=><button key={o.k} onClick={()=>setEffort(o.k)} className={`p-3 rounded-xl border text- font-bold ${effort===o.k?'bg-black text-white':'bg-[#FAF7F1]'}`}>{o.l}</button>)}</div>
              <button onClick={sortDinner} className="mt-5 w-full h-12 rounded-full bg-black text-white font-bold">Sort dinner out →</button>
            </div>
            {result && <div className="bg-black text-white rounded- p-6"><p className="text- opacity-50 tracking-widest">AKCHALLY SAYS</p><h2 className="text- font-bold mt-2">{result.title}</h2><p className="text- opacity-70 mt-2">{result.tag}</p><button onClick={()=>setCookMode(true)} className="mt-5 w-full h-12 rounded-full bg-white text-black font-bold">Cook this — hands-free →</button></div>}
          </div>
        ) : (
          <div className="flex-1">
            <div className="px-5 py-4 flex justify-between items-center border-b bg-white sticky top-"><button onClick={()=>setCookMode(false)} className="text-">← Back</button><span className="text- font-bold">COOK MODE</span><button onClick={()=>alert('Too salty? Lemon/vinegar. Split? Off heat cold yoghurt whisk. Bland? Acid before salt.')} className="px-3 py-1 rounded-full bg-[#C56A4A] text-white text- font-bold">HELP</button></div>
            <div className="p-6 space-y-4"><div className="rounded- bg-black text-white p-6"><p className="text- opacity-50">STEP {step+1}</p><p className="text- font-semibold mt-3">{result.steps[step]}</p></div><div className="grid grid-cols-2 gap-3"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))} className="h-12 rounded-full border bg-white disabled:opacity-30">Prev</button><button onClick={()=>{if(step<result.steps.length-1)setStep(s=>s+1); else setCookMode(false)}} className="h-12 rounded-full bg-black text-white">{step===result.steps.length-1?'Done ✓':'Next →'}</button></div></div>
          </div>
        )}
      </div>
    </div>
  )
}
