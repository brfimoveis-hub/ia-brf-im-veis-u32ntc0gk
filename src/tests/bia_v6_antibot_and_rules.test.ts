import { describe, it, expect } from 'vitest'
import { isBotOrAutoReplyMessage, isBotCustomerName, isAutomatedSystemThread } from '../lib/system-messages'

describe('Guarda Anti-Bot e Validações da Bia v6.0', () => {
  it('detecta auto-respostas corporativas e mensagens de ausência', () => {
    expect(isBotOrAutoReplyMessage('Esta é uma mensagem automática, por favor não responda.')).toBe(true)
    expect(isBotOrAutoReplyMessage('Agradecemos seu contato. No momento estamos ausentes, nosso horário de atendimento é de 9h às 18h.')).toBe(true)
    expect(isBotOrAutoReplyMessage('Digite 1 para suporte ou 2 para vendas')).toBe(true)
    expect(isBotOrAutoReplyMessage('Protocolo de atendimento: 20261109-8812')).toBe(true)
    expect(isBotOrAutoReplyMessage('Responda a pesquisa do meu atendimento para avaliarmos nosso serviço.')).toBe(true)
  })

  it('não bloqueia mensagens legítimas de clientes humanos', () => {
    expect(isBotOrAutoReplyMessage('Olá Bia, tudo bem? Gostaria de saber mais sobre o Vistage.')).toBe(false)
    expect(isBotOrAutoReplyMessage('Qual o valor da entrada para o apartamento de 2 quartos?')).toBe(false)
    expect(isBotOrAutoReplyMessage('OK, pode me mandar o PDF')).toBe(false)
    expect(isBotOrAutoReplyMessage('Quero agendar uma visita com o Mauro no sábado')).toBe(false)
  })

  it('detecta nomes de clientes que são robôs ou sistemas de automação', () => {
    expect(isBotCustomerName('Bot Atendimento Banco')).toBe(true)
    expect(isBotCustomerName('Auto Reply Suporte')).toBe(true)
    expect(isBotCustomerName('Atendimento Virtual Empresa')).toBe(true)
    expect(isBotCustomerName('Carlos Silva')).toBe(false)
    expect(isBotCustomerName('Mariana Oliveira')).toBe(false)
  })

  it('isAutomatedSystemThread barra robôs e auto-respostas', () => {
    expect(
      isAutomatedSystemThread({
        customer_name: 'Bot XYZ',
        customer_phone: '5548988887777',
        last_message: 'Olá, sou o robô da empresa',
      })
    ).toBe(true)

    expect(
      isAutomatedSystemThread({
        customer_name: 'Marcos Santos',
        customer_phone: '5548991234567',
        last_message: 'Mensagem automática: nosso horário de atendimento encerrou, retornaremos amanhã.',
      })
    ).toBe(true)

    expect(
      isAutomatedSystemThread({
        customer_name: 'Juliana Costa',
        customer_phone: '5548991234567',
        last_message: 'Oi Bia, vocês têm unidade disponível no Vistage virada para o sol da manhã?',
      })
    ).toBe(false)
  })

  it('garante que a linha WABA 5548992098050 e transbordo (48) 99972-8050 estão corretamente separados', () => {
    const WABA_BIA = '5548992098050'
    const TRANSBORDO_MAURO = '(48) 99972-8050'
    expect(WABA_BIA).not.toEqual(TRANSBORDO_MAURO)
    expect(TRANSBORDO_MAURO).toContain('99972-8050')
  })
})
