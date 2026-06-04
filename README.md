# Habify v1.0

**Tracker de hábitos personal** — aplicación web progresiva (PWA) diseñada para dispositivos móviles iOS/Android, desarrollada como proyecto final para la materia de Calidad de Software.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, JavaScript (Vanilla ES6+) |
| Estilos | Tailwind CSS (CDN) |
| Iconos | Lucide Icons |
| Gráficas | Chart.js |
| Base de datos | Supabase (PostgreSQL) |
| Hosting | GitHub Pages |

---

## Estructura del proyecto

```
Habify/
├── index.html      # Estructura completa de la app (SPA)
├── app.js          # Lógica principal de la aplicación
└── supabase.js     # Conexión y operaciones con Supabase
```

---

## Funcionalidades implementadas

### Autenticación
- Registro de usuario con nombre, correo y contraseña
- Inicio de sesión persistente via localStorage
- Cierre de sesión

### Gestión de hábitos
- Crear hábito con nombre, emoji, color de acento y meta semanal
- Marcar/desmarcar hábito como completado en el día actual
- Eliminar hábito con confirmación
- Cálculo automático de racha actual y racha máxima

### Pantalla principal
- Tarjetas horizontales con color de acento personalizado
- Barra de progreso semanal por hábito
- Indicador de racha activa
- Botón de check rápido sin salir de la pantalla

### Pantalla de detalle
- Estadísticas: racha actual, mejor racha, total de días completados
- Mapa de actividad tipo GitHub (últimos 3 meses)
- Historial de los últimos 10 registros
- Marcar/desmarcar desde el detalle

### Header
- Saludo personalizado por hora del día (mañana/tarde/noche)
- Primer nombre extraído automáticamente
- Tira horizontal de los últimos 14 días con indicador de actividad

### Calendario
- Vista mensual con navegación por meses
- Indicadores visuales de días con hábitos completados y notas
- Vista rápida al tocar un día: hábitos completados y nota del día
- Registro de notas por fecha guardadas en Supabase

### Estadísticas
- Porcentaje de productividad diaria con anillo SVG animado
- Gráfica de barras semanal (Chart.js)
- Gráfica de línea mensual — últimos 30 días
- Listado de rachas activas ordenadas de mayor a menor

### Perfil
- Inicial del usuario en avatar
- Hábitos creados, días de uso y racha máxima histórica
- Toggle de modo oscuro (OLED)
- Cierre de sesión

---

## Base de datos — Supabase

### Tabla `usuarios`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Identificador único |
| nombre | text | Nombre del usuario |
| correo | text | Correo electrónico |
| password | text | Contraseña |
| fecha_registro | date | Fecha de creación de cuenta |

### Tabla `habitos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Identificador único |
| usuario_id | uuid | Referencia al usuario |
| nombre | text | Nombre del hábito |
| emoji | text | Emoji icono |
| color | text | Color de acento hex |
| meta_semanal | int | Días objetivo por semana |
| fecha_creacion | date | Fecha de creación |

### Tabla `registros`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Identificador único |
| habito_id | uuid | Referencia al hábito |
| usuario_id | uuid | Referencia al usuario |
| fecha | date | Fecha del registro |
| nota | text | Nota opcional del día |

---

## Instalación y uso local

```bash
# 1. Clonar el repositorio
git clone https://github.com/c4rl0oz/Habify.git

# 2. Abrir con Live Server en VS Code
# Instalar extensión "Live Server" y abrir index.html con Go Live

# 3. La app corre en http://127.0.0.1:3000
```

> No requiere instalación de dependencias — todo corre via CDN.

---

## Despliegue

La app está publicada en GitHub Pages:

**https://c4rl0oz.github.io/Habify/**

Cada push a `main` actualiza automáticamente la URL pública en 1-2 minutos.

```bash
git add .
git commit -m "descripción del cambio"
git push
```

---

## Paleta de colores

| Nombre | Hex | Uso |
|--------|-----|-----|
| Índigo | `#6C63FF` | Color principal, acento por defecto |
| Coral | `#FF6B6B` | Acento de hábito |
| Menta | `#00C9A7` | Acento de hábito |
| Ámbar | `#FF9F43` | Acento de hábito |
| Cielo | `#4FC3F7` | Acento de hábito |
| Rosa | `#F368E0` | Acento de hábito |
| Lima | `#A8E063` | Acento de hábito |
| Pizarra | `#778CA3` | Acento de hábito |

---

## Autor

**Santiago** — Proyecto para materia de Calidad de Software  
Repositorio: [github.com/c4rl0oz/Habify](https://github.com/c4rl0oz/Habify)
