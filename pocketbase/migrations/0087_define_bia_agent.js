/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'bia',
      name: 'Bia - Mother AI',
      description:
        'Mother AI to analyze customer conversations and determine the next cadence step.',
      systemPrompt:
        'You are Bia, an intelligent AI sales assistant. Analyze the conversation context and determine if the lead should be moved to the next step in our sales cadence. Return [STATUS: NextStep] at the end of your response if they meet the criteria based on your instructions.',
      tier: 'fast',
      tools: [
        { collection: 'customers', perms: { read: true, update: true } },
        { collection: 'conversations', perms: { read: true, create: true } },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'bia')
  },
)
