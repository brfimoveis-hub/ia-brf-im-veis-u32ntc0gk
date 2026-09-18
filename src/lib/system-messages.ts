/**
 * Utilidades para detectar remetentes e mensagens de sistema / automação / verificação.
 *
 * Objetivo: filtrar lixo automatizado na tela de Atendimentos (IA)
 * para que o corretor e gestor (Mauro) vejam apenas atendimentos reais
 * de clientes humanos (WhatsApp, Instagram, Messenger).
 */

export interface SystemDetectionTarget {
  sender?: string
  content?: string
  customer_name?: string
  customer_phone?: string
  last_message?: string
  source?: string
  notes?: string
}

/**
 * Padrões de textos característicos de códigos de verificação de sistema (SMS/Meta/Instagram/WhatsApp).
 */
const VERIFICATION_CODE_PATTERNS: RegExp[] = [
  // Ex: "30433 é o teu código do Instagram. Não o partilhes."
  /\b(?:\d{4,8})\s+[ée]\s+o\s+teu\s+c[oó]digo/i,
  /\b(?:\d{4,8})\s+[ée]\s+o\s+seu\s+c[oó]digo/i,
  /\b(?:\d{4,8})\s+is\s+your\s+(?:Instagram|Facebook|WhatsApp|Meta|security|verification)\s+code/i,
  // "Não o partilhes", "não compartilhe", "don't share", "never share"
  /(?:n[aã]o\s+o\s+partilhe|n[aã]o\s+compartilhe|n[aã]o\s+divulgue|do\s*not\s+share|don'?t\s+share|never\s+share)/i,
  // "código do Instagram", "código de confirmação", "código de segurança", "código de verificação"
  /c[oó]digo\s+(?:do\s+instagram|do\s+whatsapp|do\s+facebook|da\s+meta|de\s+confirma[cç][aã]o|de\s+verifica[cç][aã]o|de\s+seguran[cç]a)/i,
  /instagram\s+code/i,
  /security\s+code/i,
  /verification\s+code/i,
  // Digitos curtos no inicio seguidos de mensagem típica de código
  /^\s*\d{4,8}\s*[-:]?\s*(?:c[oó]digo|code|é o|is your)\b/i,
]

/**
 * Padrões de mensagens puramente técnicas de sistema (como payloads raw não suportados de API)
 */
const SYSTEM_PAYLOAD_PATTERNS: RegExp[] = [
  /\[unsupported\s+Recebida\]/i,
  /\[unsupported\]/i,
  /Essa é uma mensagem automática\s*🤖\s*para avisar que este número é exclusivo para comunicados/i,
  /este número é exclusivo para comunicados e novidades,\s*sem atendimento humano/i,
]

/**
 * Números de telefone oficiais / conhecidos de gateways de sistema e SMS da Meta/Instagram/Facebook.
 * Ex: 447710173736 (SMS oficial Meta no Reino Unido/Global para 2FA de Instagram)
 */
const KNOWN_SYSTEM_PHONES = new Set(['447710173736', '+447710173736'])

/**
 * Nomes comuns atribuídos a contatos do sistema
 */
const KNOWN_SYSTEM_NAMES: RegExp[] = [
  /^facebook\s+business$/i,
  /^instagram\s+(?:business|security|code)$/i,
  /^meta\s+(?:business|security)$/i,
]

/**
 * Verifica se um texto de mensagem bate com padrões claros de código de verificação ou mensagem técnica de sistema.
 */
export function isSystemVerificationMessage(text?: string | null): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (!trimmed) return false

  for (const pattern of VERIFICATION_CODE_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }

  for (const pattern of SYSTEM_PAYLOAD_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }

  return false
}

/**
 * Normaliza número de telefone removendo qualquer caractere não numérico.
 */
function normalizeDigits(phone?: string | null): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Verifica se o telefone pertence a gateway/número curto de sistema ou número conhecido de SMS internacional de sistema.
 */
export function isSystemPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false
  const digits = normalizeDigits(phone)
  if (!digits) return false

  // Número exato da Meta/Instagram conhecido
  if (KNOWN_SYSTEM_PHONES.has(digits) || KNOWN_SYSTEM_PHONES.has(phone.trim())) {
    return true
  }

  // Short codes / números curtos de SMS (ex: 4 a 6 dígitos como 29000, 27185 etc.)
  if (digits.length >= 3 && digits.length <= 6) {
    return true
  }

  return false
}

/**
 * Verifica se o nome do cliente é claramente de sistema.
 */
export function isSystemCustomerName(name?: string | null): boolean {
  if (!name) return false
  const trimmed = name.trim()
  for (const pattern of KNOWN_SYSTEM_NAMES) {
    if (pattern.test(trimmed)) return true
  }
  return false
}

/**
 * Heurística consolidada: determina se uma thread ou conversa é de sistema / automação e deve ser ocultada da tela de Atendimentos.
 *
 * Casos cobertos:
 * 1. O sender é explicitamente 'system'
 * 2. O telefone é um número de SMS/gateway de sistema conhecido (ex: 447710173736 da Meta/Instagram)
 * 3. O nome do cliente é "Facebook Business", "Meta Business", etc.
 * 4. A mensagem contém código de verificação ("30433 é o teu código do Instagram. Não o partilhes", etc.)
 * 5. O remetente não tem nome real (apenas o número de telefone como nome, ex: "447710173736") e a mensagem é payload técnico
 *    ou aviso de "mensagem automática... sem atendimento humano".
 */
export function isAutomatedSystemThread(target: SystemDetectionTarget): boolean {
  if (!target) return false

  // 1. Remetente explícito do sistema
  if (target.sender === 'system') {
    return true
  }

  const phone = target.customer_phone || ''
  const name = target.customer_name || ''
  const message = target.last_message || target.content || ''
  const digitsPhone = normalizeDigits(phone)
  const digitsName = normalizeDigits(name)

  // 2. Telefone conhecido de gateway de sistema (ex: 447710173736)
  if (isSystemPhoneNumber(phone)) {
    return true
  }

  // 3. Nome de sistema cadastrado (ex: "Facebook Business")
  if (isSystemCustomerName(name)) {
    return true
  }

  // 4. Mensagem é código de verificação ou aviso automático de sistema
  if (isSystemVerificationMessage(message)) {
    return true
  }

  // 5. Se o nome do lead for exatamente o telefone (sem nome de lead) e o telefone for internacional +44 (UK gateway)
  // ou a mensagem for um aviso de ausência de humano / unsupported
  if (digitsName && digitsPhone && digitsName === digitsPhone) {
    // Lead que começa com 447 (UK mobile/gateway) sem nome de cliente
    if (digitsPhone.startsWith('447710173736')) {
      return true
    }
  }

  return false
}
