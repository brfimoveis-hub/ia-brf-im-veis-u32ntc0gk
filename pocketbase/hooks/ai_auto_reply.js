onRecordAfterCreateSuccess((e) => {
  const sender = e.record.getString('sender')

  if (sender === 'agent' || sender === 'ai' || sender === 'system') {
    return e.next()
  }

  try {
    const customer = $app.findRecordById('customers', e.record.getString('customer_id'))
    const tags = customer.get('tags') || []

    if (tags.includes('ai_paused')) {
      return e.next()
    }

    let aiContext = ''
    try {
      const kbRecords = $app.findRecordsByFilter('knowledge_base', '1=1', '-created', 1, 0)
      if (kbRecords && kbRecords.length > 0) {
        aiContext = kbRecords[0].getString('ai_instructions') || ''
      }
    } catch (_) {
      // Ignorar se não encontrar base de conhecimento
    }

    let responseText =
      'Entendi! Vou separar o material e te envio em instantes. Há algo mais que eu possa adiantar para você?'

    if (aiContext) {
      responseText += `\n\n*(Aplicando instruções da base de conhecimento: ${aiContext.substring(0, 60)}...)*`
    }

    const reply = new Record($app.findCollectionByNameOrId('conversations'))
    reply.set('user_id', e.record.getString('user_id'))
    reply.set('customer_id', e.record.getString('customer_id'))
    reply.set('sender', 'ai')
    reply.set('content', responseText)

    $app.save(reply)
  } catch (err) {
    $app.logger().error('AI Auto Reply Error', 'err', err)
  }

  return e.next()
}, 'conversations')
