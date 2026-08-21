import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// AI Engine prompt for Akchally
const SYSTEM_PROMPT = `
You are Akchally - a voice-active kitchen assistant for akchally.com.
User says what ingredients they have, time, vibe.
You must:
1. Parse ingredients list (normalize: yoghurt=yogurt, bangers=sausage, etc)
2. Suggest 2-3 recipes that use ONLY what they have + pantry staples (oil, salt, pepper). No hallucinated ingredients.
3. Consider time: "not in a rush" = longer, more technique. "quick" = 20 min max.
4. Return JSON: { recipes: [{title, time, ingredients_used, missing[], steps[], spoken_intro}], spoken_response }
5. Keep spoken_response short, friendly, South African vibe.
6. During cooking, answer questions: next step, timers, substitutions.
`

app.post('/api/recipe', async (req,res)=>{
  const { transcript, timeVibe } = req.body
  // If no OpenAI key, return mock
  if(!process.env.OPENAI_API_KEY){
    return res.json({
      spoken_response: "I found 3 ideas with your bangers and potatoes. First up, hash with eggs!",
      recipes: [{ title: "Mock hash", time: "45 min", steps: ["Fry potatoes","Add bangers","Top with eggs"] }]
    })
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Pantry: ${transcript}. Time vibe: ${timeVibe}` }
    ],
    response_format: { type: "json_object" }
  })
  res.json(JSON.parse(completion.choices[0].message.content))
})

app.post('/api/ask', async (req,res)=>{
  const { question, currentRecipe, stepIndex } = req.body
  if(!process.env.OPENAI_API_KEY){
    return res.json({ answer: `For "${question}" - keep going! Next is step ${stepIndex+2}` })
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are Akchally standby chef. Answer short, voice-friendly, 1-2 sentences. Context: " + JSON.stringify(currentRecipe) },
      { role: "user", content: question }
    ]
  })
  res.json({ answer: completion.choices[0].message.content })
})

app.listen(3001, ()=> console.log('Akchally AI engine on :3001'))