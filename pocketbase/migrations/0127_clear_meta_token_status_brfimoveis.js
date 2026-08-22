migrate(
  (app) => {
    // Clear the stale "error" value on meta_token_status for the brfimoveis user.
    // The Meta Data Use Checkup has since been approved, so the error status is
    // no longer accurate. The field has a NOT NULL constraint, so we set it to an
    // empty string instead of NULL — the ConnectionAlertBanner only shows when the
    // value is in ['error', 'expired'], so "" hides the banner.
    app
      .db()
      .newQuery('UPDATE users SET meta_token_status = {:status} WHERE id = {:id}')
      .bind({ status: '', id: 'g5jto8bhulw01bz' })
      .execute()
  },
  (app) => {
    // Revert: restore the previous error status so the rollback is explicit.
    app
      .db()
      .newQuery('UPDATE users SET meta_token_status = {:status} WHERE id = {:id}')
      .bind({ status: 'error', id: 'g5jto8bhulw01bz' })
      .execute()
  },
)
