// Variables globales
let misHabitos = [];
let usuarioActual = null;
let fechaActualCalendario = new Date();
let graficaSemanal = null;
let graficaMensual = null;
let diaSeleccionadoTira = hoyComoTexto();
let animarCargaInicial = true;
let notasCacheadas = {};

// ============================================================
// ANIMACIONES DE PANTALLA
// ============================================================
function abrirPantallaAnimada(id) {
    const el = document.getElementById(id);
    el.classList.remove('pantalla-slide-up', 'pantalla-slide-down');
    el.style.transform = '';
    el.style.opacity = '';
    el.classList.remove('hidden');
    void el.offsetHeight; // fuerza reflow
    el.classList.add('pantalla-slide-up');
    el.addEventListener('animationend', () => {
        el.classList.remove('pantalla-slide-up');
    }, { once: true });
}

function cerrarPantallaAnimada(id, callback) {
    const el = document.getElementById(id);
    el.classList.remove('pantalla-slide-up');
    el.classList.add('pantalla-cerrando');
    setTimeout(() => {
        el.classList.remove('pantalla-cerrando');
        el.classList.add('hidden');
        el.style.transform = '';
        el.style.opacity = '';
        if (callback) callback();
    }, 280);
}

function hoyComoTexto() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${mes}-${dia}`;
}

// Convierte un año, mes (0-indexed) y día en formato "YYYY-MM-DD"
function fechaComoTexto(year, mes, dia) {
    return `${year}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
// ============================================================
// CÁLCULOS AUTOMÁTICOS (ya no hay números manuales)
// ============================================================

// Devuelve cuántas veces se completó un hábito en la semana actual
function completadosEstaSemana(habito) {
    // Protección: si no tiene registros, retorna 0
    if (!habito.registros || !Array.isArray(habito.registros)) return 0;
    
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
    lunes.setHours(0, 0, 0, 0);

    return habito.registros.filter(fecha => {
        const d = new Date(fecha + "T00:00:00");
        return d >= lunes && d <= hoy;
    }).length;
}

// Devuelve true si el hábito ya fue completado HOY
function completadoHoy(habito) {
    return habito.registros.includes(hoyComoTexto());
}

// Calcula la racha actual (días consecutivos hasta hoy)
function calcularRacha(habito) {
    if (habito.registros.length === 0) return 0;

    const registrosOrdenados = [...habito.registros].sort().reverse();
    const hoy = hoyComoTexto();
    const ayer = fechaComoTexto(
        new Date(new Date() - 86400000).getFullYear(),
        new Date(new Date() - 86400000).getMonth(),
        new Date(new Date() - 86400000).getDate()
    );
    const anteayer = fechaComoTexto(
        new Date(new Date() - 172800000).getFullYear(),
        new Date(new Date() - 172800000).getMonth(),
        new Date(new Date() - 172800000).getDate()
    );

    // Sin actividad en los últimos 2 días — racha rota
    if (registrosOrdenados[0] !== hoy && 
        registrosOrdenados[0] !== ayer && 
        registrosOrdenados[0] !== anteayer) return 0;

    let racha = 0;
    let fechaEsperada = new Date(registrosOrdenados[0] + "T00:00:00");

    for (let i = 0; i < registrosOrdenados.length; i++) {
        const fechaRegistro = new Date(registrosOrdenados[i] + "T00:00:00");
        const diff = (fechaEsperada - fechaRegistro) / 86400000;

        if (diff === 0) {
            racha++;
            fechaEsperada = new Date(fechaRegistro - 86400000);
        } else {
            break;
        }
    }
    return racha;
}

// Devuelve true si la racha está en riesgo (último registro fue anteayer)
function rachaEnRiesgo(habito) {
    if (habito.registros.length === 0) return false;
    const registrosOrdenados = [...habito.registros].sort().reverse();
    const hoy = hoyComoTexto();
    const ayer = fechaComoTexto(
        new Date(new Date() - 86400000).getFullYear(),
        new Date(new Date() - 86400000).getMonth(),
        new Date(new Date() - 86400000).getDate()
    );
    const anteayer = fechaComoTexto(
        new Date(new Date() - 172800000).getFullYear(),
        new Date(new Date() - 172800000).getMonth(),
        new Date(new Date() - 172800000).getDate()
    );
    return registrosOrdenados[0] === anteayer && 
           registrosOrdenados[0] !== hoy && 
           registrosOrdenados[0] !== ayer;
}

function calcularRachaMaxima(habito) {
    if (!habito.registros || habito.registros.length === 0) return 0;

    const registrosOrdenados = [...habito.registros].sort();
    let rachaMax = 1;
    let rachaActual = 1;

    for (let i = 1; i < registrosOrdenados.length; i++) {
        const fechaAnterior = new Date(registrosOrdenados[i - 1] + "T00:00:00");
        const fechaActual = new Date(registrosOrdenados[i] + "T00:00:00");
        const diff = (fechaActual - fechaAnterior) / 86400000;

        if (diff === 1) {
            rachaActual++;
            rachaMax = Math.max(rachaMax, rachaActual);
        } else if (diff > 1) {
            rachaActual = 1;
        }
    }

    return rachaMax;
}

// ============================================================
// AUTENTICACIÓN CON SUPABASE
// ============================================================
function cambiarTab(tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegistro = document.getElementById('tab-registro');
    const formLogin = document.getElementById('form-login');
    const formRegistro = document.getElementById('form-registro');

    if (tab === 'login') {
        tabLogin.style.background = '#6C63FF';
        tabLogin.style.color = 'white';
        tabLogin.style.boxShadow = '0 4px 12px rgba(108,99,255,0.35)';
        tabRegistro.style.background = 'transparent';
        tabRegistro.style.color = '#94a3b8';
        tabRegistro.style.boxShadow = 'none';
        formLogin.classList.remove('hidden');
        formRegistro.classList.add('hidden');
        document.getElementById('btn-login').classList.remove('hidden');
        document.getElementById('btn-registro').classList.add('hidden');
    } else {
        tabRegistro.style.background = '#6C63FF';
        tabRegistro.style.color = 'white';
        tabRegistro.style.boxShadow = '0 4px 12px rgba(108,99,255,0.35)';
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = '#94a3b8';
        tabLogin.style.boxShadow = 'none';
        formRegistro.classList.remove('hidden');
        formLogin.classList.add('hidden');
        document.getElementById('btn-registro').classList.remove('hidden');
        document.getElementById('btn-login').classList.add('hidden');
    }
}

async function registrarUsuario() {
    const nombre = document.getElementById('registro-nombre').value.trim();
    const correo = document.getElementById('registro-correo').value.trim();
    const password = document.getElementById('registro-password').value.trim();
    const error = document.getElementById('registro-error');

    if (!nombre || !correo || password.length < 4) {
        error.innerText = 'Completa todos los campos correctamente.';
        error.classList.remove('hidden');
        return;
    }

    error.classList.add('hidden');
    
    // Mostrar loading
    const btn = event.target;
    btn.innerText = 'Creando cuenta...';
    btn.disabled = true;

    const resultado = await registrarUsuarioSupabase(nombre, correo, password);

    if (resultado.error) {
        error.innerText = resultado.error;
        error.classList.remove('hidden');
        btn.innerText = 'Crear cuenta →';
        btn.disabled = false;
        return;
    }

    usuarioActual = resultado.usuario;
    localStorage.setItem('habify_usuario_id', usuarioActual.id);
    await cargarDatosUsuario();
    document.getElementById('pantalla-auth').classList.add('hidden');
    actualizarUIUsuario(usuarioActual);
}

async function loginUsuario() {
    const correo = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const error = document.getElementById('login-error');

    if (!correo || !password) {
        error.classList.remove('hidden');
        return;
    }

    error.classList.add('hidden');

    const btn = event.target;
    btn.innerText = 'Entrando...';
    btn.disabled = true;

    const resultado = await loginUsuarioSupabase(correo, password);

    if (resultado.error) {
        error.innerText = resultado.error;
        error.classList.remove('hidden');
        btn.innerText = 'Entrar →';
        btn.disabled = false;
        return;
    }

    usuarioActual = resultado.usuario;
    localStorage.setItem('habify_usuario_id', usuarioActual.id);
    await cargarDatosUsuario();
    document.getElementById('pantalla-auth').classList.add('hidden');
    actualizarUIUsuario(usuarioActual);
}

async function verificarSesion() {
    const usuarioId = localStorage.getItem('habify_usuario_id');
    if (!usuarioId) {
        document.getElementById('pantalla-auth').classList.remove('hidden');
        return;
    }

    // Mostrar estado de carga
    mostrarCargando(true);

    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${usuarioId}&select=*`,
            { headers }
        );
        const data = await res.json();

        if (data.length === 0) {
            localStorage.removeItem('habify_usuario_id');
            document.getElementById('pantalla-auth').classList.remove('hidden');
            mostrarCargando(false);
            return;
        }

        usuarioActual = data[0];
        actualizarUIUsuario(usuarioActual);
        await cargarDatosUsuario();
        document.getElementById('pantalla-auth').classList.add('hidden');
    } catch (e) {
        mostrarError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
        mostrarCargando(false);
    }
}

async function cargarDatosUsuario() {
    if (!usuarioActual) return;

    try {
        const habitosDB = await obtenerHabitosSupabase(usuarioActual.id);
        const registrosDB = await obtenerRegistrosSupabase(usuarioActual.id);

        misHabitos = habitosDB.map(h => ({
            id: h.id,
            nombre: h.nombre,
            emoji: h.emoji,
            color: h.color || '#6C63FF',
            metaSemanal: h.meta_semanal,
            fechaCreacion: h.fecha_creacion,
            recordatorio: h.recordatorio || null,
            orden: h.orden ?? 0,
            tipo: h.tipo || 'check',
            unidad: h.unidad || null,
            metaCantidad: h.meta_cantidad || null,
            pinneado: h.pinneado || false,
            registros: registrosDB
                .filter(r => r.habito_id === h.id && (h.tipo !== 'contador' || r.cantidad >= (h.meta_cantidad || 1)))
                .map(r => r.fecha),
            cantidades: registrosDB
                .filter(r => r.habito_id === h.id && r.cantidad != null)
                .reduce((acc, r) => { acc[r.fecha] = r.cantidad; return acc; }, {})
        }));

        await cargarTodasLasNotas();
        renderizarHabitos();
        actualizarResumenHoy();
        inicializarTiraDias();
        programarRecordatorios();
        verificarNuevosLogros();
    } catch (e) {
        mostrarError('Revisa tu conexión.');
    }
}

function actualizarUIUsuario(usuario) {
    const inicial = usuario.nombre.charAt(0).toUpperCase();
    const headerInicial = document.getElementById('header-inicial');
    if (headerInicial) headerInicial.innerText = inicial;

    //saludo dinámico personalizado

    const saludo = document.getElementById('greeting-title');
    if (saludo) {
        const hora = new Date().getHours();
        let mensaje = '';
        const primerNombre = usuario.nombre.split(' ')[0];
        if (hora >= 6 && hora < 12) mensaje = `Buenos Días, ${primerNombre}! `;
        else if (hora >= 12 && hora < 19) mensaje = `Buenas Tardes, ${primerNombre}! `;
        else mensaje = `Buenas Noches, ${primerNombre}! `;
        saludo.innerText = mensaje;
    }
}

function abrirPerfil() {
    if (!usuarioActual) return;

    const inicial = usuarioActual.nombre.charAt(0).toUpperCase();
    document.getElementById('perfil-inicial').innerText = inicial;
    document.getElementById('perfil-nombre').innerText = usuarioActual.nombre;
    document.getElementById('perfil-total-habitos').innerText = misHabitos.length;

    const fechaRegistro = new Date(usuarioActual.fecha_registro + "T00:00:00");
    const hoy = new Date();
    const dias = Math.floor((hoy - fechaRegistro) / 86400000) + 1;
    document.getElementById('perfil-dias-uso').innerText = dias;

    const rachaMaxGlobal = misHabitos.reduce((max, habito) => {
        return Math.max(max, calcularRachaMaxima(habito));
    }, 0);
    document.getElementById('perfil-racha-max').innerText =
        rachaMaxGlobal > 0 ? `🔥 ${rachaMaxGlobal} días` : '—';

    // Renderizar logros
    const contenedorLogros = document.getElementById('perfil-logros');
    if (contenedorLogros) {
        const desbloqueados = obtenerLogrosDesbloqueados();
        const idsDesbloqueados = desbloqueados.map(l => l.id);
        contenedorLogros.innerHTML = '';

        LOGROS.forEach(logro => {
            const desbloqueado = idsDesbloqueados.includes(logro.id);
            const div = document.createElement('div');
            div.style.cssText = `
                display:flex; align-items:center; gap:12px; padding:12px 16px;
                border-radius:16px; border:1px solid;
                background:${desbloqueado ? 'rgba(108,99,255,0.08)' : 'transparent'};
                border-color:${desbloqueado ? 'rgba(108,99,255,0.2)' : 'rgba(0,0,0,0.06)'};
                opacity:${desbloqueado ? '1' : '0.4'};
            `;
            div.innerHTML = `
                <span style="font-size:24px; flex-shrink:0;">${logro.emoji}</span>
                <div style="flex:1; min-width:0;">
                    <p style="font-size:13px; font-weight:700;">${logro.nombre}</p>
                    <p style="font-size:11px; color:#94a3b8; margin-top:1px;">${logro.descripcion}</p>
                </div>
                ${desbloqueado ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
            `;
            contenedorLogros.appendChild(div);
        });
    }

    // Contador de logros
    const desbloqueados = obtenerLogrosDesbloqueados();
    const contadorEl = document.getElementById('perfil-logros-count');
    if (contadorEl) {
        contadorEl.innerText = `${desbloqueados.length} de ${LOGROS.length} desbloqueados`;
    }

    abrirPantallaAnimada('pantalla-perfil');
}

function cerrarPerfil() {
    cerrarPantallaAnimada('pantalla-perfil');
}

function cerrarSesion() {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
        localStorage.removeItem('habify_usuario_id');
        usuarioActual = null;
        misHabitos = [];
        document.getElementById('pantalla-perfil').classList.add('hidden');
        document.getElementById('pantalla-auth').classList.remove('hidden');
        document.getElementById('login-correo').value = '';
        document.getElementById('login-password').value = '';
    }
}
// ============================================================
// ESTADO DE CARGA Y ERRORES
// ============================================================
function mostrarCargando(activo) {
    let el = document.getElementById('pantalla-cargando');
    if (activo) {
        if (!el) {
            el = document.createElement('div');
            el.id = 'pantalla-cargando';
            el.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-black gap-4';
            el.innerHTML = `
                <div style="width:40px;height:40px;border-radius:50%;border:3px solid rgba(108,99,255,0.2);border-top-color:#6C63FF;animation:spin 0.8s linear infinite;"></div>
                <p class="text-sm font-bold text-slate-400">Cargando...</p>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            `;
            document.body.appendChild(el);
        }
        el.classList.remove('hidden');
    } else {
        if (el) el.classList.add('hidden');
    }
}

function mostrarError(mensaje) {
    let el = document.getElementById('toast-error');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast-error';
        el.className = 'fixed top-6 left-6 right-6 z-[200] px-4 py-3 rounded-2xl text-white text-sm font-bold text-center transition-all';
        el.style.background = '#f43f5e';
        el.style.boxShadow = '0 4px 20px rgba(244,63,94,0.4)';
        document.body.appendChild(el);
    }
    el.innerText = mensaje;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
}
function inicializarApp() {
    inicializarModoOscuro();
    inicializarScrollResumen();
    verificarSesion();
}

// ============================================================
// SALUDO DINÁMICO POR HORA
// ============================================================
function actualizarSaludo() {
    const usuario = JSON.parse(localStorage.getItem('habify_usuario'));
    if (usuario) {
        actualizarUIUsuario(usuario);
        return;
    }
    const horaActual = new Date().getHours();
    const saludoElemento = document.getElementById('greeting-title');
    if (!saludoElemento) return;
    if (horaActual >= 6 && horaActual < 12) {
        saludoElemento.innerText = "Buenos Días! ";
    } else if (horaActual >= 12 && horaActual < 19) {
        saludoElemento.innerText = "Buenas Tardes! ";
    } else {
        saludoElemento.innerText = "Buenas Noches! ";
    }
}

// ============================================================
// RENDERIZAR WIDGETS
// ============================================================
function renderizarHabitos() {
    const contenedor = document.getElementById('contenedor-widgets');
    if (!contenedor) return;

    contenedor.innerHTML = "";
    contenedor.className = "space-y-3";

    if (misHabitos.length === 0) {
        contenedor.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <span class="text-4xl">🌱</span>
                </div>
                <div class="space-y-1">
                    <p class="text-base font-black text-black dark:text-white">¡Empieza tu primer hábito!</p>
                    <p class="text-xs text-slate-400 font-medium leading-relaxed">
                        Los grandes cambios comienzan<br>con un pequeño paso diario.
                    </p>
                </div>
                <button onclick="abrirModal()" 
                        class="text-white font-bold text-sm px-6 py-3 rounded-2xl active:scale-95 transition-all shadow-md"
                        style="background:#6C63FF">
                    Crear mi primer hábito →
                </button>
            </div>
        `;
        actualizarResumenHoy();
        return;
    }

    const fechaReferencia = diaSeleccionadoTira || hoyComoTexto();
    const esHoyReferencia = fechaReferencia === hoyComoTexto();

    // Ordenar: pinneados → no completados → completados (dentro de cada grupo, orden de creación)
    const habitosOrdenados = [...misHabitos]
        .filter(h => h.fechaCreacion <= fechaReferencia)
        .sort((a, b) => {
            const aPin = a.pinneado ? 0 : 1;
            const bPin = b.pinneado ? 0 : 1;
            if (aPin !== bPin) return aPin - bPin;

            const aHecho = a.registros.includes(fechaReferencia) ? 1 : 0;
            const bHecho = b.registros.includes(fechaReferencia) ? 1 : 0;
            if (aHecho !== bHecho) return aHecho - bHecho;

            return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
        });

    habitosOrdenados.forEach(habito => {

        const completados = completadosEstaSemana(habito);
        const porcentaje = Math.min(Math.round((completados / habito.metaSemanal) * 100), 100);
        const yaHecho = habito.registros.includes(fechaReferencia);
        const racha = calcularRacha(habito);
        const enRiesgo = rachaEnRiesgo(habito);
        const color = habito.color || '#6C63FF';

        const esDark = document.documentElement.classList.contains('dark');
        const colorFondo = yaHecho ? color + '22' : (esDark ? '#0f0f0f' : 'transparent');
        const borderColor = yaHecho ? color + '50' : (esDark ? 'rgba(255,255,255,0.10)' : '#e2e8f0');
        

        const tarjetaHTML = `
    <div class="habito-card rounded-[20px] overflow-hidden border transition-colors duration-300 cursor-grab active:cursor-grabbing"
        data-id="${habito.id}"
        style="background:${colorFondo}; border-color:${borderColor}; position:relative; box-shadow:${yaHecho ? `0 4px 20px ${color}30` : '0 2px 12px rgba(0,0,0,0.06)'};"
         onclick="abrirDetalleHabito('${habito.id}')">
        <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-[20px]" style="background:${color}"></div>
        <div class="flex items-center gap-4 px-5 py-4 pl-6 relative">
            <div class="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style="background:${color}18">
                <span class="text-2xl">${habito.emoji}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-black text-black dark:text-white truncate">${habito.nombre}</p>
                <div class="flex items-center gap-2 mt-0.5">
                    <p class="text-xs font-bold text-slate-400">${completados}/${habito.metaSemanal} esta semana</p>
                    ${racha > 0 && !enRiesgo ? `<span class="text-xs font-bold" style="color:${color}">🔥 ${racha}</span>` : ''}
                    ${racha > 0 && enRiesgo ? `<span class="text-xs font-bold text-amber-500">⚠️ ${racha} en riesgo</span>` : ''}
                </div>
                <div class="mt-2 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width:${porcentaje}%; background:${color}"></div>
                </div>
            </div>
            ${habito.tipo === 'contador'
                ? `<div class="flex items-center gap-1 flex-shrink-0">
                    <button onclick="event.stopPropagation(); ajustarContador('${habito.id}', '${fechaReferencia}', -1)"
                        class="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                        style="background:${color}22; border:1.5px solid ${color}40; color:${color}; font-size:18px; font-weight:700; line-height:1;">−</button>
                    <div class="flex flex-col items-center min-w-[36px]">
                        <span data-cantidad-id="${habito.id}" class="text-sm font-black" style="color:${color}">${habito.cantidades?.[fechaReferencia] || 0}</span>
                        <span class="text-[9px] font-bold text-slate-400">${habito.unidad || ''}</span>
                    </div>
                    <button onclick="event.stopPropagation(); ajustarContador('${habito.id}', '${fechaReferencia}', 1)"
                        class="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                        style="background:${color}; color:white; font-size:18px; font-weight:700; line-height:1;">+</button>
                   </div>`
                : `<button data-habito-id="${habito.id}" onclick="event.stopPropagation(); toggleHabitoDia('${habito.id}', '${fechaReferencia}')"
                    class="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-90"
                    style="background:${yaHecho ? color : 'transparent'}; border:2px solid ${yaHecho ? color : '#e2e8f0'}">
                    ${yaHecho
                        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                    }
                   </button>`
            }
        </div>
    </div>
`;
       contenedor.innerHTML += tarjetaHTML;
    });

    // Activar drag & drop
    activarDragAndDrop();

    // Fade-in escalonado solo en carga inicial
    if (animarCargaInicial) {
        const tarjetas = contenedor.querySelectorAll('.rounded-\\[20px\\]');
        tarjetas.forEach((t, i) => {
            t.style.animationDelay = `${i * 60}ms`;
            t.classList.add('fade-in-up');
            t.addEventListener('animationend', () => {
                t.classList.remove('fade-in-up');
                t.style.opacity = '1';
                t.style.transform = 'none';
                t.style.animationDelay = '';
            }, { once: true });
        });
        animarCargaInicial = false;
    }
}
async function ajustarContadorDetalle(delta) {
    if (!habitoDetalleActual) return;
    const habito = habitoDetalleActual;
    const fechaStr = hoyComoTexto();

    await ajustarContador(habito.id, fechaStr, delta);

    // Actualizar UI del detalle
    const cantidadHoy = habito.cantidades?.[fechaStr] || 0;
    const meta = habito.metaCantidad || 1;
    const color = habito.color || '#6C63FF';
    const porcentajeCantidad = Math.min(Math.round((cantidadHoy / meta) * 100), 100);

    const numEl = document.getElementById('detalle-cantidad-num');
    if (numEl) numEl.innerText = cantidadHoy;

    const barraEl = document.querySelector('#detalle-contador .h-full');
    if (barraEl) barraEl.style.width = `${porcentajeCantidad}%`;

    const labelEl = document.querySelector('#detalle-contador .flex.items-center.justify-between p:last-child');
    if (labelEl) labelEl.innerText = `${cantidadHoy} / ${meta} ${habito.unidad || ''}`;

    // Actualizar stats de racha
    document.getElementById('stat-racha-actual').innerText = calcularRacha(habito);
    document.getElementById('stat-total').innerText = habito.registros.length;

    // Actualizar mapa de actividad
    generarMapaActividad(habito);

    // Re-renderizar tarjetas para reflejar el cambio de estado
    animarCargaInicial = false;
    renderizarHabitos();
    actualizarResumenHoy();
    inicializarTiraDias();
    mostrarResumenDiaTira(hoyComoTexto());
}
async function togglePin(habitoId) {
    const habito = misHabitos.find(h => h.id === habitoId);
    if (!habito) return;

    habito.pinneado = !habito.pinneado;
    await togglePinSupabase(habitoId, habito.pinneado);

    if (habitoDetalleActual?.id === habitoId) {
        habitoDetalleActual.pinneado = habito.pinneado;
        // Actualizar botón en detalle
        const btnPin = document.getElementById('detalle-btn-pin');
        if (btnPin) {
            btnPin.style.background = habito.pinneado ? '#6C63FF' : '';
            const svg = btnPin.querySelector('svg');
            if (svg) svg.style.stroke = habito.pinneado ? 'white' : '';
        }
    }

    animarCargaInicial = false;
    renderizarHabitos();
}
async function ajustarContador(habitoId, fechaStr, delta) {
    const habito = misHabitos.find(h => h.id === habitoId);
    if (!habito || !usuarioActual) return;

    if (!habito.cantidades) habito.cantidades = {};
    const cantidadActual = habito.cantidades[fechaStr] || 0;
    const nuevaCantidad = Math.max(0, cantidadActual + delta);
    habito.cantidades[fechaStr] = nuevaCantidad;

    const metaCantidad = habito.metaCantidad;
    if (!metaCantidad || metaCantidad < 1) {
        mostrarError('Este hábito no tiene meta definida.');
        return;
    }    
    const yaCompletado = habito.registros.includes(fechaStr);

    if (nuevaCantidad >= metaCantidad && !yaCompletado) {
        // Llegó a la meta — marcar como completado
        await marcarHabitoSupabase(habitoId, usuarioActual.id, fechaStr);
        habito.registros.push(fechaStr);
        // Guardar cantidad en ese registro
        await fetch(
            `${SUPABASE_URL}/rest/v1/registros?habito_id=eq.${habitoId}&fecha=eq.${fechaStr}`,
            { method: 'PATCH', headers, body: JSON.stringify({ cantidad: nuevaCantidad }) }
        );
        if (navigator.vibrate) navigator.vibrate(30);
        verificarNuevosLogros();

    } else if (nuevaCantidad < metaCantidad && yaCompletado) {
        // Bajó de la meta — desmarcar y guardar cantidad parcial
        await desmarcarHabitoSupabase(habitoId, fechaStr);
        habito.registros = habito.registros.filter(f => f !== fechaStr);
        // Guardar cantidad parcial en nuevo registro
        if (nuevaCantidad > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    habito_id: habitoId,
                    usuario_id: usuarioActual.id,
                    fecha: fechaStr,
                    cantidad: nuevaCantidad
                })
            });
        }

    } else if (!yaCompletado && nuevaCantidad > 0) {
        // Progreso parcial sin completar — guardar o actualizar
        await guardarCantidadSupabase(habitoId, usuarioActual.id, fechaStr, nuevaCantidad);

    } else if (nuevaCantidad === 0 && yaCompletado) {
        // Bajó a 0 estando completado — desmarcar y borrar
        await desmarcarHabitoSupabase(habitoId, fechaStr);
        habito.registros = habito.registros.filter(f => f !== fechaStr);

    } else if (nuevaCantidad === 0 && !yaCompletado) {
        // Bajó a 0 sin estar completado — borrar registro parcial si existe
        await fetch(
            `${SUPABASE_URL}/rest/v1/registros?habito_id=eq.${habitoId}&fecha=eq.${fechaStr}`,
            { method: 'DELETE', headers }
        );
    }

    // Actualizar UI
    const cantidadEl = document.querySelector(`[data-cantidad-id="${habitoId}"]`);
    if (cantidadEl) cantidadEl.innerText = nuevaCantidad;

    animarCargaInicial = false;
    renderizarHabitos();
    actualizarResumenHoy();
    inicializarTiraDias();
    mostrarResumenDiaTira(fechaStr);
}
async function toggleHabitoDia(habitoId, fechaStr) {
    const habito = misHabitos.find(h => h.id === habitoId);
    if (!habito || !usuarioActual) return;

    const completado = habito.registros.includes(fechaStr);

    if (completado) {
        await desmarcarHabitoSupabase(habitoId, fechaStr);
        habito.registros = habito.registros.filter(f => f !== fechaStr);
    } else {
        await marcarHabitoSupabase(habitoId, usuarioActual.id, fechaStr);
        habito.registros.push(fechaStr);
        if (navigator.vibrate) navigator.vibrate(30);
    }

    animarCargaInicial = false;
    renderizarHabitos();
    actualizarResumenHoy();
    inicializarTiraDias();
    mostrarResumenDiaTira(fechaStr);
    verificarNuevosLogros();
}

// ============================================================
// ELIMINAR HÁBITO
// ============================================================
async function eliminarHabito(id) {
    const habito = misHabitos.find(h => h.id === id);
    if (!habito) return;

    const confirmar = confirm(`¿Eliminar "${habito.nombre}"?\n\nSe borrará todo su historial.`);
    if (!confirmar) return;

    await eliminarHabitoSupabase(id);
    misHabitos = misHabitos.filter(h => h.id !== id);
    renderizarHabitos();
    actualizarResumenHoy();
}
// ============================================================
// MODAL DE CREAR HÁBITO
// ============================================================
function abrirModal() {
    const pantalla = document.getElementById('pantalla-crear-habito');
    abrirPantallaAnimada('pantalla-crear-habito');
    // Reset estado
    document.getElementById('habito-nombre').value = '';
    document.getElementById('contador-caracteres').innerText = '0/30';
    document.getElementById('habito-emoji').value = '🏃';
    document.getElementById('emoji-preview').innerText = '🏃';
    document.getElementById('emoji-nombre-preview').innerText = 'Correr';
    document.getElementById('habito-color').value = '#6C63FF';
    // Reset tipo
    document.getElementById('habito-tipo').value = 'check';
    document.getElementById('config-contador').classList.add('hidden');
    document.getElementById('habito-meta-cantidad').value = '';
    document.getElementById('habito-unidad').value = '';
    const btnCheck = document.getElementById('tipo-check-btn');
    const btnContador = document.getElementById('tipo-contador-btn');
    btnCheck.style.background = '#6C63FF';
    btnCheck.style.color = 'white';
    btnCheck.style.borderColor = '#6C63FF';
    btnContador.style.background = 'transparent';
    btnContador.style.color = '';
    btnContador.style.borderColor = '';
    // Reset recordatorio
    recordatorioActivo = false;
    document.getElementById('toggle-recordatorio').style.background = '';
    document.getElementById('toggle-recordatorio-circulo').style.transform = 'translateX(0)';
    document.getElementById('recordatorio-hora-container').classList.add('hidden');
    horaRecordatorio = 8;
    minutoRecordatorio = 0;
    document.getElementById('recordatorio-hora').value = '08:00';
    document.getElementById('recordatorio-hora-display').innerText = '08';
    document.getElementById('recordatorio-minuto-display').innerText = '00';

    document.getElementById('btn-crear-habito').style.background = '#6C63FF';
    document.getElementById('btn-crear-habito').style.boxShadow = '0 6px 24px rgba(108,99,255,0.4), 0 2px 8px rgba(108,99,255,0.25)';
    document.getElementById('habito-meta').value = '1';
    // Reset slider meta
    document.getElementById('slider-meta').value = 1;
    document.getElementById('habito-meta').value = '1';
    document.getElementById('meta-valor-label').innerText = '1 día / sem';
    document.getElementById('meta-descripcion').innerText = 'para empezar suave';
    const esDarkSlider = document.documentElement.classList.contains('dark');
    document.getElementById('slider-meta').style.background = `linear-gradient(to right, #6C63FF 0%, ${esDarkSlider ? '#2a2a2a' : '#e2e8f0'} 0%)`;
    document.getElementById('slider-meta').style.setProperty('--slider-color', '#6C63FF');
    // Reset botones color
    document.querySelectorAll('.color-btn').forEach(b => {
        b.style.outline = 'none';
    });
    const primerColor = document.querySelector('.color-btn');
    if (primerColor) {
        primerColor.style.outline = '2px solid #6C63FF';
        primerColor.style.outlineOffset = '3px';
    }
    // Cargar primera categoría
    document.querySelectorAll('.cat-emoji-btn').forEach(b => {
        b.style.background = '';
        b.style.color = '';
    });
    mostrarCategoriaEmoji('deporte', document.querySelector('.cat-emoji-btn'));
}

function cerrarModal() {
    modoEdicion = false;
    document.querySelector('#pantalla-crear-habito h2').innerText = 'Nuevo hábito';
    const btnCrear = document.getElementById('btn-crear-habito');
    btnCrear.onclick = crearHabitoNuevo;
    cerrarPantallaAnimada('pantalla-crear-habito');
}

// ============================================================
// CALENDARIO
// ============================================================
function generarCalendarioMensual() {
    const tituloMes = document.getElementById('calendario-mes-titulo');
    const cuadrilla = document.getElementById('cuadrilla-mensual');
    if (!cuadrilla) return;

    cuadrilla.innerHTML = "";

    const añoNav = fechaActualCalendario.getFullYear();
    const mesNav = fechaActualCalendario.getMonth();

    const hoy = new Date();
    const añoReal = hoy.getFullYear();
    const mesReal = hoy.getMonth();
    const diaReal = hoy.getDate();

    const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    tituloMes.innerText = `${nombresMeses[mesNav]} ${añoNav}`;

    const primerDiaIndex = new Date(añoNav, mesNav, 1).getDay();
    const totalDiasMes = new Date(añoNav, mesNav + 1, 0).getDate();

    for (let i = 0; i < primerDiaIndex; i++) {
        cuadrilla.innerHTML += `<div></div>`;
    }

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const fechaDia = fechaComoTexto(añoNav, mesNav, dia);
        const fechaObj = new Date(añoNav, mesNav, dia);
        const hoyObj = new Date(añoReal, mesReal, diaReal);

        const esHoy = añoNav === añoReal && mesNav === mesReal && dia === diaReal;
        const esFuturo = fechaObj > hoyObj;

        // Verificamos si ese día tiene al menos un hábito completado (datos REALES)
        const tieneRegistros = misHabitos.some(h => h.registros && Array.isArray(h.registros) && h.registros.includes(fechaDia));
        const tieneNota = obtenerNotas()[fechaDia] !== undefined;

        let clasesEstilo = "";

        const esDark = document.documentElement.classList.contains('dark');

        if (esHoy) {
            clasesEstilo = "rounded-2xl";
        } else if (esFuturo) {
            clasesEstilo = "cursor-not-allowed";
        } else if (tieneRegistros) {
            clasesEstilo = "rounded-full relative";
        } else {
            clasesEstilo = "rounded-full";
        }

        let indicador = '';
        if (!esFuturo && !esHoy) {
            if (tieneRegistros && tieneNota) {
                indicador = `
                    <span class="absolute bottom-0.5 left-1/3 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full"></span>
                    <span class="absolute bottom-0.5 right-1/3 translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></span>
                `;
            } else if (tieneRegistros) {
                indicador = `<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full"></span>`;
            } else if (tieneNota) {
                indicador = `<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></span>`;
            }
        }

        cuadrilla.innerHTML += `
            <button onclick="verVistaRapidaDia('${fechaDia}', ${esFuturo})" ${esFuturo ? 'disabled' : ''}
                    class="h-10 w-10 mx-auto font-bold text-xs active:scale-90 transition-all flex items-center justify-center ${clasesEstilo}"
                    style="${
                        esHoy ? 'background:#6C63FF; color:white;' : 
                        esFuturo ? `color:${esDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};` : 
                        tieneRegistros ? `background:${esDark ? '#2a2a2a' : '#f1f5f9'}; color:${esDark ? 'white' : '#1e293b'};` : 
                        `background:${esDark ? '#1a1a1a' : '#f1f5f9'}; color:${esDark ? 'rgba(255,255,255,0.35)' : '#475569'};`
                    }">
                ${dia}
                ${indicador}
            </button>
        `;
    }
}

function cambiarMes(direccion) {
    fechaActualCalendario.setMonth(fechaActualCalendario.getMonth() + direccion);
    generarCalendarioMensual();
    document.getElementById('vista-rapida-dia').classList.add('hidden');
}

// Ahora recibe la fecha completa "YYYY-MM-DD" en lugar de solo el número de día
function verVistaRapidaDia(fechaStr, esFuturo) {
    const panelVistaRapida = document.getElementById('vista-rapida-dia');
    const tituloResumen = document.getElementById('resumen-dia-titulo');
    const contenedorLista = document.getElementById('lista-habitos-cumplidos');
    const textarea = document.getElementById('nota-dia');
    const msg = document.getElementById('nota-guardada-msg');

    panelVistaRapida.classList.remove('hidden');
    contenedorLista.innerHTML = '';
    msg.classList.add('hidden');

    if (esFuturo) {
        tituloResumen.innerText = "Día futuro";
        contenedorLista.innerHTML = `<span class="text-xs text-slate-400 font-medium">Este día aún no ha ocurrido.</span>`;
        textarea.value = '';
        textarea.disabled = true;
        textarea.placeholder = 'No puedes escribir en días futuros';
        return;
    }

    // Habilitamos el textarea para días pasados y hoy
    textarea.disabled = false;
    textarea.placeholder = '¿Cómo fue tu día? Escribe algo...';

    // Guardamos la fecha en el textarea para usarla al guardar
    textarea.dataset.fecha = fechaStr;

    const numeroDia = parseInt(fechaStr.split('-')[2]);
    tituloResumen.innerText = `Logros del día ${numeroDia}`;

    // Hábitos completados ese día
    const habitosDelDia = misHabitos.filter(h => {
        const existia = h.fechaCreacion <= fechaStr;
        const loHizo = h.registros && h.registros.includes(fechaStr);
        return existia && loHizo;
    });

    if (habitosDelDia.length > 0) {
        habitosDelDia.forEach(habito => {
            contenedorLista.innerHTML += `
                <span class="bg-white dark:bg-black px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-sm text-xs font-bold flex items-center gap-1 text-black dark:text-white">
                    ${habito.emoji} ${habito.nombre}
                </span>
            `;
        });
    } else {
        contenedorLista.innerHTML = `<span class="text-xs text-slate-400 font-medium">Ningún hábito completado este día.</span>`;
    }

    // Cargar nota guardada de ese día
    textarea.value = '';
    cargarNotaDia(fechaStr).catch(console.error);
}

function actualizarResumenHoy() {
    const el = document.getElementById('texto-resumen-hoy');
    if (!el) return;

    const total = misHabitos.length;
    if (total === 0) {
        el.innerText = "No tienes hábitos aún. ¡Crea uno!";
        return;
    }

    const completadosHoy = misHabitos.filter(h => completadoHoy(h)).length;
    el.innerText = `${completadosHoy} de ${total} hábitos completados hoy`;
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

function irAPantalla(pantalla) {
    const inicio = document.getElementById('pantalla-inicio');
    const calendario = document.getElementById('pantalla-calendario');
    const estadisticas = document.getElementById('pantalla-estadisticas');
    const resumen = document.getElementById('resumen-hoy');
    const tira = document.getElementById('tira-dias');

    inicio.classList.add('hidden');
    calendario.classList.add('hidden');
    estadisticas.classList.add('hidden');

    if (pantalla === 'inicio') {
        inicio.classList.remove('hidden');
        resumen.classList.remove('hidden');
        if (tira) tira.classList.remove('hidden');
    } else if (pantalla === 'calendario') {
        calendario.classList.remove('hidden');
        resumen.classList.add('hidden');
        if (tira) tira.classList.add('hidden');
        generarCalendarioMensual();
    } else if (pantalla === 'estadisticas') {
        estadisticas.classList.remove('hidden');
        resumen.classList.add('hidden');
        if (tira) tira.classList.remove('hidden');
        generarEstadisticas();
    }
}

function generarEstadisticas() {
    const fechaRef = diaSeleccionadoTira || hoyComoTexto();
    const fecha = new Date(fechaRef + 'T00:00:00');
    const hoyStr = hoyComoTexto();
    const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    const fechaEl = document.getElementById('stats-fecha');
    if (fechaEl) fechaEl.innerText = fechaRef === hoyStr
        ? `${fecha.getDate()} de ${nombresMeses[fecha.getMonth()]}`
        : `${fecha.getDate()} de ${nombresMeses[fecha.getMonth()]}`;

    // Etiqueta de la tarjeta de productividad
    const labelProd = document.getElementById('stats-label-prod');
    if (labelProd) labelProd.innerText = fechaRef === hoyStr ? 'PRODUCTIVIDAD HOY' : `DÍA ${fecha.getDate()} DE ${nombresMeses[fecha.getMonth()].toUpperCase()}`;

    // --- PRODUCTIVIDAD DEL DÍA SELECCIONADO ---
    const habitosDelDia = misHabitos.filter(h => h.fechaCreacion <= fechaRef);
    const total = habitosDelDia.length;
    const hechos = habitosDelDia.filter(h => h.registros.includes(fechaRef)).length;
    const porcentaje = total === 0 ? 0 : Math.round((hechos / total) * 100);

    document.getElementById('stats-porcentaje').innerText = `${porcentaje}%`;
    document.getElementById('stats-descripcion').innerText =
        total === 0 ? 'Sin hábitos aún' : `${hechos} de ${total} hábitos completados`;
    setTimeout(() => {
        document.getElementById('stats-anillo').setAttribute('stroke-dasharray', `${porcentaje}, 100`);
    }, 100);

    // --- GRÁFICAS centradas en la fecha seleccionada ---
    generarGraficaSemanal(fechaRef);
    generarGraficaMensual(fechaRef);

    // --- RACHAS (siempre del momento actual) ---
    generarListaRachas();
}

function generarGraficaSemanal(fechaRef) {
    const hoy = fechaRef ? new Date(fechaRef + 'T00:00:00') : new Date();
    const diaSemana = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
    lunes.setHours(0, 0, 0, 0);

    const etiquetas = [];
    const fechasDias = [];
    const diasCortos = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
        const dia = new Date(lunes);
        dia.setDate(lunes.getDate() + i);
        etiquetas.push(diasCortos[i]);
        fechasDias.push(fechaComoTexto(dia.getFullYear(), dia.getMonth(), dia.getDate()));
    }

    // Para cada día calculamos cuántos hábitos se completaron
    const datos = fechasDias.map(fecha => {
        return misHabitos.filter(h =>
            h.registros && h.registros.includes(fecha)
        ).length;
    });

    const ctx = document.getElementById('grafica-semanal');
    if (!ctx) return;

    // Si ya existe una gráfica previa la destruimos para evitar duplicados
    if (graficaSemanal) {
        graficaSemanal.destroy();
        graficaSemanal = null;
    }

    graficaSemanal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Hábitos completados',
                data: datos,
                backgroundColor: fechasDias.map(fecha => {
                    const esSeleccionado = fecha === (fechaRef || hoyComoTexto());
                    return esSeleccionado ? '#6C63FF' : '#b9b8ba80';
                }),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: 'rgba(255,255,255,0.6)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx => `${ctx.raw} hábito${ctx.raw !== 1 ? 's' : ''}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { family: 'sans-serif', size: 11, weight: 'bold' },
                        color: '#94a3b8'
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: {
                        font: { family: 'sans-serif', size: 11, weight: 'bold' },
                        color: '#94a3b8'
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function generarGraficaMensual(fechaRef) {
    const hoy = fechaRef ? new Date(fechaRef + 'T00:00:00') : new Date();
    const etiquetas = [];
    const fechasDias = [];
    const datos = [];

    // Generamos los últimos 30 días
    for (let i = 29; i >= 0; i--) {
        const dia = new Date(hoy);
        dia.setDate(hoy.getDate() - i);
        const fechaStr = fechaComoTexto(dia.getFullYear(), dia.getMonth(), dia.getDate());
        fechasDias.push(fechaStr);

        // Solo mostramos etiqueta cada 5 días para no saturar
        etiquetas.push(i % 5 === 0 ? `${dia.getDate()}` : '');

        const completados = misHabitos.filter(h =>
            h.registros && h.registros.includes(fechaStr)
        ).length;
        datos.push(completados);
    }

    const ctx = document.getElementById('grafica-mensual');
    if (!ctx) return;

    if (graficaMensual) {
        graficaMensual.destroy();
        graficaMensual = null;
    }

    graficaMensual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Hábitos completados',
                data: datos,
                borderColor: '#6C63FF',
                backgroundColor: 'rgba(108, 99, 255, 0.08)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#ffffff',
                    bodyColor: 'rgba(255,255,255,0.6)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx => `${ctx.raw} hábito${ctx.raw !== 1 ? 's' : ''}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { family: 'sans-serif', size: 11, weight: 'bold' },
                        color: '#94a3b8'
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: {
                        font: { family: 'sans-serif', size: 11, weight: 'bold' },
                        color: '#94a3b8'
                    },
                    grid: { display: false }
                }
            }
        }
    });
}
function generarListaRachas() {
    const contenedor = document.getElementById('lista-rachas');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    if (misHabitos.length === 0) {
        contenedor.innerHTML = `<p class="text-xs text-slate-400 font-medium px-1">No hay hábitos aún.</p>`;
        return;
    }

    // Ordenamos por racha de mayor a menor
    const habitosOrdenados = [...misHabitos].sort((a, b) =>
        calcularRacha(b) - calcularRacha(a)
    );

    habitosOrdenados.forEach(habito => {
        const racha = calcularRacha(habito);
        const completados = completadosEstaSemana(habito);
        const porcentajeSemana = Math.min(
            Math.round((completados / habito.metaSemanal) * 100), 100
        );

        contenedor.innerHTML += `
            <div class="bg-slate-100/70 dark:bg-[#1a1a1a] p-4 rounded-2xl flex items-center justify-between border border-transparent dark:border-white/10" style="box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
                <div class="flex items-center gap-3">
                    <span class="text-xl">${habito.emoji}</span>
                    <div>
                        <p class="text-sm font-bold text-black dark:text-white">${habito.nombre}</p>
                        <p class="text-xs text-slate-400 dark:text-white/40 font-medium">${completados}/${habito.metaSemanal} esta semana</p>   
                        <p class="text-sm font-black text-black dark:text-white">
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-black ${rachaEnRiesgo(habito) ? 'text-amber-500' : 'text-black dark:text-white'}">${racha > 0 ? (rachaEnRiesgo(habito) ? `⚠️ ${racha}` : `🔥 ${racha}`) : '—'}</p>
                    <p class="text-xs font-medium ${rachaEnRiesgo(habito) ? 'text-amber-400' : 'text-slate-400'}">${racha > 0 ? (rachaEnRiesgo(habito) ? '¡complétalo hoy!' : 'días') : 'sin racha'}</p>
                </div>
            </div>
        `;
    });
}
// ============================================================
// OCULTAR RESUMEN AL HACER SCROLL
// ============================================================
function inicializarScrollResumen() {
    const main = document.querySelector('main');
    const resumen = document.getElementById('resumen-hoy');
    if (!main || !resumen) return;

    // Agregamos transición suave al resumen desde el CSS
    resumen.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    let ultimoScroll = 0;

    main.addEventListener('scroll', () => {
        const scrollActual = main.scrollTop;

        if (scrollActual > ultimoScroll && scrollActual > 10) {
            // Scrolleando hacia abajo → ocultar
            resumen.style.transform = 'translateY(20px)';
            resumen.style.opacity = '0';
            resumen.style.pointerEvents = 'none';
        } else {
            // Scrolleando hacia arriba → mostrar
            resumen.style.transform = 'translateY(0)';
            resumen.style.opacity = '1';
            resumen.style.pointerEvents = 'auto';
        }

        ultimoScroll = scrollActual;
    });
}

// ============================================================
// MODO OSCURO
// ============================================================
function inicializarModoOscuro() {
    const modoGuardado = localStorage.getItem('habify_modo_oscuro');
    if (modoGuardado === 'true') {
        document.documentElement.classList.add('dark');
    }
}

function toggleModoOscuro() {
    const html = document.documentElement;
    const estaOscuro = html.classList.contains('dark');
    
    if (estaOscuro) {
        html.classList.remove('dark');
        localStorage.setItem('habify_modo_oscuro', 'false');
    } else {
        html.classList.add('dark');
        localStorage.setItem('habify_modo_oscuro', 'true');
    }

    animarCargaInicial = false;
    renderizarHabitos();
}
const catActiva = document.querySelector('.cat-emoji-btn');
if (catActiva && !document.getElementById('pantalla-crear-habito').classList.contains('hidden')) {
    mostrarCategoriaEmoji('deporte', catActiva);
}

// ============================================================
// REGISTRO DIARIO - NOTAS POR FECHA
// ============================================================

async function cargarTodasLasNotas() {
    if (!usuarioActual) return;
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/registros?usuario_id=eq.${usuarioActual.id}&nota=not.is.null&select=fecha,nota`,
            { headers }
        );
        const data = await res.json();
        notasCacheadas = {};
        data.forEach(r => {
            if (r.nota && r.nota.trim()) notasCacheadas[r.fecha] = r.nota;
        });
    } catch (e) {
        notasCacheadas = {};
    }
}

function obtenerNotas() {
    return notasCacheadas;
}

async function cargarNotaDia(fechaStr) {
    const textarea = document.getElementById('nota-dia');
    if (!textarea || !usuarioActual) return;
    
    const nota = await obtenerNotaDiaSupabase(usuarioActual.id, fechaStr);
    textarea.value = nota;
}

async function guardarNotaDia() {
    const textarea = document.getElementById('nota-dia');
    const msg = document.getElementById('nota-guardada-msg');
    if (!textarea || !usuarioActual) return;

    const fechaActual = textarea.dataset.fecha;
    if (!fechaActual) return;

    const texto = textarea.value.trim();

    // Buscamos si hay registros ese día para vincular la nota
    const registrosDelDia = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?usuario_id=eq.${usuarioActual.id}&fecha=eq.${fechaActual}&select=id,habito_id`,
        { headers }
    ).then(r => r.json());

    if (registrosDelDia.length > 0) {
        // Actualizamos la nota en el primer registro del día
        await fetch(
            `${SUPABASE_URL}/rest/v1/registros?id=eq.${registrosDelDia[0].id}`,
            {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ nota: texto })
            }
        );
    } else {
        // No hay registros ese día, guardamos en el primer hábito disponible
        if (misHabitos.length > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    habito_id: misHabitos[0].id,
                    usuario_id: usuarioActual.id,
                    fecha: fechaActual,
                    nota: texto
                })
            });
        }
    }

    // Actualizar caché local
    if (texto) {
        notasCacheadas[fechaActual] = texto;
    } else {
        delete notasCacheadas[fechaActual];
    }
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2000);
    generarCalendarioMensual();
}

// ============================================================
// TIRA DE DÍAS HORIZONTAL
// ============================================================

function inicializarTiraDias() {
    if (!diaSeleccionadoTira) diaSeleccionadoTira = hoyComoTexto();
    const contenedor = document.getElementById('tira-dias');
    const fechaHoyEl = document.getElementById('fecha-hoy');
    if (!contenedor) return;

    // Mostrar fecha actual en header
    const hoy = new Date();
    const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const diasSemana = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
    if (fechaHoyEl) {
        fechaHoyEl.innerText = `${diasSemana[hoy.getDay()]}, ${hoy.getDate()} de ${nombresMeses[hoy.getMonth()]}`;
    }

    contenedor.innerHTML = '';

    // Generamos los últimos 14 días + hoy
    const dias = [];
    for (let i = 13; i >= 0; i--) {
        const dia = new Date();
        dia.setDate(hoy.getDate() - i);
        dias.push(dia);
    }

    dias.forEach(dia => {
        const fechaStr = fechaComoTexto(dia.getFullYear(), dia.getMonth(), dia.getDate());
        const esHoy = fechaStr === hoyComoTexto();
        const esSeleccionado = fechaStr === diaSeleccionadoTira;

        // Verificar si ese día tiene hábitos completados
        const completadosEseDia = misHabitos.filter(h =>
            h.registros && h.registros.includes(fechaStr)
        ).length;
        const tieneActividad = completadosEseDia > 0;

        const nombreDia = ["D","L","M","M","J","V","S"][dia.getDay()];
        const numeroDia = dia.getDate();

        const btn = document.createElement('button');
        btn.dataset.fecha = fechaStr;
        btn.className = 'tira-dia flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 transition-all active:scale-95';

        btn.innerHTML = `
            <span style="font-size:9px; font-weight:500; color:${esSeleccionado ? 'rgba(255,255,255,0.7)' : 'rgba(100,100,100,0.6)'}">${nombreDia}</span>
            <div style="width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:${esSeleccionado ? '#6C63FF' : 'transparent'}; border:${esHoy && !esSeleccionado ? '1.5px solid #6C63FF' : 'none'}">
                <span style="font-size:13px; font-weight:800; color:${esSeleccionado ? '#fff' : esHoy ? '#6C63FF' : 'inherit'}">${numeroDia}</span>
            </div>
            <div style="width:4px; height:4px; border-radius:50%; background:${tieneActividad ? (esSeleccionado ? 'rgba(255,255,255,0.7)' : '#6C63FF') : 'transparent'}"></div>
        `;

btn.onclick = () => {
            btn.style.transition = 'transform 0.2s cubic-bezier(0.32,0.72,0,1)';
            btn.style.transform = 'scale(0.88)';
            setTimeout(() => { btn.style.transform = ''; }, 200);
            seleccionarDiaTira(fechaStr);
        };
        contenedor.appendChild(btn);
    });

    // Auto-scroll al día de hoy
    setTimeout(() => {
        const hoyBtn = contenedor.querySelector(`[data-fecha="${hoyComoTexto()}"]`);
        if (hoyBtn) hoyBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
}

function seleccionarDiaTira(fechaStr) {
    diaSeleccionadoTira = fechaStr;
    animarCargaInicial = false;
    inicializarTiraDias();
    mostrarResumenDiaTira(fechaStr);
    renderizarHabitos();

    // Si estadísticas está visible, actualizarla con el nuevo día
    const pantallaStats = document.getElementById('pantalla-estadisticas');
    if (pantallaStats && !pantallaStats.classList.contains('hidden')) {
        generarEstadisticas();
    }
}

async function toggleHabitoDia(habitoId, fechaStr) {
    const habito = misHabitos.find(h => h.id === habitoId);
    if (!habito || !usuarioActual) return;

    const completado = habito.registros.includes(fechaStr);

    if (completado) {
        await desmarcarHabitoSupabase(habitoId, fechaStr);
        habito.registros = habito.registros.filter(f => f !== fechaStr);
    } else {
        await marcarHabitoSupabase(habitoId, usuarioActual.id, fechaStr);
        habito.registros.push(fechaStr);
        if (navigator.vibrate) navigator.vibrate(30);
    }

    animarCargaInicial = false;
    renderizarHabitos();
    actualizarResumenHoy();
    inicializarTiraDias();
    mostrarResumenDiaTira(fechaStr);
}

async function toggleHabitoHoy(id) {
    const habito = misHabitos.find(h => h.id === id);
    if (!habito || !usuarioActual) return;

    const fechaRef = diaSeleccionadoTira || hoyComoTexto();

    if (habito.registros.includes(fechaRef)) {
        await desmarcarHabitoSupabase(id, fechaRef);
        habito.registros = habito.registros.filter(f => f !== fechaRef);
    } else {
        await marcarHabitoSupabase(id, usuarioActual.id, fechaRef);
        habito.registros.push(fechaRef);
        if (navigator.vibrate) navigator.vibrate(50);
    }

    animarCargaInicial = false;
    renderizarHabitos();

    setTimeout(() => {
        const btnCheck = document.querySelector(`button[data-habito-id="${id}"]`);
        if (btnCheck) {
            btnCheck.classList.add('check-pop');
            btnCheck.addEventListener('animationend', () => {
                btnCheck.classList.remove('check-pop');
            }, { once: true });
        }
    }, 20);
}

function mostrarResumenDiaTira(fechaStr) {
    const esHoy = fechaStr === hoyComoTexto();
    const completados = misHabitos.filter(h =>
        h.registros && h.registros.includes(fechaStr)
    );
    const total = misHabitos.filter(h => h.fechaCreacion <= fechaStr).length;

    // Actualizamos el resumen de hoy
    const textoResumen = document.getElementById('texto-resumen-hoy');
    if (textoResumen) {
        if (esHoy) {
            textoResumen.innerText = `${completados.length} de ${total} hábitos completados hoy`;
        } else {
            const numeroDia = parseInt(fechaStr.split('-')[2]);
            const mes = parseInt(fechaStr.split('-')[1]) - 1;
            const nombresMeses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
            textoResumen.innerText = completados.length > 0
                ? `${completados.length} de ${total} completados el ${numeroDia} de ${nombresMeses[mes]}`
                : `Sin hábitos completados el ${numeroDia} de ${nombresMeses[mes]}`;
        }
    }
}

// ============================================================
// CREAR HÁBITO — NUEVA PANTALLA
// ============================================================

let colorSeleccionado = '#6C63FF';
let metaSeleccionada = 1;
let recordatorioActivo = false;

// ============================================================
// RECORDATORIOS
// ============================================================
let horaRecordatorio = 8;
let minutoRecordatorio = 0;

function cambiarHora(delta) {
    horaRecordatorio = (horaRecordatorio + delta + 24) % 24;
    document.getElementById('recordatorio-hora-display').innerText = String(horaRecordatorio).padStart(2, '0');
    actualizarInputHora();
}

function cambiarMinuto(delta) {
    minutoRecordatorio = (minutoRecordatorio + delta * 5 + 60) % 60;
    document.getElementById('recordatorio-minuto-display').innerText = String(minutoRecordatorio).padStart(2, '0');
    actualizarInputHora();
}

function actualizarInputHora() {
    const hora = String(horaRecordatorio).padStart(2, '0');
    const minuto = String(minutoRecordatorio).padStart(2, '0');
    document.getElementById('recordatorio-hora').value = `${hora}:${minuto}`;
}

function toggleRecordatorio() {
    recordatorioActivo = !recordatorioActivo;
    const btn = document.getElementById('toggle-recordatorio');
    const circulo = document.getElementById('toggle-recordatorio-circulo');
    const container = document.getElementById('recordatorio-hora-container');
    const color = document.getElementById('habito-color').value || '#6C63FF';

    if (recordatorioActivo) {
        btn.style.background = color;
        circulo.style.transform = 'translateX(24px)';
        container.classList.remove('hidden');
        solicitarPermisoNotificaciones();
    } else {
        btn.style.background = '';
        btn.classList.add('bg-slate-200', 'dark:bg-white/10');
        circulo.style.transform = 'translateX(0)';
        container.classList.add('hidden');
    }
}

async function solicitarPermisoNotificaciones() {
    if (!('Notification' in window)) {
        alert('Tu navegador no soporta notificaciones.');
        recordatorioActivo = false;
        return;
    }
    if (Notification.permission !== 'granted') {
        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') {
            alert('Necesitas permitir las notificaciones para usar esta función.');
            recordatorioActivo = false;
            toggleRecordatorio();
        }
    }
}

function programarRecordatorios() {
    if (!misHabitos) return;

    misHabitos.forEach(habito => {
        if (!habito.recordatorio) return;

        const [hora, minuto] = habito.recordatorio.split(':').map(Number);
        const ahora = new Date();
        const recordatorio = new Date();
        recordatorio.setHours(hora, minuto, 0, 0);

        // Si la hora ya pasó hoy, no programar
        if (recordatorio <= ahora) return;

        // Si ya completó el hábito hoy, no notificar
        if (completadoHoy(habito)) return;

        const ms = recordatorio - ahora;
        setTimeout(() => {
            if (!completadoHoy(habito)) {
                new Notification(`¡Recuerda tu hábito! ${habito.emoji}`, {
                    body: `Aún no has completado "${habito.nombre}" hoy.`,
                    icon: '/favicon.ico'
                });
            }
        }, ms);
    });
}

// ============================================================
// DRAG & DROP
// ============================================================
let dragSrcId = null;

function activarDragAndDrop() {
    const tarjetas = document.querySelectorAll('.habito-card');
    tarjetas.forEach(tarjeta => {
        tarjeta.setAttribute('draggable', 'true');

        tarjeta.addEventListener('dragstart', e => {
            dragSrcId = tarjeta.dataset.id;
            tarjeta.style.opacity = '0.4';
            tarjeta.style.transform = 'scale(0.97)';
            e.dataTransfer.effectAllowed = 'move';
        });

        tarjeta.addEventListener('dragend', () => {
            tarjeta.style.opacity = '1';
            tarjeta.style.transform = '';
            document.querySelectorAll('.habito-card').forEach(t => {
                t.classList.remove('drag-over');
                t.style.borderColor = '';
            });
        });

        tarjeta.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (tarjeta.dataset.id !== dragSrcId) {
                tarjeta.classList.add('drag-over');
            }
        });

        tarjeta.addEventListener('dragleave', () => {
            tarjeta.classList.remove('drag-over');
        });

        tarjeta.addEventListener('drop', e => {
            e.preventDefault();
            if (tarjeta.dataset.id === dragSrcId) return;

            const idOrigen = dragSrcId;
            const idDestino = tarjeta.dataset.id;

            const indexOrigen = misHabitos.findIndex(h => h.id === idOrigen);
            const indexDestino = misHabitos.findIndex(h => h.id === idDestino);

            // Reordenar en memoria
            const [habitoMovido] = misHabitos.splice(indexOrigen, 1);
            misHabitos.splice(indexDestino, 0, habitoMovido);

            // Actualizar orden en Supabase
            misHabitos.forEach((h, i) => {
                h.orden = i;
                actualizarOrdenSupabase(h.id, i);
            });

            animarCargaInicial = false;
            renderizarHabitos();
        });

        // Touch para móvil — long press para activar drag
        let touchStartY = 0;
        let touchStartX = 0;
        let touchStartId = null;
        let longPressTimer = null;
        let dragActivo = false;

        tarjeta.addEventListener('touchstart', e => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            touchStartId = tarjeta.dataset.id;
            dragActivo = false;

            // Activar drag solo después de 400ms presionando
            longPressTimer = setTimeout(() => {
                dragActivo = true;
                tarjeta.style.opacity = '0.7';
                tarjeta.style.transform = 'scale(0.97)';
                tarjeta.style.transition = 'transform 0.2s, opacity 0.2s';
                if (navigator.vibrate) navigator.vibrate(40);
            }, 400);
        }, { passive: true });

        tarjeta.addEventListener('touchmove', e => {
            const moveX = Math.abs(e.touches[0].clientX - touchStartX);
            const moveY = Math.abs(e.touches[0].clientY - touchStartY);

            // Si se mueve antes del long press, cancelar
            if (!dragActivo && (moveX > 8 || moveY > 8)) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });

        tarjeta.addEventListener('touchend', e => {
            clearTimeout(longPressTimer);
            longPressTimer = null;

            tarjeta.style.opacity = '1';
            tarjeta.style.transform = '';
            tarjeta.style.transition = '';

            if (!dragActivo) return; // no era drag, fue tap normal
            dragActivo = false;

            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchEndY - touchStartY;

            if (Math.abs(diff) < 20) return;

            const indexOrigen = misHabitos.findIndex(h => h.id === touchStartId);
            const nuevoPosicion = diff > 0 ? indexOrigen + 1 : indexOrigen - 1;

            if (nuevoPosicion < 0 || nuevoPosicion >= misHabitos.length) return;

            const [habitoMovido] = misHabitos.splice(indexOrigen, 1);
            misHabitos.splice(nuevoPosicion, 0, habitoMovido);

            misHabitos.forEach((h, i) => {
                h.orden = i;
                actualizarOrdenSupabase(h.id, i);
            });

            animarCargaInicial = false;
            renderizarHabitos();
        }, { passive: true });
    });
}

function seleccionarTipoHabito(tipo) {
    document.getElementById('habito-tipo').value = tipo;
    const btnCheck = document.getElementById('tipo-check-btn');
    const btnContador = document.getElementById('tipo-contador-btn');
    const configContador = document.getElementById('config-contador');
    const color = document.getElementById('habito-color').value || '#6C63FF';

    if (tipo === 'check') {
        btnCheck.style.background = color;
        btnCheck.style.color = 'white';
        btnCheck.style.borderColor = color;
        btnContador.style.background = 'transparent';
        btnContador.style.color = '';
        btnContador.style.borderColor = '';
        configContador.classList.add('hidden');
    } else {
        btnContador.style.background = color;
        btnContador.style.color = 'white';
        btnContador.style.borderColor = color;
        btnCheck.style.background = 'transparent';
        btnCheck.style.color = '';
        btnCheck.style.borderColor = '';
        configContador.classList.remove('hidden');
    }
}

function actualizarContador(input) {
    document.getElementById('contador-caracteres').innerText = `${input.value.length}/30`;
}

function seleccionarColor(color, btn) {
    colorSeleccionado = color;
    document.getElementById('habito-color').value = color;
    document.getElementById('btn-crear-habito').style.background = color;
    document.getElementById('btn-crear-habito').style.boxShadow = `0 6px 24px ${color}40, 0 2px 8px ${color}25`;

    // Reset todos los botones de color
    document.querySelectorAll('.color-btn').forEach(b => {
        b.style.outline = 'none';
    });
    // Marcar el seleccionado
    btn.style.outline = `2px solid ${color}`;
    btn.style.outlineOffset = '3px';

    // Actualizar categoría activa
    const catActiva = document.querySelector('.cat-emoji-btn[style*="white"]');
    if (catActiva) {
        catActiva.style.background = color;
    }

    // Actualizar slider
    const diasActuales = parseInt(document.getElementById('slider-meta').value);
    const porcentaje = ((diasActuales - 1) / 6) * 100;
    document.getElementById('slider-meta').style.background = `linear-gradient(to right, ${color} ${porcentaje}%, #e2e8f0 ${porcentaje}%)`;
    document.getElementById('slider-meta').style.setProperty('--slider-color', color);

}

const CATEGORIAS_EMOJI = {
    deporte: [
        { e: '🏃', n: 'Correr' }, { e: '🚴', n: 'Ciclismo' }, { e: '🏋️', n: 'Pesas' },
        { e: '🧘', n: 'Yoga' }, { e: '🤸', n: 'Gimnasia' }, { e: '⚽', n: 'Fútbol' },
        { e: '🏊', n: 'Natación' }, { e: '🧗', n: 'Escalada' }, { e: '🎾', n: 'Tenis' },
        { e: '🏄', n: 'Surf' }, { e: '⛷️', n: 'Esquí' }, { e: '🥊', n: 'Boxeo' },
    ],
    salud: [
        { e: '💧', n: 'Agua' }, { e: '🍏', n: 'Comer sano' }, { e: '🥗', n: 'Ensalada' },
        { e: '🍎', n: 'Frutas' }, { e: '🥦', n: 'Verduras' }, { e: '😴', n: 'Dormir' },
        { e: '☀️', n: 'Sol' }, { e: '🪥', n: 'Higiene' }, { e: '💊', n: 'Vitaminas' },
        { e: '🫁', n: 'Respirar' }, { e: '🩺', n: 'Salud' }, { e: '🧴', n: 'Skincare' },
    ],
    mente: [
        { e: '📚', n: 'Leer' }, { e: '✏️', n: 'Escribir' }, { e: '🎯', n: 'Enfoque' },
        { e: '🧠', n: 'Aprender' }, { e: '📖', n: 'Estudiar' }, { e: '🎓', n: 'Curso' },
        { e: '💻', n: 'Programar' }, { e: '📝', n: 'Notas' }, { e: '🔬', n: 'Investigar' },
        { e: '🙏', n: 'Gratitud' }, { e: '💭', n: 'Reflexión' }, { e: '🧩', n: 'Puzzle' },
    ],
    finanzas: [
        { e: '💰', n: 'Ahorrar' }, { e: '📊', n: 'Finanzas' }, { e: '💼', n: 'Trabajo' },
        { e: '📈', n: 'Invertir' }, { e: '✅', n: 'Tareas' }, { e: '💳', n: 'Gastos' },
        { e: '🏦', n: 'Banco' }, { e: '🪙', n: 'Monedas' }, { e: '📉', n: 'Presupuesto' },
    ],
    creatividad: [
        { e: '🎨', n: 'Pintar' }, { e: '🎵', n: 'Música' }, { e: '🎸', n: 'Guitarra' },
        { e: '🎹', n: 'Piano' }, { e: '✍️', n: 'Diario' }, { e: '📷', n: 'Fotos' },
        { e: '🎬', n: 'Video' }, { e: '🎭', n: 'Teatro' }, { e: '🖌️', n: 'Ilustrar' },
        { e: '📻', n: 'Podcast' }, { e: '🪡', n: 'Tejer' }, { e: '🎤', n: 'Cantar' },
    ],
    hogar: [
        { e: '🧹', n: 'Limpiar' }, { e: '🛁', n: 'Baño' }, { e: '🌱', n: 'Plantas' },
        { e: '🍳', n: 'Cocinar' }, { e: '🧺', n: 'Ropa' }, { e: '🪴', n: 'Jardín' },
        { e: '🛏️', n: 'Tender cama' }, { e: '🗑️', n: 'Orden' }, { e: '🪟', n: 'Ventilar' },
    ],
};

function mostrarCategoriaEmoji(categoria, btnActivo) {
    const fila = document.getElementById('fila-emojis');
    const emojis = CATEGORIAS_EMOJI[categoria] || [];

    fila.innerHTML = '';
    emojis.forEach(({ e, n }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-2xl active:scale-90 transition-all emoji-cat-btn';
        btn.innerHTML = e;
        btn.onclick = () => {
            document.getElementById('habito-emoji').value = e;
            document.getElementById('emoji-preview').innerText = e;
            document.getElementById('emoji-nombre-preview').innerText = n;
            document.querySelectorAll('.emoji-cat-btn').forEach(b => {
                b.style.background = '';
                b.classList.add('bg-slate-100');
            });
            const color = document.getElementById('habito-color').value || '#6C63FF';
            btn.style.background = color + '30';
            btn.style.outline = `2px solid ${color}`;
            btn.style.outlineOffset = '0px';
        };
        fila.appendChild(btn);
    });

    const esDark = document.documentElement.classList.contains('dark');

    document.querySelectorAll('.cat-emoji-btn').forEach(b => {
        b.style.background = '';
        b.style.color = '';
        b.style.border = 'none';
        b.style.outline = 'none';
    });
    if (btnActivo) {
        const color = document.getElementById('habito-color').value || '#6C63FF';
        btnActivo.style.background = color;
        btnActivo.style.color = 'white';
    }
}

function actualizarSliderMeta(valor) {
    const dias = parseInt(valor);
    document.getElementById('habito-meta').value = dias;
    metaSeleccionada = dias;

    const color = document.getElementById('habito-color').value || '#6C63FF';
    const porcentaje = ((dias - 1) / 6) * 100;
    const slider = document.getElementById('slider-meta');
    const esDarkSlider2 = document.documentElement.classList.contains('dark');
    slider.style.background = `linear-gradient(to right, ${color} ${porcentaje}%, ${esDarkSlider2 ? '#2a2a2a' : '#e2e8f0'} ${porcentaje}%)`;
    slider.style.setProperty('--slider-color', color);
    document.getElementById('slider-meta').style.accentColor = color;

    const etiquetas = {
        1: '1 día / sem — para empezar suave',
        2: '2 días / sem — ritmo ligero',
        3: '3 días / sem — equilibrado',
        4: '4 días / sem — constante',
        5: '5 días / sem — disciplinado',
        6: '6 días / sem — muy comprometido',
        7: '7 días / sem — modo bestia 🔥'
    };

    const etiquetasCortas = {
        1: '1 día / sem', 2: '2 días / sem', 3: '3 días / sem',
        4: '4 días / sem', 5: '5 días / sem', 6: '6 días / sem', 7: '7 días / sem'
    };

    document.getElementById('meta-valor-label').innerText = etiquetasCortas[dias];
    document.getElementById('meta-descripcion').innerText = etiquetas[dias].split(' — ')[1];
    
}

async function crearHabitoNuevo() {
    const nombre = document.getElementById('habito-nombre').value.trim();
    const emoji = document.getElementById('habito-emoji').value;
    const color = document.getElementById('habito-color').value;
    const meta = parseInt(document.getElementById('habito-meta').value);

    if (!nombre) {
        document.getElementById('habito-nombre').focus();
        document.getElementById('habito-nombre').classList.add('ring-2', 'ring-red-400');
        setTimeout(() => document.getElementById('habito-nombre').classList.remove('ring-2', 'ring-red-400'), 1500);
        return;
    }
    if (!meta || meta < 1) {
        document.getElementById('meta-descripcion').innerText = '⚠️ Elige cuántos días por semana';
        return;
    }
    if (!usuarioActual) return;

    const btn = document.getElementById('btn-crear-habito');
    btn.innerText = 'Creando...';
    btn.disabled = true;

    const recordatorio = recordatorioActivo ? document.getElementById('recordatorio-hora').value : null;
    const tipo = document.getElementById('habito-tipo').value;
    const unidad = tipo === 'contador' ? document.getElementById('habito-unidad').value.trim() : null;
    const metaCantidad = tipo === 'contador' ? parseInt(document.getElementById('habito-meta-cantidad').value) : null;

    if (tipo === 'contador' && (!metaCantidad || !unidad)) {
        mostrarError('Ingresa la meta diaria y la unidad del contador.');
        btn.innerText = 'Crear hábito →';
        btn.disabled = false;
        return;
    }

    const resultado = await crearHabitoSupabase(
        usuarioActual.id, nombre, emoji, meta, hoyComoTexto(), color, recordatorio, tipo, unidad, metaCantidad
    );

    if (resultado.error) {
        alert('Error al crear hábito. Intenta de nuevo.');
        btn.innerText = 'Crear hábito →';
        btn.disabled = false;
        return;
    }

    const nuevoHabito = {
        id: resultado.habito.id,
        nombre: resultado.habito.nombre,
        emoji: resultado.habito.emoji,
        color: resultado.habito.color || '#6C63FF',
        metaSemanal: resultado.habito.meta_semanal,
        fechaCreacion: resultado.habito.fecha_creacion,
        recordatorio: resultado.habito.recordatorio || null,
        orden: misHabitos.length,
        tipo: resultado.habito.tipo || 'check',
        unidad: resultado.habito.unidad || null,
        metaCantidad: resultado.habito.meta_cantidad || null,
        pinneado: false,
        registros: [],
        cantidades: {}
    };

    misHabitos.push(nuevoHabito);
    renderizarHabitos();
    actualizarResumenHoy();
    cerrarModal();
}

// ============================================================
// PANTALLA DE DETALLE DE HÁBITO
// ============================================================

let habitoDetalleActual = null;
let modoEdicion = false;

function abrirDetalleHabito(id) {
    const habito = misHabitos.find(h => h.id === id);
    if (!habito) return;
    habitoDetalleActual = habito;
    const color = habito.color || '#6C63FF';

    document.getElementById('detalle-header').style.background = color + '18';
    document.getElementById('detalle-emoji').innerText = habito.emoji;
    document.getElementById('detalle-emoji-container').style.background = color + '25';
    document.getElementById('detalle-nombre').innerText = habito.nombre;
    document.getElementById('detalle-meta').innerText = `Meta: ${habito.metaSemanal} días / semana`;

    const racha = calcularRacha(habito);
    const rachaMax = calcularRachaMaxima(habito);
    const total = habito.registros.length;

    ['stat-card-racha', 'stat-card-max', 'stat-card-total'].forEach(id => {
        const el = document.getElementById(id);
        el.style.background = color + '18';
        el.style.boxShadow = `0 4px 16px ${color}18, 0 1px 4px ${color}10`;
    });
    ['stat-racha-actual', 'stat-racha-max', 'stat-total'].forEach(id => {
        document.getElementById(id).style.color = color;
    });

    document.getElementById('stat-racha-actual').innerText = racha;
    document.getElementById('stat-racha-max').innerText = rachaMax;
    document.getElementById('stat-total').innerText = total;

    const yaHecho = completadoHoy(habito);
    const btnCheck = document.getElementById('detalle-btn-check');
    const esModoOscuro = document.documentElement.classList.contains('dark');

    if (habito.tipo === 'contador') {
        // Ocultar botón de check — se completa automáticamente con el contador
        btnCheck.style.display = 'none';
    } else {
        btnCheck.style.display = '';
        btnCheck.style.background = yaHecho ? (esModoOscuro ? '#ffffff15' : '#e2e8f0') : color;
        btnCheck.style.color = yaHecho ? (esModoOscuro ? '#ffffff60' : '#94a3b8') : 'white';
        btnCheck.style.boxShadow = yaHecho ? 'none' : `0 6px 24px ${color}45, 0 2px 8px ${color}30`;
        btnCheck.innerText = yaHecho ? '✓ Completado hoy' : 'Marcar como hecho hoy ✓';
    }
    // Estado del botón pin
    const btnPin = document.getElementById('detalle-btn-pin');
    if (btnPin) {
        btnPin.style.background = habito.pinneado ? '#6C63FF' : '';
        const svg = btnPin.querySelector('svg');
        if (svg) svg.style.stroke = habito.pinneado ? 'white' : '';
    }
    generarMapaActividad(habito);
    generarUltimosRegistros(habito);

    // Mostrar contador en detalle si aplica
    const contadorDetalle = document.getElementById('detalle-contador');
    if (contadorDetalle) {
        if (habito.tipo === 'contador') {
            const hoy = hoyComoTexto();
            const cantidadHoy = habito.cantidades?.[hoy] || 0;
            const meta = habito.metaCantidad || 1;
            const porcentajeCantidad = Math.min(Math.round((cantidadHoy / meta) * 100), 100);
            contadorDetalle.classList.remove('hidden');
            contadorDetalle.innerHTML = `
                <div class="p-5 rounded-[28px] space-y-4 border border-transparent dark:border-white/10 card-shadow" style="background:${color}12;">
                    <div class="flex items-center justify-between">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Progreso de hoy</p>
                        <p class="text-xs font-bold" style="color:${color}">${cantidadHoy} / ${meta} ${habito.unidad || ''}</p>
                    </div>
                    <div class="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500" style="width:${porcentajeCantidad}%; background:${color}"></div>
                    </div>
                    <div class="flex items-center justify-center gap-6">
                        <button onclick="ajustarContadorDetalle(-1)"
                            class="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all text-2xl font-black"
                            style="background:${color}22; border:2px solid ${color}40; color:${color};">−</button>
                        <div class="text-center">
                            <p id="detalle-cantidad-num" class="text-4xl font-black" style="color:${color}">${cantidadHoy}</p>
                            <p class="text-xs font-bold text-slate-400 mt-1">${habito.unidad || 'unidades'}</p>
                        </div>
                        <button onclick="ajustarContadorDetalle(1)"
                            class="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all text-2xl font-black text-white"
                            style="background:${color};">+</button>
                    </div>
                </div>
            `;
        } else {
            contadorDetalle.classList.add('hidden');
        }
    }

    abrirPantallaAnimada('pantalla-detalle-habito');
}

function abrirEditarHabito() {
    if (!habitoDetalleActual) return;
    const habito = habitoDetalleActual;
    modoEdicion = true;

    // Precargar datos del hábito en la pantalla de crear
    document.getElementById('habito-nombre').value = habito.nombre;
    document.getElementById('contador-caracteres').innerText = `${habito.nombre.length}/30`;
    document.getElementById('habito-emoji').value = habito.emoji;
    document.getElementById('emoji-preview').innerText = habito.emoji;
    document.getElementById('emoji-nombre-preview').innerText = habito.nombre;
    document.getElementById('habito-color').value = habito.color;
    document.getElementById('habito-meta').value = habito.metaSemanal;

    // Actualizar slider
    const slider = document.getElementById('slider-meta');
    slider.value = habito.metaSemanal;
    actualizarSliderMeta(habito.metaSemanal);

    // Abrir pantalla primero para que los elementos sean visibles
    abrirPantallaAnimada('pantalla-crear-habito');

    // Precargar recordatorio si existe
    if (habito.recordatorio) {
        recordatorioActivo = true;
        const btn = document.getElementById('toggle-recordatorio');
        const circulo = document.getElementById('toggle-recordatorio-circulo');
        btn.style.background = habito.color;
        circulo.style.transform = 'translateX(24px)';
        document.getElementById('recordatorio-hora-container').classList.remove('hidden');
        document.getElementById('recordatorio-hora').value = habito.recordatorio;
        // Actualizar displays visuales con la hora guardada
        const partes = habito.recordatorio.split(':');
        horaRecordatorio = parseInt(partes[0]);
        minutoRecordatorio = parseInt(partes[1]);
        document.getElementById('recordatorio-hora-display').innerText = partes[0];
        document.getElementById('recordatorio-minuto-display').innerText = partes[1];
    } else {
        recordatorioActivo = false;
        document.getElementById('toggle-recordatorio').style.background = '';
        document.getElementById('toggle-recordatorio-circulo').style.transform = 'translateX(0)';
        document.getElementById('recordatorio-hora-container').classList.add('hidden');
        horaRecordatorio = 8;
        minutoRecordatorio = 0;
        document.getElementById('recordatorio-hora').value = '08:00';
        document.getElementById('recordatorio-hora-display').innerText = '08';
        document.getElementById('recordatorio-minuto-display').innerText = '00';
    }

    // Cambiar título y botón
    document.querySelector('#pantalla-crear-habito h2').innerText = 'Editar hábito';
    const btnCrear = document.getElementById('btn-crear-habito');
    btnCrear.innerText = 'Guardar cambios →';
    btnCrear.style.background = habito.color;
    btnCrear.style.boxShadow = `0 6px 24px ${habito.color}40`;
    btnCrear.onclick = guardarEdicionHabito;

    // Actualizar color seleccionado
    document.getElementById('habito-color').value = habito.color;
    colorSeleccionado = habito.color;
    document.querySelectorAll('.color-btn').forEach(b => b.style.outline = 'none');
    const btnColor = document.querySelector(`.color-btn[data-color="${habito.color}"]`);
    if (btnColor) {
        btnColor.style.outline = `2px solid ${habito.color}`;
        btnColor.style.outlineOffset = '3px';
    }

    // Cargar categoría deporte por defecto
    setTimeout(() => {
        mostrarCategoriaEmoji('deporte', document.querySelector('.cat-emoji-btn'));
    }, 50);
}

async function guardarEdicionHabito() {
    if (!habitoDetalleActual || !usuarioActual) return;

    const nombre = document.getElementById('habito-nombre').value.trim();
    const emoji = document.getElementById('habito-emoji').value;
    const color = document.getElementById('habito-color').value;
    const meta = parseInt(document.getElementById('habito-meta').value);

    if (!nombre) {
        document.getElementById('habito-nombre').focus();
        document.getElementById('habito-nombre').classList.add('ring-2', 'ring-red-400');
        setTimeout(() => document.getElementById('habito-nombre').classList.remove('ring-2', 'ring-red-400'), 1500);
        return;
    }

    const btn = document.getElementById('btn-crear-habito');
    btn.innerText = 'Guardando...';
    btn.disabled = true;

    const recordatorio = recordatorioActivo ? document.getElementById('recordatorio-hora').value : null;
    const resultado = await editarHabitoSupabase(habitoDetalleActual.id, nombre, emoji, meta, color, recordatorio);

    if (resultado.error) {
        alert('Error al guardar. Intenta de nuevo.');
        btn.innerText = 'Guardar cambios →';
        btn.disabled = false;
        return;
    }

    // Actualizar en memoria
    const habito = misHabitos.find(h => h.id === habitoDetalleActual.id);
    if (habito) {
        habito.nombre = nombre;
        habito.emoji = emoji;
        habito.color = color;
        habito.metaSemanal = meta;
        habito.recordatorio = recordatorio;
        habitoDetalleActual = habito;
    }

    modoEdicion = false;
    cerrarPantallaAnimada('pantalla-crear-habito', () => {
        // Resetear pantalla crear a su estado original
        document.querySelector('#pantalla-crear-habito h2').innerText = 'Nuevo hábito';
        const btnCrear = document.getElementById('btn-crear-habito');
        btnCrear.onclick = crearHabitoNuevo;
        btnCrear.disabled = false;
    });

    renderizarHabitos();
    actualizarResumenHoy();

    // Refrescar detalle sin cerrar la pantalla
    abrirDetalleHabito(habitoDetalleActual.id);
}

function cerrarDetalleHabito() {
    cerrarPantallaAnimada('pantalla-detalle-habito', () => {
        habitoDetalleActual = null;
    });
}

async function toggleDesdeDetalle() {
    if (!habitoDetalleActual) return;
    await toggleHabitoHoy(habitoDetalleActual.id);

    // Actualizar solo el botón y los stats sin reconstruir la pantalla
    const habito = habitoDetalleActual;
    const color = habito.color || '#6C63FF';
    const yaHecho = completadoHoy(habito);
    const esModoOscuro = document.documentElement.classList.contains('dark');

    const btnCheck = document.getElementById('detalle-btn-check');
    btnCheck.style.background = yaHecho ? (esModoOscuro ? '#ffffff15' : '#e2e8f0') : color;
    btnCheck.style.color = yaHecho ? (esModoOscuro ? '#ffffff60' : '#94a3b8') : 'white';
    btnCheck.style.boxShadow = yaHecho ? 'none' : `0 6px 24px ${color}45, 0 2px 8px ${color}30`;
    btnCheck.innerText = yaHecho ? '✓ Completado hoy' : 'Marcar como hecho hoy ✓';

    // Animación check-pop en el botón
    btnCheck.classList.add('check-pop');
    btnCheck.addEventListener('animationend', () => btnCheck.classList.remove('check-pop'), { once: true });

    // Actualizar stats
    document.getElementById('stat-racha-actual').innerText = calcularRacha(habito);
    document.getElementById('stat-racha-max').innerText = calcularRachaMaxima(habito);
    document.getElementById('stat-total').innerText = habito.registros.length;
}

async function eliminarHabitoDesdeDetalle() {
    if (!habitoDetalleActual) return;
    await eliminarHabito(habitoDetalleActual.id);
    cerrarDetalleHabito();
}

function generarMapaActividad(habito) {
    const contenedor = document.getElementById('mapa-actividad');
    contenedor.innerHTML = '';
    const color = habito.color || '#6C63FF';
    const esDark = document.documentElement.classList.contains('dark');
    const hoy = new Date();

    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - 90);
    inicio.setDate(inicio.getDate() - inicio.getDay());

    // Construir columnas por semana
    let diaActual = new Date(inicio);
    let semanaActual = [];
    const columnas = [];

    while (diaActual <= hoy) {
        const fechaStr = fechaComoTexto(diaActual.getFullYear(), diaActual.getMonth(), diaActual.getDate());
        semanaActual.push({
            fechaStr,
            mes: diaActual.getMonth(),
            tieneRegistro: habito.registros.includes(fechaStr),
            esFuturo: diaActual > hoy
        });
        if (diaActual.getDay() === 6) {
            columnas.push([...semanaActual]);
            semanaActual = [];
        }
        diaActual.setDate(diaActual.getDate() + 1);
    }
    if (semanaActual.length > 0) columnas.push(semanaActual);

    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const diasLabels = ['D','L','M','X','J','V','S'];

    // Wrapper con flex para días + grid
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '4px';
    wrapper.style.overflowX = 'auto';

    // Columna de etiquetas de días
    const labelsCol = document.createElement('div');
    labelsCol.style.display = 'flex';
    labelsCol.style.flexDirection = 'column';
    labelsCol.style.gap = '3px';
    labelsCol.style.flexShrink = '0';
    labelsCol.style.marginTop = '16px'; // espacio para la fila de meses

    [0,1,2,3,4,5,6].forEach(i => {
        const lbl = document.createElement('div');
        lbl.style.height = '12px';
        lbl.style.lineHeight = '12px';
        lbl.style.fontSize = '9px';
        lbl.style.color = esDark ? 'rgba(255,255,255,0.3)' : '#94a3b8';
        lbl.style.width = '12px';
        lbl.style.textAlign = 'center';
        lbl.innerText = diasLabels[i];
        labelsCol.appendChild(lbl);
    });

    wrapper.appendChild(labelsCol);

    // Contenedor del grid con meses arriba
    const gridWrapper = document.createElement('div');
    gridWrapper.style.display = 'flex';
    gridWrapper.style.flexDirection = 'column';
    gridWrapper.style.gap = '3px';
    gridWrapper.style.overflowX = 'auto';

    // Fila de meses
    const mesesRow = document.createElement('div');
    mesesRow.style.display = 'flex';
    mesesRow.style.gap = '3px';
    mesesRow.style.height = '13px';

    let ultimoMes = -1;
    columnas.forEach(semana => {
        const mesActual = semana[0]?.mes;
        const lbl = document.createElement('div');
        lbl.style.width = '12px';
        lbl.style.fontSize = '9px';
        lbl.style.color = esDark ? 'rgba(255,255,255,0.3)' : '#94a3b8';
        lbl.style.flexShrink = '0';
        lbl.style.whiteSpace = 'nowrap';
        if (mesActual !== ultimoMes) {
            lbl.innerText = meses[mesActual];
            lbl.style.width = '24px';
            ultimoMes = mesActual;
        }
        mesesRow.appendChild(lbl);
    });
    gridWrapper.appendChild(mesesRow);

    // Grid de celdas
    const grid = document.createElement('div');
    grid.style.display = 'flex';
    grid.style.gap = '3px';

    columnas.forEach(semana => {
        const col = document.createElement('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.gap = '3px';

        semana.forEach(({ tieneRegistro, esFuturo }) => {
            const celda = document.createElement('div');
            celda.style.width = '12px';
            celda.style.height = '12px';
            celda.style.borderRadius = '3px';
            celda.style.flexShrink = '0';
            celda.style.background = esFuturo ? 'transparent'
                : tieneRegistro ? color
                : (esDark ? '#2a2a2a' : '#e2e8f0');
            col.appendChild(celda);
        });
        grid.appendChild(col);
    });

    gridWrapper.appendChild(grid);
    wrapper.appendChild(gridWrapper);
    contenedor.appendChild(wrapper);

    // Leyenda actualizada
    const leyenda = document.createElement('div');
    leyenda.style.cssText = 'display:flex; align-items:center; gap:6px; justify-content:flex-end; margin-top:8px;';
    leyenda.innerHTML = `
        <span style="font-size:10px; color:${esDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'}">Sin completar</span>
        <div style="width:12px;height:12px;border-radius:3px;background:${esDark ? '#2a2a2a' : '#e2e8f0'}"></div>
        <div style="width:12px;height:12px;border-radius:3px;background:${color}"></div>
        <span style="font-size:10px; color:${esDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'}">Completado</span>
    `;
    contenedor.appendChild(leyenda);

    // Auto-scroll al final
    setTimeout(() => { contenedor.scrollLeft = contenedor.scrollWidth; }, 50);
}

function generarUltimosRegistros(habito) {
    const contenedor = document.getElementById('lista-ultimos-registros');
    contenedor.innerHTML = '';
    const color = habito.color || '#6C63FF';
    const registros = [...habito.registros].sort().reverse().slice(0, 10);

    if (registros.length === 0) {
        contenedor.innerHTML = `<p class="text-xs text-slate-400 font-medium">Aún no hay registros.</p>`;
        return;
    }

    const diasSemana = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    registros.forEach(fecha => {
        const d = new Date(fecha + 'T00:00:00');
        const esHoy = fecha === hoyComoTexto();
        const etiqueta = esHoy ? 'Hoy' : `${diasSemana[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]}`;
        const esDark = document.documentElement.classList.contains('dark');
        contenedor.innerHTML += `
            <div class="flex items-center gap-3 px-4 py-3 rounded-2xl" style="background:${document.documentElement.classList.contains('dark') ? '#1a1a1a' : color+'10'}; border:1px solid ${document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.10)' : color+'20'};">
                <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color}"></div>
                <p class="text-sm font-bold text-black dark:text-white flex-1">${etiqueta}</p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
        `;
    });
}

// ============================================================
// LOGROS / BADGES
// ============================================================

const LOGROS = [
    {
        id: 'primer_paso',
        emoji: '🔥',
        nombre: 'Primer paso',
        descripcion: 'Completa un hábito por primera vez',
        check: () => misHabitos.some(h => h.registros.length > 0)
    },
    {
        id: 'en_racha',
        emoji: '🔥',
        nombre: 'En racha',
        descripcion: '7 días consecutivos en cualquier hábito',
        check: () => misHabitos.some(h => calcularRacha(h) >= 7)
    },
    {
        id: 'imparable',
        emoji: '🔥',
        nombre: 'Imparable',
        descripcion: '30 días consecutivos en cualquier hábito',
        check: () => misHabitos.some(h => calcularRacha(h) >= 30)
    },
    {
        id: 'leyenda',
        emoji: '🔥',
        nombre: 'Leyenda',
        descripcion: '100 días consecutivos en cualquier hábito',
        check: () => misHabitos.some(h => calcularRacha(h) >= 100)
    },
    {
        id: 'semana_perfecta',
        emoji: '⭐',
        nombre: 'Semana perfecta',
        descripcion: 'Completa todos tus hábitos 7 días seguidos',
        check: () => {
            if (misHabitos.length === 0) return false;
            const hoy = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date(hoy);
                d.setDate(hoy.getDate() - i);
                const fecha = fechaComoTexto(d.getFullYear(), d.getMonth(), d.getDate());
                const habitosDelDia = misHabitos.filter(h => h.fechaCreacion <= fecha);
                if (habitosDelDia.length === 0) return false;
                const todosCompletados = habitosDelDia.every(h => h.registros.includes(fecha));
                if (!todosCompletados) return false;
            }
            return true;
        }
    },
    {
        id: 'mes_solido',
        emoji: '⭐',
        nombre: 'Mes sólido',
        descripcion: 'Al menos 80% de tus hábitos completados por 30 días',
        check: () => {
            if (misHabitos.length === 0) return false;
            const hoy = new Date();
            let diasCumplidos = 0;
            for (let i = 0; i < 30; i++) {
                const d = new Date(hoy);
                d.setDate(hoy.getDate() - i);
                const fecha = fechaComoTexto(d.getFullYear(), d.getMonth(), d.getDate());
                const habitosDelDia = misHabitos.filter(h => h.fechaCreacion <= fecha);
                if (habitosDelDia.length === 0) continue;
                const completados = habitosDelDia.filter(h => h.registros.includes(fecha)).length;
                if (completados / habitosDelDia.length >= 0.8) diasCumplidos++;
            }
            return diasCumplidos >= 30;
        }
    },
    {
        id: 'coleccionista',
        emoji: '💎',
        nombre: 'Coleccionista',
        descripcion: 'Crea 5 hábitos',
        check: () => misHabitos.length >= 5
    },
    {
        id: 'centenario',
        emoji: '💎',
        nombre: 'Centenario',
        descripcion: 'Registra 100 completados en total',
        check: () => misHabitos.reduce((sum, h) => sum + h.registros.length, 0) >= 100
    },
    {
        id: 'veterano',
        emoji: '💎',
        nombre: 'Veterano',
        descripcion: 'Registra 500 completados en total',
        check: () => misHabitos.reduce((sum, h) => sum + h.registros.length, 0) >= 500
    },
    {
        id: 'bienvenido',
        emoji: '🌱',
        nombre: 'Bienvenido',
        descripcion: 'Primer día usando Habify',
        check: () => true
    },
    {
        id: 'un_mes',
        emoji: '🌱',
        nombre: 'Un mes contigo',
        descripcion: '30 días desde tu registro',
        check: () => {
            if (!usuarioActual?.fecha_registro) return false;
            const fechaRegistro = new Date(usuarioActual.fecha_registro + 'T00:00:00');
            const dias = Math.floor((new Date() - fechaRegistro) / 86400000);
            return dias >= 30;
        }
    },
    {
        id: 'habify_pro',
        emoji: '🌱',
        nombre: 'Habify Pro',
        descripcion: '90 días desde tu registro',
        check: () => {
            if (!usuarioActual?.fecha_registro) return false;
            const fechaRegistro = new Date(usuarioActual.fecha_registro + 'T00:00:00');
            const dias = Math.floor((new Date() - fechaRegistro) / 86400000);
            return dias >= 90;
        }
    }
];

function abrirLogros() {
    const desbloqueados = obtenerLogrosDesbloqueados();
    const idsDesbloqueados = desbloqueados.map(l => l.id);

    const resumen = document.getElementById('logros-resumen');
    if (resumen) resumen.innerText = `${desbloqueados.length} de ${LOGROS.length} desbloqueados`;

    const lista = document.getElementById('lista-logros');
    lista.innerHTML = '';

    // Primero los desbloqueados, luego los bloqueados
    const ordenados = [...LOGROS].sort((a, b) => {
        const aDesbloqueado = idsDesbloqueados.includes(a.id);
        const bDesbloqueado = idsDesbloqueados.includes(b.id);
        if (aDesbloqueado && !bDesbloqueado) return -1;
        if (!aDesbloqueado && bDesbloqueado) return 1;
        return 0;
    });

    ordenados.forEach(logro => {
        const desbloqueado = idsDesbloqueados.includes(logro.id);
        const esDark = document.documentElement.classList.contains('dark');

        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 p-4 rounded-2xl border transition-all card-shadow';
        div.style.background = desbloqueado
            ? (esDark ? 'rgba(108,99,255,0.12)' : 'rgba(108,99,255,0.06)')
            : (esDark ? '#1a1a1a' : '#f8fafc');
        div.style.borderColor = desbloqueado
            ? 'rgba(108,99,255,0.25)'
            : (esDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0');
        div.style.opacity = desbloqueado ? '1' : '0.45';

        div.innerHTML = `
            <span style="font-size:28px; flex-shrink:0;">${logro.emoji}</span>
            <div style="flex:1; min-width:0;">
                <p class="text-sm font-bold text-black dark:text-white">${logro.nombre}</p>
                <p class="text-xs text-slate-400 font-medium mt-0.5">${logro.descripcion}</p>
            </div>
            ${desbloqueado
                ? `<div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style="background:#6C63FF">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   </div>`
                : `<div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-200 dark:bg-white/10">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   </div>`
            }
        `;
        lista.appendChild(div);
    });

    abrirPantallaAnimada('pantalla-logros');
}

function cerrarLogros() {
    cerrarPantallaAnimada('pantalla-logros');
}
function obtenerLogrosDesbloqueados() {
    return LOGROS.filter(l => {
        try { return l.check(); } catch { return false; }
    });
}

function verificarNuevosLogros() {
    const yaVistos = JSON.parse(localStorage.getItem('habify_logros_vistos') || '[]');
    const desbloqueados = obtenerLogrosDesbloqueados();

    desbloqueados.forEach(logro => {
        if (!yaVistos.includes(logro.id)) {
            yaVistos.push(logro.id);
            localStorage.setItem('habify_logros_vistos', JSON.stringify(yaVistos));
            mostrarNotificacionLogro(logro);
        }
    });
}

function mostrarNotificacionLogro(logro) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; left: 16px; right: 16px; z-index: 300;
        background: #6C63FF; color: white; border-radius: 20px;
        padding: 14px 18px; display: flex; align-items: center; gap: 12px;
        box-shadow: 0 8px 32px rgba(108,99,255,0.45);
        animation: slideDown 0.35s cubic-bezier(0.32,0.72,0,1) forwards;
        transform: translateY(-100%);
    `;
    toast.innerHTML = `
        <span style="font-size:28px; flex-shrink:0;">${logro.emoji}</span>
        <div>
            <p style="font-size:11px; font-weight:700; opacity:0.75; text-transform:uppercase; letter-spacing:0.05em;">¡Logro desbloqueado!</p>
            <p style="font-size:14px; font-weight:800; margin-top:1px;">${logro.nombre}</p>
            <p style="font-size:12px; opacity:0.75; margin-top:1px;">${logro.descripcion}</p>
        </div>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.transform = 'translateY(-120%)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// ============================================================
// ARRANCAR
// ============================================================
inicializarApp();
