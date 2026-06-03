
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


// BASE DE DATOS

let misHabitos = JSON.parse(localStorage.getItem('habify_habitos')) || [];

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
// GUARDAR EN LOCALSTORAGE
// ============================================================
function guardarEnAlmacenamiento() {
    localStorage.setItem('habify_habitos', JSON.stringify(misHabitos));
}

// ============================================================
// AUTENTICACIÓN Y PERFIL
// ============================================================

function verificarSesion() {
    const usuario = JSON.parse(localStorage.getItem('habify_usuario'));
    if (!usuario) {
        document.getElementById('pantalla-auth').classList.remove('hidden');
    } else {
        document.getElementById('pantalla-auth').classList.add('hidden');
        actualizarUIUsuario(usuario);
    }
}

function registrarUsuario() {
    const nombre = document.getElementById('auth-nombre').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const error = document.getElementById('auth-error');

    if (!nombre || password.length < 4) {
        error.classList.remove('hidden');
        return;
    }

    error.classList.add('hidden');

    const usuario = {
        nombre: nombre,
        password: password,
        fechaRegistro: hoyComoTexto()
    };

    localStorage.setItem('habify_usuario', JSON.stringify(usuario));
    document.getElementById('pantalla-auth').classList.add('hidden');
    actualizarUIUsuario(usuario);
}

function actualizarUIUsuario(usuario) {
    const inicial = usuario.nombre.charAt(0).toUpperCase();

    // Actualizar inicial en header
    const headerInicial = document.getElementById('header-inicial');
    if (headerInicial) headerInicial.innerText = inicial;

    // Actualizar saludo con nombre
    const saludo = document.getElementById('greeting-title');
    if (saludo) {
        const hora = new Date().getHours();
        let mensaje = "";
        if (hora >= 6 && hora < 12) mensaje = `Buenos Días, ${usuario.nombre}! ☀️`;
        else if (hora >= 12 && hora < 19) mensaje = `Buenas Tardes, ${usuario.nombre}! 🌤️`;
        else mensaje = `Buenas Noches, ${usuario.nombre}! 🌙`;
        saludo.innerText = mensaje;
    }
}

function abrirPerfil() {
    const usuario = JSON.parse(localStorage.getItem('habify_usuario'));
    if (!usuario) return;

    const inicial = usuario.nombre.charAt(0).toUpperCase();
    document.getElementById('perfil-inicial').innerText = inicial;
    document.getElementById('perfil-nombre').innerText = usuario.nombre;
    document.getElementById('perfil-total-habitos').innerText = misHabitos.length;

    // Calcular días usando la app
    const fechaRegistro = new Date(usuario.fechaRegistro + "T00:00:00");
    const hoy = new Date();
    const dias = Math.floor((hoy - fechaRegistro) / 86400000) + 1;
    document.getElementById('perfil-dias-uso').innerText = dias;

    // Calcular racha máxima global entre todos los hábitos
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
    if (confirm('¿Seguro que quieres cerrar sesión? Tus hábitos se mantendrán guardados.')) {
        localStorage.removeItem('habify_usuario');
        document.getElementById('pantalla-perfil').classList.add('hidden');
        document.getElementById('pantalla-auth').classList.remove('hidden');
        document.getElementById('auth-nombre').value = '';
        document.getElementById('auth-password').value = '';
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
        saludoElemento.innerText = "Buenos Días! ☀️";
    } else if (horaActual >= 12 && horaActual < 19) {
        saludoElemento.innerText = "Buenas Tardes! 🌤️";
    } else {
        saludoElemento.innerText = "Buenas Noches! 🌙";
    }
}

// ============================================================
// RENDERIZAR WIDGETS
// Ahora el anillo y el contador se calculan desde registros reales
// ============================================================
function renderizarHabitos() {
    const contenedor = document.getElementById('contenedor-widgets');
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (misHabitos.length === 0) {
        contenedor.innerHTML = `
            <div class="col-span-2 flex flex-col items-center justify-center py-8 text-center gap-4">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <span class="text-4xl">🌱</span>
                </div>
                <div class="space-y-1">
                    <p class="text-base font-black text-black">¡Empieza tu primer hábito!</p>
                    <p class="text-xs text-slate-400 font-medium leading-relaxed">
                        Los grandes cambios comienzan<br>con un pequeño paso diario.
                    </p>
                </div>
                <button onclick="abrirModal()" 
                        class="bg-[#333538] text-white font-bold text-sm px-6 py-3 rounded-2xl active:scale-95 transition-all shadow-md">
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

        const esModoOscuro = document.documentElement.classList.contains('dark');

        const colorAnillo = yaHecho
            ? (esModoOscuro ? "text-white" : "text-slate-600")
            : (esModoOscuro ? "text-white" : "text-black");

        const fondoWidget = yaHecho
            ? (esModoOscuro ? "bg-white/10 border-white/10" : "bg-slate-300/80 border-slate-200")
            : (esModoOscuro ? "bg-[#111111] border-white/5" : "bg-slate-200/70 border-slate-100/50");

        const widgetHTML = `
            <div class="${fondoWidget} p-5 rounded-[28px] flex flex-col justify-between h-44 border relative transition-all duration-300">
                
                <button onclick="eliminarHabito(${habito.id})" 
                    class="absolute top-4 right-4 ${esModoOscuro ? 'text-white/20 hover:text-white/60' : 'text-slate-300 hover:text-rose-400'} active:scale-90 transition-all p-1 text-xs">
                    ✕
                </button>

                <div onclick="toggleHabitoHoy(${habito.id})" 
                     class="relative w-12 h-12 flex items-center justify-center cursor-pointer active:scale-90 transition-transform select-none">
                    <svg class="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path class="text-slate-300" stroke-width="3" stroke="currentColor" fill="none" 
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        <path class="${colorAnillo} transition-all duration-500" 
                              stroke-dasharray="${porcentaje}, 100" stroke-width="3" stroke-linecap="round" 
                              stroke="currentColor" fill="none" 
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <span class="text-base z-10">${yaHecho ? '✓' : habito.emoji}</span>
                </div>
                
                <div class="space-y-0.5">
                    <p class="text-xs font-bold ${esModoOscuro ? 'text-white/50' : 'text-slate-500'} leading-none">${habito.nombre}</p>
                    <p class="text-2xl font-black ${esModoOscuro ? 'text-white' : 'text-black'} leading-tight">${completados}/${habito.metaSemanal}</p>
                    <p class="text-[11px] font-bold ${esModoOscuro ? 'text-white/40' : 'text-slate-400'} tracking-tight">
                        ${racha > 0 ? `🔥 ${racha} días de racha` : 'esta semana'}
                    </p>
                </div>
            </div>
        `;
        contenedor.innerHTML += widgetHTML;
    });
}

// ============================================================
// TOGGLE HÁBITO HOY
// Si ya lo hizo hoy → lo desmarca. Si no → lo marca.
// ============================================================
function toggleHabitoHoy(id) {
    const habito = misHabitos.find(h => h.id === id);
    if (!habito) return;

    const hoy = hoyComoTexto();

    if (habito.registros.includes(hoy)) {
        habito.registros = habito.registros.filter(f => f !== hoy);
    } else {
        habito.registros.push(hoy);

        // Vibración suave en móvil real
        if (navigator.vibrate) navigator.vibrate(50);

        // Animación de completado: buscamos el widget por id
        const widgets = document.querySelectorAll('#contenedor-widgets > div');
        const index = misHabitos.findIndex(h => h.id === id);
        if (widgets[index]) {
            widgets[index].style.transition = 'transform 0.15s ease';
            widgets[index].style.transform = 'scale(0.95)';
            setTimeout(() => {
                widgets[index].style.transform = 'scale(1)';
            }, 150);
        }
    }

    guardarEnAlmacenamiento();
    renderizarHabitos();
}

// ============================================================
// ELIMINAR HÁBITO
// ============================================================
function eliminarHabito(id) {
    const habito = misHabitos.find(h => h.id === id);
    if (!habito) return;

    // Mostramos confirmación antes de borrar
    const confirmar = confirm(`¿Eliminar "${habito.nombre}"?\n\nSe borrará todo su historial de registros.`);
    if (!confirmar) return;

    misHabitos = misHabitos.filter(h => h.id !== id);
    guardarEnAlmacenamiento();
    renderizarHabitos();
}
// ============================================================
// MODAL DE CREAR HÁBITO
// ============================================================
function abrirModal() {
    document.getElementById('modal-container').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

document.getElementById('form-nuevo-habito').addEventListener('submit', function(event) {
    event.preventDefault();

    const nombreInput = document.getElementById('habito-nombre').value.trim();
    const emojiInput = document.getElementById('habito-emoji').value;
    const metaInput = parseInt(document.getElementById('habito-meta').value);

    if (!nombreInput) return;

    const nuevoHabito = {
        id: Date.now(),
        nombre: nombreInput,
        emoji: emojiInput,
        metaSemanal: metaInput,
        fechaCreacion: hoyComoTexto(),
        registros: []  // empieza sin ningún día completado
    };

    misHabitos.push(nuevoHabito);
    guardarEnAlmacenamiento();
    renderizarHabitos();
    this.reset();
    cerrarModal();
});

// ============================================================
// CALENDARIO
// ============================================================
let fechaActualCalendario = new Date();

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
            clasesEstilo = "bg-[#333538] text-white rounded-2xl";
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
                    class="h-10 w-10 mx-auto font-bold text-xs active:scale-90 transition-all flex items-center justify-center ${clasesEstilo}">
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
    cargarNotaDia(fechaStr);
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

let graficaSemanal = null; // Variable global para guardar la gráfica
let graficaMensual = null; // Variable global para la gráfica mensual

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
                    return esHoy ? '#333538' : '#cbd5e1';
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
                borderColor: '#333538',
                backgroundColor: 'rgba(51, 53, 56, 0.08)',
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

function cargarNotaDia(fechaStr) {
    const notas = obtenerNotas();
    const textarea = document.getElementById('nota-dia');
    if (!textarea) return;
    textarea.value = notas[fechaStr] || '';
}

function guardarNotaDia() {
    const textarea = document.getElementById('nota-dia');
    const msg = document.getElementById('nota-guardada-msg');
    if (!textarea) return;

    const fechaActual = textarea.dataset.fecha;
    if (!fechaActual) return;

    const notas = obtenerNotas();
    const texto = textarea.value.trim();

    if (texto) {
        notas[fechaActual] = texto;
    } else {
        delete notas[fechaActual]; // Si está vacío, borramos la nota
    }

    guardarNotas(notas);

    // Mostrar mensaje de confirmación
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2000);

    // Actualizar el calendario para mostrar indicador de nota
    generarCalendarioMensual();
}

// ============================================================
// ARRANCAR
// ============================================================
inicializarApp();
