migrate(
  (app) => {
    app
      .db()
      .newQuery(
        "UPDATE users SET ai_name = 'Bia' WHERE ai_name = 'Bia Jovem' OR ai_name IS NULL OR ai_name = ''",
      )
      .execute()
  },
  (app) => {
    // Reverting would be unpredictable, leave as is
  },
)
