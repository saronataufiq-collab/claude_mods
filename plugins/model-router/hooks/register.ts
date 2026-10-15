import type { Register } from 'claude-code'

export type Route = 'chat' | 'quick' | 'full'

const MODELS = { chat: 'claude-haiku-5-5', quick: 'claude-sonnet-5-5' } as const

// Past this many messages the conversation is long enough that switching
// models (which loses the prompt cache) would cost more than it saves.
const MAX_MESSAGES = 12

const CHAT = /^(hi|hello|hey|thanks|thank you|thx|good (morning|night|evening)|how are you|ok|okay|cool|nice|great)\b[\s\w!?.,]{0,30}$/i
const QUESTION = /^(what|who|when|where|which|why|is|are|can|could|does|do|did|should|how (much|many|long|do i say)|define|meaning of|translate|tl;?dr|summari[sz]e)\b/i
const HARD = /\b(debug|error|bug|fix|refactor|build|implement|code|script|function|class|install|deploy|test|review|analy[sz]e|strategy|backtest|optimi[sz]e|plan|design|create|write|make|step by step|in detail|compare|research|ea|mql\d?|indicator|chart)\b/i
const TECHNICAL = /```|[{};]|[\/]\w|\.\w{2,4}\b|https?:|\b\d+(\.\d+)?\s*(lot|pips?|%)/i

// Picks a tier for a prompt. 'full' keeps the session's own model.
export const classify = (text: string, hasAttachments: boolean): Route => {
  const t = text.trim()
  if (!t || t.startsWith('/') || t.startsWith('!') || hasAttachments) return 'full'
  if (TECHNICAL.test(t) || HARD.test(t)) return 'full'

  const words = t.split(/\s+/).length
  if (words <= 8 && CHAT.test(t)) return 'chat'
  if (words <= 40 && QUESTION.test(t)) return 'quick'
  return 'full'
}

const isBigModel = (model: string) => /opus|fable/i.test(model)

export const register: Register = on => {
  let isOn = true
  let pending: Route = 'full'
  const routes = new Map<string, Route>()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'router',
      description: 'Model router: /router on, /router off, or /router to see its state',
    })

    return next(e)
  })

  on('command.run', { command: 'router' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on') isOn = true
    if (arg === 'off') isOn = false
    if (!isOn) $.ui.status(undefined)

    return {
      text: `Model router is ${isOn ? 'ON' : 'OFF'}. Quick questions go to Sonnet, greetings to Haiku, everything else stays on your chosen model. Start a prompt with "!" to force your own model for that message.`,
    }
  })

  on('prompt.submit', ($, e, next) => {
    pending = isOn ? classify(e.text, (e.attachments?.length ?? 0) > 0) : 'full'
    if (e.text.trim().startsWith('!')) {
      return next({ ...e, text: e.text.trim().slice(1).trim() || e.text })
    }

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    if (e.text) {
      routes.set(e.turnId, pending)
      pending = 'full'
    }

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const route = routes.get(e.turnId) ?? 'full'
    const canSwitch = isOn && route !== 'full' && !e.agentId && isBigModel(e.model) && e.messageCount <= MAX_MESSAGES

    if (!canSwitch) {
      if (e.index === 0 && !e.agentId && isOn) $.ui.status(undefined)
      return yield* next(e)
    }

    const model = MODELS[route]
    if (e.index === 0) $.ui.status(`router: ${route === 'chat' ? 'Haiku' : 'Sonnet'} for this message`)

    return yield* next(e.effort === undefined ? { ...e, model } : { ...e, model, effort: 'low' })
  })

  on('turn.complete', ($, e, next) => {
    if (routes.size > 50) routes.clear()

    return next(e)
  })
}
