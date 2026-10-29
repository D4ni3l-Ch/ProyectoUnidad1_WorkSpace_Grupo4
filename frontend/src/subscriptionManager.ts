export type MovementType = 'credit' | 'debit'

export type SubscriptionMovement = {
  id: string
  createdAt: string
  type: MovementType
  description: string
  reference: string
  hours: number
  resultingBalance: number
  status: 'completed'
}

export type SubscriptionState = {
  purchasedHours: number
  consumedHours: number
  balance: number
  movements: SubscriptionMovement[]
}

export type HourPackage = {
  id: string
  hours: number
  price: number
  description: string
}

export const hourPackages: HourPackage[] = [
  { id: 'pack-10', hours: 10, price: 75, description: 'Para reuniones puntuales y equipos pequeños.' },
  { id: 'pack-20', hours: 20, price: 140, description: 'Más flexibilidad para el trabajo recurrente.' },
  { id: 'pack-50', hours: 50, price: 325, description: 'La mejor opción para equipos con uso frecuente.' },
]

export const initialSubscription: SubscriptionState = {
  purchasedHours: 0,
  consumedHours: 0,
  balance: 0,
  movements: [],
}

function operationId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

export const SubscriptionManager = {
  getBalance(state: SubscriptionState) {
    return state.balance
  },

  calculateDuration(slot: string) {
    const [start, end] = slot.split('–')
    if (!start || !end) return 0
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    return Math.max(0, endHour + endMinute / 60 - (startHour + startMinute / 60))
  },

  canDebit(state: SubscriptionState, hours: number) {
    return hours > 0 && state.balance >= hours
  },

  purchase(state: SubscriptionState, item: HourPackage) {
    const balance = state.balance + item.hours
    const reference = operationId('COMPRA')
    const movement: SubscriptionMovement = {
      id: operationId('MOV'),
      createdAt: new Date().toISOString(),
      type: 'credit',
      description: `Compra paquete de ${item.hours} horas`,
      reference,
      hours: item.hours,
      resultingBalance: balance,
      status: 'completed',
    }
    return {
      state: {
        purchasedHours: state.purchasedHours + item.hours,
        consumedHours: state.consumedHours,
        balance,
        movements: [movement, ...state.movements],
      },
      reference,
    }
  },

  debit(state: SubscriptionState, slot: string, bookingReference: string) {
    const hours = this.calculateDuration(slot)
    const duplicate = state.movements.some(
      (movement) => movement.type === 'debit' && movement.reference === bookingReference,
    )
    if (duplicate) return { ok: true as const, state, hours, duplicate: true }
    if (!this.canDebit(state, hours)) {
      return { ok: false as const, state, hours, duplicate: false }
    }
    const balance = state.balance - hours
    const movement: SubscriptionMovement = {
      id: operationId('MOV'),
      createdAt: new Date().toISOString(),
      type: 'debit',
      description: `Reserva pagada con saldo de horas`,
      reference: bookingReference,
      hours,
      resultingBalance: balance,
      status: 'completed',
    }
    return {
      ok: true as const,
      state: {
        purchasedHours: state.purchasedHours,
        consumedHours: state.consumedHours + hours,
        balance,
        movements: [movement, ...state.movements],
      },
      hours,
      duplicate: false,
    }
  },
}
