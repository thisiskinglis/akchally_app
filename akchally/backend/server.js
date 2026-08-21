import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// === WEIGHTS ===
const WEIGHTS = {
  deliciousness: 0.30,
  time_fit: 0.20,
  use_soon: 0.15,
  simplicity: 0.15,
  texture: 0.10,
  cleanup: 0.05,
  efficiency: 0.05
}
function calculateWeightedTotal(scores){
  return Math.round((
    scores.deliciousness * WEIGHTS.deliciousness +
    scores.time_fit * WEIGHTS.time_fit +
    scores.use_soon * WEIGHTS.use_soon +
    scores.simplicity * WEIGHTS.simplicity +
    scores.texture * WEIGHTS.texture +
    scores.cleanup * WEIGHTS.cleanup +
    scores.efficiency * WEIGHTS.efficiency
  ) * 10) / 10
}

// === SCHEMA V1 (kept from previous) ===
const AKCHALLY_V1_SCHEMA = {
  name: "akchally_v1_thinking_model",
  strict: true,
  schema: {
    type: "object",
    properties: {
      kitchen_state: {
        type: "object",
        properties: {
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: ["string","null"] },
                state: { type: "string", enum: ["fresh","raw","cooked_leftover","leftover","starting_to_turn","opened","unknown"] },
                intent: { type: "string", enum: ["required","priority","available"] },
                priority: { type: "string", enum: ["use_soon","normal"] },
                note: { type: ["string","null"] }
              },
              required: ["name","state","intent","priority"],
              additionalProperties: false
            }
          }
        },
        required: ["ingredients"],
        additionalProperties: false
      },
      mode_interpretation: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["quick","relaxed"] },
          target_total_time_minutes: { type: "integer" },
          max_active_time_minutes: { type: ["integer","null"] },
          complexity: { type: "string", enum: ["low","moderate","higher"] },
          preferred_cleanup: { type: ["string","null"], enum: ["low","moderate", null] },
          allow_roasting: { type: "boolean" },
          allow_slow_browning: { type: "boolean" },
          allow_dough_or_longer_methods: { type: "boolean" }
        },
        required: ["mode","target_total_time_minutes","complexity","allow_roasting","allow_slow_browning","allow_dough_or_longer_methods"],
        additionalProperties: false
      },
      candidates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dish: { type: "string" },
            family: { type: "string" },
            ingredients: { type: "array", items: { type: "string" } },
            why: { type: "string" }
          },
          required: ["dish","family","ingredients","why"],
          additionalProperties: false
        }
      },
      scored: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dish: { type: "string" },
            scores: {
              type: "object",
              properties: {
                deliciousness: { type: "integer", minimum: 0, maximum: 10 },
                time_fit: { type: "integer", minimum: 0, maximum: 10 },
                use_soon: { type: "integer", minimum: 0, maximum: 10 },
                simplicity: { type: "integer", minimum: 0, maximum: 10 },
                texture: { type: "integer", minimum: 0, maximum: 10 },
                cleanup: { type: "integer", minimum: 0, maximum: 10 },
                efficiency: { type: "integer", minimum: 0, maximum: 10 }
              },
              required: ["deliciousness","time_fit","use_soon","simplicity","texture","cleanup","efficiency"],
              additionalProperties: false
            }
          },
          required: ["dish","scores"],
          additionalProperties: false
        }
      },
      winner: {
        type: "object",
        properties: {
          selected_dish: { type: "string" },
          family: { type: "string" },
          use: { type: "array", items: { type: "string" } },
          optional: { type: "array", items: { type: "string" } },
          leave_out: { type: "array", items: { type: "string" } },
          selection_reason: { type: "string" }
        },
        required: ["selected_dish","family","use","optional","leave_out","selection_reason"],
        additionalProperties: false
      },
      culinary_check: {
        type: "object",
        properties: {
          salt: { type: "string" },
          fat: { type: "string" },
          acid: { type: "string" },
          aromatics: { type: "string" },
          moisture: { type: "string" },
          browning: { type: "string" },
          texture: { type: "string" },
          fix_applied: { type: ["string","null"] }
        },
        required: ["salt","fat","acid","aromatics","moisture","browning","texture"],
        additionalProperties: false
      },
      recipe: {
        type: "object",
        properties: {
          title: { type: "string" },
          time: { type: "string" },
          effort: { type: "string" },
          meta: { type: "string" },
          uses: { type: "array", items: { type: "string" } },
          saves_for_later: { type: "array", items: { type: "string" } },
          spoken_intro: { type: "string" },
          steps: { type: "array", items: { type: "string" } }
        },
        required: ["title","time","effort","meta","uses","saves_for_later","spoken_intro","steps"],
        additionalProperties: false
      },
      validation: {
        type: "object",
        properties: {
          no_invented_ingredients: { type: "boolean" },
          uses_only_selected: { type: "boolean" },
          title_is_dish_not_list: { type: "boolean" },
          timing_realistic: { type: "boolean" },
          food_safety_ok: { type: "boolean" },
          passes: { type: "boolean" },
          notes: { type: "string" }
        },
        required: ["no_invented_ingredients","uses_only_selected","title_is_dish_not_list","timing_realistic","food_safety_ok","passes","notes"],
        additionalProperties: false
      }
    },
    required: ["kitchen_state","mode_interpretation","candidates","scored","winner","culinary_check","recipe","validation"],
    additionalProperties: false
  }
}

// === HELP SCHEMA ===
const HELP_SCHEMA = {
  name: "akchally_help_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["rescue","clarification","substitution","timing","doneness","flavour_correction","safety","equipment","general"] },
      spoken_response: { type: "string", description: "Short enough to hear while cooking, immediate action first" },
      updated_current_step: { type: ["string","null"], description: "Rewritten current step if question changes it" },
      updated_future_steps: { type: ["array","null"], items: { type: "string" }, description: "If change affects later steps, modify them" },
      session_updates: {
        type: "object",
        properties: {
          substitutions: { type: "array", items: { type: "string" } },
          active_timers: { 
            type: "array", 
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                minutes: { type: "integer" }
              },
              required: ["label","minutes"],
              additionalProperties: false
            }
          },
          completed_steps: { type: ["array","null"], items: { type: "integer" } }
        },
        required: ["substitutions","active_timers"],
        additionalProperties: false
      },
      recipe_changed: { type: "boolean" },
      quick_action: { type: "string", description: "One-line immediate action, e.g. Turn heat down now" }
    },
    required: ["type","spoken_response","session_updates","recipe_changed","quick_action"],
    additionalProperties: false
  }
}

const V1_SYSTEM_PROMPT = `
You are AKCHALLY V1 — a practical cooking decision engine.
MOST IMPORTANT: Choose the most delicious, coherent meal possible from what is available — not try to use everything. Every ingredient must earn its place.
Ingredients are possibilities, not obligations. Never use ingredient simply because mentioned.

Stages: 1 kitchen_state with intent (required=want to use/need to use/definitely use, priority=about to die/going funny/needs using/opened days ago, available=rest) + state, 2 mode interpretation quick 25min low vs relaxed 60min roasting, 3 candidates 3-5 dish families (pasta, frittata, roast tray, stir-fry, soup, toastie, curry, bowl, hash/skillet), 4 scoring 0-10 individual only, 5 winner use/optional/leave_out MUST include required, 6 culinary check salt/fat/acid/aromatics/moisture/browning/texture, 7 pantry safe salt/pepper/oil/water never assume cream/parmesan/wine, 8 title culinary not list, 9 recipe ONLY winner.use + safe staples, 10 validation.
`

const HELP_SYSTEM_PROMPT = `
You are AKCHALLY HELP — cooking rescue inside an active cook session.

You have full context: recipe title, selected ingredients, current step, completed steps, substitutions, active timers.

RULES:
1. Answer using current recipe and current step context. Never make user explain whole recipe again.
2. Identify question type: clarification, substitution, cooking failure/rescue, timing, doneness, flavour correction, safety, equipment alternative
3. Give immediate action FIRST, then brief why.
4. Keep answers short enough to hear while cooking — 1-3 sentences spoken, max 40 words ideally, but can be slightly longer if needed.
5. If user changes ingredient/method, update cook session state (substitutions, active_timers).
6. Never invent ingredients user has not confirmed, except known pantry staples (salt, pepper, neutral oil, water).
7. Do not restart or regenerate whole recipe unless necessary.
8. Preserve completed steps and continue from current position.
9. If change affects later steps, modify those later steps automatically (return updated_future_steps).
10. Food safety is critical: leftover chicken must be reheated to steaming, chicken cooked through, etc.
11. Be conversational, South African friendly, calm, direct.

Examples:
User: "My sauce is too thick" → quick_action: "Add splash water now" spoken: "Add a small splash of water now, stir. It'll loosen with the cheese. If still thick, another splash."
User: "Can I use yoghurt instead of cream?" → substitution, explain, update session
User: "Potatoes still hard" → rescue, timing, maybe timer
User: "Too much salt" → flavour correction, rescue with acid/potato/water
User: "What does brown hard mean?" → clarification

Return JSON matching HELP schema exactly.
`

function jsValidate(result){
  const errors = []
  const usesIsSubset = result.recipe.uses.every(u => result.winner.use.some(w=> w.toLowerCase().includes(u.toLowerCase()) || u.toLowerCase().includes(w.toLowerCase())))
  if(!usesIsSubset) errors.push('recipe.uses not subset of winner.use')
  const timeNum = parseInt(result.recipe.time) || 0
  if(timeNum < 5 || timeNum > 120) errors.push('unrealistic time')
  const required = result.kitchen_state.ingredients.filter(i=>i.intent==='required').map(i=>i.name.toLowerCase())
  const usedLower = result.winner.use.map(u=>u.toLowerCase()).join(' ')
  for(const r of required){ if(!usedLower.includes(r)) errors.push(`required ${r} not in use`) }
  const passes = errors.length===0 && result.validation?.passes !== false
  return { passes, errors, js_notes: errors.length? errors.join('; ') : 'passes' }
}

async function thinkDinner(transcript, mode='quick', attempt=1){
  if(!process.env.OPENAI_API_KEY) throw new Error('No OPENAI_API_KEY')
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    messages: [
      {role:"system", content: V1_SYSTEM_PROMPT},
      {role:"user", content: `INVENTORY (detect required/priority intent): "${transcript}"\nMODE: "${mode}"\nReturn JSON matching schema.`}
    ],
    response_format: { type: "json_schema", json_schema: AKCHALLY_V1_SCHEMA }
  })
  const data = JSON.parse(completion.choices[0].message.content)
  data.scored = data.scored.map(s=> ({...s, weighted_total: calculateWeightedTotal(s.scores)}))
  data.scored.sort((a,b)=> b.weighted_total - a.weighted_total)
  const jsVal = jsValidate(data)
  data.validation.js_validation = jsVal
  data.validation.passes = data.validation.passes && jsVal.passes
  if(!jsVal.passes) data.validation.notes += ` | JS: ${jsVal.js_notes}`
  if(!data.validation.passes && attempt < 2){
    console.log(`Validation failed attempt ${attempt}:`, jsVal.errors, '— regenerating...')
    return thinkDinner(transcript, mode, attempt+1)
  }
  const publicView = {
    title: data.recipe.title,
    time: data.recipe.time,
    effort: data.recipe.effort,
    meta: data.recipe.meta,
    uses: data.recipe.uses,
    saves_for_later: data.recipe.saves_for_later,
    spoken_intro: data.recipe.spoken_intro,
    steps: data.recipe.steps,
    family: data.winner.family,
    dish_concept: data.winner.selected_dish
  }
  return { ...data, public: publicView }
}

async function helpCook(session, question){
  if(!process.env.OPENAI_API_KEY) throw new Error('No OPENAI_API_KEY')
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    messages: [
      { role: "system", content: HELP_SYSTEM_PROMPT },
      { role: "user", content: `COOK SESSION:\n${JSON.stringify(session, null, 2)}\n\nUSER QUESTION: "${question}"\n\nAnswer as HELP interrupting active cook. Immediate action first. Short spoken. Update session if needed. Return JSON matching HELP schema.` }
    ],
    response_format: { type: "json_schema", json_schema: HELP_SCHEMA }
  })
  return JSON.parse(completion.choices[0].message.content)
}

// === ROUTES ===

app.post('/api/think', async (req,res)=>{
  const { transcript, mode } = req.body
  if(!transcript) return res.status(400).json({error:"transcript required"})
  try{
    const result = await thinkDinner(transcript, mode||'quick')
    res.json(result)
  }catch(e){
    console.error(e)
    res.status(500).json({error:e.message})
  }
})

app.post('/api/recipe', async (req,res)=>{
  const transcript = req.body.transcript
  const mode = req.body.mode || (req.body.timeVibe?.includes('quick') ? 'quick' : 'quick')
  if(!transcript) return res.status(400).json({error:"transcript required"})
  try{
    const result = await thinkDinner(transcript, mode)
    res.json(result)
  }catch(e){
    res.status(500).json({error:e.message})
  }
})

app.post('/api/cook/help', async (req,res)=>{
  const { session, question } = req.body
  if(!session || !question) return res.status(400).json({error:"session and question required"})

  if(!process.env.OPENAI_API_KEY){
    // Demo fallback
    return res.json({
      type: "general",
      spoken_response: "Demo mode — add OPENAI_API_KEY. For your question: keep heat medium, add splash water, taste as you go.",
      updated_current_step: null,
      updated_future_steps: null,
      session_updates: { substitutions: [], active_timers: [] },
      recipe_changed: false,
      quick_action: "Keep cooking, medium heat"
    })
  }

  try{
    const result = await helpCook(session, question)
    res.json(result)
  }catch(e){
    console.error('HELP error', e)
    res.status(500).json({error:e.message})
  }
})

app.get('/health', (req,res)=> res.json({ok:true, hasKey: !!process.env.OPENAI_API_KEY, version:"V1.2 + HELP + cook_session"}))

const PORT = process.env.PORT || 3001
app.listen(PORT, ()=> console.log(`AKCHALLY V1.2 — thinkDinner + HELP cook_session on :${PORT}`))
