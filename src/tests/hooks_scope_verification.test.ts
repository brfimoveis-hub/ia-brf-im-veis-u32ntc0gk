import fs from 'node:fs'
import path from 'node:path'
import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { describe, it, expect } from 'vitest'

describe('Validação Estática de Identificadores e Referências em Hooks PocketBase (Goja)', () => {
  const hooksDir = path.resolve(process.cwd(), 'pocketbase/hooks')
  const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'))

  const POCKETBASE_GLOBALS = new Set([
    '$app', '$http', '$apis', '$os', '$security', '$secrets', '$documents',
    '$ai', '$mails', '$filesystem', 'Record', 'Collection', 'migrate',
    'routerAdd', 'onModelBeforeCreate', 'onModelAfterCreate',
    'onModelBeforeUpdate', 'onModelAfterUpdate',
    'onModelBeforeDelete', 'onModelAfterDelete',
    'onRecordBeforeCreateRequest', 'onRecordAfterCreateRequest',
    'onRecordBeforeUpdateRequest', 'onRecordAfterUpdateRequest',
    'onRecordBeforeDeleteRequest', 'onRecordAfterDeleteRequest',
    'onRecordAuthWithPasswordRequest', 'cronAdd',
    'console', 'Date', 'Math', 'JSON', 'String', 'Number', 'Boolean',
    'Array', 'Object', 'RegExp', 'Error', 'TypeError', 'ReferenceError',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
    'decodeURIComponent', 'encodeURI', 'decodeURI', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'undefined', 'NaN', 'Infinity', 'Map', 'Set',
    'Promise', 'Function', 'Symbol', 'arguments'
  ])

  hookFiles.forEach((file) => {
    it(`Hook ${file} não deve ter erros de sintaxe ou referências inválidas`, () => {
      const code = fs.readFileSync(path.join(hooksDir, file), 'utf-8')
      let ast
      expect(() => {
        ast = acorn.parse(code, {
          ecmaVersion: 2020,
          sourceType: 'script',
          locations: true,
        })
      }).not.toThrow()
    })
  })

  it('ai_auto_reply.js deve declarar e definir isFreeSearchIntent e variáveis essenciais', () => {
    const code = fs.readFileSync(path.join(hooksDir, 'ai_auto_reply.js'), 'utf-8')
    expect(code).toContain('var isFreeSearchIntent = false')
    expect(code).toContain('var detectedSpecificPropertyQuery = false')
    expect(code).toContain('var targetSpecificProp = null')
    expect(code).toContain('var matchedProps = []')
  })
})
