migrate(
  (app) => {
    // This migration represents the file-based update of the meta_test_connection hook
    // to use the /debug_token endpoint and verify ads_read and whatsapp_business_management scopes.
    console.log(
      'Migration 0046: meta_test_connection hook updated with deep-scan and scope verification.',
    )
  },
  (app) => {},
)
