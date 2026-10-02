import fs from 'node:fs'
import path from 'node:path'
import * as acorn from 'acorn'
import * as walk from 'acorn-walk'

const hooksDir = path.resolve(process.cwd(), 'pocketbase/hooks')
console.log('Varrendo diretório de hooks:', hooksDir)

// Globais fornecidos pelo runtime Goja e PocketBase
const POCKETBASE_GLOBALS = new Set([
  '$app',
  '$http',
  '$apis',
  '$os',
  '$security',
  '$secrets',
  '$documents',
  '$ai',
  '$mails',
  '$filesystem',
  'Record',
  'Collection',
  'migrate',
  'routerAdd',
  'onModelBeforeCreate',
  'onModelAfterCreate',
  'onModelBeforeUpdate',
  'onModelAfterUpdate',
  'onModelBeforeDelete',
  'onModelAfterDelete',
  'onRecordBeforeCreateRequest',
  'onRecordAfterCreateRequest',
  'onRecordBeforeUpdateRequest',
  'onRecordAfterUpdateRequest',
  'onRecordBeforeDeleteRequest',
  'onRecordAfterDeleteRequest',
  'onRecordAuthWithPasswordRequest',
  'cronAdd',
  'console',
  'Date',
  'Math',
  'JSON',
  'String',
  'Number',
  'Boolean',
  'Array',
  'Object',
  'RegExp',
  'Error',
  'TypeError',
  'ReferenceError',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
  'encodeURI',
  'decodeURI',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'undefined',
  'NaN',
  'Infinity',
  'Map',
  'Set',
  'Promise',
  'Function',
  'Symbol',
])

let totalErrors = 0

function analyzeFile(filePath) {
  const fileName = path.basename(filePath)
  const code = fs.readFileSync(filePath, 'utf-8')

  let ast
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 2020,
      sourceType: 'script',
      locations: true,
    })
  } catch (parseErr) {
    console.error(
      `[SYNTAX ERROR] em ${fileName}: ${parseErr.message} na linha ${parseErr.loc ? parseErr.loc.line : '?'}`,
    )
    totalErrors++
    return
  }

  // Coletar escopos e referências
  // Usar visitor do acorn-walk
  const globalScope = new Set(POCKETBASE_GLOBALS)

  // Vamos rastrear escopos hierárquicos
  function checkScope() {
    const scopeStack = [new Set(POCKETBASE_GLOBALS)]
    const unresolvedReads = []

    function currentScopeHas(name) {
      for (let i = scopeStack.length - 1; i >= 0; i--) {
        if (scopeStack[i].has(name)) return true
      }
      return false
    }

    function declareInCurrentScope(name) {
      scopeStack[scopeStack.length - 1].add(name)
    }

    function declareInFunctionScope(name) {
      // Para var, sobe até o escopo de função ou global mais próximo
      for (let i = scopeStack.length - 1; i >= 0; i--) {
        if (scopeStack[i].isFunction || i === 0) {
          scopeStack[i].add(name)
          break
        }
      }
    }

    walk.ancestor(ast, {
      FunctionDeclaration(node, ancestors) {
        // Nome da função no escopo pai
        if (node.id) {
          declareInFunctionScope(node.id.name)
        }
      },
      VariableDeclaration(node) {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier') {
            if (node.kind === 'var') {
              declareInFunctionScope(decl.id.name)
            } else {
              declareInCurrentScope(decl.id.name)
            }
          } else if (decl.id.type === 'ObjectPattern') {
            for (const prop of decl.id.properties) {
              if (prop.value && prop.value.type === 'Identifier') {
                if (node.kind === 'var') declareInFunctionScope(prop.value.name)
                else declareInCurrentScope(prop.value.name)
              }
            }
          } else if (decl.id.type === 'ArrayPattern') {
            for (const el of decl.id.elements) {
              if (el && el.type === 'Identifier') {
                if (node.kind === 'var') declareInFunctionScope(el.name)
                else declareInCurrentScope(el.name)
              }
            }
          }
        }
      },
    })
  }

  console.log(`[PASS] Sintaxe acorn OK: ${fileName}`)
}

const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.js'))
for (const file of files) {
  analyzeFile(path.join(hooksDir, file))
}

if (totalErrors > 0) {
  console.error(`\nFalhas encontradas: ${totalErrors}`)
  process.exit(1)
} else {
  console.log(`\nTodos os ${files.length} arquivos de hooks passaram na análise!`)
}
