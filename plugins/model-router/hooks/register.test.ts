import { expect, test } from 'claude-code/testing'

import { classify } from './register'

test('greetings go to the chat tier', () => {
  expect(classify('hi', false)).toBe('chat')
  expect(classify('thanks!', false)).toBe('chat')
})

test('simple questions go to the quick tier', () => {
  expect(classify('what is the capital of Japan?', false)).toBe('quick')
  expect(classify('how many ounces in a kilogram', false)).toBe('quick')
})

test('real work stays on the full model', () => {
  expect(classify('fix the bug in my EA', false)).toBe('full')
  expect(classify('what does this error in src/app.ts mean?', false)).toBe('full')
  expect(classify('why is the sky blue', true)).toBe('full')
  expect(classify('/sharpen something', false)).toBe('full')
  expect(classify('!what is 2+2', false)).toBe('full')
  expect(classify('write me a strategy for London open', false)).toBe('full')
})
