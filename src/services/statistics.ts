import pb from '@/lib/pocketbase/client'

export interface PlatformStats {
  metaCapi: {
    totalEvents: number
    successCount: number
    failedCount: number
    successRate: number
  }
  metaMessaging: {
    totalSent: number
    totalReceived: number
    deliveryRate: number
  }
  emailCampaigns: {
    totalCampaigns: number
    totalRecipients: number
    totalDelivered: number
    totalOpened: number
    totalClicked: number
    deliveryRate: number
    openRate: number
    clickRate: number
  }
}

const EMPTY_STATS: PlatformStats = {
  metaCapi: { totalEvents: 0, successCount: 0, failedCount: 0, successRate: 0 },
  metaMessaging: { totalSent: 0, totalReceived: 0, deliveryRate: 0 },
  emailCampaigns: {
    totalCampaigns: 0,
    totalRecipients: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
  },
}

export const getPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const [campaignsRes, conversationsRes, capiLogsRes] = await Promise.all([
      pb
        .collection('email_campaigns')
        .getFullList({ sort: '-created' })
        .catch(() => []),
      pb
        .collection('conversations')
        .getList(1, 500, { sort: '-created' })
        .catch(() => ({ items: [] as any[] })),
      pb
        .collection('system_logs')
        .getList(1, 500, {
          filter: 'type ~ "meta_capi" || type ~ "remarketing" || type ~ "capi"',
          sort: '-created',
        })
        .catch(() => ({ items: [] as any[] })),
    ])

    const campaigns = campaignsRes as any[]
    const conversations = (conversationsRes as any)?.items || []
    const capiLogs = (capiLogsRes as any)?.items || []

    const totalRecipients = campaigns.reduce(
      (sum: number, c: any) => sum + (c.total_recipients || 0),
      0,
    )
    const totalSentEmail = campaigns.reduce(
      (sum: number, c: any) => sum + (c.success_count || 0),
      0,
    )
    const totalOpened = campaigns.reduce((sum: number, c: any) => sum + (c.unique_opens || 0), 0)
    const totalClicked = campaigns.reduce((sum: number, c: any) => sum + (c.unique_clicks || 0), 0)

    const outgoingMessages = conversations.filter(
      (c: any) => c.sender === 'ai' || c.sender === 'agent',
    ).length
    const incomingMessages = conversations.filter((c: any) => c.sender === 'customer').length

    const capiSuccess = capiLogs.filter(
      (l: any) =>
        (l.message || '').toLowerCase().includes('success') ||
        (l.message || '').toLowerCase().includes('processed'),
    ).length
    const capiFailed = capiLogs.filter(
      (l: any) =>
        (l.message || '').toLowerCase().includes('error') ||
        (l.message || '').toLowerCase().includes('fail'),
    ).length

    return {
      metaCapi: {
        totalEvents: capiLogs.length,
        successCount: capiSuccess,
        failedCount: capiFailed,
        successRate: capiLogs.length > 0 ? Math.round((capiSuccess / capiLogs.length) * 100) : 0,
      },
      metaMessaging: {
        totalSent: outgoingMessages,
        totalReceived: incomingMessages,
        deliveryRate: outgoingMessages > 0 ? 100 : 0,
      },
      emailCampaigns: {
        totalCampaigns: campaigns.length,
        totalRecipients,
        totalDelivered: totalSentEmail,
        totalOpened,
        totalClicked,
        deliveryRate:
          totalRecipients > 0 ? Math.round((totalSentEmail / totalRecipients) * 100) : 0,
        openRate: totalSentEmail > 0 ? Math.round((totalOpened / totalSentEmail) * 100) : 0,
        clickRate: totalSentEmail > 0 ? Math.round((totalClicked / totalSentEmail) * 100) : 0,
      },
    }
  } catch {
    return EMPTY_STATS
  }
}
