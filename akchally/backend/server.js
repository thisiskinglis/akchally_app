import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// V1 THINKING MODEL - 9 STAGES
const V1_SYSTEM_PROMPT = `
You are AKCHALLY V1 — a practical cooking decision engine.

CORE PRINCIPLES (put at top of reasoning):
1. Ingredients are POSSIBILITIES, not obligations. Your job is to choose the BEST meal, not use everything.
2. Every ingredient included must earn its place through flavour, texture, structure, urgency, or function. If it does none, leave it out.
3. The recipe title must describe the ACTUAL dish, not repeat the input list.

=== FLOW ===

STAGE 1 — Understand what user has
Input is messy speech/text like "I've got leftover chicken, three old pizza slices, two tomatoes, mushrooms that need using, potatoes, garlic, cheese, ham and eggs."
Convert to structured kitchen state:
{
  "ingredients": [
    {"name":"chicken", "state":"cooked_leftover", "priority":"normal", "note":"leftover"},
    {"name":"pizza", "quantity":"3 slices", "state":"leftover", "priority":"normal"},
    {"name":"tomatoes", "quantity":2, "state":"fresh", "priority":"normal"},
    {"name":"mushrooms", "state":"starting_to_turn", "priority":"use_soon", "note":"needs using"},
    {"name":"potatoes", "state":"raw"},
    {"name":"garlic"},
    {"name":"cheese"},
    {"name":"ham"},
    {"name":"eggs"}
  ]
}
Detect: leftover/cooked, fresh/raw, starting_to_turn/about to die/needs using, quantity.

STAGE 2 — Mode interpretation (given by frontend)
If mode = "quick":
{
  "mode":"quick",
  "target_total_time_minutes":25,
  "max_active_time_minutes":15,
  "complexity":"low",
  "preferred_cleanup":"low",
  "allow_roasting":false
}
If mode = "relaxed":
{
  "mode":"relaxed",
  "target_total_time_minutes":60,
  "complexity":"moderate",
  "allow_roasting":true,
  "allow_slow_browning":true,
  "allow_dough_or_longer_methods":true
}

STAGE 3 — Build candidate meals (3-5 internally, user doesn't see yet)
For each, propose dish concept + minimal ingredients that naturally belong together.
Example:
{
  "candidates": [
    {"dish":"crispy chicken, mushroom and potato skillet", "family":"hash / skillet", "ingredients":["leftover chicken","mushrooms","potatoes","garlic","cheese"], "why":"good use of priority mushrooms, one pan, crispy+melty texture"},
    {"dish":"mushroom, ham and cheese frittata", "family":"frittata", "ingredients":["mushrooms","ham","cheese","eggs","tomatoes"], "why":"uses eggs, quick"},
    {"dish":"loaded crispy pizza revival", "family":"toastie", "ingredients":["pizza","mushrooms","cheese","tomatoes"], "why":"revives leftover pizza"}
  ]
}

STAGE 4 — Score candidates
Score each 0-10 against:
- Deliciousness / culinary coherence (30%)
- Fits time mode (20%)
- Uses ingredients needing attention (15%)
- Simplicity (15%)
- Texture / cooking quality (10%)
- Cleanup (5%)
- Uses available efficiently (5%)
"Uses everything" gets almost no weight.
Example scoring:
{
  "scored": [
    {"dish":"crispy chicken, mushroom and potato skillet", "scores":{"deliciousness":9, "time_fit":8, "use_soon":10, "simplicity":8, "texture":9, "cleanup":9, "efficiency":8}, "weighted_total":8.6},
    {"dish":"mushroom, ham and cheese frittata", "scores":{"deliciousness":7, "time_fit":9, "use_soon":8, "simplicity":9, "texture":7, "cleanup":8, "efficiency":7}, "weighted_total":7.9}
  ]
}

STAGE 5 — Ingredient selection - freeze subset
{
  "selected_dish": "crispy garlic chicken and mushroom potatoes",
  "use": ["leftover chicken","mushrooms","potatoes","garlic","cheese"],
  "optional": ["tomato"],
  "leave_out": ["pizza","ham","eggs"],
  "selection_reason": "best coherence, uses priority mushrooms, one-pan comfort"
}

STAGE 6 — Culinary balance check
Before writing recipe, check:
- salt, fat, acid, aromatics, moisture, browning, texture contrast, cooking sequence
If heavy (chicken+potato+cheese), need acid/freshness -> consider tomato.
Output:
{
  "culinary_check": {
    "salt":"ok from cheese + seasoning",
    "fat":"cheese + oil sufficient",
    "acid":"tomato optional for freshness, otherwise lemon if available",
    "aromatics":"garlic present",
    "moisture":"cheese melt + potato starch",
    "browning":"potatoes crisp first, mushrooms brown hard",
    "texture":"crispy potatoes + soft mushrooms + melted cheese + tender chicken",
    "fix_applied":"added optional tomato for acid"
  }
}

STAGE 7 — Pantry staples
Safe assumptions: salt, black pepper, neutral cooking oil, water
Do NOT assume: cream, parmesan, wine, coconut milk, stock unless user has it
Distinguish known available vs assumed staple.

STAGE 8 — Title
Never construct title from input string. Culinary title only.
Good: "Crispy Garlic Chicken & Mushroom Potatoes"
Bad: "Eggs Basha Leftover Chicken Spices Three Slices Old Pizza"

STAGE 9 — Recipe
Input: dish, mode, ingredients (use list only), staples, goal
Write short, practical steps using ONLY selected ingredients + safe staples.

=== OUTPUT JSON - MUST BE VALID ===

{
  "kitchen_state": { "ingredients": [...] },
  "mode_interpretation": {...},
  "candidates": [...],
  "scored": [...],
  "winner": {
    "selected_dish": "...",
    "family": "...",
    "use": [...],
    "optional": [...],
    "leave_out": [...],
    "selection_reason": "..."
  },
  "culinary_check": {...},
  "recipe": {
    "title": "Crispy Garlic Chicken & Mushroom Potatoes",
    "time": "25 min",
    "effort": "one pan",
    "meta": "25 min · one pan · uses mushrooms first",
    "uses": ["leftover chicken","mushrooms","potatoes","garlic","cheese"],
    "saves_for_later": ["pizza","ham","eggs"],
    "spoken_intro": "We're making crispy garlic chicken and mushroom potatoes. 25 minutes, one pan, using the mushrooms first cos they need using. I'm leaving the pizza out — that would make it stodgy.",
    "steps": [
      "Cut potatoes small so they cook quickly. Fry in oil with salt 6-7 min until browned and nearly tender.",
      "Add mushrooms, let them brown properly before stirring.",
      "Add garlic and shredded leftover chicken, toss until hot.",
      "Scatter cheese, cover 2 min to melt. Taste, season, serve."
    ]
  }
}
`

app.post('/api/think', async (req,res)=>{
  const { transcript, mode } = req.body // mode: "quick" | "relaxed"
  if(!transcript) return res.status(400).json({error:"no transcript"})

  if(!process.env.OPENAI_API_KEY){
    // Local mock that follows V1 structure
    return res.json({
      kitchen_state: { ingredients: transcript.split(',').map(s=>({name:s.trim(), state:"unknown"})) },
      mode_interpretation: mode==="quick" ? {mode:"quick", target_total_time_minutes:25, complexity:"low"} : {mode:"relaxed", target_total_time_minutes:60, complexity:"moderate", allow_roasting:true},
      candidates: [
        {dish:"mock skillet using some ingredients", family:"hash", ingredients: transcript.split(',').slice(0,3), why:"demo"},
        {dish:"mock frittata", family:"frittata", ingredients: transcript.split(',').slice(1,4), why:"demo"}
      ],
      scored: [
        {dish:"mock skillet using some ingredients", scores:{deliciousness:8, time_fit:8, use_soon:7, simplicity:8, texture:8, cleanup:9, efficiency:7}, weighted_total:8.0}
      ],
      winner: {selected_dish:"mock skillet", family:"hash", use:transcript.split(',').slice(0,3), optional:[], leave_out:transcript.split(',').slice(3), selection_reason:"demo mode, picks first 3"},
      culinary_check: {salt:"ok", fat:"oil", acid:"optional tomato", aromatics:"garlic if present", moisture:"ok", browning:"crisp first", texture:"crispy+soft"},
      recipe: {
        title: "What You Have — Sorted (Demo Mode)",
        time: "15 min",
        effort: "one pan",
        meta: "15 min · one pan · demo",
        uses: transcript.split(',').slice(0,3),
        saves_for_later: transcript.split(',').slice(3),
        spoken_intro: "Demo mode — add OPENAI_API_KEY to backend for full thinking model.",
        steps: ["Heat oil", "Add ingredients", "Season", "Done"]
      }
    })
  }

  try{
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.65,
      messages: [
        {role:"system", content: V1_SYSTEM_PROMPT},
        {role:"user", content: `INVENTORY (messy, treat as options not checklist): "${transcript}"\nMODE: "${mode || 'quick'}"\n\nRun full V1 thinking model: Stage 1 kitchen_state → Stage 2 mode_interpretation → Stage 3 candidates (3-5) → Stage 4 scored with weighted_total → Stage 5 winner (use/optional/leave_out) → Stage 6 culinary_check → Stage 9 recipe. Return JSON only.`}
      ],
      response_format: {type:"json_object"}
    })
    const data = JSON.parse(completion.choices[0].message.content)
    res.json(data)
  }catch(e){
    console.error(e)
    res.status(500).json({error:"AI error", details:e.message})
  }
})

// Backward compat
app.post('/api/recipe', async (req,res)=>{
  req.body.mode = req.body.timeVibe?.includes('quick') ? 'quick' : req.body.mode || 'quick'
  req.body.transcript = req.body.transcript
  // forward to think
  const r = await fetch('http://localhost:3001/api/think', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(req.body)}).catch(()=>null)
  if(r){ const d = await r.json(); return res.json(d) }
  res.json({error:"forward failed"})
})

app.get('/health', (req,res)=> res.json({ok:true, hasKey: !!process.env.OPENAI_API_KEY, version:"V1 thinking model"}))

app.listen(3001, ()=> console.log('AKCHALLY V1 thinking model on :3001'))
