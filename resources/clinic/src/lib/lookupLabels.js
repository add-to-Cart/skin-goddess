export function clientLabel(client) {
  return `${client.first_name} ${client.last_name} · #${client.id}${client.phone ? ` · ${client.phone}` : client.email ? ` · ${client.email}` : ''}`
}

export function serviceLabel(service) {
  return service.name
}

export function supplyLabel(item) {
  return `${item.name} · ${item.current_quantity} ${item.unit || ''} in stock`
}
