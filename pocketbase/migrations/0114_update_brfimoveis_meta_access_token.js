migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')

      user.set(
        'meta_whatsapp_access_token',
        'EAATKh9qcDhYBSETk10n0OsOzTy25060SGNwOcy5MUG1LKYIUmTRwJQHIn0wrKoHDPLUjjCk6uEyG2HKEqOZA72ZCOPNt4C2sZANwnaiTEFL4kE5VAqCKjoFHZAJrZC6Nitw2CoKgQzu4kOkZBVCfTla3ZAkfgBYPRUKzdwa8H3E3wnFmHA95CJOs0jZBklYK99j1hPXiAkxK',
      )
      user.set('meta_app_id', '1348584743898646')
      user.set('meta_token_status', '')

      app.saveNoValidate(user)
    } catch (_) {}
  },
  (app) => {},
)
