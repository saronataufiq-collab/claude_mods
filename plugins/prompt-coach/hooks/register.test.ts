import { expect, test } from 'claude-code/testing'

import { coach } from './register'

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
