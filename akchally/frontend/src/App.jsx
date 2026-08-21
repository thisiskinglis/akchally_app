// This makes DOWNLOAD actually work
const [deferredPrompt, setDeferredPrompt] = useState(null)
useEffect(()=>{
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault(); setDeferredPrompt(e)
  })
},[])

const handleDownload = async () => {
  if(deferredPrompt){
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if(outcome==='accepted') setIsInstalled(true)
  } else {
    // iOS fallback — show Share → Add to Home Screen instructions
    setShowInstructions(true)
  }
}
