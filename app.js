// Variables globales
let misHabitos = [];
let usuarioActual = null;
let fechaActualCalendario = new Date();
let graficaSemanal = null;
let graficaMensual = null;
let diaSeleccionadoTira = hoyComoTexto();

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
    // La racha solo cuenta si completó hoy o ayer
    if (registrosOrdenados[0] !== hoy && registrosOrdenados[0] !== ayer) return 0;

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
        tabRegistro.style.background = 'transparent';
        tabRegistro.style.color = '#94a3b8';
        formLogin.classList.remove('hidden');
        formRegistro.classList.add('hidden');
    } else {
        tabRegistro.style.background = '#6C63FF';
        tabRegistro.style.color = 'white';
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = '#94a3b8';
        formRegistro.classList.remove('hidden');
        formLogin.classList.add('hidden');
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

    // Buscar usuario en Supabase
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${usuarioId}&select=*`,
        { headers }
    );
    const data = await res.json();

    if (data.length === 0) {
        localStorage.removeItem('habify_usuario_id');
        document.getElementById('pantalla-auth').classList.remove('hidden');
        return;
    }

    usuarioActual = data[0];
    await cargarDatosUsuario();
    document.getElementById('pantalla-auth').classList.add('hidden');
    actualizarUIUsuario(usuarioActual);
}

async function cargarDatosUsuario() {
    if (!usuarioActual) return;

    // Cargar hábitos desde Supabase
    const habitosDB = await obtenerHabitosSupabase(usuarioActual.id);
    
    // Cargar registros desde Supabase
    const registrosDB = await obtenerRegistrosSupabase(usuarioActual.id);

    // Convertir al formato que usa la app
    misHabitos = habitosDB.map(h => ({
        id: h.id,
        nombre: h.nombre,
        emoji: h.emoji,
        color: h.color || '#6C63FF',   // ← agrega esta línea
        metaSemanal: h.meta_semanal,
        fechaCreacion: h.fecha_creacion,
        registros: registrosDB
            .filter(r => r.habito_id === h.id)
            .map(r => r.fecha)
    }));
    renderizarHabitos();
    actualizarResumenHoy();
    inicializarTiraDias();
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

    document.getElementById('pantalla-perfil').classList.remove('hidden');
}

function cerrarPerfil() {
    document.getElementById('pantalla-perfil').classList.add('hidden');
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
// INICIALIZADOR
// ============================================================
function inicializarApp() {
    inicializarModoOscuro();
    verificarSesion();
    actualizarSaludo();
    renderizarHabitos();
    actualizarResumenHoy();
    inicializarScrollResumen();
    inicializarTiraDias();
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

    misHabitos.forEach(habito => {
        const completados = completadosEstaSemana(habito);
        const porcentaje = Math.min(Math.round((completados / habito.metaSemanal) * 100), 100);
        const yaHecho = completadoHoy(habito);
        const racha = calcularRacha(habito);
        const color = habito.color || '#6C63FF';

        const colorFondo = yaHecho ? color + '18' : 'transparent';
        const borderColor = yaHecho ? color + '40' : '#e2e8f0';

        const tarjetaHTML = `
    <div class="rounded-[20px] overflow-hidden border transition-colors duration-300 cursor-pointer active:scale-[0.98]"
        style="background:${colorFondo}; border-color:${borderColor}; position:relative;"
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
                    ${racha > 0 ? `<span class="text-xs font-bold" style="color:${color}">🔥 ${racha}</span>` : ''}
                </div>
                <div class="mt-2 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width:${porcentaje}%; background:${color}"></div>
                </div>
            </div>
            <button onclick="event.stopPropagation(); toggleHabitoHoy('${habito.id}')"
                    class="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-90"
                    style="background:${yaHecho ? color : 'transparent'}; border:2px solid ${yaHecho ? color : '#e2e8f0'}">
                ${yaHecho
                    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                }
            </button>
        </div>
    </div>
`;
        contenedor.innerHTML += tarjetaHTML;
    });
}

// ============================================================
// TOGGLE HÁBITO HOY
// Si ya lo hizo hoy → lo desmarca. Si no → lo marca.
// ============================================================
async function toggleHabitoHoy(id) {
    const habito = misHabitos.find(h => h.id === id);
    if (!habito || !usuarioActual) return;

    const hoy = hoyComoTexto();

    if (habito.registros.includes(hoy)) {
        await desmarcarHabitoSupabase(id, hoy);
        habito.registros = habito.registros.filter(f => f !== hoy);
    } else {
        await marcarHabitoSupabase(id, usuarioActual.id, hoy);
        habito.registros.push(hoy);
        if (navigator.vibrate) navigator.vibrate(50);
    }

    renderizarHabitos();
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
    pantalla.classList.remove('hidden');
    // Reset estado
    document.getElementById('habito-nombre').value = '';
    document.getElementById('contador-caracteres').innerText = '0/30';
    document.getElementById('habito-emoji').value = '🏃';
    document.getElementById('emoji-preview').innerText = '🏃';
    document.getElementById('emoji-nombre-preview').innerText = 'Correr';
    document.getElementById('habito-color').value = '#6C63FF';
    document.getElementById('btn-crear-habito').style.background = '#6C63FF';
    document.getElementById('habito-meta').value = '1';
    // Reset slider meta
    document.getElementById('slider-meta').value = 1;
    document.getElementById('habito-meta').value = '1';
    document.getElementById('meta-valor-label').innerText = '1 día / sem';
    document.getElementById('meta-descripcion').innerText = 'para empezar suave';
    document.getElementById('slider-meta').style.background = 'linear-gradient(to right, #6C63FF 0%, #e2e8f0 0%)';
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
    mostrarCategoriaEmoji('deporte', document.querySelector('.cat-emoji-btn'));
}

function cerrarModal() {
    document.getElementById('pantalla-crear-habito').classList.add('hidden');
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

        if (esHoy) {
            clasesEstilo = "text-white rounded-2xl";
        } else if (esFuturo) {
            clasesEstilo = "text-slate-300 cursor-not-allowed";
        } else if (tieneRegistros) {
            // Día pasado con hábitos completados → punto verde debajo
            clasesEstilo = "bg-slate-100 text-slate-800 hover:bg-slate-800 hover:text-white rounded-full relative";
        } else {
            clasesEstilo = "bg-slate-100 text-slate-800 hover:bg-slate-800 hover:text-white rounded-full";
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
            style="${esHoy ? 'background:#6C63FF;' : ''}">
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

    // Ocultamos todas las pantallas
    inicio.classList.add('hidden');
    calendario.classList.add('hidden');
    estadisticas.classList.add('hidden');

    if (pantalla === 'inicio') {
        inicio.classList.remove('hidden');
        resumen.classList.remove('hidden'); // Mostramos resumen solo en inicio
    } else if (pantalla === 'calendario') {
        calendario.classList.remove('hidden');
        resumen.classList.add('hidden'); // Ocultamos resumen en calendario
        generarCalendarioMensual();
    } else if (pantalla === 'estadisticas') {
        estadisticas.classList.remove('hidden');
        resumen.classList.add('hidden'); // Ocultamos resumen en estadísticas
        generarEstadisticas();
    }
}

function generarEstadisticas() {
    // Fecha actual
    const hoy = new Date();
    const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const fechaEl = document.getElementById('stats-fecha');
    if (fechaEl) fechaEl.innerText = `${hoy.getDate()} de ${nombresMeses[hoy.getMonth()]}`;

    // --- PRODUCTIVIDAD HOY ---
    const total = misHabitos.length;
    const hechos = misHabitos.filter(h => completadoHoy(h)).length;
    const porcentaje = total === 0 ? 0 : Math.round((hechos / total) * 100);

    document.getElementById('stats-porcentaje').innerText = `${porcentaje}%`;
    document.getElementById('stats-descripcion').innerText =
        total === 0 ? 'Sin hábitos aún' : `${hechos} de ${total} hábitos completados`;
    setTimeout(() => {
        document.getElementById('stats-anillo').setAttribute('stroke-dasharray', `${porcentaje}, 100`);
    }, 100);

    // --- GRÁFICA SEMANAL ---
    generarGraficaSemanal();
    generarGraficaMensual();

    // --- RACHAS ---
    generarListaRachas();
}

function generarGraficaSemanal() {
    // Obtenemos los 7 días de la semana actual (lunes a domingo)
    const hoy = new Date();
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
                    const esHoy = fecha === hoyComoTexto();
                    return esHoy ? '#6C63FF' : '#e2e8f0';
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

function generarGraficaMensual() {
    const hoy = new Date();
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
            <div class="bg-slate-100/70 p-4 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="text-xl">${habito.emoji}</span>
                    <div>
                        <p class="text-sm font-bold text-black">${habito.nombre}</p>
                        <p class="text-xs text-slate-400 font-medium">${completados}/${habito.metaSemanal} esta semana</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-black text-black">${racha > 0 ? `🔥 ${racha}` : '—'}</p>
                    <p class="text-xs text-slate-400 font-medium">${racha > 0 ? 'días' : 'sin racha'}</p>
                </div>
            </div>
        `;
    });
}

// ============================================================
// GRID DE EMOJIS
// ============================================================
function inicializarGridEmojis() {
    const emojis = [
        "🏃","🚴","🏋️","🧘","🤸","⚽","🏊",
        "🧗","🎾","🏄","⛷️","🥊","🏇","🤾",
        "💧","🍏","🥗","🍎","🥦","🫐","🥤",
        "🍵","🥑","🍇","🥕","🫚","🍱","🥩",
        "📚","✏️","🎯","💡","🧠","📖","🎓",
        "💻","📝","🔬","📐","🗂️","📌","🖊️",
        "😴","⏰","☀️","🌙","🧹","🛁","🪥",
        "💰","📊","💼","📈","✅","💳","🏦",
        "🎨","🎵","🎸","🎹","✍️","📷","🎬",
        "🌱","🌿","❤️","🙏","💪","🔥","⭐"
    ];

    const grid = document.getElementById('grid-emojis-panel');
    if (!grid) return;

    grid.innerHTML = '';

    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = emoji;
        btn.className = 'text-2xl p-2 rounded-2xl hover:bg-slate-100 active:scale-90 transition-all emoji-btn flex items-center justify-center';
        btn.onclick = () => seleccionarEmoji(emoji, btn);
        grid.appendChild(btn);
    });
}

function seleccionarEmoji(emoji, btnClickeado) {
    document.getElementById('habito-emoji').value = emoji;
    document.getElementById('emoji-seleccionado').innerText = emoji;

    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.classList.remove('bg-[#333538]', 'scale-110');
        btn.style.filter = '';
    });

    btnClickeado.classList.add('bg-[#333538]');
    btnClickeado.style.filter = 'brightness(10)';

    setTimeout(() => cerrarSelectorEmoji(), 200);
}

function abrirSelectorEmoji() {
    document.getElementById('selector-emoji').classList.remove('hidden');
    inicializarGridEmojis();
}

function cerrarSelectorEmoji() {
    document.getElementById('selector-emoji').classList.add('hidden');
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
}

// ============================================================
// REGISTRO DIARIO - NOTAS POR FECHA
// ============================================================

function obtenerNotas() {
    return JSON.parse(localStorage.getItem('habify_notas')) || {};
}

function guardarNotas(notas) {
    localStorage.setItem('habify_notas', JSON.stringify(notas));
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

        btn.onclick = () => seleccionarDiaTira(fechaStr);
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
    inicializarTiraDias();
    mostrarResumenDiaTira(fechaStr);
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

function actualizarContador(input) {
    document.getElementById('contador-caracteres').innerText = `${input.value.length}/30`;
}

function seleccionarColor(color, btn) {
    colorSeleccionado = color;
    document.getElementById('habito-color').value = color;
    document.getElementById('btn-crear-habito').style.background = color;

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


function seleccionarMeta(dias, btn) {
    metaSeleccionada = dias;
    document.getElementById('habito-meta').value = dias;

    const descripciones = {
        1: '1 día a la semana — para empezar suave',
        2: '2 días a la semana — ritmo ligero',
        3: '3 días a la semana — equilibrado',
        4: '4 días a la semana — constante',
        5: '5 días a la semana — disciplinado',
        7: '¡Todos los días! — modo bestia 🔥'
    };
    document.getElementById('meta-descripcion').innerText = descripciones[dias];

    const color = document.getElementById('habito-color').value || '#6C63FF';
    document.querySelectorAll('.meta-btn').forEach(b => {
        b.style.background = '';
        b.style.color = '';
        b.classList.remove('text-white');
        b.classList.add('bg-slate-100', 'text-slate-500');
    });
    btn.style.background = color;
    btn.style.color = 'white';
    btn.classList.remove('bg-slate-100', 'text-slate-500');
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
        btn.className = 'flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-2xl active:scale-90 transition-all emoji-cat-btn';
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

    document.querySelectorAll('.cat-emoji-btn').forEach(b => {
        b.style.background = '#f1f5f9';
        b.style.color = '#64748b';
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
    slider.style.background = `linear-gradient(to right, ${color} ${porcentaje}%, #e2e8f0 ${porcentaje}%)`;
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

    const resultado = await crearHabitoSupabase(
        usuarioActual.id, nombre, emoji, meta, hoyComoTexto(), color
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
        registros: []
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
        document.getElementById(id).style.background = color + '18';
    });
    ['stat-racha-actual', 'stat-racha-max', 'stat-total'].forEach(id => {
        document.getElementById(id).style.color = color;
    });

    document.getElementById('stat-racha-actual').innerText = racha;
    document.getElementById('stat-racha-max').innerText = rachaMax;
    document.getElementById('stat-total').innerText = total;

    ['actividad-color-1', 'actividad-color-2', 'actividad-color-3'].forEach(id => {
        document.getElementById(id).style.background = color;
    });

    const yaHecho = completadoHoy(habito);
    const btnCheck = document.getElementById('detalle-btn-check');
    btnCheck.style.background = yaHecho ? '#e2e8f0' : color;
    btnCheck.style.color = yaHecho ? '#94a3b8' : 'white';
    btnCheck.innerText = yaHecho ? '✓ Completado hoy' : 'Marcar como hecho hoy ✓';

    generarMapaActividad(habito);
    generarUltimosRegistros(habito);

    document.getElementById('pantalla-detalle-habito').classList.remove('hidden');
}

function cerrarDetalleHabito() {
    document.getElementById('pantalla-detalle-habito').classList.add('hidden');
    habitoDetalleActual = null;
}

async function toggleDesdeDetalle() {
    if (!habitoDetalleActual) return;
    await toggleHabitoHoy(habitoDetalleActual.id);
    abrirDetalleHabito(habitoDetalleActual.id);
}

async function eliminarHabitoDesdeDetalle() {
    if (!habitoDetalleActual) return;
    await eliminarHabito(habitoDetalleActual.id);
    cerrarDetalleHabito();
}

function generarMapaActividad(habito) {
    const grid = document.getElementById('grid-actividad');
    grid.innerHTML = '';
    const color = habito.color || '#6C63FF';
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - 90);
    inicio.setDate(inicio.getDate() - inicio.getDay());

    let diaActual = new Date(inicio);
    let semanaActual = [];
    const columnas = [];

    while (diaActual <= hoy) {
        const fechaStr = fechaComoTexto(diaActual.getFullYear(), diaActual.getMonth(), diaActual.getDate());
        semanaActual.push({
            fechaStr,
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
            celda.style.background = esFuturo ? 'transparent' : tieneRegistro ? color : '#e2e8f0';
            col.appendChild(celda);
        });
        grid.appendChild(col);
    });

    setTimeout(() => {
        const mapa = document.getElementById('mapa-actividad');
        mapa.scrollLeft = mapa.scrollWidth;
    }, 50);
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
        contenedor.innerHTML += `
            <div class="flex items-center gap-3 px-4 py-3 rounded-2xl" style="background:${color}10;">
                <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color}"></div>
                <p class="text-sm font-bold text-black dark:text-white flex-1">${etiqueta}</p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
        `;
    });
}

// ============================================================
// ARRANCAR
// ============================================================
inicializarApp();
