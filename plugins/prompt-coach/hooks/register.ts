import type { Register } from 'claude-code'

// Short replies that are fine on their own in a conversation.
const REPLIES = /^(y|yes|yeah|yep|no|nope|ok|okay|sure|thanks|thank you|thx|go|go ahead|do it|continue|proceed|stop|done|lgtm|perfect|great|nice|cool)[.! ]*$/i

const VAGUE_WORDS = /\b(it|this|that|thing|stuff|something|better|nicer|properly|work|fix|improve|update|change)\b/i
const SPECIFIC = /[\/.:]\w|`|"|\d|https?:/

// Returns a coaching tip for a vague prompt, or undefined when it reads clear.
export const coach = (text: string, hasAttachments: boolean): string | undefined => {
  const t = text.trim()
  if (!t || t.startsWith('/') || REPLIES.test(t) || hasAttachments) return undefined

  const words = t.split(/\s+/).length
  if (words >= 15 || SPECIFIC.test(t)) return undefined

  if (words <= 3) {
    return 'Very short prompt. Add what you want done, where (file, page, app), and what "done" looks like. Tip: /sharpen <idea> rewrites it for you.'
  }
  if (VAGUE_WORDS.test(t)) {
    return 'Vague words like "it", "fix" or "better" make me guess. Name the thing, say what is wrong now, and what result you expect. Tip: /sharpen <idea>.'
  }
  return undefined
}

const SHARPEN_RULES = `You rewrite a user's rough request into a clear prompt for Claude Code, the AI assistant the user is talking to (desktop app and terminal).
In this setting "mods", "plugins", "skills", "hooks", "commands", "sessions" and "models" mean Claude Code ones, not games or other software, unless the conversation clearly says otherwise.
Use the recent conversation, when given, to fill in what the user means; never quote it back at length.
Keep the user's intent and language. Do not invent facts, files or numbers; where something important is missing, add a short [fill in: ...] placeholder.
Structure it as:
Goal: one sentence.
Context: what exists now / relevant files or data (placeholders if unknown).
Requirements: 2-5 bullets.
Done when: how to tell it worked.
Output only the rewritten prompt, nothing else. Keep it under 150 words.`

type Row = { role: 'user' | 'assistant'; text: string }

// The last few text messages of the conversation, trimmed, for /sharpen to read.
export const recentContext = (rows: readonly Row[], count = 6, maxChars = 600): string =>
  rows
    .filter(row => row.text.trim() !== '')
    .slice(-count)
    .map(row => {
      const text = row.text.trim().replace(/\s+/g, ' ')
      return `${row.role === 'user' ? 'User' : 'Claude'}: ${text.length > maxChars ? `${text.slice(0, maxChars)}...` : text}`
    })
    .join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sharpen',
      description: 'Rewrite a rough idea into a clear prompt (add --send to send it right away)',
    })

    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    if (e.origin.kind === 'composer' || e.origin.kind === 'bridge') {
      const tip = coach(e.text, (e.attachments?.length ?? 0) > 0)
      if (tip) $.ui.toast(tip)
    }

    return next(e)
  })

  on('command.run', { command: 'sharpen' }, async ($, e) => {
    let idea = e.args.trim()
    const send = /(^|\s)--send(\s|$)/.test(idea)
    idea = idea.replace(/(^|\s)--send(\s|$)/, ' ').trim()

    if (!idea) {
      return { text: 'Usage: /sharpen <your rough idea>   (add --send to send the result straight away)' }
    }

    let context = ''
    try {
      context = recentContext(await $.session.messages())
    } catch {
      context = ''
    }
    const prompt = context
      ? `Recent conversation:
${context}

Rough request to rewrite:
${idea}`
      : idea

    const r = await $.model.complete({
      model: 'haiku',
      system: SHARPEN_RULES,
      prompt,
      effort: 'low',
      maxTokens: 600,
      timeoutMs: 30000,
    })

    if (!r.isAnswered) {
      return { text: `Could not sharpen that prompt (${r.reason}). Try again.` }
    }

    const sharpened = r.text.trim()
    if (send) {
      await $.prompt.submit({ text: sharpened, asUser: true })
      return { text: `Sent this sharpened prompt:\n\n${sharpened}` }
    }

    return { text: `Sharpened prompt (copy, fill any [fill in] parts, and send):\n\n${sharpened}` }
  })
}
