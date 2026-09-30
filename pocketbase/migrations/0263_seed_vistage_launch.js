migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const adminUser = app.findFirstRecordByFilter('users', "email != ''")
    if (!adminUser) return

    const launches = app.findCollectionByNameOrId('launches')

    // Verificar se o lançamento já existe
    let existing = null
    try {
      existing = app.findFirstRecordByFilter('launches', "slug = 'vistage-residence'")
    } catch (e) {
      existing = null
    }

    const unitsData = [
      {
        id: 'u-1',
        typology: '2 Dormitórios c/ Suíte',
        area: '63m² a 72m²',
        price: 'A partir de R$ 596.000',
        available: true,
        notes: 'Living integrado, sacada com churrasqueira a carvão, 1 a 2 vagas',
      },
      {
        id: 'u-2',
        typology: '3 Dormitórios c/ Suíte',
        area: '86m² a 105m²',
        price: 'A partir de R$ 890.000',
        available: true,
        notes: 'Suíte máster ampla, lavabo social, 2 vagas de garagem privativas',
      },
      {
        id: 'u-3',
        typology: 'Apartamento Garden',
        area: '130m² a 150m²',
        price: 'A partir de R$ 980.000',
        available: true,
        notes: 'Terraço privativo amplo, espera para ofurô/SPA privativo',
      },
      {
        id: 'u-4',
        typology: 'Cobertura Duplex Linear',
        area: 'Até 296m²',
        price: 'Sob Consulta',
        available: true,
        notes: 'Vista panorâmica 360°, terraço com piscina privativa, até 4 vagas',
      },
    ]

    const differentialsData = [
      'Rooftop com piscina de borda infinita e deck molhado panorâmico',
      'Academia panorâmica no rooftop completa com vista definitiva para o mar',
      'Salão de Festas na cobertura com brinquedoteca integrada e terraço',
      'Salão Gourmet no térreo para encontros intimistas e jantares',
      'Marketplace autônomo 24 horas integrado ao piso de garagens',
      'Espaço Pet Place cercado e Playground infantil seguro no térreo',
      'Hall de entrada com pé-direito duplo e controle de acesso biométrico',
      'Padrão Construtivo AJ Coelho Construtora (mais de 30 anos de solidez)',
    ]

    const keywordsData = [
      'vistage',
      'vistage residence',
      'barreiros',
      'sao jose',
      'aj coelho',
      'piscina cobertura',
      'rooftop barreiros',
      'apartamento barreiros',
      'lancamento barreiros',
    ]

    if (!existing) {
      const record = new Record(launches)
      record.set('user_id', adminUser.id)
      record.set('name', 'Vistage Residence')
      record.set('slug', 'vistage-residence')
      record.set('enterprise_name', 'Vistage Residence Barreiros')
      record.set('status', 'publicado')
      record.set(
        'headline',
        'Apartamentos de 2 e 3 dormitórios com suíte e rooftop incomparável em Barreiros',
      )
      record.set(
        'description',
        'O Vistage Residence chega para transformar a forma de viver em Barreiros, São José. Com entrega e padrão AJ Coelho, reúne arquitetura contemporânea, piscina de borda infinita no rooftop, academia com vista mar, marketplace 24h na garagem e plantas inteligentes para moradia ou investimento.',
      )
      record.set('location', 'Barreiros, São José - SC (Grande Florianópolis)')
      record.set('units', unitsData)
      record.set('differentials', differentialsData)
      record.set('keywords', keywordsData)
      record.set(
        'payment_terms',
        'Condições especiais de lançamento: entrada facilitada + parcelamento direto durante a obra ou financiamento bancário.',
      )
      record.set(
        'sales_arguments',
        '1. Localização nobre em Barreiros com valorização contínua. 2. Lazer completo na cobertura com vista definitiva. 3. Conveniência inédita com marketplace 24h no condomínio. 4. Segurança e liquidez com a assinatura AJ Coelho.',
      )
      record.set('cta_whatsapp_number', '5548992098050')
      record.set(
        'cta_default_message',
        'Olá Bia! Gostaria de receber a tabela de valores e as plantas do Vistage Residence em Barreiros (origem: landing page vistage-residence)',
      )
      record.set('landing_theme', {
        primaryColor: '#059669',
        accentColor: '#10b981',
        badgeText: 'Lançamento Exclusivo Barreiros',
      })
      record.set(
        'raw_material',
        'Material oficial originado de 11 pastas do Google Drive com fotos da Academia, Apto Modelo, Piscina Cobertura, Área Comum Térreo, Hall, Mercado Garagem, Plantas Humanizadas, Salões e Vídeos por andar.',
      )
      app.save(record)
    } else {
      existing.set('status', 'publicado')
      existing.set('enterprise_name', 'Vistage Residence Barreiros')
      existing.set(
        'headline',
        'Apartamentos de 2 e 3 dormitórios com suíte e rooftop incomparável em Barreiros',
      )
      existing.set(
        'description',
        'O Vistage Residence chega para transformar a forma de viver em Barreiros, São José. Com entrega e padrão AJ Coelho, reúne arquitetura contemporânea, piscina de borda infinita no rooftop, academia com vista mar, marketplace 24h na garagem e plantas inteligentes para moradia ou investimento.',
      )
      existing.set('location', 'Barreiros, São José - SC (Grande Florianópolis)')
      existing.set('units', unitsData)
      existing.set('differentials', differentialsData)
      existing.set('keywords', keywordsData)
      app.save(existing)
    }
  },
  (app) => {
    // rollback opcional
  },
)
