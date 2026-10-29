import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import {
  hourPackages,
  initialSubscription,
  HourPackage,
  SubscriptionManager,
  SubscriptionState,
} from './subscriptionManager'

type Role = 'client' | 'admin'
type Page =
  | 'login'
  | 'home'
  | 'availability'
  | 'checkout'
  | 'bookings'
  | 'pass'
  | 'subscription'
  | 'admin-scan'
  | 'admin-reservations'
  | 'admin-rooms'

type Room = {
  id: string
  name: string
  capacity: number
  slot: '10:00–12:00' | '18:00–20:00'
  services: string[]
}

type Booking = {
  id: string
  roomId: string
  roomName: string
  date: string
  slot: string
  capacity: number
  total: number
  status: 'active' | 'refunded'
  paymentMethod: 'card' | 'hours'
}

type PendingBooking = {
  reference: string
  room: Room
  date: string
  capacity: number
}

const defaultRooms: Room[] = [
  { id: 'north', name: 'Norte', capacity: 12, slot: '10:00–12:00', services: ['Proyector HD'] },
  { id: 'side', name: 'Lateral', capacity: 8, slot: '18:00–20:00', services: ['Catering'] },
]

const servicePrices: Record<string, number> = {
  'Proyector HD': 5,
  Catering: 12,
  Pizarra: 3,
  Videoconferencia: 8,
}

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function slotIsFuture(date: string, slot: Room['slot'], now = new Date()) {
  if (date < localDateValue(now)) return false
  if (date > localDateValue(now)) return true
  const [hours, minutes] = slot.split('–')[0].split(':').map(Number)
  const start = new Date(now)
  start.setHours(hours, minutes, 0, 0)
  return now < start
}

function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

function Icon({ name }: { name: 'arrow' | 'lock' | 'check' }) {
  if (name === 'arrow') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
  if (name === 'check') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
}

function Shell({ role, title, subtitle, go, logout, children }: {
  role: Role
  title: string
  subtitle: string
  go: (page: Page) => void
  logout: () => void
  children: ReactNode
}) {
  return (
    <main className="portal-shell">
      <header className="portal-header">
        <button className="brand-button" onClick={() => go('home')}>WorkSpace</button>
        <nav className="portal-nav" aria-label="Navegación principal">
          <button onClick={() => go('home')}>Inicio</button>
          {role === 'client' ? (
            <>
              <button onClick={() => go('availability')}>Disponibilidad</button>
              <button onClick={() => go('bookings')}>Reservas</button>
              <button onClick={() => go('pass')}>Mi QR</button>
              <button onClick={() => go('subscription')}>Mi Suscripción</button>
            </>
          ) : (
            <>
              <button onClick={() => go('admin-scan')}>Escáner</button>
              <button onClick={() => go('admin-reservations')}>Reservas</button>
              <button onClick={() => go('admin-rooms')}>Salas</button>
            </>
          )}
          <button onClick={logout}>Salir</button>
        </nav>
      </header>
      <div className="portal-content">
        <div className="portal-intro">
          <p className="eyebrow">{role === 'admin' ? 'Panel administrador' : 'Área de cliente'}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  )
}

function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const credentials = `${email.trim().toLowerCase()}:${password}`
    if (credentials === 'usuario@usuario.com:password') onLogin('client')
    else if (credentials === 'admin@admin.com:password') onLogin('admin')
    else setError('Credenciales incorrectas. Revisa el correo y la contraseña.')
  }

  return (
    <main className="login-shell">
      <section className="login-side">
        <span className="brand-button light">WorkSpace</span>
        <div>
          <p className="eyebrow">Espacios que funcionan</p>
          <h1>Tu próxima sala, a un paso.</h1>
          <p>Consulta disponibilidad, gestiona reservas y accede con tu pase digital.</p>
        </div>
        <span className="mono-note">ACCESO SEGURO · 24/7</span>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <p className="eyebrow">Bienvenido</p>
          <h2>Inicio de sesión</h2>
          <p className="form-lead">Ingresa una de las credenciales autorizadas para continuar.</p>
          <div className="field"><label htmlFor="email">Correo electrónico</label><input id="email" type="email" required placeholder="nombre@empresa.com" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} /></div>
          <div className="field"><label htmlFor="password">Contraseña</label><input id="password" type="password" required placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button login-submit" type="submit">Iniciar sesión <span>→</span></button>
          <div className="credentials-box">
            <span>CLIENTE · usuario@usuario.com / password</span>
            <span>ADMIN · admin@admin.com / password</span>
          </div>
        </form>
      </section>
    </main>
  )
}

function Home({ role, go, logout }: { role: Role; go: (page: Page) => void; logout: () => void }) {
  const cards: [string, string, string, Page][] = role === 'client'
    ? [
        ['01', 'Buscar un espacio', 'Consulta horarios y crea una nueva reserva.', 'availability'],
        ['02', 'Mis reservas', 'Gestiona la reserva activa o cancélala.', 'bookings'],
        ['03', 'Mi pase QR', 'Abre el comprobante de tu reserva activa.', 'pass'],
      ]
    : [
        ['01', 'Comprobar acceso', 'Escanea y valida el comprobante QR.', 'admin-scan'],
        ['02', 'Reservas y reembolsos', 'Consulta actividad y procesa reembolsos.', 'admin-reservations'],
        ['03', 'Modificar salas', 'Edita nombre, aforo y servicios.', 'admin-rooms'],
      ]
  return (
    <Shell role={role} title={role === 'admin' ? 'Centro de operaciones.' : '¿Qué necesitas hoy?'} subtitle={role === 'admin' ? 'Gestiona accesos, reservas y espacios.' : 'Busca una sala disponible y genera tu pase digital.'} go={go} logout={logout}>
      {role === 'admin' && <div className="role-notice"><Icon name="lock" /> Perfil administrativo · Creación de reservas bloqueada</div>}
      <div className="menu-grid">
        {cards.map(([number, title, copy, page]) => (
          <button className="menu-card" key={number} onClick={() => go(page)}>
            <span className="menu-number">{number}</span><div><h2>{title}</h2><p>{copy}</p></div><span className="menu-arrow">↗</span>
          </button>
        ))}
      </div>
    </Shell>
  )
}

function Availability({ rooms, go, logout, select }: {
  rooms: Room[]
  go: (page: Page) => void
  logout: () => void
  select: (room: Room, date: string, capacity: number) => void
}) {
  const today = localDateValue()
  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState<Room['slot']>(() =>
    (['10:00–12:00', '18:00–20:00'] as Room['slot'][]).find((item) => slotIsFuture(today, item)) ?? '18:00–20:00',
  )
  const [capacity, setCapacity] = useState(1)
  const [searched, setSearched] = useState(false)
  const isPastDate = date < today
  const weekday = date ? ![0, 6].includes(new Date(`${date}T12:00:00`).getDay()) : false
  const availableSlots = (['10:00–12:00', '18:00–20:00'] as Room['slot'][]).filter((item) => slotIsFuture(date, item))
  const validTime = slotIsFuture(date, slot)
  const results = searched && weekday && !isPastDate && validTime
    ? rooms.filter((room) => room.slot === slot && capacity <= room.capacity)
    : []
  const dateLabel = date ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`)) : ''

  return (
    <Shell role="client" title="Consulta de disponibilidad." subtitle="Las salas operan de lunes a viernes en sus horarios asignados." go={go} logout={logout}>
      <section className="availability-layout">
        <form className="search-panel" onSubmit={(e) => { e.preventDefault(); setSearched(true) }}>
          <div className="field"><label htmlFor="date">Fecha</label><input id="date" type="date" min={today} required value={date} onChange={(e) => {
            const nextDate = e.target.value
            const nextSlots = (['10:00–12:00', '18:00–20:00'] as Room['slot'][]).filter((item) => slotIsFuture(nextDate, item))
            setDate(nextDate)
            if (!nextSlots.includes(slot) && nextSlots[0]) setSlot(nextSlots[0])
            setSearched(false)
          }} /></div>
          <div className="field"><label htmlFor="slot">Horario</label><select id="slot" value={slot} disabled={availableSlots.length === 0} onChange={(e) => { setSlot(e.target.value as Room['slot']); setSearched(false) }}><option disabled={!availableSlots.includes('10:00–12:00')}>10:00–12:00</option><option disabled={!availableSlots.includes('18:00–20:00')}>18:00–20:00</option></select></div>
          <div className="field"><label htmlFor="capacity">Aforo solicitado</label><input id="capacity" type="number" min="1" required value={capacity} onChange={(e) => { setCapacity(Math.max(1, Number(e.target.value))); setSearched(false) }} /></div>
          <button className="primary-button" type="submit" disabled={isPastDate || availableSlots.length === 0}>Consultar disponibilidad <span>→</span></button>
        </form>
        <section className="results-panel">
          <div className="results-head"><p className="eyebrow">Resultados</p><strong>{searched ? `${results.length} disponibles` : 'Completa la búsqueda'}</strong></div>
          {isPastDate && <div className="empty-state"><p>No es posible reservar una fecha anterior al día actual.</p></div>}
          {!isPastDate && availableSlots.length === 0 && <div className="empty-state"><p>Todos los horarios de hoy ya comenzaron o finalizaron.</p></div>}
          {searched && weekday && !validTime && availableSlots.length > 0 && <div className="empty-state"><p>El horario seleccionado ya comenzó. Elige un turno posterior.</p></div>}
          {searched && !weekday && <div className="empty-state"><p>Las salas solo están disponibles de lunes a viernes.</p></div>}
          {searched && weekday && validTime && results.length === 0 && <div className="empty-state"><p>No hay salas para ese horario y aforo.</p></div>}
          <div className="space-results">
            {results.map((room) => (
              <button className="space-card selected-space" key={room.id} onClick={() => { select(room, date, capacity); go('checkout') }}>
                <span className="space-index">01</span><div><h3>Sala {room.name}</h3><p>{dateLabel} · {room.slot} · Máx. {room.capacity}</p></div><strong>{money.format(30)}</strong>
              </button>
            ))}
          </div>
        </section>
      </section>
    </Shell>
  )
}

function QrCode() {
  const cells = Array.from({ length: 441 }, (_, index) => {
    const x = index % 21, y = Math.floor(index / 21)
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
    return finder
      ? x % 14 === 0 || x % 14 === 6 || y % 14 === 0 || y % 14 === 6 || (x % 14 > 1 && x % 14 < 5 && y % 14 > 1 && y % 14 < 5)
      : (x * 7 + y * 11 + x * y) % 5 < 2
  })
  return <div className="qr" aria-label="Código QR de acceso">{cells.map((filled, index) => <i className={filled ? 'filled' : ''} key={index} />)}</div>
}

function EmptyBooking({ go }: { go: (page: Page) => void }) {
  return <div className="no-booking"><span className="no-booking-mark">×</span><h2>No existe una reserva activa.</h2><p>Realiza una búsqueda y completa el pago para generar tu comprobante QR.</p><button className="primary-button" onClick={() => go('availability')}>Buscar una sala <span>→</span></button></div>
}

function Pass({ booking, go, logout }: { booking: Booking | null; go: (page: Page) => void; logout: () => void }) {
  return (
    <Shell role="client" title="Tu pase de acceso." subtitle="Presenta el código en recepción para validar tu entrada." go={go} logout={logout}>
      {!booking || booking.status !== 'active' ? <EmptyBooking go={go} /> : (
        <div className="pass-card">
          <div className="pass-top"><span className="mono-note">PASE DIGITAL · ACTIVO</span><span className="status-dot">Válido</span></div>
          <div className="pass-main"><QrCode /><div className="pass-details"><p className="eyebrow">Reserva #{booking.id}</p><h2>Sala {booking.roomName}</h2><dl><div><dt>Fecha</dt><dd>{booking.date}</dd></div><div><dt>Horario</dt><dd>{booking.slot}</dd></div><div><dt>Titular</dt><dd>Usuario de prueba</dd></div><div><dt>Aforo</dt><dd>{booking.capacity} personas</dd></div></dl></div></div>
          <p className="pass-foot">Comprobante personal e intransferible.</p>
        </div>
      )}
    </Shell>
  )
}

function Bookings({ booking, cancel, go, logout }: { booking: Booking | null; cancel: () => void; go: (page: Page) => void; logout: () => void }) {
  return (
    <Shell role="client" title="Mis reservas." subtitle="Consulta o cancela tu reserva activa." go={go} logout={logout}>
      {!booking || booking.status !== 'active' ? <EmptyBooking go={go} /> : (
        <article className="booking-card active-booking">
          <div><span className="status-dot">Activa</span><h2>Sala {booking.roomName}</h2><p>{booking.date} · {booking.slot} · {booking.capacity} asistentes</p></div><strong>#{booking.id}</strong>
          <div className="booking-actions"><button className="outline-button" onClick={() => go('pass')}>Ver pase QR</button><button className="text-button" onClick={cancel}>Cancelar reserva</button></div>
        </article>
      )}
    </Shell>
  )
}

function SubscriptionDashboard({ subscription, purchase, go, logout }: {
  subscription: SubscriptionState
  purchase: (item: HourPackage) => void
  go: (page: Page) => void
  logout: () => void
}) {
  const [selectedPackage, setSelectedPackage] = useState<HourPackage | null>(null)
  const [processing, setProcessing] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const confirmPurchase = () => {
    if (!selectedPackage || processing) return
    setProcessing(true)
    window.setTimeout(() => {
      purchase(selectedPackage)
      setConfirmation(`Se acreditaron ${selectedPackage.hours} horas correctamente.`)
      setSelectedPackage(null)
      setProcessing(false)
    }, 450)
  }

  return (
    <Shell role="client" title="Mi Suscripción." subtitle="Compra paquetes flexibles y controla el uso de tus horas." go={go} logout={logout}>
      <div className="subscription-stats">
        <article><span>Horas adquiridas</span><strong>{subscription.purchasedHours} h</strong></article>
        <article><span>Horas consumidas</span><strong>{subscription.consumedHours} h</strong></article>
        <article className="balance-stat"><span>Horas disponibles</span><strong>{subscription.balance} h</strong></article>
      </div>
      {confirmation && <div className="purchase-confirmation" role="status"><Icon name="check" /> {confirmation}</div>}

      <div className="subscription-heading"><div><p className="eyebrow">Recargar saldo</p><h2>Paquetes de horas</h2></div><span>Precios de demostración</span></div>
      <div className="package-grid">
        {hourPackages.map((item) => (
          <article className="package-card" key={item.id}>
            <span className="mono-note">PAQUETE FLEXIBLE</span><strong>{item.hours}<small> horas</small></strong>
            <p>{item.description}</p><div><b>{money.format(item.price)}</b><span>Valor demo</span></div>
            <button className="outline-button" onClick={() => { setSelectedPackage(item); setConfirmation('') }}>Comprar paquete</button>
          </article>
        ))}
      </div>

      {selectedPackage && <section className="purchase-summary">
        <div><p className="eyebrow">Resumen de compra</p><h2>Paquete de {selectedPackage.hours} horas</h2><p>Se acreditarán <strong>{selectedPackage.hours} horas</strong> por {money.format(selectedPackage.price)}.</p></div>
        <div className="purchase-actions"><button className="text-button" disabled={processing} onClick={() => setSelectedPackage(null)}>Cancelar</button><button className="primary-button" disabled={processing} onClick={confirmPurchase}>{processing ? 'Procesando…' : 'Confirmar compra'} <span>→</span></button></div>
      </section>}

      <div className="subscription-heading history-heading"><div><p className="eyebrow">Actividad</p><h2>Historial de movimientos</h2></div></div>
      <div className="history-wrap">
        {subscription.movements.length === 0 ? <div className="empty-state"><p>Todavía no hay movimientos en tu suscripción.</p></div> : <table className="history-table">
          <thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Descripción</th><th>Referencia</th><th>Crédito</th><th>Débito</th><th>Saldo</th><th>Estado</th></tr></thead>
          <tbody>{subscription.movements.map((movement) => <tr key={movement.id}>
            <td>{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(movement.createdAt))}</td>
            <td><span className={`movement-tag ${movement.type}`}>{movement.type === 'credit' ? 'Recarga' : 'Consumo'}</span></td>
            <td>{movement.description}</td><td>{movement.reference}</td><td className="credit-value">{movement.type === 'credit' ? `+${movement.hours} h` : '—'}</td><td className="debit-value">{movement.type === 'debit' ? `−${movement.hours} h` : '—'}</td><td>{movement.resultingBalance} h</td><td>Completada</td>
          </tr>)}</tbody>
        </table>}
      </div>
    </Shell>
  )
}

function Checkout({ pending, subscription, complete, go }: {
  pending: PendingBooking | null
  subscription: SubscriptionState
  complete: (total: number, paymentMethod: 'card' | 'hours') => boolean
  go: (page: Page) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'hours'>('card')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const services = pending?.room.services ?? []
  const total = useMemo(() => 30 + selected.reduce((sum, service) => sum + (servicePrices[service] ?? 0), 0), [selected])
  const duration = pending ? SubscriptionManager.calculateDuration(pending.room.slot) : 0
  const enoughHours = SubscriptionManager.canDebit(subscription, duration)
  if (!pending) return <main className="success-shell"><EmptyBooking go={go} /></main>
  return (
    <main className="page-shell">
      <header className="site-header"><button className="brand-button" onClick={() => go('home')}>WorkSpace</button><div className="secure-label"><Icon name="lock" /> Pago seguro</div></header>
      <div className="checkout-wrap">
        <button className="back-link button-link" onClick={() => go('availability')}><Icon name="arrow" /> Volver a disponibilidad</button>
        <div className="intro"><p className="eyebrow">Finalizar reserva</p><h1>Confirma tu espacio.</h1><p>Sala {pending.room.name} · {pending.room.slot} · {pending.capacity} personas</p></div>
        <form className="checkout-grid" onSubmit={(e) => {
          e.preventDefault()
          if (processing) return
          if (paymentMethod === 'hours' && !enoughHours) {
            setError(`Saldo insuficiente: tienes ${subscription.balance} h y necesitas ${duration} h.`)
            return
          }
          setProcessing(true)
          if (!complete(total, paymentMethod)) {
            setError('No fue posible confirmar la reserva. No se realizó ningún cargo.')
            setProcessing(false)
          }
        }}>
          <section className="left-column">
            <div className="section-heading"><span>01</span><div><h2>Servicios de la sala</h2><p>Amplía tu reserva.</p></div></div>
            <div className="extras-list">
              {services.length === 0 && <p className="form-lead">Esta sala no ofrece servicios adicionales.</p>}
              {services.map((service) => { const checked = selected.includes(service); return <button className={`extra-option ${checked ? 'selected' : ''}`} key={service} type="button" onClick={() => setSelected((current) => checked ? current.filter((item) => item !== service) : [...current, service])}><span className="checkbox">{checked && <Icon name="check" />}</span><span className="extra-copy"><strong>{service}</strong><small>Disponible para esta sala</small></span><span className="extra-price">+{money.format(servicePrices[service] ?? 0)}</span></button> })}
            </div>
            <div className="section-heading payment-heading"><span>02</span><div><h2>Método de pago</h2><p>Elige cómo quieres confirmar tu reserva.</p></div></div>
            <div className="payment-methods">
              <button type="button" className={paymentMethod === 'card' ? 'active' : ''} onClick={() => { setPaymentMethod('card'); setError('') }}><span>Tarjeta de crédito</span><small>Pago simulado actual</small></button>
              <button type="button" className={paymentMethod === 'hours' ? 'active' : ''} onClick={() => { setPaymentMethod('hours'); setError('') }}><span>Saldo de Horas</span><small>{subscription.balance} h disponibles</small></button>
            </div>
            {paymentMethod === 'card' ? <>
              <div className="field"><label htmlFor="card">Número de tarjeta</label><input id="card" required placeholder="0000 0000 0000 0000" /></div>
              <div className="field-row"><div className="field"><label htmlFor="expiry">Caducidad</label><input id="expiry" required placeholder="MM / AA" /></div><div className="field"><label htmlFor="cvc">CVC</label><input id="cvc" required placeholder="•••" /></div></div>
            </> : <div className={`hours-payment-summary ${enoughHours ? '' : 'insufficient'}`}>
              <div><span>Saldo disponible</span><strong>{subscription.balance} h</strong></div><div><span>Duración de la reserva</span><strong>{duration} h</strong></div><div><span>Horas a descontar</span><strong>−{duration} h</strong></div><div><span>Saldo tras reservar</span><strong>{Math.max(0, subscription.balance - duration)} h</strong></div>
              {!enoughHours && <p>Saldo insuficiente. Necesitas {duration} h y tienes {subscription.balance} h.</p>}
            </div>}
            {error && <p className="checkout-error" role="alert">{error}</p>}
          </section>
          <aside className="summary"><p className="summary-label">Resumen de pago</p><div className="summary-title"><div><h2>Sala {pending.room.name}</h2><p>{pending.date} · {pending.room.slot}</p></div></div><div className="line-items"><div><span>Reserva de sala</span><strong>{money.format(30)}</strong></div>{selected.map((service) => <div key={service}><span>{service}</span><strong>{money.format(servicePrices[service] ?? 0)}</strong></div>)}</div><div className="total-row"><span>{paymentMethod === 'hours' ? 'Consumo' : 'Total'}</span><strong>{paymentMethod === 'hours' ? `${duration} h` : money.format(total)}</strong></div><button className="primary-button" type="submit" disabled={processing || (paymentMethod === 'hours' && !enoughHours)}>{processing ? 'Confirmando…' : 'Confirmar y pagar'} <span>→</span></button><p className="secure-note"><Icon name="lock" /> TRANSACCIÓN CIFRADA</p></aside>
        </form>
      </div>
    </main>
  )
}

function AdminScan({ booking, go, logout }: { booking: Booking | null; go: (page: Page) => void; logout: () => void }) {
  const [scanned, setScanned] = useState(false)
  const valid = booking?.status === 'active'
  return (
    <Shell role="admin" title="Comprobar acceso." subtitle="Simula el escaneo del comprobante QR del cliente." go={go} logout={logout}>
      <section className="admin-card scan-card">
        <div className={`camera ${scanned ? 'scanned' : ''}`}><div className="focus-frame" /><span>{scanned ? (valid ? 'QR VALIDADO' : 'QR NO VÁLIDO') : 'CÁMARA PREPARADA'}</span></div>
        <button className="primary-button" onClick={() => setScanned(true)}>Escanear comprobante <span>→</span></button>
        {scanned && <div className="access-result"><span className={valid ? 'status-dot' : 'muted-status'}>{valid ? 'Acceso autorizado' : 'Sin reserva activa'}</span>{valid && <p><strong>Sala {booking.roomName}</strong> · {booking.slot} · {booking.capacity} personas</p>}</div>}
      </section>
    </Shell>
  )
}

function AdminReservations({ booking, refund, go, logout }: { booking: Booking | null; refund: () => void; go: (page: Page) => void; logout: () => void }) {
  return (
    <Shell role="admin" title="Reservas y reembolsos." subtitle="Consulta el estado actual y procesa cancelaciones." go={go} logout={logout}>
      {!booking ? <div className="empty-state"><p>No hay reservas registradas durante esta sesión.</p></div> : (
        <article className="booking-card active-booking"><div><span className={booking.status === 'active' ? 'status-dot' : 'muted-status'}>{booking.status === 'active' ? 'Activa' : 'Reembolsada'}</span><h2>Sala {booking.roomName}</h2><p>{booking.date} · {booking.slot} · {booking.capacity} asistentes</p></div><strong>#{booking.id}</strong><div className="booking-actions"><button className="outline-button" disabled={booking.status === 'refunded'} onClick={refund}>{booking.status === 'refunded' ? 'Reembolso completado' : `Reembolsar ${money.format(booking.total)}`}</button></div></article>
      )}
    </Shell>
  )
}

function AdminRooms({ rooms, save, go, logout }: { rooms: Room[]; save: (room: Room) => void; go: (page: Page) => void; logout: () => void }) {
  return (
    <Shell role="admin" title="Modificar salas." subtitle="Los cambios se guardan localmente y se aplican a las búsquedas del cliente." go={go} logout={logout}>
      <div className="room-editor-grid">{rooms.map((room) => <RoomEditor key={room.id} room={room} save={save} />)}</div>
    </Shell>
  )
}

function RoomEditor({ room, save }: { room: Room; save: (room: Room) => void }) {
  const [draft, setDraft] = useState(room)
  const [saved, setSaved] = useState(false)
  const allServices = Object.keys(servicePrices)
  return (
    <form className="admin-card room-editor" onSubmit={(e) => { e.preventDefault(); save(draft); setSaved(true) }}>
      <p className="eyebrow">Sala · {room.slot}</p>
      <div className="field"><label>Nombre</label><input value={draft.name} required onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setSaved(false) }} /></div>
      <div className="field"><label>Aforo máximo</label><input type="number" min="1" value={draft.capacity} required onChange={(e) => { setDraft({ ...draft, capacity: Math.max(1, Number(e.target.value)) }); setSaved(false) }} /></div>
      <fieldset className="service-options"><legend>Servicios adicionales</legend>{allServices.map((service) => <label key={service}><input type="checkbox" checked={draft.services.includes(service)} onChange={() => { const services = draft.services.includes(service) ? draft.services.filter((item) => item !== service) : [...draft.services, service]; setDraft({ ...draft, services }); setSaved(false) }} /> {service}</label>)}</fieldset>
      <button className="primary-button" type="submit">{saved ? 'Cambios guardados' : 'Guardar cambios'} <span>{saved ? '✓' : '→'}</span></button>
    </form>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('login')
  const [role, setRole] = useState<Role>('client')
  const [rooms, setRooms] = useStoredState<Room[]>('workspace-rooms', defaultRooms)
  const [booking, setBooking] = useStoredState<Booking | null>('workspace-booking', null)
  const [subscription, setSubscription] = useStoredState<SubscriptionState>('workspace-subscription', initialSubscription)
  const [pending, setPending] = useState<PendingBooking | null>(null)

  const go = (next: Page) => {
    const clientOnly: Page[] = ['availability', 'checkout', 'bookings', 'pass', 'subscription']
    const adminOnly: Page[] = ['admin-scan', 'admin-reservations', 'admin-rooms']
    if (role === 'admin' && clientOnly.includes(next)) return
    if (role === 'client' && adminOnly.includes(next)) return
    setPage(next)
  }
  const logout = () => { setPending(null); setPage('login') }
  const complete = (total: number, paymentMethod: 'card' | 'hours') => {
    if (!pending) return false
    if (paymentMethod === 'hours') {
      const result = SubscriptionManager.debit(subscription, pending.room.slot, pending.reference)
      if (!result.ok) return false
      setSubscription(result.state)
    }
    setBooking({ id: pending.reference, roomId: pending.room.id, roomName: pending.room.name, date: pending.date, slot: pending.room.slot, capacity: pending.capacity, total, status: 'active', paymentMethod })
    setPending(null)
    setPage('pass')
    return true
  }

  if (page === 'login') return <Login onLogin={(nextRole) => { setRole(nextRole); setPage('home') }} />
  if (page === 'availability') return <Availability rooms={rooms} go={go} logout={logout} select={(room, date, capacity) => setPending({ reference: `WS-${Math.floor(1000 + Math.random() * 9000)}`, room, date, capacity })} />
  if (page === 'checkout') return <Checkout pending={pending} subscription={subscription} complete={complete} go={go} />
  if (page === 'bookings') return <Bookings booking={booking} cancel={() => setBooking(null)} go={go} logout={logout} />
  if (page === 'pass') return <Pass booking={booking} go={go} logout={logout} />
  if (page === 'subscription') return <SubscriptionDashboard subscription={subscription} purchase={(item) => setSubscription(SubscriptionManager.purchase(subscription, item).state)} go={go} logout={logout} />
  if (page === 'admin-scan') return <AdminScan booking={booking} go={go} logout={logout} />
  if (page === 'admin-reservations') return <AdminReservations booking={booking} refund={() => booking && setBooking({ ...booking, status: 'refunded' })} go={go} logout={logout} />
  if (page === 'admin-rooms') return <AdminRooms rooms={rooms} save={(updated) => setRooms(rooms.map((room) => room.id === updated.id ? updated : room))} go={go} logout={logout} />
  return <Home role={role} go={go} logout={logout} />
}
