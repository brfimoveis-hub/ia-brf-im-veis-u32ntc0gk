/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Adicionar campos do Motor de Persistência na coleção customers
    try {
      const customersCol = app.findCollectionByNameOrId('customers')

      const addCustField = (field) => {
        try {
          if (!customersCol.fields.getByName(field.name)) {
            customersCol.fields.add(field)
          }
        } catch (_) {
          customersCol.fields.add(field)
        }
      }

      addCustField(new NumberField({ name: 'follow_up_count', required: false, min: 0 }))
      addCustField(
        new SelectField({
          name: 'follow_up_step',
          values: ['d1', 'd3', 'd7', 'd14', 'nurturing_monthly', 'finalizado'],
          maxSelect: 1,
          required: false,
        }),
      )
      addCustField(new DateField({ name: 'last_follow_up_at', required: false }))
      addCustField(new DateField({ name: 'next_follow_up_at', required: false }))
      addCustField(new JSONField({ name: 'lead_profile_json', required: false }))
      addCustField(new NumberField({ name: 'rejection_count', required: false, min: 0 }))
      addCustField(new TextField({ name: 'last_rejection_reason', required: false }))
      addCustField(
        new SelectField({
          name: 'persistence_status',
          values: ['ativo', 'aguardando_momento', 'pausado', 'convertido'],
          maxSelect: 1,
          required: false,
        }),
      )
      addCustField(new BoolField({ name: 'promise_pending', required: false }))
      addCustField(new DateField({ name: 'promise_made_at', required: false }))
      addCustField(new TextField({ name: 'promise_context', required: false }))

      app.save(customersCol)
      console.log('[MIG_1760000002] Campos de persistência em customers verificados e salvos.')
    } catch (custErr) {
      console.warn('[MIG_1760000002] Erro ao atualizar customers: ' + custErr.message)
    }

    // 2. Adicionar campos correspondentes na coleção conversations (para controle por conversa / canal)
    try {
      const convCol = app.findCollectionByNameOrId('conversations')

      const addConvField = (field) => {
        try {
          if (!convCol.fields.getByName(field.name)) {
            convCol.fields.add(field)
          }
        } catch (_) {
          convCol.fields.add(field)
        }
      }

      addConvField(new NumberField({ name: 'follow_up_count', required: false, min: 0 }))
      addConvField(
        new SelectField({
          name: 'follow_up_step',
          values: ['d1', 'd3', 'd7', 'd14', 'nurturing_monthly', 'finalizado'],
          maxSelect: 1,
          required: false,
        }),
      )
      addConvField(new DateField({ name: 'last_follow_up_at', required: false }))
      addConvField(new DateField({ name: 'next_follow_up_at', required: false }))
      addConvField(new NumberField({ name: 'rejection_count', required: false, min: 0 }))
      addConvField(new TextField({ name: 'last_rejection_reason', required: false }))
      addConvField(
        new SelectField({
          name: 'persistence_status',
          values: ['ativo', 'aguardando_momento', 'pausado', 'convertido'],
          maxSelect: 1,
          required: false,
        }),
      )
      addConvField(new BoolField({ name: 'promise_pending', required: false }))
      addConvField(new DateField({ name: 'promise_made_at', required: false }))

      app.save(convCol)
      console.log('[MIG_1760000002] Campos de persistência em conversations verificados e salvos.')
    } catch (convErr) {
      console.warn('[MIG_1760000002] Erro ao atualizar conversations: ' + convErr.message)
    }
  },
  (app) => {
    // Revert
  },
)
