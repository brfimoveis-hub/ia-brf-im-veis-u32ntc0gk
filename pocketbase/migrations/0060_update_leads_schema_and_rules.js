migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')

    if (!leads.fields.getByName('name')) leads.fields.add(new TextField({ name: 'name' }))
    if (!leads.fields.getByName('email')) leads.fields.add(new EmailField({ name: 'email' }))
    if (!leads.fields.getByName('phone')) leads.fields.add(new TextField({ name: 'phone' }))
    if (!leads.fields.getByName('notes')) leads.fields.add(new TextField({ name: 'notes' }))

    leads.listRule = "@request.auth.id != '' && assigned_to = @request.auth.id"
    leads.viewRule = "@request.auth.id != '' && assigned_to = @request.auth.id"
    leads.updateRule = "@request.auth.id != '' && assigned_to = @request.auth.id"
    leads.deleteRule = "@request.auth.id != '' && assigned_to = @request.auth.id"

    app.save(leads)

    const customers = app.findCollectionByNameOrId('customers')
    customers.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    customers.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    customers.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    customers.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"

    app.save(customers)
  },
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    leads.listRule = "@request.auth.id != ''"
    leads.viewRule = "@request.auth.id != ''"
    leads.updateRule = "@request.auth.id != ''"
    leads.deleteRule = "@request.auth.id != ''"
    app.save(leads)

    const customers = app.findCollectionByNameOrId('customers')
    customers.listRule = "@request.auth.id != ''"
    customers.viewRule = "@request.auth.id != ''"
    customers.updateRule = "@request.auth.id != ''"
    customers.deleteRule = "@request.auth.id != ''"
    app.save(customers)
  },
)
