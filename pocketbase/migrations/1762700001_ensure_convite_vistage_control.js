/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração idempotente:
 * Garante que o registro app_controls com key='convite_vistage' exista e nasça
 * estritamente DESLIGADO (is_active = false) com o texto de convite do Mauro e
 * o link padrão da landing page Vistage.
 */
migrate(
  (app) => {
    try {
      var col = app.findCollectionByNameOrId('app_controls')
      if (!col) return

      var existing = null
      try {
        existing = app.findFirstRecordByFilter('app_controls', "key = 'convite_vistage'")
      } catch (_) {
        existing = null
      }

      var textoMauro =
        'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.'

      if (!existing) {
        var rec = new Record(col)
        rec.set('key', 'convite_vistage')
        rec.set('name', 'Disparo do Convite Vistage (com link da landing page)')
        rec.set('is_active', false)
        rec.set(
          'description',
          'PAUSADO por padrão. Ativar SOMENTE pelo painel após aprovação do Mauro.',
        )
        rec.set(
          'metadata',
          JSON.stringify({
            mensagem: textoMauro,
            link: 'https://ia-uazapi-6d79e--preview.goskip.app/lancamento/vistage',
            cursor_nome: '',
            ultimo_enviado_nome: '',
            total_enviados: 0,
          }),
        )
        app.saveNoValidate(rec)
      } else {
        // Se já existia, garante que is_active permaneça falso (disparo nasce desligado)
        // a menos que o usuário explicitamente já tivesse ativado
        if (existing.getBool('is_active')) {
          existing.set('is_active', false)
          app.saveNoValidate(existing)
        }
      }
    } catch (_) {
      // Idempotente
    }
  },
  (_app) => {
    // Revert no-op
  },
)
