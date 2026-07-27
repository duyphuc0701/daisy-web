import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  normalizePathname,
  resolveClientNavigation,
  resolveRoute,
} from '../src/routing.js'

describe('client-side route resolution', () => {
  it('normalizes trailing slashes without changing the root route', () => {
    assert.equal(normalizePathname('/'), '/')
    assert.equal(normalizePathname('/about///'), '/about')
  })

  it('resolves the home, about, and fallback routes', () => {
    assert.deepEqual(resolveRoute('/'), { name: 'home' })
    assert.deepEqual(resolveRoute('/about'), { name: 'about' })
    assert.deepEqual(resolveRoute('/unknown'), { name: 'home' })
  })

  it('resolves and decodes book identifiers', () => {
    assert.deepEqual(resolveRoute('/book/DAISY%201'), {
      name: 'book',
      params: { id: 'DAISY 1' },
    })
  })

  it('keeps malformed encoded identifiers usable', () => {
    assert.deepEqual(resolveRoute('/book/%E0%A4%A'), {
      name: 'book',
      params: { id: '%E0%A4%A' },
    })
  })

  it('allows only same-origin HTTP client navigation', () => {
    const currentUrl = 'https://library.example/books'

    assert.equal(
      resolveClientNavigation('/about', currentUrl).href,
      'https://library.example/about'
    )
    assert.equal(
      resolveClientNavigation('//attacker.example', currentUrl),
      null
    )
    assert.equal(
      resolveClientNavigation('javascript:alert(1)', currentUrl),
      null
    )
  })
})
