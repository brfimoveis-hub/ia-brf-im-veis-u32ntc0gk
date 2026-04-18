migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')

    const textFields = [
      'first_name',
      'middle_name',
      'last_name',
      'phonetic_first_name',
      'phonetic_middle_name',
      'phonetic_last_name',
      'name_prefix',
      'name_suffix',
      'nickname',
      'file_as',
      'org_name',
      'org_title',
      'org_dept',
      'birthday',
      'photo',
      'email_1_label',
      'email_1_value',
      'email_2_label',
      'email_2_value',
      'phone_1_label',
      'phone_1_value',
      'phone_2_label',
      'phone_2_value',
      'phone_3_label',
      'phone_3_value',
      'phone_4_label',
      'phone_4_value',
      'address_1_label',
      'address_1_formatted',
      'address_1_street',
      'address_1_city',
      'address_1_po_box',
      'address_1_region',
      'address_1_postal_code',
      'address_1_country',
      'address_1_extended',
      'website_1_label',
      'website_1_value',
    ]

    for (const name of textFields) {
      if (!col.fields.getByName(name)) {
        col.fields.add(new TextField({ name: name }))
      }
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    const textFields = [
      'first_name',
      'middle_name',
      'last_name',
      'phonetic_first_name',
      'phonetic_middle_name',
      'phonetic_last_name',
      'name_prefix',
      'name_suffix',
      'nickname',
      'file_as',
      'org_name',
      'org_title',
      'org_dept',
      'birthday',
      'photo',
      'email_1_label',
      'email_1_value',
      'email_2_label',
      'email_2_value',
      'phone_1_label',
      'phone_1_value',
      'phone_2_label',
      'phone_2_value',
      'phone_3_label',
      'phone_3_value',
      'phone_4_label',
      'phone_4_value',
      'address_1_label',
      'address_1_formatted',
      'address_1_street',
      'address_1_city',
      'address_1_po_box',
      'address_1_region',
      'address_1_postal_code',
      'address_1_country',
      'address_1_extended',
      'website_1_label',
      'website_1_value',
    ]

    for (const name of textFields) {
      col.fields.removeByName(name)
    }

    app.save(col)
  },
)
