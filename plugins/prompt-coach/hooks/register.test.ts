import { expect, test } from 'claude-code/testing'

import { coach, recentContext } from './register'

test('vague prompts get a tip', () => {
  expect(coach('fix it', false)).toBeDefined()
  expect(coach('make this better please', false)).toBeDefined()
})

test('clear prompts, replies, commands and screenshots pass', () => {
  expect(coach('In src/app.ts, rename the login function to signIn and update its callers', false)).toBeUndefined()
  expect(coach('yes', false)).toBeUndefined()
  expect(coach('thanks!', false)).toBeUndefined()
  expect(coach('/sharpen fix it', false)).toBeUndefined()
  expect(coach('fix this', true)).toBeUndefined()
})

test('recent context keeps the last text messages, trimmed', () => {
  const rows = [
    { role: 'user' as const, text: 'old' },
    { role: 'assistant' as const, text: '' },
    { role: 'user' as const, text: 'what mods are there' },
    { role: 'assistant' as const, text: 'x'.repeat(700) },
  ]
  const out = recentContext(rows, 2, 600)
  expect(out.startsWith('User: what mods are there')).toBe(true)
  expect(out.includes('old')).toBe(false)
  expect(out.endsWith('...')).toBe(true)
})
