import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'

type Role = 'client' | 'admin'
type Page =
  | 'login'
  | 'home'
  | 'availability'
  | 'checkout'
  | 'bookings'
  | 'pass'
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
  const [date, setDate] = useState('2026-03-12')
  const [slot, setSlot] = useState<Room['slot']>('10:00–12:00')
  const [capacity, setCapacity] = useState(1)
  const [searched, setSearched] = useState(false)
  const weekday = date ? ![0, 6].includes(new Date(`${date}T12:00:00`).getDay()) : false
  const results = searched && weekday ? rooms.filter((room) => room.slot === slot && capacity <= room.capacity) : []
  const dateLabel = date ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`)) : ''

  return (
    <Shell role="client" title="Consulta de disponibilidad." subtitle="Las salas operan de lunes a viernes en sus horarios asignados." go={go} logout={logout}>
      <section className="availability-layout">
        <form className="search-panel" onSubmit={(e) => { e.preventDefault(); setSearched(true) }}>
          <div className="field"><label htmlFor="date">Fecha</label><input id="date" type="date" required value={date} onChange={(e) => { setDate(e.target.value); setSearched(false) }} /></div>
          <div className="field"><label htmlFor="slot">Horario</label><select id="slot" value={slot} onChange={(e) => { setSlot(e.target.value as Room['slot']); setSearched(false) }}><option>10:00–12:00</option><option>18:00–20:00</option></select></div>
          <div className="field"><label htmlFor="capacity">Aforo solicitado</label><input id="capacity" type="number" min="1" required value={capacity} onChange={(e) => { setCapacity(Math.max(1, Number(e.target.value))); setSearched(false) }} /></div>
          <button className="primary-button" type="submit">Consultar disponibilidad <span>→</span></button>
        </form>
        <section className="results-panel">
          <div className="results-head"><p className="eyebrow">Resultados</p><strong>{searched ? `${results.length} disponibles` : 'Completa la búsqueda'}</strong></div>
          {searched && !weekday && <div className="empty-state"><p>Las salas solo están disponibles de lunes a viernes.</p></div>}
          {searched && weekday && results.length === 0 && <div className="empty-state"><p>No hay salas para ese horario y aforo.</p></div>}
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

function Checkout({ pending, complete, go }: { pending: { room: Room; date: string; capacity: number } | null; complete: (total: number) => void; go: (page: Page) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const services = pending?.room.services ?? []
  const total = useMemo(() => 30 + selected.reduce((sum, service) => sum + (servicePrices[service] ?? 0), 0), [selected])
  if (!pending) return <main className="success-shell"><EmptyBooking go={go} /></main>
  return (
    <main className="page-shell">
      <header className="site-header"><button className="brand-button" onClick={() => go('home')}>WorkSpace</button><div className="secure-label"><Icon name="lock" /> Pago seguro</div></header>
      <div className="checkout-wrap">
        <button className="back-link button-link" onClick={() => go('availability')}><Icon name="arrow" /> Volver a disponibilidad</button>
        <div className="intro"><p className="eyebrow">Finalizar reserva</p><h1>Confirma tu espacio.</h1><p>Sala {pending.room.name} · {pending.room.slot} · {pending.capacity} personas</p></div>
        <form className="checkout-grid" onSubmit={(e) => { e.preventDefault(); complete(total) }}>
          <section className="left-column">
            <div className="section-heading"><span>01</span><div><h2>Servicios de la sala</h2><p>Amplía tu reserva.</p></div></div>
            <div className="extras-list">
              {services.length === 0 && <p className="form-lead">Esta sala no ofrece servicios adicionales.</p>}
              {services.map((service) => { const checked = selected.includes(service); return <button className={`extra-option ${checked ? 'selected' : ''}`} key={service} type="button" onClick={() => setSelected((current) => checked ? current.filter((item) => item !== service) : [...current, service])}><span className="checkbox">{checked && <Icon name="check" />}</span><span className="extra-copy"><strong>{service}</strong><small>Disponible para esta sala</small></span><span className="extra-price">+{money.format(servicePrices[service] ?? 0)}</span></button> })}
            </div>
            <div className="section-heading payment-heading"><span>02</span><div><h2>Datos de pago</h2><p>Datos simulados para completar la prueba.</p></div></div>
            <div className="field"><label htmlFor="card">Número de tarjeta</label><input id="card" required placeholder="0000 0000 0000 0000" /></div>
            <div className="field-row"><div className="field"><label htmlFor="expiry">Caducidad</label><input id="expiry" required placeholder="MM / AA" /></div><div className="field"><label htmlFor="cvc">CVC</label><input id="cvc" required placeholder="•••" /></div></div>
          </section>
          <aside className="summary"><p className="summary-label">Resumen de pago</p><div className="summary-title"><div><h2>Sala {pending.room.name}</h2><p>{pending.date} · {pending.room.slot}</p></div></div><div className="line-items"><div><span>Reserva de sala</span><strong>{money.format(30)}</strong></div>{selected.map((service) => <div key={service}><span>{service}</span><strong>{money.format(servicePrices[service] ?? 0)}</strong></div>)}</div><div className="total-row"><span>Total</span><strong>{money.format(total)}</strong></div><button className="primary-button" type="submit">Confirmar y pagar <span>→</span></button><p className="secure-note"><Icon name="lock" /> TRANSACCIÓN CIFRADA</p></aside>
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
  const [pending, setPending] = useState<{ room: Room; date: string; capacity: number } | null>(null)

  const go = (next: Page) => {
    const clientOnly: Page[] = ['availability', 'checkout', 'bookings', 'pass']
    const adminOnly: Page[] = ['admin-scan', 'admin-reservations', 'admin-rooms']
    if (role === 'admin' && clientOnly.includes(next)) return
    if (role === 'client' && adminOnly.includes(next)) return
    setPage(next)
  }
  const logout = () => { setPending(null); setPage('login') }
  const complete = (total: number) => {
    if (!pending) return
    setBooking({ id: `WS-${Math.floor(1000 + Math.random() * 9000)}`, roomId: pending.room.id, roomName: pending.room.name, date: pending.date, slot: pending.room.slot, capacity: pending.capacity, total, status: 'active' })
    setPending(null)
    setPage('pass')
  }

  if (page === 'login') return <Login onLogin={(nextRole) => { setRole(nextRole); setPage('home') }} />
  if (page === 'availability') return <Availability rooms={rooms} go={go} logout={logout} select={(room, date, capacity) => setPending({ room, date, capacity })} />
  if (page === 'checkout') return <Checkout pending={pending} complete={complete} go={go} />
  if (page === 'bookings') return <Bookings booking={booking} cancel={() => setBooking(null)} go={go} logout={logout} />
  if (page === 'pass') return <Pass booking={booking} go={go} logout={logout} />
  if (page === 'admin-scan') return <AdminScan booking={booking} go={go} logout={logout} />
  if (page === 'admin-reservations') return <AdminReservations booking={booking} refund={() => booking && setBooking({ ...booking, status: 'refunded' })} go={go} logout={logout} />
  if (page === 'admin-rooms') return <AdminRooms rooms={rooms} save={(updated) => setRooms(rooms.map((room) => room.id === updated.id ? updated : room))} go={go} logout={logout} />
  return <Home role={role} go={go} logout={logout} />
}
