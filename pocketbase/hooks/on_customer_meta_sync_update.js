onRecordAfterUpdateSuccess((e) => {
  // Sync CAPI was disabled due to removal of CAPI Token
  return e.next()
}, 'customers')
