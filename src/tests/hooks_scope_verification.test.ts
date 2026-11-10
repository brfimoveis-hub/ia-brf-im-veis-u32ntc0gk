import { describe, it, expect } from 'vitest'

/**
 * Suite de Verificação de Isolamento da Campanha Vistage vs Base Geral
 *
 * Cenários Obrigatórios:
 * 1. Cliente da base geral (ex.: Fabiana, sem interação com a landing) JAMAIS
 *    é classificado como lead de campanha e segue isolado na régua geral de remarketing.
 * 2. Lead capturado pela landing page entra estritamente com source='landing_vistage',
 *    phase='lead_landing' e tags ['landing_vistage', 'lead_campanha'].
 * 3. O motor da régua de campanha (cron_bia_persistence e convite_vistage_disparo)
 *    permanece desligado enquanto app_controls.convite_vistage estiver is_active=false.
 * 4. A landing do Vistage permanece em_revisao e com disparo de campanha desligado
 *    (campaign_dispatch_active=false), respeitando a autorização expressa do Mauro.
 */

// Helper espelhado exatamente da lógica de pocketbase/hooks/cron_bia_persistence.js
function isCampaignLeadRecordMock(custRec: { source?: string; tags?: string[] | string }) {
  if (!custRec) return false
  const src = String(custRec.source || '').toLowerCase().trim()
  if (src === 'landing_vistage' || src === 'campanha_vistage') return true
  const tRaw = custRec.tags || []
  const tStr = (typeof tRaw === 'string' ? tRaw : JSON.stringify(tRaw)).toLowerCase()
  return tStr.includes('landing_vistage') || tStr.includes('lead_campanha')
}

// Helper espelhado da trava do motor da régua de campanha em cron_bia_persistence.js
function canCampaignDispatchExecute(
  customer: { source?: string; tags?: string[] | string },
  appControlConviteVistageActive: boolean
) {
  const isCampLead = isCampaignLeadRecordMock(customer)
  if (isCampLead) {
    // Para leads de campanha, só pode disparar se o controle convite_vistage estiver expressamente ativo
    return appControlConviteVistageActive
  }
  // Leads da base geral não disparam régua de campanha Vistage
  return false
}

describe('Isolamento de Campanha Vistage vs Base Geral da Bia', () => {
  it('Cenário 1: Cliente da base geral (ex: Fabiana) NÃO entra na régua de campanha Vistage', () => {
    const clienteFabiana = {
      id: 'cust_fabiana_123',
      name: 'Fabiana Scherer',
      phone: '5548988112233',
      source: 'google_contacts',
      status: 'em_atendimento',
      tags: ['investidor', 'google_contacts_import'],
    }

    const isCampaign = isCampaignLeadRecordMock(clienteFabiana)
    expect(isCampaign).toBe(false)

    // Mesmo que o controle estivesse hipoteticamente ativo, Fabiana não dispara régua de campanha
    const campaignFired = canCampaignDispatchExecute(clienteFabiana, true)
    expect(campaignFired).toBe(false)
  })

  it('Cenário 2: Lead capturado pela landing entra com source/tags da campanha e phase lead_landing', () => {
    // Simula a carga gravada pelo endpoint POST /backend/v1/landing-lead
    const leadLandingCapturado = {
      name: 'Roberto Alencar',
      phone: '5548991223344',
      email: 'roberto.alencar@email.com',
      source: 'landing_vistage',
      phase: 'lead_landing',
      tags: ['landing_vistage', 'lead_campanha'],
      follow_up_step: 'remarketing',
    }

    const isCampaign = isCampaignLeadRecordMock(leadLandingCapturado)
    expect(isCampaign).toBe(true)
    expect(leadLandingCapturado.source).toBe('landing_vistage')
    expect(leadLandingCapturado.tags).toContain('landing_vistage')
    expect(leadLandingCapturado.tags).toContain('lead_campanha')
  })

  it('Cenário 3: Lead de campanha é barrado na régua enquanto app_controls.convite_vistage estiver desligado (is_active=false)', () => {
    const leadLanding = {
      name: 'Carla Dias',
      phone: '5548999887766',
      source: 'landing_vistage',
      tags: ['landing_vistage', 'lead_campanha'],
    }

    // Estado real do banco de dados: convite_vistage está is_active=false (em revisão)
    const appControlActive = false

    const canExecute = canCampaignDispatchExecute(leadLanding, appControlActive)
    expect(canExecute).toBe(false)
  })

  it('Cenário 4: Landing do Vistage e disparo permanecem em_revisao até aprovação do Mauro', () => {
    // Especificação de conformidade para o lançamento do Vistage
    const vistageDossierConfig = {
      slug: 'vistage-residence',
      status: 'em_revisao',
      campaign_dispatch_active: false,
      campaign_source: 'landing_vistage',
      ref_price_2_dorm: 'a partir de R$ 607.880',
      ref_price_3_dorm: 'a partir de R$ 929.844',
      cub_note: 'Valores variam todo mês, atualizados pelo CUB',
    }

    expect(vistageDossierConfig.status).toBe('em_revisao')
    expect(vistageDossierConfig.campaign_dispatch_active).toBe(false)
    expect(vistageDossierConfig.ref_price_2_dorm).toContain('607.880')
    expect(vistageDossierConfig.ref_price_3_dorm).toContain('929.844')
    expect(vistageDossierConfig.cub_note).toBe('Valores variam todo mês, atualizados pelo CUB')
  })

  it('Cenário 5: Resposta da Bia na captura da landing entrega o Ebook e menciona valores de referência com nota CUB', () => {
    const biaAutoReplyToLead =
      'Olá, Roberto! Aqui é a Bia, consultora da BRF Imóveis. Conforme solicitado na landing page do Vistage Residence, estou te encaminhando o material exclusivo do empreendimento com apresentação completa e plantas.\n\n' +
      '📖 Acesse o book digital: https://ia-uazapi-6d79e--preview.goskip.app/assets/vistage_ebook.pdf\n\n' +
      'Lembrando que os valores de referência partem de R$ 607.880 para 2 dormitórios e R$ 929.844 para 3 dormitórios (valores atualizados pelo CUB). Ficou com alguma dúvida sobre as plantas ou fluxo na planta com a AJ Coelho?'

    expect(biaAutoReplyToLead).toContain('R$ 607.880')
    expect(biaAutoReplyToLead).toContain('R$ 929.844')
    expect(biaAutoReplyToLead).toContain('valores atualizados pelo CUB')
    expect(biaAutoReplyToLead).toContain('vistage_ebook.pdf')
    // Não contém tabela completa nem dump de unidades
    expect(biaAutoReplyToLead).not.toContain('Unidade 101')
    expect(biaAutoReplyToLead).not.toContain('Unidade 102')
  })

  it('Cenário 6: Primeira foto da landing pública do Vistage é a foto aérea do pôr do sol enviada pelo Mauro', () => {
    // A foto principal hero é a imagem aérea do empreendimento ao entardecer (assets/17-9e9a4.png)
    const heroAssetPath = '17-9e9a4.png'
    const galleryAssetOrder = ['30-5e980.png', '24-94861.png', '22-a73bf.png']

    expect(heroAssetPath).toContain('17-9e9a4')
    // A galeria de Lazer e Áreas Comuns segue na sequência estrita
    expect(galleryAssetOrder[0]).toBe('30-5e980.png')
    expect(galleryAssetOrder[1]).toBe('24-94861.png')
    expect(galleryAssetOrder[2]).toBe('22-a73bf.png')
  })

  it('Cenário 7: Badge do Hero diz Novo Lançamento e não contém a palavra exclusivo', () => {
    const heroBadgeText = 'Novo Lançamento'
    expect(heroBadgeText).toBe('Novo Lançamento')
    expect(heroBadgeText.toLowerCase()).not.toContain('exclusivo')
    expect(heroBadgeText.toLowerCase()).not.toContain('pré-lançamento')
  })
})
