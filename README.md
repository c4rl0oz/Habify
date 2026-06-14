# 🌱 Habify

**Tu tracker de hábitos personal.** Una PWA mobile-first para crear, seguir y mantener hábitos, con notificaciones push reales, rachas inteligentes y un diseño cuidado al estilo nativo de iOS.

> Proyecto que nació en un curso de calidad de software y evolucionó a una herramienta personal completa y pulida.

---

## ✨ Características

### Autenticación
- Registro e inicio de sesión con correo y contraseña (sobre Supabase).
- Sesión persistente vía `localStorage`.
- Recuperación de contraseña con contraseñas temporales legibles (formato `Palabra###`).

### Hábitos
- Creación con paleta de **8 colores de acento**, selector de emoji y nombre.
- Dos tipos: **check** (hecho/no hecho) y **contador** (con meta y unidad, ej. "8 vasos").
- Configuración flexible de frecuencia:
  - Todos los días.
  - **Meta semanal** (X veces por semana, cualquier día).
  - **Días concretos** de la semana (ej. lunes, viernes y sábado).
- Reordenamiento por **arrastrar y soltar**, fijar hábitos (pin) y edición completa.

### Seguimiento diario
- Tira horizontal de días.
- Tarjetas de hábito con color de acento y barra de progreso semanal.
- Toggle de completado y celebración **"Día perfecto"** con confeti al terminar todo.

### Calendario
- Vista mensual con indicadores por día.
- Resumen semanal con barras de progreso por hábito e insights.
- Notas por día.

### Estadísticas
- Anillo de productividad del día.
- Gráficas semanal (barras) y mensual (línea) con Chart.js.
- Comparativa semana contra semana.
- Patrón por día de la semana.
- **Empty state** amable cuando aún no hay hábitos.

### Rachas y logros
- **Sistema de rachas con 3 lógicas** según el tipo de hábito (ver más abajo).
- Estado de "en riesgo" con día de margen.
- Sistema de **12 logros** con toasts de desbloqueo.

### Recordatorios (Web Push real)
- Notificaciones push **que llegan aunque la app esté cerrada**, incluido iOS instalado en pantalla de inicio.
- Respetan la configuración de días: si eliges ciertos días, solo esos días te recuerda.
- **Múltiples recordatorios por día** para hábitos de contador.
- Vista de recordatorios activos dentro del detalle de cada hábito.

### Fotos
- Foto al completar un hábito, con compresión en cliente (Canvas API, <200KB).
- Almacenamiento en Supabase Storage e historial de fotos.

### Perfil y experiencia
- Edición de nombre, contraseña y foto de perfil.
- Estadística de hora pico personal, mejor racha y FAQ.
- **Modo oscuro OLED** (negro puro) y modo claro.
- Animaciones de entrada, onboarding de 5 pasos y splash screen.

---

## 🧠 Lógica de rachas

Las rachas se comportan distinto según cómo esté configurado el hábito. Todas las semanas se cuentan de **lunes a domingo**.

| Tipo de hábito | Cómo cuenta | Cuándo se rompe | Cuándo empieza a mostrarse |
|---|---|---|---|
| **Todos los días** | Días consecutivos completados | Tras más de 1 día sin completar (1 día de margen) | A partir del día 3 |
| **Meta semanal** (X veces/sem, sin días fijos) | Días totales + semanas cumplidas | Solo si una semana ya terminada no alcanzó la meta | Desde la 1.ª vez si la meta es 1/sem; desde la 2.ª si es ≥2/sem |
| **Días concretos** (ej. L, V, S) | Días totales + semanas cumplidas | Si falta cualquier día programado de una semana ya terminada | A partir del día 2 |

En los hábitos de meta semanal y días concretos, la racha muestra **días + semanas** (ej. `🔥 5 · 2 sem`).

---

## 🛠️ Stack tecnológico

**Frontend**
- HTML5 + JavaScript vanilla (ES6+)
- Tailwind CSS (CDN)
- Chart.js
- SVGs en línea, Web Audio API, Canvas API, Web Notifications API

**Backend**
- Supabase (PostgreSQL + REST API)
- Supabase Storage
- Supabase Edge Functions (Deno / TypeScript)
- `pg_cron` + `pg_net`

**PWA / despliegue**
- Service Worker (`sw.js`)
- `manifest.json`
- GitHub Pages

---

## 🔔 Cómo funcionan las notificaciones (arquitectura)

El sistema de recordatorios usa **Web Push real** en lugar de temporizadores en el navegador (que no sobreviven cuando el Service Worker se duerme). El flujo es:

1. **Suscripción (cliente):** al aceptar permisos, `app.js` suscribe el dispositivo con la clave pública VAPID y guarda la suscripción (`endpoint`, claves y **zona horaria**) en la tabla `push_subscriptions`.
2. **Recepción (Service Worker):** `sw.js` escucha el evento `push` y muestra la notificación con el título y cuerpo que envía el servidor.
3. **Envío (Edge Function):** la función `enviar-recordatorios` (Deno + `web-push`, firmada con VAPID) calcula la hora local de cada suscripción según su zona horaria, busca los hábitos cuyo recordatorio coincide con ese minuto —respetando los días programados y si ya se completó— y envía el push.
4. **Automatización (cron):** `pg_cron` ejecuta la Edge Function **cada minuto**, así los recordatorios llegan solos sin intervención.

```
Cliente (suscribe) ─► push_subscriptions (Supabase)
                                  │
        pg_cron (cada minuto) ──► Edge Function ──► Web Push ──► Service Worker ──► 🔔 Notificación
```

---

## 📂 Estructura del proyecto

```
Habify/
├── index.html        # Estructura y todas las pantallas (UI)
├── app.js            # Lógica de la app, rachas, push, render
├── supabase.js       # Cliente REST de Supabase
├── sw.js             # Service Worker (recepción de push)
├── manifest.json     # Configuración PWA
└── icons/            # Íconos de la app
```

**Lado servidor (en Supabase):**
- Tabla `usuarios`, `habitos`, `registros`, `push_subscriptions`.
- Buckets de Storage: `habit-photos`, `profile-photos`.
- Edge Function: `enviar-recordatorios`.
- Job de `pg_cron` que la dispara cada minuto.

---

## ⚙️ Puesta en marcha

> El frontend es estático: basta servir los archivos (o publicarlos en GitHub Pages). El backend requiere un proyecto de Supabase configurado.

### 1. Supabase
- Crea las tablas (`usuarios`, `habitos`, `registros`, `push_subscriptions`) y los buckets de Storage.
- Ajusta `SUPABASE_URL` y la `anon key` en `supabase.js`.

### 2. Notificaciones push
- Genera un par de claves **VAPID**.
- Pon la **clave pública** en `app.js` (`VAPID_PUBLIC_KEY`).
- Despliega la Edge Function `enviar-recordatorios` y configura sus *secrets*: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente).
- Activa `pg_cron` + `pg_net` y programa la función cada minuto.

> ⚠️ Las claves privadas y *service role* **nunca** van en el frontend ni en el repositorio.

### 3. PWA en iOS
Para recibir notificaciones en iPhone/iPad, la app debe **instalarse en la pantalla de inicio** (iOS 16.4+) y abrirse desde ahí, no desde Safari.

---

## 🗺️ Próximos pasos

- Íconos y logo personalizados.
- "Modo Reto" (challenge mode).
- Pulido visual adicional.

---

## 📄 Notas

Habify es un proyecto personal en evolución. La arquitectura prioriza la simplicidad (tres archivos de frontend, sin build step) y una experiencia visual limpia con estética nativa de iOS.
