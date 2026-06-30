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
// FEEDBACK: SONIDO + VISUAL
// ============================================================
let audioCtx = null;
let audioCompressor = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCompressor = audioCtx.createDynamicsCompressor();
        audioCompressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
        audioCompressor.knee.setValueAtTime(6, audioCtx.currentTime);
        audioCompressor.ratio.setValueAtTime(3, audioCtx.currentTime);
        audioCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
        audioCompressor.release.setValueAtTime(0.15, audioCtx.currentTime);
        audioCompressor.connect(audioCtx.destination);
    }
    return audioCtx;
}

function getDest() { getAudioCtx(); return audioCompressor; }

function crearReverb(ctx, duracion = 0.3, decay = 2.0) {
    const convolver = ctx.createConvolver();
    const largo = Math.floor(ctx.sampleRate * duracion);
    const buffer = ctx.createBuffer(2, largo, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < largo; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, decay);
        }
    }
    convolver.buffer = buffer;
    return convolver;
}

function nota(ctx, dest, freq, delay, duracion, volumen, tipo = 'sine') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(volumen, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duracion);
    osc.connect(g); g.connect(dest);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duracion);
}

// 1. ABRIR CREAR HÁBITO — curiosidad, invitación
// Dos notas ascendentes con bounce, ligeras y abiertas
function sonarAbrirCrear() {
    try {
        const ctx = getAudioCtx();
        const master = ctx.createGain();
        master.gain.setValueAtTime(1.3, ctx.currentTime);
        master.connect(getDest());
        nota(ctx, master, 440, 0,    0.14, 1.0);
        nota(ctx, master, 554, 0.10, 0.20, 1.0);
        nota(ctx, master, 880, 0.12, 0.12, 0.4);
    } catch(e) {}
}

// 2. CREAR HÁBITO — satisfacción, pequeño logro completado
// Tres notas que forman una cadencia, con reverb corto
function sonarCrearHabito() {
    try {
        const ctx = getAudioCtx();
        const dest = getDest();
        const master = ctx.createGain();
        master.gain.setValueAtTime(1.3, ctx.currentTime);
        const reverb = crearReverb(ctx, 0.3, 2.5);
        const rvGain = ctx.createGain();
        rvGain.gain.setValueAtTime(0.4, ctx.currentTime);
        reverb.connect(rvGain); rvGain.connect(dest);
        master.connect(dest);
        nota(ctx, master, 330, 0,    0.22, 1.0);
        nota(ctx, master, 415, 0.09, 0.20, 1.0);
        nota(ctx, master, 494, 0.18, 0.30, 1.0);
        nota(ctx, reverb,  330, 0,   0.22, 0.7);
        nota(ctx, reverb,  415, 0.09,0.20, 0.7);
        nota(ctx, reverb,  494, 0.18,0.30, 0.8);
    } catch(e) {}
}

// 3. MARCAR COMPLETADO — positivo, fresco, satisfactorio
// Intervalo Do→Sol (quinta justa) — universalmente positivo
function sonarCheck() {
    try {
        const ctx = getAudioCtx();
        const dest = getDest();
        const master = ctx.createGain();
        master.gain.setValueAtTime(1.3, ctx.currentTime);
        const reverb = crearReverb(ctx, 0.25, 3.0);
        const rvGain = ctx.createGain();
        rvGain.gain.setValueAtTime(0.4, ctx.currentTime);
        reverb.connect(rvGain); rvGain.connect(dest);
        master.connect(dest);
        nota(ctx, master, 523,  0,    0.14, 1.0);
        nota(ctx, master, 784,  0.10, 0.22, 1.0);
        nota(ctx, master, 1047, 0.12, 0.12, 0.4);
        nota(ctx, reverb,  523,  0,   0.14, 0.7);
        nota(ctx, reverb,  784,  0.10,0.22, 0.8);
    } catch(e) {}
}

// 4. DESMARCAR — neutral, suave, sin drama
// Una sola nota descendente con glide suave
function sonarUncheck() {
    try {
        const ctx = getAudioCtx();
        const master = ctx.createGain();
        master.gain.setValueAtTime(1.1, ctx.currentTime);
        master.connect(getDest());
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.20);
        g.gain.setValueAtTime(1.0, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20);
        osc.connect(g); g.connect(master);
        osc.start(); osc.stop(ctx.currentTime + 0.20);
    } catch(e) {}
}

// 5. META CONTADOR COMPLETADA — energía, más potente que el check
// Cuatro notas rápidas ascendentes — tipo "power up"
function sonarMetaContador() {
    try {
        const ctx = getAudioCtx();
        const dest = getDest();
        const master = ctx.createGain();
        master.gain.setValueAtTime(1.3, ctx.currentTime);
        const reverb = crearReverb(ctx, 0.35, 2.0);
        const rvGain = ctx.createGain();
        rvGain.gain.setValueAtTime(0.4, ctx.currentTime);
        reverb.connect(rvGain); rvGain.connect(dest);
        master.connect(dest);
        [[523,0],[659,0.07],[784,0.14],[1047,0.21]].forEach(([f,d]) => {
            nota(ctx, master, f, d, 0.20, 1.0);
            nota(ctx, reverb,  f, d, 0.20, 0.7);
        });
    } catch(e) {}
}

// 6. DÍA PERFECTO — euforia, el más grande
// Fanfarria: arpegio mayor + acorde final sostenido con reverb largo
function sonarDiaPerfecto() {
    try {
        const ctx = getAudioCtx();
        const dest = getDest();
        const master = ctx.createGain();
        master.gain.setValueAtTime(1.3, ctx.currentTime);
        const reverb = crearReverb(ctx, 0.8, 1.5);
        const rvGain = ctx.createGain();
        rvGain.gain.setValueAtTime(0.5, ctx.currentTime);
        reverb.connect(rvGain); rvGain.connect(dest);
        master.connect(dest);
        [[523,0],[659,0.07],[784,0.14],[1047,0.21]].forEach(([f,d]) => {
            nota(ctx, master, f, d, 0.18, 1.0);
            nota(ctx, reverb,  f, d, 0.18, 0.7);
        });
        [[523,0.38],[659,0.38],[784,0.38],[1047,0.38]].forEach(([f,d]) => {
            nota(ctx, master, f, d, 0.60, 1.0);
            nota(ctx, reverb,  f, d, 0.60, 0.6);
        });
    } catch(e) {}
}

function aplicarFeedbackVisual(el) {
    const esPill = el.classList.contains('w-full') || el.classList.contains('btn-pill');
    const clase = esPill ? 'btn-press-pill' : 'btn-press';
    el.classList.add(clase);
    setTimeout(() => el.classList.remove(clase), 150);
}

function inicializarFeedbackGlobal() {
    // Solo feedback visual — sin sonido genérico
    document.addEventListener('touchstart', e => {
        const btn = e.target.closest('button, [role="button"]');
        if (!btn || btn.disabled) return;
        aplicarFeedbackVisual(btn);
    }, { passive: true });
}

// ============================================================
// FOTOS DE HÁBITOS
// ============================================================
let registroFotoActual = null; // { id, habitoId, fecha }
let fotoBlob = null;

// — SHEET AL MARCAR —

function abrirSheetFoto(registroId, habitoId, fecha) {
    registroFotoActual = { id: registroId, habitoId, fecha };
    fotoBlob = null;
    document.getElementById('sheet-foto-preview').classList.add('hidden');
    document.getElementById('btn-guardar-foto').classList.add('hidden');
    document.getElementById('sheet-foto').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('sheet-foto-inner').style.transform = 'translateY(0)';
    }, 10);
}

function actualizarBotonFotoDetalle(habito) {
    const container = document.getElementById('detalle-btn-foto-container');
    const texto = document.getElementById('detalle-btn-foto-texto');
    if (!container || !texto) return;
    const hoy = hoyComoTexto();
    const completadoHoyHabito = habito.registros.includes(hoy);
    const tieneFoto = !!habito.fotos?.[hoy];
    if (!completadoHoyHabito || tieneFoto) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    texto.textContent = 'Agregar foto de hoy';
}

function abrirSheetFotoDesdeDetalle() {
    if (!habitoDetalleActual) return;
    const hoy = hoyComoTexto();
    const registroId = habitoDetalleActual._registroIdMap?.[hoy];
    if (!registroId) return;
    abrirSheetFoto(registroId, habitoDetalleActual.id, hoy);
}

function cerrarSheetFoto() {
    document.getElementById('sheet-foto-inner').style.transform = 'translateY(100%)';
    setTimeout(() => {
        document.getElementById('sheet-foto').classList.add('hidden');
        registroFotoActual = null;
        fotoBlob = null;
    }, 300);
}

function seleccionarFoto(fuente) {
    const input = document.getElementById('input-foto');
    input.value = '';
    if (fuente === 'camara') {
        input.setAttribute('capture', 'environment');
    } else {
        input.removeAttribute('capture');
    }
    input.click();
}

function comprimirImagen(archivo, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 1200;
            let w = img.width, h = img.height;
            if (w > maxSize || h > maxSize) {
                if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                else { w = Math.round(w * maxSize / h); h = maxSize; }
            }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob(blob => callback(blob, e.target.result), 'image/jpeg', 0.80);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(archivo);
}

function onFotoSeleccionada(input) {
    const archivo = input.files[0];
    if (!archivo) return;
    comprimirImagen(archivo, (blob, dataUrl) => {
        fotoBlob = blob;
        document.getElementById('sheet-foto-img').src = dataUrl;
        document.getElementById('sheet-foto-preview').classList.remove('hidden');
        document.getElementById('btn-guardar-foto').classList.remove('hidden');
    });
    input.value = '';
}

async function guardarFotoSheet() {
    if (!fotoBlob || !registroFotoActual || !usuarioActual) return;
    const btn = document.getElementById('btn-guardar-foto');
    btn.textContent = 'Subiendo...';
    btn.disabled = true;

    const url = await subirFotoRegistro(registroFotoActual.id, fotoBlob, usuarioActual.id);
    if (url) {
        await guardarFotoEnRegistro(registroFotoActual.id, url);
        // Guardar en memoria
        const habito = misHabitos.find(h => h.id === registroFotoActual.habitoId);
        if (habito) {
            habito.fotos = habito.fotos || {};
            habito.fotos[registroFotoActual.fecha] = url;
            habito._registroIdMap = habito._registroIdMap || {};
            habito._registroIdMap[registroFotoActual.fecha] = registroFotoActual.id;
        }
    }

    btn.textContent = 'Guardar foto ✓';
    btn.disabled = false;
    cerrarSheetFoto();
    if (habitoDetalleActual) {
        generarUltimosRegistros(habitoDetalleActual);
        actualizarBotonFotoDetalle(habitoDetalleActual);
    }
    // Re-renderizar histórico si está abierto
    const hist = document.getElementById('pantalla-historico-fotos');
    if (hist && !hist.classList.contains('hidden')) {
        generarHistoricoFotos();
    }
}

// — VISOR DE FOTO COMPLETA —

let visorRegistroActual = null; // { registroId, habitoId, fecha }

function abrirVisorFoto(url, nombreHabito, fecha, registroId, habitoId) {
    visorRegistroActual = { registroId, habitoId, fecha };
    document.getElementById('visor-foto-img').src = url;
    document.getElementById('visor-foto-habito').textContent = nombreHabito;
    const d = new Date(fecha + 'T00:00:00');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    document.getElementById('visor-foto-fecha').textContent =
        `${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
    const visor = document.getElementById('visor-foto');
    visor.classList.remove('hidden');
    visor.style.display = 'flex';
}

function cerrarVisorFoto() {
    const visor = document.getElementById('visor-foto');
    visor.classList.add('hidden');
    visor.style.display = 'none';
    visorRegistroActual = null;
}

async function eliminarFotoDesdeVisor() {
    if (!visorRegistroActual) return;
    if (!confirm('¿Eliminar esta foto?')) return;
    const { registroId, habitoId, fecha } = visorRegistroActual;
    await eliminarFotoDeRegistro(registroId);
    const habito = misHabitos.find(h => h.id === habitoId);
    if (habito && habito.fotos) delete habito.fotos[fecha];
    cerrarVisorFoto();
    if (habitoDetalleActual && habitoDetalleActual.id === habitoId) {
        generarUltimosRegistros(habitoDetalleActual);
        actualizarBotonFotoDetalle(habitoDetalleActual);
    }
    const hist = document.getElementById('pantalla-historico-fotos');
    if (hist && !hist.classList.contains('hidden')) generarHistoricoFotos();
}

async function cambiarFotoDesdeVisor() {
    if (!visorRegistroActual) return;
    registroFotoActual = {
        id: visorRegistroActual.registroId,
        habitoId: visorRegistroActual.habitoId,
        fecha: visorRegistroActual.fecha
    };
    cerrarVisorFoto();
    fotoBlob = null;
    document.getElementById('sheet-foto-preview').classList.add('hidden');
    document.getElementById('btn-guardar-foto').classList.add('hidden');
    document.getElementById('sheet-foto').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('sheet-foto-inner').style.transform = 'translateY(0)';
    }, 10);
}

// — HISTÓRICO DE FOTOS —

function abrirHistoricoFotos() {
    generarHistoricoFotos();
    abrirPantallaAnimada('pantalla-historico-fotos');
}

function cerrarHistoricoFotos() {
    cerrarPantallaAnimada('pantalla-historico-fotos');
}

function generarHistoricoFotos() {
    const contenedor = document.getElementById('historico-fotos-contenido');
    contenedor.innerHTML = '';

    // Recopilar todos los registros con foto
    const todasLasFotos = [];
    for (const habito of misHabitos) {
        if (!habito.fotos) continue;
        for (const [fecha, url] of Object.entries(habito.fotos)) {
            todasLasFotos.push({ fecha, url, habito });
        }
    }

    if (todasLasFotos.length === 0) {
        contenedor.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 gap-3">
                <p class="text-4xl">📷</p>
                <p class="text-sm font-bold text-slate-400">Aún no tienes fotos guardadas</p>
                <p class="text-xs text-slate-400">Aparecerán aquí cuando marques hábitos con foto</p>
            </div>`;
        return;
    }

    // Ordenar por fecha descendente
    todasLasFotos.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Agrupar por mes
    const porMes = {};
    const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    for (const item of todasLasFotos) {
        const d = new Date(item.fecha + 'T00:00:00');
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = `${mesesNombres[d.getMonth()]} ${d.getFullYear()}`;
        if (!porMes[key]) porMes[key] = { label, items: [] };
        porMes[key].items.push(item);
    }

    for (const { label, items } of Object.values(porMes)) {
        const seccion = document.createElement('div');
        seccion.className = 'space-y-3';

        // Header del mes
        seccion.innerHTML = `<p class="text-xs font-black text-slate-400 uppercase tracking-widest">${label}</p>`;

        // Grid de fotos
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-2';

        for (const { fecha, url, habito } of items) {
            const d = new Date(fecha + 'T00:00:00');
            const diasSemana = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            const etiqueta = `${diasSemana[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
            const registroId = habito._registroIdMap?.[fecha];

            const card = document.createElement('div');
            card.className = 'relative rounded-2xl overflow-hidden active:scale-95 transition-all cursor-pointer';
            card.style.aspectRatio = '1';
            card.onclick = () => abrirVisorFoto(url, `${habito.emoji} ${habito.nombre}`, fecha, registroId, habito.id);
            card.innerHTML = `
                <img src="${url}" class="w-full h-full object-cover">
                <div class="absolute inset-0" style="background:linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);">
                </div>
                <div class="absolute bottom-0 left-0 right-0 p-2.5">
                    <p class="text-white text-[11px] font-black leading-tight">${habito.emoji} ${habito.nombre}</p>
                    <p class="text-white/70 text-[10px] font-medium">${etiqueta}</p>
                </div>
            `;
            grid.appendChild(card);
        }

        seccion.appendChild(grid);
        contenedor.appendChild(seccion);
    }
}

// ============================================================
// PERFIL — EDITAR Y FOTO
// ============================================================

function abrirEditarPerfil() {
    if (!usuarioActual) return;
    document.getElementById('editar-nombre').value = usuarioActual.nombre;
    document.getElementById('editar-correo-display').textContent = usuarioActual.correo;
    document.getElementById('editar-password-nueva').value = '';
    document.getElementById('editar-password-confirmar').value = '';
    document.getElementById('editar-error').classList.add('hidden');
    document.getElementById('editar-exito').classList.add('hidden');
    abrirPantallaAnimada('pantalla-editar-perfil');
}

function cerrarEditarPerfil() {
    cerrarPantallaAnimada('pantalla-editar-perfil');
}

async function guardarCambiosPerfil() {
    const nombre = document.getElementById('editar-nombre').value.trim();
    const passNueva = document.getElementById('editar-password-nueva').value;
    const passConfirmar = document.getElementById('editar-password-confirmar').value;
    const errorEl = document.getElementById('editar-error');
    const exitoEl = document.getElementById('editar-exito');

    errorEl.classList.add('hidden');
    exitoEl.classList.add('hidden');

    if (!nombre) {
        errorEl.textContent = 'El nombre no puede estar vacío.';
        errorEl.classList.remove('hidden');
        return;
    }
    if (passNueva && passNueva.length < 4) {
        errorEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
        errorEl.classList.remove('hidden');
        return;
    }
    if (passNueva && passNueva !== passConfirmar) {
        errorEl.textContent = 'Las contraseñas no coinciden.';
        errorEl.classList.remove('hidden');
        return;
    }

    const campos = { nombre };
    if (passNueva) campos.password = passNueva;

    const ok = await actualizarUsuario(usuarioActual.id, campos);
    if (ok) {
        usuarioActual.nombre = nombre;
        if (passNueva) usuarioActual.password = passNueva;
        actualizarUIUsuario(usuarioActual);
        abrirPerfil();
        exitoEl.textContent = '¡Cambios guardados!';
        exitoEl.classList.remove('hidden');
        setTimeout(() => cerrarEditarPerfil(), 1000);
    } else {
        errorEl.textContent = 'Error al guardar. Intenta de nuevo.';
        errorEl.classList.remove('hidden');
    }
}

function cambiarFotoPerfil() {
    document.getElementById('input-foto-perfil').value = '';
    document.getElementById('input-foto-perfil').click();
}

function onFotoPerfilSeleccionada(input) {
    const archivo = input.files[0];
    if (!archivo) return;
    comprimirImagen(archivo, async (blob) => {
        const url = await subirFotoPerfil(usuarioActual.id, blob);
        if (url) {
            await actualizarUsuario(usuarioActual.id, { foto_url: url });
            usuarioActual.foto_url = url;
            actualizarAvatarPerfil(url);
        }
    });
}

function actualizarAvatarPerfil(fotoUrl) {
    const foto = document.getElementById('perfil-foto');
    const inicial = document.getElementById('perfil-inicial');
    const headerFoto = document.getElementById('header-foto');
    const headerInicial = document.getElementById('header-inicial');

    if (fotoUrl) {
        if (foto) { foto.src = fotoUrl; foto.classList.remove('hidden'); }
        if (inicial) inicial.classList.add('hidden');
        if (headerFoto) { headerFoto.src = fotoUrl; headerFoto.classList.remove('hidden'); }
        if (headerInicial) headerInicial.classList.add('hidden');
    } else {
        if (foto) foto.classList.add('hidden');
        if (inicial) inicial.classList.remove('hidden');
        if (headerFoto) headerFoto.classList.add('hidden');
        if (headerInicial) headerInicial.classList.remove('hidden');
    }
}

// ============================================================
// AUTH — RECUPERAR CONTRASEÑA
// ============================================================

function mostrarRecuperarPassword() {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-registro').classList.add('hidden');
    document.getElementById('form-recuperar').classList.remove('hidden');
    document.getElementById('form-recuperar').style.display = 'flex';
    document.getElementById('btn-login').classList.add('hidden');
    document.getElementById('btn-registro').classList.add('hidden');
    document.getElementById('btn-recuperar').classList.remove('hidden');
    document.getElementById('recuperar-correo').value = '';
    document.getElementById('recuperar-msg').classList.add('hidden');
}

async function enviarRecuperacion() {
    const correo = document.getElementById('recuperar-correo').value.trim();
    const msg = document.getElementById('recuperar-msg');
    if (!correo) return;

    const existe = await enviarCorreoRecuperacion(correo);
    msg.classList.remove('hidden');
    if (existe) {
        // Generar contraseña temporal y guardarla
        const palabras = ['Cielo','Luna','Sol','Mar','Viento','Roca','Fuego','Nieve','Bosque','Río','Árbol','Nube'];
        const palabra = palabras[Math.floor(Math.random() * palabras.length)];
        const numero = Math.floor(Math.random() * 900) + 100;
        const tempPass = `${palabra}${numero}`;
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ password: tempPass })
            }
        );
        if (res.ok) {
            msg.style.color = '#6C63FF';
            msg.textContent = `Tu nueva contraseña temporal es: ${tempPass} — Úsala para entrar y cámbiala en tu perfil.`;
        } else {
            msg.style.color = '#f43f5e';
            msg.textContent = 'Error al restablecer. Intenta de nuevo.';
        }
    } else {
        msg.style.color = '#f43f5e';
        msg.textContent = 'No encontramos ese correo registrado.';
    }
}

// ============================================================
// ANIMACIONES DE PANTALLA
// ============================================================
function abrirPantallaAnimada(id) {
    const el = document.getElementById(id);
    el.classList.remove('pantalla-slide-up', 'pantalla-spring', 'pantalla-cerrando');
    el.style.transform = '';
    el.style.opacity = '';
    el.classList.remove('hidden');
    void el.offsetHeight;
    el.classList.add('pantalla-spring');
    setTimeout(() => {
        el.classList.remove('pantalla-spring');
        el.style.transform = '';
        el.style.opacity = '';
    }, 420);
    // Animar hijos con entrada en cascada
    const items = el.querySelectorAll('.entrada-item');
    items.forEach((item, i) => {
        item.style.animationDelay = `${i * 0.05 + 0.1}s`;
    });
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

// ============================================================
//  RACHAS — 3 modos según el tipo de hábito
//  A) diario  B) meta semanal flexible  C) días concretos
// ============================================================

// Lunes (00:00) de la semana a la que pertenece una fecha
function lunesDeLaSemana(fecha) {
    const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const dow = d.getDay(); // 0=Dom .. 6=Sáb
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return d;
}
function claveSemana(fecha) {
    const l = lunesDeLaSemana(fecha);
    return fechaComoTexto(l.getFullYear(), l.getMonth(), l.getDate());
}

// Determina el tipo de racha del hábito
function tipoRacha(habito) {
    const diasFijos = habito.diasSemana && habito.diasSemana.length > 0 && habito.diasSemana.length < 7;
    if (diasFijos) return 'dias_fijos';                                  // Caso C
    return (habito.metaSemanal && habito.metaSemanal < 7) ? 'semanal' : 'diario'; // B / A
}

// Motor principal: { tipo, dias, semanas, enRiesgo }
function analizarRacha(habito) {
    const tipo = tipoRacha(habito);
    if (!habito.registros || habito.registros.length === 0)
        return { tipo, dias: 0, semanas: 0, enRiesgo: false };

    // ---------- Caso A: todos los días (consecutivo, 1 día de margen) ----------
    if (tipo === 'diario') {
        const ord = [...habito.registros].sort().reverse();
        const hoy = hoyComoTexto();
        const t = Date.now();
        const ayer = fechaComoTexto(new Date(t-86400000).getFullYear(), new Date(t-86400000).getMonth(), new Date(t-86400000).getDate());
        const anteayer = fechaComoTexto(new Date(t-172800000).getFullYear(), new Date(t-172800000).getMonth(), new Date(t-172800000).getDate());
        if (ord[0] !== hoy && ord[0] !== ayer && ord[0] !== anteayer)
            return { tipo, dias: 0, semanas: 0, enRiesgo: false };
        let racha = 0, esperada = new Date(ord[0] + 'T00:00:00');
        for (let i = 0; i < ord.length; i++) {
            const f = new Date(ord[i] + 'T00:00:00');
            if ((esperada - f) / 86400000 === 0) { racha++; esperada = new Date(f - 86400000); }
            else break;
        }
        return racha >= 3
            ? { tipo, dias: racha, semanas: 0, enRiesgo: ord[0] === anteayer }
            : { tipo, dias: 0, semanas: 0, enRiesgo: false };
    }

    const setReg = new Set(habito.registros);
    const primera = new Date([...habito.registros].sort()[0] + 'T00:00:00');
    const hoy0 = new Date(); hoy0.setHours(0,0,0,0);
    let cursor = lunesDeLaSemana(new Date());
    let dias = 0, semanas = 0, enRiesgo = false, idx = 0;

    // ---------- Caso B: meta semanal flexible ----------
    if (tipo === 'semanal') {
        const meta = habito.metaSemanal;
        const porSemana = {};
        for (const f of habito.registros) {
            const k = claveSemana(new Date(f + 'T00:00:00'));
            porSemana[k] = (porSemana[k] || 0) + 1;
        }
        while (true) {
            const fin = new Date(cursor); fin.setDate(cursor.getDate() + 6);
            if (fin < primera) break;
            const count = porSemana[fechaComoTexto(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())] || 0;
            if (idx === 0) {
                dias += count;
                if (count >= meta) semanas++;
                if (count < meta && new Date().getDay() === 0) enRiesgo = true; // domingo sin cumplir
            } else {
                if (count >= meta) { semanas++; dias += count; } else break;
            }
            cursor.setDate(cursor.getDate() - 7); idx++;
        }
        const umbral = meta === 1 ? 1 : 2;
        if (dias < umbral) return { tipo, dias: 0, semanas: 0, enRiesgo: false };
        return { tipo, dias, semanas, enRiesgo };
    }

    // ---------- Caso C: días concretos (rompe si falta cualquier día programado) ----------
    const prog = habito.diasSemana;
    while (true) {
        const lunes = new Date(cursor);
        const fin = new Date(lunes); fin.setDate(lunes.getDate() + 6);
        if (fin < primera) break;
        let totalProg = 0, hechos = 0, faltadosPasados = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(lunes); d.setDate(lunes.getDate() + i);
            if (!prog.includes(d.getDay())) continue;
            totalProg++;
            if (setReg.has(fechaComoTexto(d.getFullYear(), d.getMonth(), d.getDate()))) hechos++;
            else if (d < hoy0) faltadosPasados++;
        }
        if (idx === 0) {
            dias += hechos;
            if (totalProg > 0 && hechos === totalProg) semanas++;
            if (faltadosPasados > 0) enRiesgo = true; // ya falló un día → se romperá al cerrar la semana
        } else {
            if (hechos === totalProg) { semanas++; dias += hechos; } else break;
        }
        cursor.setDate(cursor.getDate() - 7); idx++;
    }
    if (dias < 2) return { tipo, dias: 0, semanas: 0, enRiesgo: false };
    return { tipo, dias, semanas, enRiesgo };
}

// Wrappers para mantener compatible el resto del código
function calcularRacha(habito) { return analizarRacha(habito).dias; }
function calcularRachaSemanas(habito) { return analizarRacha(habito).semanas; }
function rachaEnRiesgo(habito) { return analizarRacha(habito).enRiesgo; }

// Sufijo "· N sem" para hábitos semanales / de días fijos
function sufijoSemanas(habito) {
    const a = analizarRacha(habito);
    if (a.tipo === 'diario' || a.semanas <= 0) return '';
    return ` · ${a.semanas} sem`;
}

// ¿El hábito está programado para esta fecha? (ya existía + aplica ese día de la semana)
// Fuente única de verdad para el filtrado por días activos.
function habitoActivoEnFecha(habito, fechaStr) {
    const creado = (habito.fechaCreacion || '').slice(0, 10);
    if (creado && creado > fechaStr) return false;                        // aún no existía
    if (!habito.diasSemana || habito.diasSemana.length === 0) return true; // sin días fijos → todos los días
    const dow = new Date(fechaStr + 'T00:00:00').getDay();
    return habito.diasSemana.includes(dow);                               // días concretos
}

// ¿Este hábito cuenta para las estadísticas de un día concreto?
function aplicaEnDia(habito, fechaStr) {
    // Estructura: ya existe y aplica este día de la semana
    if (!habitoActivoEnFecha(habito, fechaStr)) return false;

    // Meta semanal flexible: sigue pendiente cada día hasta cumplir la meta de esa semana
    if (tipoRacha(habito) === 'semanal') {
        const meta = habito.metaSemanal;
        const f = new Date(fechaStr + 'T00:00:00');
        const lunes = lunesDeLaSemana(f);
        let hechosAntes = 0;
        for (const r of habito.registros) {
            const fr = new Date(r + 'T00:00:00');
            if (fr >= lunes && fr < f) hechosAntes++; // completados antes de este día, en su semana
        }
        return hechosAntes < meta;
    }

    // días fijos o diario → cuenta si está activo
    return true;
}

// Pinta los recordatorios del hábito en el detalle
function renderizarRecordatoriosDetalle(habito) {
    const cont = document.getElementById('detalle-recordatorios');
    if (!cont) return;

    let horas = [];
    if (habito.recordatorio) {
        try {
            const parsed = JSON.parse(habito.recordatorio);
            horas = Array.isArray(parsed) ? parsed : [habito.recordatorio];
        } catch {
            horas = [habito.recordatorio];
        }
    }
    horas = horas.filter(Boolean).sort();

    if (horas.length === 0) {
        cont.innerHTML = `
            <div class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100/70 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0118 8"/><path d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 00-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                Sin recordatorios activos
            </div>`;
        return;
    }

    const color = habito.color || '#6C63FF';
    cont.innerHTML = horas.map(h => `
        <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-100/70 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${color}18;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </span>
            <span class="text-sm font-bold text-black dark:text-white">${h}</span>
        </div>
    `).join('');
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
    const formLogin = document.getElementById('form-login');
    const formRegistro = document.getElementById('form-registro');
    const formRecuperar = document.getElementById('form-recuperar');
    const tabLogin = document.getElementById('tab-login');
    const tabRegistro = document.getElementById('tab-registro');
    const btnLogin = document.getElementById('btn-login');
    const btnRegistro = document.getElementById('btn-registro');
    const btnRecuperar = document.getElementById('btn-recuperar');

    // Ocultar recuperar siempre al cambiar tab
    if (formRecuperar) { formRecuperar.classList.add('hidden'); formRecuperar.style.display = ''; }
    if (btnRecuperar) btnRecuperar.classList.add('hidden');

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

    // Restaurar el botón (evita que quede atascado al cerrar sesión y volver)
    btn.innerText = 'Crear cuenta →';
    btn.disabled = false;

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

    // Restaurar el botón (evita que quede atascado al cerrar sesión y volver)
    btn.innerText = 'Entrar →';
    btn.disabled = false;

    usuarioActual = resultado.usuario;
    localStorage.setItem('habify_usuario_id', usuarioActual.id);
    await cargarDatosUsuario();
    document.getElementById('pantalla-auth').classList.add('hidden');
    actualizarUIUsuario(usuarioActual);
}

async function verificarSesion() {
    const usuarioId = localStorage.getItem('habify_usuario_id');
    if (!usuarioId) {
        ocultarSplash();
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
        ocultarSplash();
        mostrarError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
        mostrarCargando(false);
    }
}

let _habitosDBCache = [];
let historialCompletoCargado = false;

function fechaHaceMeses(n) {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
}

function mapearHabitos(habitosDB, registrosDB) {
    return habitosDB.map(h => ({
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
            .reduce((acc, r) => { acc[r.fecha] = r.cantidad; return acc; }, {}),
        horas: Object.fromEntries(
            registrosDB
                .filter(r => r.habito_id === h.id && r.hora)
                .map(r => [r.fecha, r.hora])
        ),
        fotos: Object.fromEntries(
            registrosDB
                .filter(r => r.habito_id === h.id && r.foto_url)
                .map(r => [r.fecha, r.foto_url])
        ),
        _registroIdMap: Object.fromEntries(
            registrosDB
                .filter(r => r.habito_id === h.id)
                .map(r => [r.fecha, r.id])
        ),
        diasSemana: h.dias_semana
            ? h.dias_semana.split(',').map(Number)
            : []
    }));
}

async function cargarDatosUsuario() {
    if (!usuarioActual) return;

    try {
        const habitosDB = await obtenerHabitosSupabase(usuarioActual.id);
        _habitosDBCache = habitosDB;
        historialCompletoCargado = false;

        // Carga inicial: solo últimos 6 meses para un arranque rápido
        const registrosDB = await obtenerRegistrosSupabase(usuarioActual.id, fechaHaceMeses(6));
        misHabitos = mapearHabitos(habitosDB, registrosDB);

        await cargarTodasLasNotas();
        renderizarHabitos();
        actualizarResumenHoy();
        inicializarTiraDias();
        suscribirPush();
        verificarNuevosLogros();
        ocultarSplash();
        mostrarTutorialSiEsNecesario();

        // Historial completo en segundo plano (no bloquea el arranque)
        cargarHistorialCompleto();
    } catch (e) {
        mostrarError('Revisa tu conexión.');
    }
}

async function cargarHistorialCompleto() {
    if (historialCompletoCargado || !usuarioActual) return;
    try {
        const registrosDB = await obtenerRegistrosSupabase(usuarioActual.id);
        misHabitos = mapearHabitos(_habitosDBCache, registrosDB);
        historialCompletoCargado = true;

        // Refrescar lo visible ya con el historial completo
        animarCargaInicial = false;
        renderizarHabitos();
        actualizarResumenHoy();
        const calendarioVisible = !document.getElementById('pantalla-calendario').classList.contains('hidden');
        if (calendarioVisible) {
            generarCalendarioMensual();
            generarResumenSemanal();
        }
    } catch (e) {
        // Si falla, la app sigue funcionando con los últimos 6 meses
    }
}

function actualizarUIUsuario(usuario) {
    const inicial = usuario.nombre.charAt(0).toUpperCase();
    const headerInicial = document.getElementById('header-inicial');
    if (headerInicial) headerInicial.innerText = inicial;
    // Cargar foto de perfil si existe
    if (usuario.foto_url) {
        actualizarAvatarPerfil(usuario.foto_url);
    }

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
    actualizarNavActiva('perfil');
    if (!usuarioActual) return;

    const inicial = usuarioActual.nombre.charAt(0).toUpperCase();
    if (usuarioActual.foto_url) {
        actualizarAvatarPerfil(usuarioActual.foto_url);
    } else {
        document.getElementById('perfil-inicial').innerText = inicial;
        document.getElementById('perfil-foto').classList.add('hidden');
        document.getElementById('perfil-inicial').classList.remove('hidden');
    }
    document.getElementById('perfil-nombre').innerText = usuarioActual.nombre;
    const correoEl = document.getElementById('perfil-correo');
    if (correoEl) correoEl.textContent = usuarioActual.correo;
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

    // Hora pico — analizar registros con hora guardada
    const horaPicoEl = document.getElementById('perfil-hora-pico');
    const conteoFranjas = { madrugada: 0, mañana: 0, tarde: 0, noche: 0 };
    let totalConHora = 0;

    misHabitos.forEach(habito => {
        if (!habito.horas) return;
        Object.values(habito.horas).forEach(hora => {
            if (!hora) return;
            const h = parseInt(hora.split(':')[0]);
            totalConHora++;
            if (h >= 5 && h < 12) conteoFranjas.mañana++;
            else if (h >= 12 && h < 19) conteoFranjas.tarde++;
            else if (h >= 19 && h < 24) conteoFranjas.noche++;
            else conteoFranjas.madrugada++;
        });
    });

    if (totalConHora < 3) {
        horaPicoEl.innerText = 'Pocos datos aún';
    } else {
        const mejor = Object.entries(conteoFranjas).sort((a,b) => b[1] - a[1])[0][0];
        const etiquetas = {
            mañana: '🌅 Mañanas',
            tarde: '☀️ Tardes',
            noche: '🌙 Noches',
            madrugada: '🌃 Madrugada'
        };
        horaPicoEl.innerText = etiquetas[mejor];
    }

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
        fechaActualCalendario = new Date();
        notasCacheadas = {};
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
let swRegistration = null;

async function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const swPath = location.pathname.replace(/\/[^/]*$/, '/') + 'sw.js';
        swRegistration = await navigator.serviceWorker.register(swPath);
        // Esperar a que el SW esté activo
        await navigator.serviceWorker.ready;
        swRegistration = await navigator.serviceWorker.getRegistration(swPath);
        console.log('SW listo');
    } catch(e) {
        console.warn('SW no disponible:', e);
    }
}

// ============================================================
// PUSH NOTIFICATIONS (Web Push)
// ============================================================
const VAPID_PUBLIC_KEY = 'BPsgKmu09C0DIAhLNAc2Im8Pkr4Hxp7TopY1GFwFLM6m3TqhVKZJKDruasTFoTNTpLN5iFkCbGD6nsjU3vT7azA';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function suscribirPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!usuarioActual) return;
    if (Notification.permission !== 'granted') return;
    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        const json = sub.toJSON();
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await guardarSuscripcionPush(usuarioActual.id, json.endpoint, json.keys.p256dh, json.keys.auth, tz);
        console.log('Push suscrito y guardado ✓');
    } catch (e) {
        console.warn('No se pudo suscribir a push:', e);
    }
}

function inicializarApp() {
    inicializarModoOscuro();
    inicializarScrollResumen();
    inicializarFeedbackGlobal();
    registrarServiceWorker();
    verificarSesion();
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
    const diaReferencia = new Date(fechaReferencia + 'T00:00:00').getDay();

    const habitosOrdenados = [...misHabitos]
        .filter(h => habitoActivoEnFecha(h, fechaReferencia))
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
        const colorFondo = yaHecho ? color + '22' : (esDark ? '#0f0f0f' : '#f1f5f9');
        const borderColor = yaHecho ? color + '50' : (esDark ? 'rgba(255,255,255,0.10)' : '#e2e8f0');
        

        const tarjetaHTML = `
    <div class="habito-card rounded-[20px] overflow-hidden border transition-colors duration-300 cursor-grab active:cursor-grabbing"
        data-id="${habito.id}"
        style="background:${colorFondo}; border-color:${borderColor}; position:relative; box-shadow:${yaHecho ? `0 6px 24px ${color}40, 0 2px 8px ${color}20` : '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)'};"
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
                    ${racha > 0 && !enRiesgo ? `<span class="text-xs font-bold pulse-badge" style="color:${color}">🔥 ${racha}${sufijoSemanas(habito)}</span>` : ''}
                    ${racha > 0 && enRiesgo ? `<span class="text-xs font-bold text-amber-500">⚠️ ${racha}${sufijoSemanas(habito)} en riesgo</span>` : ''}
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

    // Animación de entrada en cascada solo en carga inicial
    if (animarCargaInicial) {
        const tarjetas = contenedor.querySelectorAll('.rounded-\\[20px\\]');
        tarjetas.forEach((t, i) => {
            t.style.animationDelay = `${i * 0.06}s`;
            t.classList.add('entrada-item');
            setTimeout(() => {
                t.classList.remove('entrada-item');
                t.style.opacity = '1';
                t.style.transform = 'none';
                t.style.animationDelay = '';
            }, 380 + i * 60);
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
    const _r = analizarRacha(habito);
    document.getElementById('stat-racha-actual').innerText = _r.dias;
    const _lblRacha = document.querySelector('#stat-card-racha p:last-child');
    if (_lblRacha) _lblRacha.innerText = (_r.tipo !== 'diario' && _r.semanas > 0) ? `Racha · ${_r.semanas} sem` : 'Racha actual';
    document.getElementById('stat-total').innerText = habito.registros.length;

    // Actualizar mapa de actividad
    generarMapaActividad(habito);

    // Mostrar recordatorios del hábito
    renderizarRecordatoriosDetalle(habito);

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
        sonarMetaContador();
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
    verificarDiaPerfecto();
}
async function toggleHabitoDia(habitoId, fechaStr) {
    const habito = misHabitos.find(h => h.id === habitoId);
    if (!habito || !usuarioActual) return;

    const completado = habito.registros.includes(fechaStr);

    if (completado) {
        const tieneFoto = !!habito.fotos?.[fechaStr];
        if (tieneFoto) {
            const ok = confirm('Al desmarcar este hábito se eliminará la foto guardada para este día. ¿Continuar?');
            if (!ok) return;
            const regId = habito._registroIdMap?.[fechaStr];
            if (regId) await eliminarFotoDeRegistro(regId);
            delete habito.fotos[fechaStr];
        }
        await desmarcarHabitoSupabase(habitoId, fechaStr);
        habito.registros = habito.registros.filter(f => f !== fechaStr);
        sonarUncheck();
    } else {
        const registroId = await marcarHabitoSupabase(habitoId, usuarioActual.id, fechaStr);
        habito.registros.push(fechaStr);
        if (registroId) {
            habito._registroIdMap = habito._registroIdMap || {};
            habito._registroIdMap[fechaStr] = registroId;
        }
        sonarCheck();
        if (registroId) setTimeout(() => abrirSheetFoto(registroId, habitoId, fechaStr), 400);
    }

    animarCargaInicial = false;
    renderizarHabitos();
    actualizarResumenHoy();
    inicializarTiraDias();
    mostrarResumenDiaTira(fechaStr);
    verificarNuevosLogros();
    verificarDiaPerfecto();
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
    sonarAbrirCrear();
    // Bounce en el botón +
    const btnPlus = document.querySelector('button[onclick="abrirModal()"]');
    if (btnPlus) {
        btnPlus.classList.add('bounce-once');
        setTimeout(() => btnPlus.classList.remove('bounce-once'), 400);
    }
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
    horasRecordatorioMultiple = ['08:00'];
    document.getElementById('toggle-recordatorio').style.background = '';
    document.getElementById('toggle-recordatorio-circulo').style.transform = 'translateX(0)';
    document.getElementById('recordatorio-hora-container').classList.add('hidden');
    document.getElementById('recordatorio-hora-unica').classList.remove('hidden');
    document.getElementById('recordatorio-horas-multiples').classList.add('hidden');
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
    resetearSelectorDias();
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

        const esSeleccionadoCal = !esHoy && fechaSeleccionadaCal === fechaDia;
        cuadrilla.innerHTML += `
            <button onclick="verVistaRapidaDia('${fechaDia}', ${esFuturo})" ${esFuturo ? 'disabled' : ''}
                    class="h-10 w-10 mx-auto font-bold text-xs active:scale-90 transition-all flex items-center justify-center relative ${clasesEstilo}"
                    style="${
                        esHoy ? 'background:#6C63FF; color:white;' :
                        esSeleccionadoCal ? `background:transparent; color:#6C63FF; border:2px solid #6C63FF;` :
                        esFuturo ? `color:${esDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};` :
                        tieneRegistros ? `background:${esDark ? '#2a2a2a' : '#f1f5f9'}; color:${esDark ? 'white' : '#1e293b'};` :
                        `background:${esDark ? '#1a1a1a' : '#f1f5f9'}; color:${esDark ? 'rgba(255,255,255,0.35)' : '#475569'};`
                    }; ${esHoy && fechaSeleccionadaCal && fechaSeleccionadaCal !== fechaDia ? 'outline: 3px solid rgba(108,99,255,0.4); outline-offset: 2px;' : ''}">
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
let fechaSeleccionadaCal = null;

function verVistaRapidaDia(fechaStr, esFuturo) {
    fechaSeleccionadaCal = esFuturo ? null : fechaStr;
    generarCalendarioMensual();
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

const MENSAJES_DIA_COMPLETO = [
    '¡Todo listo! 🎉',
    '¡Día perfecto! 💪',
    '¡Lo lograste! 🌟',
    '¡Imparable! 🔥',
    '¡Completado! 🚀',
    '¡Increíble disciplina! 🏆',
    '¡Lo ganaste! ✨',
    '¡Redondo! 🎯',
    '¡Eres una máquina! 🤖',
    '¡Éxito total! 🥳',
    '¡Fantástico! 🎊',
    '¡Conquistado! 🏅',
];

function actualizarResumenHoy() {
    const el = document.getElementById('texto-resumen-hoy');
    if (!el) return;

    const hoyStr = hoyComoTexto();
    const total = misHabitos.filter(h => aplicaEnDia(h, hoyStr)).length;

    if (total === 0) {
        el.innerText = "No tienes hábitos aún. ¡Crea uno!";
        return;
    }

    const completadosHoy = misHabitos.filter(h => aplicaEnDia(h, hoyStr) && completadoHoy(h)).length;

    if (completadosHoy === total) {
        const idx = Math.floor(Math.random() * MENSAJES_DIA_COMPLETO.length);
        el.innerText = MENSAJES_DIA_COMPLETO[idx];
    } else {
        el.innerText = `${completadosHoy} de ${total} hábitos completados hoy`;
    }
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

function actualizarHeaderModulo(pantalla) {
    const titulo = document.getElementById('greeting-title');
    const subtitulo = document.getElementById('greeting-subtitle');
    if (!titulo) return;
    const nombre = usuarioActual?.nombre || '';
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const titulos = {
        inicio:       `${saludo}, ${nombre}!`,
        calendario:   'Calendario',
        estadisticas: 'Estadísticas',
    };
    const subtitulos = {
        inicio:       subtitulo?.dataset.original || '',
        calendario:   'Revisa tu historial',
        estadisticas: 'Tu progreso en números',
    };
    titulo.innerText = titulos[pantalla] || titulos.inicio;
    if (subtitulo) {
        if (pantalla === 'inicio' && !subtitulo.dataset.original) {
            subtitulo.dataset.original = subtitulo.innerText;
        }
        subtitulo.innerText = subtitulos[pantalla] ?? '';
    }
}

function actualizarNavActiva(pantalla) {
    const btns = { inicio: 'nav-btn-inicio', calendario: 'nav-btn-calendario', estadisticas: 'nav-btn-estadisticas', perfil: 'nav-btn-perfil' };
    Object.entries(btns).forEach(([key, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.style.color = key === pantalla ? '#6C63FF' : '#94a3b8';
        btn.style.transform = key === pantalla ? 'scale(1.15)' : 'scale(1)';
    });
}

function irAPantalla(pantalla) {
    actualizarNavActiva(pantalla);
    const inicio = document.getElementById('pantalla-inicio');
    const calendario = document.getElementById('pantalla-calendario');
    const estadisticas = document.getElementById('pantalla-estadisticas');
    const resumen = document.getElementById('resumen-hoy');
    const tira = document.getElementById('tira-dias');

    inicio.classList.add('hidden');
    calendario.classList.add('hidden');
    estadisticas.classList.add('hidden');

    actualizarHeaderModulo(pantalla);

    if (pantalla === 'inicio') {
        inicio.classList.remove('hidden');
        resumen.classList.remove('hidden');
        if (tira) tira.classList.remove('hidden');
    } else if (pantalla === 'calendario') {
        calendario.classList.remove('hidden');
        resumen.classList.add('hidden');
        if (tira) tira.classList.add('hidden');
        generarCalendarioMensual();
        offsetSemanaResumen = 0;
        generarResumenSemanal();
    } else if (pantalla === 'estadisticas') {
        estadisticas.classList.remove('hidden');
        resumen.classList.add('hidden');
        if (tira) tira.classList.remove('hidden');
        generarEstadisticas();
    }
}

function generarEstadisticas() {
    // Empty state: sin hábitos creados
    const _empty = document.getElementById('stats-empty');
    const _contenido = document.getElementById('stats-contenido');
    if (misHabitos.length === 0) {
        if (_empty) _empty.classList.remove('hidden');
        if (_contenido) _contenido.classList.add('hidden');
        return;
    }
    if (_empty) _empty.classList.add('hidden');
    if (_contenido) _contenido.classList.remove('hidden');

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
    const habitosDelDia = misHabitos.filter(h => aplicaEnDia(h, fechaRef));
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
    generarComparativaSemanal();
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
                    grid: { color: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#f1f5f9' }
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
                    grid: { color: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#f1f5f9' }
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
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-black ${rachaEnRiesgo(habito) ? 'text-amber-500' : 'text-black dark:text-white'}">${racha > 0 ? (rachaEnRiesgo(habito) ? `⚠️ ${racha}` : `🔥 ${racha}`) : '—'}</p>
                    <p class="text-xs font-medium ${rachaEnRiesgo(habito) ? 'text-amber-400' : 'text-slate-400'}">${racha > 0 ? (rachaEnRiesgo(habito) ? '¡complétalo hoy!' : `días${sufijoSemanas(habito)}`) : 'sin racha'}</p>
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
let _mqTemaOscuro = window.matchMedia('(prefers-color-scheme: dark)');

function obtenerTema() {
    let t = localStorage.getItem('habify_tema');
    if (!t) {
        const viejo = localStorage.getItem('habify_modo_oscuro');
        t = viejo === 'true' ? 'oscuro' : (viejo === 'false' ? 'claro' : 'sistema');
    }
    return t;
}

function aplicarTema(reRender) {
    const tema = obtenerTema();
    const oscuro = tema === 'oscuro' || (tema === 'sistema' && _mqTemaOscuro.matches);
    document.documentElement.classList.toggle('dark', oscuro);
    actualizarSelectorTema();

    if (reRender) {
        animarCargaInicial = false;
        renderizarHabitos();
        const calendarioVisible = !document.getElementById('pantalla-calendario').classList.contains('hidden');
        if (calendarioVisible) {
            generarCalendarioMensual();
            generarResumenSemanal();
        }
    }
}

function inicializarModoOscuro() {
    // El <head> ya aplicó la clase para evitar parpadeo; aquí sincronizamos el selector y escuchamos el sistema.
    aplicarTema(false);
    _mqTemaOscuro.addEventListener('change', () => {
        if (obtenerTema() === 'sistema') aplicarTema(true);
    });
}

function setTema(tema) {
    localStorage.setItem('habify_tema', tema);
    aplicarTema(true);
    const panel = document.getElementById('tema-panel');
    const chevron = document.getElementById('tema-chevron');
    if (panel) panel.style.maxHeight = '0px';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
}

function toggleColapsableTema() {
    const panel = document.getElementById('tema-panel');
    const chevron = document.getElementById('tema-chevron');
    if (!panel) return;
    const abierto = panel.style.maxHeight && panel.style.maxHeight !== '0px';
    panel.style.maxHeight = abierto ? '0px' : panel.scrollHeight + 'px';
    if (chevron) chevron.style.transform = abierto ? 'rotate(0deg)' : 'rotate(180deg)';
}

function actualizarSelectorTema() {
    const activo = obtenerTema();
    const etiquetas = { claro: 'Claro', oscuro: 'Oscuro', sistema: 'Sistema' };
    const valor = document.getElementById('tema-valor');
    if (valor) valor.textContent = etiquetas[activo] || 'Sistema';

    const esDark = document.documentElement.classList.contains('dark');
    document.querySelectorAll('.tema-opt').forEach(btn => {
        const sel = btn.dataset.tema === activo;
        btn.style.background = sel ? 'rgba(108,99,255,0.12)' : 'transparent';
        btn.style.color = sel ? '#6C63FF' : (esDark ? 'rgba(255,255,255,0.65)' : '#475569');
        const check = btn.querySelector('.tema-check');
        if (check) check.style.visibility = sel ? 'visible' : 'hidden';
    });
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
    }
    // Si no hay registros ese día, no se crea registro fantasma — la nota simplemente no se guarda

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
            <div style=\"width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:${esHoy ? '#6C63FF' : 'transparent'}; border:${!esHoy && esSeleccionado ? '2px solid #6C63FF' : 'none'}\">
                <span style=\"font-size:13px; font-weight:800; color:${esHoy ? '#fff' : esSeleccionado ? '#6C63FF' : 'inherit'}\">${numeroDia}</span>
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

async function toggleHabitoHoy(id) {
    const habito = misHabitos.find(h => h.id === id);
    if (!habito || !usuarioActual) return;

    const fechaRef = diaSeleccionadoTira || hoyComoTexto();

    if (habito.registros.includes(fechaRef)) {
        const tieneFoto = !!habito.fotos?.[fechaRef];
        if (tieneFoto) {
            const ok = confirm('Al desmarcar este hábito se eliminará la foto guardada para este día. ¿Continuar?');
            if (!ok) return;
            const regId = habito._registroIdMap?.[fechaRef];
            if (regId) await eliminarFotoDeRegistro(regId);
            delete habito.fotos[fechaRef];
        }
        await desmarcarHabitoSupabase(id, fechaRef);
        habito.registros = habito.registros.filter(f => f !== fechaRef);
        sonarUncheck();
    } else {
        const registroId = await marcarHabitoSupabase(id, usuarioActual.id, fechaRef);
        habito.registros.push(fechaRef);
        if (registroId) {
            habito._registroIdMap = habito._registroIdMap || {};
            habito._registroIdMap[fechaRef] = registroId;
        }
        sonarCheck();
        if (registroId) setTimeout(() => abrirSheetFoto(registroId, id, fechaRef), 400);
    }

    animarCargaInicial = false;
    renderizarHabitos();
    verificarDiaPerfecto();

    // Actualizar botón foto si el detalle está abierto
    if (habitoDetalleActual && habitoDetalleActual.id === id) {
        generarUltimosRegistros(habitoDetalleActual);
        actualizarBotonFotoDetalle(habitoDetalleActual);
    }

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
    const total = misHabitos.filter(h => habitoActivoEnFecha(h, fechaStr)).length;

    // Actualizamos el resumen de hoy
    const textoResumen = document.getElementById('texto-resumen-hoy');
    if (textoResumen) {
        if (esHoy) {
            actualizarResumenHoy();
            return;
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

let horasRecordatorioMultiple = ['08:00'];

function actualizarUIRecordatorioPorTipo() {
    const tipo = document.getElementById('habito-tipo')?.value || 'check';
    const unica = document.getElementById('recordatorio-hora-unica');
    const multiple = document.getElementById('recordatorio-horas-multiples');
    if (!unica || !multiple) return;
    if (tipo === 'contador') {
        unica.classList.add('hidden');
        multiple.classList.remove('hidden');
        renderizarListaHorasRecordatorio();
    } else {
        unica.classList.remove('hidden');
        multiple.classList.add('hidden');
    }
}

function renderizarListaHorasRecordatorio() {
    const lista = document.getElementById('lista-horas-recordatorio');
    if (!lista) return;
    lista.innerHTML = '';
    horasRecordatorioMultiple.forEach((hora, i) => {
        lista.innerHTML += `
            <div class="flex items-center gap-2">
                <input type="time" value="${hora}"
                    onchange="horasRecordatorioMultiple[${i}] = this.value"
                    class="flex-1 px-3 py-2.5 bg-white dark:bg-[#2a2a2a] rounded-xl text-sm font-bold text-black dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]">
                ${horasRecordatorioMultiple.length > 1 ? `
                <button type="button" onclick="eliminarHoraRecordatorio(${i})"
                    class="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                    style="background:rgba(244,63,94,0.1); color:#f43f5e;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>` : ''}
            </div>
        `;
    });
}

function agregarHoraRecordatorio() {
    if (horasRecordatorioMultiple.length >= 8) return;
    horasRecordatorioMultiple.push('12:00');
    renderizarListaHorasRecordatorio();
}

function eliminarHoraRecordatorio(i) {
    horasRecordatorioMultiple.splice(i, 1);
    renderizarListaHorasRecordatorio();
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
        actualizarUIRecordatorioPorTipo();
        solicitarPermisoNotificaciones();
    } else {
        btn.style.background = '';
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
            return;
        }
    }
    // Permiso concedido → registrar este dispositivo para push
    suscribirPush();
}

function programarRecordatorios() {
    console.log('programarRecordatorios llamado', { misHabitos: misHabitos?.length, swRegistration: !!swRegistration });
    if (!misHabitos || !swRegistration) return;

    const recordatorios = [];

    misHabitos.forEach(habito => {
        if (!habito.recordatorio) return;
        console.log('Hábito con recordatorio:', habito.nombre, habito.recordatorio);
        if (habito.tipo !== 'contador' && completadoHoy(habito)) return;

        let horas = [];
        try {
            const parsed = JSON.parse(habito.recordatorio);
            horas = Array.isArray(parsed) ? parsed : [habito.recordatorio];
        } catch {
            horas = [habito.recordatorio];
        }

        horas.forEach(hora => {
            recordatorios.push({
                nombre: habito.nombre,
                emoji: habito.emoji,
                hora,
                esContador: habito.tipo === 'contador',
                unidad: habito.unidad || ''
            });
        });
    });

    console.log('Recordatorios a programar:', recordatorios);
    console.log('SW active:', swRegistration.active);

    if (swRegistration.active) {
        swRegistration.active.postMessage({
            type: 'PROGRAMAR_RECORDATORIOS',
            recordatorios
        });
        console.log('Mensaje enviado al SW');
    } else {
        console.warn('SW no está activo todavía');
    }
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

    const glow = `0 6px 24px ${color}45, 0 2px 8px ${color}30`;

    if (tipo === 'check') {
        btnCheck.style.background = color;
        btnCheck.style.color = 'white';
        btnCheck.style.borderColor = color;
        btnCheck.style.boxShadow = glow;
        btnContador.style.background = 'transparent';
        btnContador.style.color = '';
        btnContador.style.borderColor = '';
        btnContador.style.boxShadow = '';
        configContador.classList.add('hidden');
    } else {
        btnContador.style.background = color;
        btnContador.style.color = 'white';
        btnContador.style.borderColor = color;
        btnContador.style.boxShadow = glow;
        btnCheck.style.background = 'transparent';
        btnCheck.style.color = '';
        btnCheck.style.borderColor = '';
        btnCheck.style.boxShadow = '';
        configContador.classList.remove('hidden');
    }
    // Actualizar UI de recordatorio según tipo
    if (recordatorioActivo) actualizarUIRecordatorioPorTipo();
}

function actualizarContador(input) {
    document.getElementById('contador-caracteres').innerText = `${input.value.length}/30`;
}

function seleccionarColor(color, btn) {
    colorSeleccionado = color;
    document.getElementById('habito-color').value = color;
    document.getElementById('btn-crear-habito').style.background = color;
    document.getElementById('btn-crear-habito').style.boxShadow = `0 6px 24px ${color}40, 0 2px 8px ${color}25`;

    // Actualizar botones de tipo con el nuevo color
    const tipoActual = document.getElementById('habito-tipo').value;
    seleccionarTipoHabito(tipoActual);

    // Actualizar días seleccionados con el nuevo color
    document.querySelectorAll('.dia-semana-btn').forEach(btn => {
        const dia = parseInt(btn.dataset.dia);
        if (diasSeleccionados.includes(dia)) {
            btn.style.background = color;
            btn.style.borderColor = color;
        }
    });

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
    const emojiSeleccionadoActual = document.getElementById('habito-emoji').value;
    emojis.forEach(({ e, n }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-2xl active:scale-90 transition-all emoji-cat-btn btn-shadow';
        btn.innerHTML = e;
        btn.onclick = () => {
            document.getElementById('habito-emoji').value = e;
            document.getElementById('emoji-preview').innerText = e;
            document.getElementById('emoji-nombre-preview').innerText = n;
            document.querySelectorAll('.emoji-cat-btn').forEach(b => {
                b.style.background = '';
                b.style.outline = 'none';
                b.classList.add('bg-slate-100');
            });
            const color = document.getElementById('habito-color').value || '#6C63FF';
            btn.style.background = color + '30';
            btn.style.outline = `2px solid ${color}`;
            btn.style.outlineOffset = '0px';
        };
        fila.appendChild(btn);
        if (e === emojiSeleccionadoActual) {
            const color = document.getElementById('habito-color').value || '#6C63FF';
            btn.style.background = color + '30';
            btn.style.outline = `2px solid ${color}`;
            btn.style.outlineOffset = '0px';
        }
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

    const recordatorio = recordatorioActivo
        ? (document.getElementById('habito-tipo').value === 'contador'
            ? JSON.stringify(horasRecordatorioMultiple)
            : document.getElementById('recordatorio-hora').value)
        : null;
    const tipo = document.getElementById('habito-tipo').value;
    const unidad = tipo === 'contador' ? document.getElementById('habito-unidad').value.trim() : null;
    const metaCantidad = tipo === 'contador' ? parseInt(document.getElementById('habito-meta-cantidad').value) : null;

    if (tipo === 'contador' && (!metaCantidad || !unidad)) {
        mostrarError('Ingresa la meta diaria y la unidad del contador.');
        btn.innerText = 'Crear hábito →';
        btn.disabled = false;
        return;
    }

    const diasSemanaStr = diasSeleccionados.length > 0 ? diasSeleccionados.join(',') : null;
    const resultado = await crearHabitoSupabase(
        usuarioActual.id, nombre, emoji, meta, hoyComoTexto(), color, recordatorio, tipo, unidad, metaCantidad, diasSemanaStr
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
        cantidades: {},
        horas: {},
        diasSemana: resultado.habito.dias_semana
            ? resultado.habito.dias_semana.split(',').map(Number)
            : []
    };

    misHabitos.push(nuevoHabito);
    sonarCrearHabito();
    renderizarHabitos();
    actualizarResumenHoy();

    // Restaurar el botón para el próximo hábito
    btn.innerText = 'Crear hábito →';
    btn.disabled = false;

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
    generarPatronDias(habito);
    generarMapaActividad(habito);
    generarUltimosRegistros(habito);
    actualizarBotonFotoDetalle(habito);
    renderizarRecordatoriosDetalle(habito);

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

    // Precargar tipo
    seleccionarTipoHabito(habito.tipo || 'check');
    // Precargar días
    precargarDiasSemana(habito.diasSemana || [], habito.color || '#6C63FF');
    if (habito.tipo === 'contador') {
        if (habito.metaCantidad) document.getElementById('habito-meta-cantidad').value = habito.metaCantidad;
        if (habito.unidad) document.getElementById('habito-unidad').value = habito.unidad;
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
    const tipo = document.getElementById('habito-tipo').value;
    const unidad = document.getElementById('habito-unidad')?.value.trim() || null;
    const metaCantidad = tipo === 'contador' ? parseInt(document.getElementById('habito-meta-cantidad')?.value) || null : null;

    if (!nombre) {
        document.getElementById('habito-nombre').focus();
        document.getElementById('habito-nombre').classList.add('ring-2', 'ring-red-400');
        setTimeout(() => document.getElementById('habito-nombre').classList.remove('ring-2', 'ring-red-400'), 1500);
        return;
    }

    const btn = document.getElementById('btn-crear-habito');
    btn.innerText = 'Guardando...';
    btn.disabled = true;

    const recordatorio = recordatorioActivo
        ? (document.getElementById('habito-tipo').value === 'contador'
            ? JSON.stringify(horasRecordatorioMultiple)
            : document.getElementById('recordatorio-hora').value)
        : null;
    const diasSemanaStr = diasSeleccionados.length > 0 ? diasSeleccionados.join(',') : null;
    const resultado = await editarHabitoSupabase(habitoDetalleActual.id, nombre, emoji, meta, color, recordatorio, tipo, unidad, metaCantidad, diasSemanaStr);

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
        habito.tipo = tipo;
        habito.unidad = unidad;
        habito.metaCantidad = metaCantidad;
        habito.diasSemana = diasSeleccionados.length > 0 ? [...diasSeleccionados] : [];
        habitoDetalleActual = habito;
    }

    const idHabitoEditado = habitoDetalleActual.id;
    modoEdicion = false;
    cerrarPantallaAnimada('pantalla-crear-habito', () => {
        document.querySelector('#pantalla-crear-habito h2').innerText = 'Nuevo hábito';
        const btnCrear = document.getElementById('btn-crear-habito');
        btnCrear.onclick = crearHabitoNuevo;
        btnCrear.disabled = false;
        renderizarHabitos();
        actualizarResumenHoy();
        abrirDetalleHabito(idHabitoEditado);
    });
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
    const esDark = document.documentElement.classList.contains('dark');
    const hoy = hoyComoTexto();

    registros.forEach((fecha, index) => {
        const d = new Date(fecha + 'T00:00:00');
        const esHoy = fecha === hoy;
        const etiqueta = esHoy ? 'Hoy' : `${diasSemana[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]}`;
        const fotoUrl = habito.fotos?.[fecha];
        const registroId = habito._registroIdMap?.[fecha];

        if (fotoUrl && esHoy) {
            // Foto de HOY — card grande
            contenedor.innerHTML += `
                <div class="rounded-[20px] overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
                     onclick="abrirVisorFoto('${fotoUrl}', '${habito.emoji} ${habito.nombre}', '${fecha}', '${registroId}', '${habito.id}')">
                    <div class="relative w-full" style="height:220px;">
                        <img src="${fotoUrl}" class="w-full h-full object-cover">
                        <div class="absolute inset-0" style="background:linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%);"></div>
                        <div class="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                            <div>
                                <p class="text-white text-xs font-black uppercase tracking-wider opacity-70">Hoy</p>
                                <p class="text-white text-sm font-bold mt-0.5">${habito.emoji} ${habito.nombre}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="event.stopPropagation(); abrirSheetFoto('${registroId}', '${habito.id}', '${fecha}')"
                                    class="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white active:scale-90 transition-all"
                                    style="background:rgba(255,255,255,0.2); backdrop-filter:blur(8px);">
                                    Cambiar
                                </button>
                                <button onclick="event.stopPropagation(); eliminarFotoRegistroDirecto('${registroId}', '${habito.id}', '${fecha}')"
                                    class="px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-300 active:scale-90 transition-all"
                                    style="background:rgba(244,63,94,0.2); backdrop-filter:blur(8px);">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Registro normal — con o sin thumbnail pequeño
            const thumbHtml = fotoUrl ? `
                <img src="${fotoUrl}"
                     class="w-10 h-10 rounded-xl object-cover flex-shrink-0 active:scale-95 transition-all cursor-pointer"
                     onclick="abrirVisorFoto('${fotoUrl}', '${habito.emoji} ${habito.nombre}', '${fecha}', '${registroId}', '${habito.id}')"
                     style="border:2px solid ${color}40;">
            ` : '';
            contenedor.innerHTML += `
                <div class="flex items-center gap-3 px-4 py-3 rounded-2xl"
                     style="background:${esDark ? '#1a1a1a' : color+'10'}; border:1px solid ${esDark ? 'rgba(255,255,255,0.10)' : color+'20'};">
                    <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color}"></div>
                    <p class="text-sm font-bold text-black dark:text-white flex-1">${etiqueta}</p>
                    ${thumbHtml}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            `;
        }
    });
}
async function eliminarFotoRegistroDirecto(registroId, habitoId, fecha) {
    if (!confirm('¿Eliminar esta foto?')) return;
    await eliminarFotoDeRegistro(registroId);
    const habito = misHabitos.find(h => h.id === habitoId);
    if (habito && habito.fotos) delete habito.fotos[fecha];
    generarUltimosRegistros(habito);
    actualizarBotonFotoDetalle(habito);
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
            let huboDiaConHabitos = false;
            for (let i = 0; i < 7; i++) {
                const d = new Date(hoy);
                d.setDate(hoy.getDate() - i);
                const fecha = fechaComoTexto(d.getFullYear(), d.getMonth(), d.getDate());
                const existian = misHabitos.filter(h => (h.fechaCreacion || '').slice(0, 10) <= fecha);
                if (existian.length === 0) return false;               // no tenías hábitos ese día → aún no hay semana perfecta
                const habitosDelDia = existian.filter(h => habitoActivoEnFecha(h, fecha));
                if (habitosDelDia.length === 0) continue;              // existían pero ninguno tocaba ese día → no rompe
                huboDiaConHabitos = true;
                const todosCompletados = habitosDelDia.every(h => h.registros.includes(fecha));
                if (!todosCompletados) return false;
            }
            return huboDiaConHabitos;
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
                const existian = misHabitos.filter(h => (h.fechaCreacion || '').slice(0, 10) <= fecha);
                if (existian.length === 0) continue;                   // antes de tener hábitos → no cuenta para los 30 días
                const habitosDelDia = existian.filter(h => habitoActivoEnFecha(h, fecha));
                if (habitosDelDia.length === 0) { diasCumplidos++; continue; } // existían pero ninguno tocaba → día cumplido
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
// DÍA PERFECTO
// ============================================================
function verificarDiaPerfecto() {
    const hoy = hoyComoTexto();
    const yaVisto = localStorage.getItem('habify_dia_perfecto') === hoy;
    if (yaVisto) return;

    const habitosHoy = misHabitos.filter(h => aplicaEnDia(h, hoy));
    if (habitosHoy.length === 0) return;

    const todosCompletos = habitosHoy.every(h => h.registros.includes(hoy));
    if (!todosCompletos) return;

    // Poblar stats
    document.getElementById('dia-perfecto-total').innerText = habitosHoy.length;
    const rachaMax = misHabitos.reduce((max, h) => Math.max(max, calcularRacha(h)), 0);
    document.getElementById('dia-perfecto-racha').innerText = rachaMax > 0 ? `🔥 ${rachaMax}` : '—';

    sonarDiaPerfecto();

    // Lanzar confetti
    const contenedor = document.getElementById('dia-perfecto-confetti');
    contenedor.innerHTML = '';

    // Inyectar estilos de confetti solo una vez
    if (!document.getElementById('dp-confetti-styles')) {
        const colors = ['#6C63FF','#a78bfa','#ffffff','#c4b5fd','#818cf8'];
        let keyframes = '';
        for (let i = 0; i < 38; i++) {
            keyframes += `@keyframes dpConfetti${i} {
                0%   { transform:translateY(0) rotate(0deg);   opacity:1; }
                80%  { opacity:0.6; }
                100% { transform:translateY(560px) rotate(${Math.floor(Math.random()*360)}deg); opacity:0; }
            }`;
        }
        const styleEl = document.createElement('style');
        styleEl.id = 'dp-confetti-styles';
        styleEl.textContent = keyframes;
        document.head.appendChild(styleEl);
    }

    const colors = ['#6C63FF','#a78bfa','#ffffff','#c4b5fd','#818cf8'];
    for (let i = 0; i < 38; i++) {
        const el = document.createElement('div');
        const size = Math.random() * 6 + 4;
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = Math.random() * 2 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        el.style.cssText = `
            position:absolute; width:${size}px; height:${size}px;
            background:${color}; left:${left}%;  top:-10px; opacity:0;
            border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
            animation:dpConfetti${i} ${duration}s ${delay}s ease-in infinite;
        `;
        contenedor.appendChild(el);
    }

    // Adaptar colores al modo actual
    const esDark = document.documentElement.classList.contains('dark');
    const tarjeta = document.querySelector('#pantalla-dia-perfecto > div');
    tarjeta.style.background = esDark ? '#000' : '#ffffff';
    tarjeta.style.borderColor = esDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    // Título grande
    const titulo = document.querySelector('#pantalla-dia-perfecto p[style*="26px"]');
    if (titulo) titulo.style.color = esDark ? '#ffffff' : '#0f0f0f';

    // Subtítulo "Todos tus hábitos..."
    const subtitulo = document.querySelector('#pantalla-dia-perfecto p[style*="13px"]');
    if (subtitulo) subtitulo.style.color = esDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)';

    // Labels de mini-cards
    const labelColor = esDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
    document.getElementById('dia-perfecto-label-1').style.color = labelColor;
    document.getElementById('dia-perfecto-label-2').style.color = labelColor;

    // Fondos de mini-cards
    const cardBg = esDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const cardBorder = esDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    document.getElementById('dia-perfecto-card-1').style.background = cardBg;
    document.getElementById('dia-perfecto-card-1').style.borderColor = cardBorder;
    document.getElementById('dia-perfecto-card-2').style.background = cardBg;
    document.getElementById('dia-perfecto-card-2').style.borderColor = cardBorder;

    // Mostrar pantalla
    const pantalla = document.getElementById('pantalla-dia-perfecto');
    pantalla.classList.remove('hidden');
    pantalla.style.opacity = '0';
    pantalla.style.transition = 'opacity 0.4s ease';
    setTimeout(() => { pantalla.style.opacity = '1'; }, 10);

    localStorage.setItem('habify_dia_perfecto', hoy);
}

function cerrarDiaPerfecto() {
    const pantalla = document.getElementById('pantalla-dia-perfecto');
    pantalla.style.opacity = '0';
    setTimeout(() => {
        pantalla.classList.add('hidden');
        pantalla.style.opacity = '';
        pantalla.style.transition = '';
    }, 350);
}

// ============================================================
// RESUMEN SEMANAL INTELIGENTE
// ============================================================
let offsetSemanaResumen = 0; // 0 = semana actual, -1 = semana anterior, etc.

function navegarResumenSemanal(dir) {
    const nuevoOffset = offsetSemanaResumen + dir;
    if (nuevoOffset > 0) return;
    offsetSemanaResumen = nuevoOffset;
    generarResumenSemanal();
}

function generarResumenSemanal() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7) + (offsetSemanaResumen * 7));
    lunes.setHours(0, 0, 0, 0);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    // Rango de fechas de la semana
    const fechasDias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        fechasDias.push(fechaComoTexto(d.getFullYear(), d.getMonth(), d.getDate()));
    }

    // Header — rango legible
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mismoMes = lunes.getMonth() === domingo.getMonth();
    const rango = mismoMes
        ? `${lunes.getDate()} – ${domingo.getDate()} de ${meses[domingo.getMonth()]}`
        : `${lunes.getDate()} ${meses[lunes.getMonth()]} – ${domingo.getDate()} ${meses[domingo.getMonth()]}`;
    document.getElementById('resumen-semana-rango').innerText = rango;

    // Botón siguiente — solo activo si no estamos en semana actual
    const btnSig = document.getElementById('resumen-btn-siguiente');
    if (offsetSemanaResumen < 0) {
        btnSig.disabled = false;
        btnSig.classList.remove('opacity-35');
    } else {
        btnSig.disabled = true;
        btnSig.classList.add('opacity-35');
    }

    // Solo contar días que ya ocurrieron
    const hoyStr = hoyComoTexto();
    const diasPasados = fechasDias.filter(f => f <= hoyStr);

    // Métricas globales
    let totalPosible = 0;
    let totalHechos = 0;
    const conteoPorDia = {};

    diasPasados.forEach(fecha => {
        const habitosDelDia = misHabitos.filter(h => h.fechaCreacion <= fecha);
        totalPosible += habitosDelDia.length;
        const hechos = habitosDelDia.filter(h => h.registros.includes(fecha)).length;
        totalHechos += hechos;
        conteoPorDia[fecha] = hechos;
    });

    const porcentaje = totalPosible === 0 ? 0 : Math.round((totalHechos / totalPosible) * 100);
    document.getElementById('resumen-porcentaje').innerText = `${porcentaje}%`;
    document.getElementById('resumen-fraccion').innerText = `${totalHechos} de ${totalPosible} posibles`;

    // Mejor día
    let mejorFecha = null;
    let mejorCount = 0;
    Object.entries(conteoPorDia).forEach(([fecha, count]) => {
        if (count > mejorCount) { mejorCount = count; mejorFecha = fecha; }
    });
    const diasNombre = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    if (mejorFecha) {
        const d = new Date(mejorFecha + 'T00:00:00');
        document.getElementById('resumen-mejor-dia').innerText = diasNombre[d.getDay()];
        document.getElementById('resumen-mejor-dia-count').innerText = `${mejorCount} hábitos completados`;
    } else {
        document.getElementById('resumen-mejor-dia').innerText = '—';
        document.getElementById('resumen-mejor-dia-count').innerText = 'sin datos aún';
    }

    // Lista por hábito
    const lista = document.getElementById('resumen-lista-habitos');
    lista.innerHTML = '';
    const esDark = document.documentElement.classList.contains('dark');

    misHabitos.forEach(habito => {
        const color = habito.color || '#6C63FF';
        const diasConHabito = diasPasados.filter(f => habito.fechaCreacion <= f);
        if (diasConHabito.length === 0) return;
        const hechos = diasConHabito.filter(f => habito.registros.includes(f)).length;
        const pct = Math.round((hechos / diasConHabito.length) * 100);

        lista.innerHTML += `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:18px; flex-shrink:0;">${habito.emoji}</span>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <p style="font-size:12px; font-weight:700; color:${esDark ? 'white' : '#0f0f0f'}; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;">${habito.nombre}</p>
                        <p style="font-size:12px; font-weight:700; color:${color}; margin:0; flex-shrink:0;">${hechos}/${diasConHabito.length}</p>
                    </div>
                    <div style="height:5px; background:${esDark ? '#2a2a2a' : '#f1f5f9'}; border-radius:99px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:${color}; border-radius:99px; transition:width 0.4s ease;"></div>
                    </div>
                </div>
            </div>
        `;
    });

    // Insights
    const insights = document.getElementById('resumen-insights');
    insights.innerHTML = '';
    if (misHabitos.length === 0 || diasPasados.length === 0) return;

    // Mejor hábito
    let mejorHabito = null, mejorPct = -1;
    // Peor hábito
    let peorHabito = null, peorPct = 101;

    misHabitos.forEach(habito => {
        const diasConHabito = diasPasados.filter(f => habito.fechaCreacion <= f);
        if (diasConHabito.length === 0) return;
        const hechos = diasConHabito.filter(f => habito.registros.includes(f)).length;
        const pct = hechos / diasConHabito.length;
        if (pct > mejorPct) { mejorPct = pct; mejorHabito = habito; }
        if (pct < peorPct) { peorPct = pct; peorHabito = habito; }
    });

    if (mejorHabito) {
        insights.innerHTML += `
            <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(108,99,255,0.06); border-radius:12px; border:1px solid rgba(108,99,255,0.15);">
                <span style="font-size:15px; flex-shrink:0;">⭐</span>
                <p style="font-size:12px; font-weight:600; color:${esDark ? 'rgba(255,255,255,0.85)' : '#0f0f0f'}; margin:0; line-height:1.4;">${mejorHabito.emoji} <strong>${mejorHabito.nombre}</strong> fue tu hábito más constante esta semana</p>
            </div>
        `;
    }
    if (peorHabito && peorHabito.id !== mejorHabito?.id) {
        const diasConPeor = diasPasados.filter(f => peorHabito.fechaCreacion <= f);
        const hechosPeor = diasConPeor.filter(f => peorHabito.registros.includes(f)).length;
        insights.innerHTML += `
            <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(239,68,68,0.05); border-radius:12px; border:1px solid rgba(239,68,68,0.15);">
                <span style="font-size:15px; flex-shrink:0;">⚠️</span>
                <p style="font-size:12px; font-weight:600; color:${esDark ? 'rgba(255,255,255,0.85)' : '#0f0f0f'}; margin:0; line-height:1.4;">${peorHabito.emoji} <strong>${peorHabito.nombre}</strong> necesita más atención — solo ${hechosPeor} de ${diasConPeor.length} días</p>
            </div>
        `;
    }
}

// ============================================================
// COMPARATIVA SEMANAL
// ============================================================
function generarComparativaSemanal() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();

    // Semana actual — lunes a hoy
    const lunesActual = new Date(hoy);
    lunesActual.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
    lunesActual.setHours(0, 0, 0, 0);

    const domingoActual = new Date(lunesActual);
    domingoActual.setDate(lunesActual.getDate() + 6);

    // Semana anterior — lunes a domingo previo
    const lunesAnterior = new Date(lunesActual);
    lunesAnterior.setDate(lunesActual.getDate() - 7);
    const domingoAnterior = new Date(lunesActual);
    domingoAnterior.setDate(lunesActual.getDate() - 1);

    const hoyStr = hoyComoTexto();

    function contarSemana(inicio, fin) {
        let total = 0;
        const d = new Date(inicio);
        while (d <= fin) {
            const fechaStr = fechaComoTexto(d.getFullYear(), d.getMonth(), d.getDate());
            if (fechaStr > hoyStr) break;
            misHabitos.forEach(h => {
                if (h.registros.includes(fechaStr)) total++;
            });
            d.setDate(d.getDate() + 1);
        }
        return total;
    }

    const actual = contarSemana(lunesActual, domingoActual);
    const anterior = contarSemana(lunesAnterior, domingoAnterior);
    const diff = actual - anterior;
    const pct = anterior === 0 ? 0 : Math.round(Math.abs(diff / anterior) * 100);
    const sube = diff >= 0;

    // Rango
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mismoMes = lunesActual.getMonth() === domingoActual.getMonth();
    const rango = mismoMes
        ? `${lunesActual.getDate()} – ${domingoActual.getDate()} de ${meses[domingoActual.getMonth()]}`
        : `${lunesActual.getDate()} ${meses[lunesActual.getMonth()]} – ${domingoActual.getDate()} ${meses[domingoActual.getMonth()]}`;

    document.getElementById('comparativa-rango').innerText = rango;
    document.getElementById('comparativa-actual').innerText = actual;
    document.getElementById('comparativa-anterior').innerText = anterior;

    const colorSube = '#16a34a';
    const colorBaja = '#dc2626';
    const color = sube ? colorSube : colorBaja;

    const icono = document.getElementById('comparativa-icono');
    icono.style.background = sube ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)';
    icono.innerHTML = sube
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colorSube}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colorBaja}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 9 12 15 6 9"/></svg>`;

    const diffEl = document.getElementById('comparativa-diff');
    diffEl.style.color = color;
    diffEl.innerText = diff === 0 ? 'Sin cambio' : `${sube ? '+' : ''}${diff} hábitos`;

    document.getElementById('comparativa-pct').innerText = anterior === 0
        ? 'Primera semana con datos'
        : `${sube ? '+' : '-'}${pct}% respecto a la semana pasada`;

    const msgBox = document.getElementById('comparativa-mensaje');
    const msgTexto = document.getElementById('comparativa-mensaje-texto');
    if (sube) {
        msgBox.style.background = 'rgba(34,197,94,0.06)';
        msgBox.style.border = '0.5px solid rgba(34,197,94,0.2)';
        msgTexto.style.color = '#15803d';
        msgTexto.innerText = diff === 0
            ? 'Mismo ritmo que la semana pasada. ¡Consistencia es clave! 💪'
            : '¡Vas mejor que la semana pasada! Mantén el ritmo 💪';
    } else {
        msgBox.style.background = 'rgba(239,68,68,0.05)';
        msgBox.style.border = '0.5px solid rgba(239,68,68,0.15)';
        msgTexto.style.color = '#b91c1c';
        msgTexto.innerText = 'Esta semana va un poco más lento. ¡Aún estás a tiempo de revertirlo! 🔥';
    }
}
// ============================================================
// PATRÓN DE DÍAS POR HÁBITO
// ============================================================
function generarPatronDias(habito) {
    const grid = document.getElementById('patron-dias-grid');
    const insightTexto = document.getElementById('patron-dias-insight-texto');
    if (!grid || !insightTexto) return;

    const color = habito.color || '#6C63FF';
    const esDark = document.documentElement.classList.contains('dark');
    const diasNombre = ['D','L','M','M','J','V','S'];
    const conteo = [0,0,0,0,0,0,0]; // índice 0=Dom, 1=Lun ... 6=Sáb

    habito.registros.forEach(fecha => {
        const d = new Date(fecha + 'T00:00:00');
        conteo[d.getDay()]++;
    });

    const maximo = Math.max(...conteo, 1);

    grid.innerHTML = '';
    conteo.forEach((count, i) => {
        const altura = Math.round((count / maximo) * 48);
        const esMejor = count === maximo && count > 0;
        const opacidad = count === 0 ? 0.15 : 0.2 + (count / maximo) * 0.8;

        grid.innerHTML += `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:5px;">
                <div style="width:100%; height:48px; border-radius:8px; background:${color}18; display:flex; align-items:flex-end;">
                    <div style="width:100%; height:${Math.max(altura, count > 0 ? 6 : 0)}px; border-radius:8px; background:${color}; opacity:${opacidad.toFixed(2)};"></div>
                </div>
                <p style="font-size:11px; font-weight:${esMejor ? '800' : '600'}; color:${esMejor ? color : (esDark ? 'rgba(255,255,255,0.4)' : '#94a3b8')}; margin:0;">${diasNombre[i]}</p>
                <p style="font-size:10px; color:${esDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'}; margin:0; font-weight:600;">${count}x</p>
            </div>
        `;
    });

    // Insight — mejor y peor día
    if (habito.registros.length === 0) {
        insightTexto.innerText = 'Aún no hay suficientes datos para detectar un patrón.';
        return;
    }

    const diasNombreCompleto = ['domingos','lunes','martes','miércoles','jueves','viernes','sábados'];
    const mejorIdx = conteo.indexOf(Math.max(...conteo));
    const diasConDatos = conteo.filter(c => c > 0);
    
    let insight = `💡 Eres más constante los ${diasNombreCompleto[mejorIdx]}`;

    if (diasConDatos.length > 1) {
        const minVal = Math.min(...conteo.filter(c => c > 0));
        const peorIdx = conteo.indexOf(minVal);
        if (peorIdx !== mejorIdx) {
            insight += ` — intenta reforzar los ${diasNombreCompleto[peorIdx]}`;
        }
    }

    insightTexto.innerText = insight;
}
// ============================================================
// SELECTOR DE DÍAS DE LA SEMANA
// ============================================================
let diasSeleccionados = [];

function toggleDiaSemana(dia, btn) {
    const color = document.getElementById('habito-color').value || '#6C63FF';
    const idx = diasSeleccionados.indexOf(dia);

    if (idx === -1) {
        diasSeleccionados.push(dia);
        btn.style.background = color;
        btn.style.color = 'white';
        btn.style.borderColor = color;
    } else {
        diasSeleccionados.splice(idx, 1);
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }

    const slider = document.getElementById('slider-meta');
    const container = document.getElementById('slider-meta-container');

    if (diasSeleccionados.length > 0) {
        // Bloquear slider y ajustar meta
        slider.value = diasSeleccionados.length;
        slider.disabled = true;
        container.style.opacity = '0.4';
        container.style.pointerEvents = 'none';
        document.getElementById('habito-meta').value = diasSeleccionados.length;
        actualizarSliderMeta(diasSeleccionados.length);
    } else {
        // Desbloquear slider
        slider.disabled = false;
        container.style.opacity = '1';
        container.style.pointerEvents = '';
    }
}

function resetearSelectorDias() {
    diasSeleccionados = [];
    document.querySelectorAll('.dia-semana-btn').forEach(btn => {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    });
    const slider = document.getElementById('slider-meta');
    const container = document.getElementById('slider-meta-container');
    if (slider) slider.disabled = false;
    if (container) { container.style.opacity = '1'; container.style.pointerEvents = ''; }
}

function precargarDiasSemana(dias, color) {
    diasSeleccionados = [...dias];
    document.querySelectorAll('.dia-semana-btn').forEach(btn => {
        const dia = parseInt(btn.dataset.dia);
        if (dias.includes(dia)) {
            btn.style.background = color;
            btn.style.color = 'white';
            btn.style.borderColor = color;
        } else {
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
        }
    });
}
// ─── FAQ ───────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: '¿Cómo creo un hábito?',
    a: 'Toca el botón "+" en la esquina inferior derecha de la pantalla de inicio. Ponle un nombre, elige un color, un icono y configura los días en que quieres realizarlo.'
  },
  {
    q: '¿Qué diferencia hay entre un hábito normal y uno de contador?',
    a: 'Un hábito normal se marca como hecho o no hecho. Un hábito de contador tiene una meta numérica diaria (ej. tomar 8 vasos de agua) y puedes ir sumando avances parciales durante el día.'
  },
  {
    q: '¿Cómo funcionan las rachas?',
    a: 'La racha cuenta los días consecutivos que completas un hábito. Empieza a mostrarse a partir del tercer día seguido. Si un día no lo completas, la racha se reinicia.'
  },
  {
    q: '¿Qué es el "día en riesgo"?',
    a: 'Si ayer no completaste un hábito, aparece un indicador ámbar de "en riesgo". Es una señal de que tu racha puede estar en peligro, para que no pierdas el ritmo.'
  },
  {
    q: '¿Para qué sirven los días de la semana en un hábito?',
    a: 'Puedes configurar un hábito para que solo aplique ciertos días. Por ejemplo, "ejercicio" solo de lunes a viernes. En los días que no aplica, el hábito no cuenta ni afecta tus estadísticas.'
  },
  {
    q: '¿Cómo funciona el sistema de logros?',
    a: 'Habify tiene 12 logros que se desbloquean automáticamente conforme usas la app: completar tu primer hábito, mantener rachas largas, alcanzar días perfectos y más. Puedes verlos todos en "Mis logros".'
  },
  {
    q: '¿Puedo agregar fotos a mis hábitos?',
    a: 'Sí. Al marcar un hábito como completado, puedes tomar una foto o elegir una de tu galería como recuerdo. Todas tus fotos se guardan y puedes verlas en "Mis fotos" dentro de tu perfil.'
  },
  {
    q: '¿Cómo cambio el orden de mis hábitos?',
    a: 'Mantén presionado cualquier tarjeta de hábito y arrástrala a la posición que quieras. El nuevo orden se guarda automáticamente.'
  },
  {
    q: '¿Qué es un "día perfecto"?',
    a: 'Un día perfecto ocurre cuando completas todos tus hábitos del día. Habify lo celebra con una pantalla especial y confeti. ¡Intenta conseguir uno!'
  },
  {
    q: '¿Mis datos se guardan en la nube?',
    a: 'Sí. Habify usa Supabase para guardar todos tus hábitos, registros y fotos de forma segura en la nube. Puedes acceder desde cualquier dispositivo con tu cuenta.'
  }
];

function abrirFAQ() {
    const pantalla = document.getElementById('pantalla-faq');
    const lista = document.getElementById('faq-lista');

    // Render items si aún no están
    if (!lista.hasChildNodes()) {
        lista.innerHTML = FAQ_ITEMS.map((item, i) => `
            <div class="bg-slate-100 dark:bg-[#1a1a1a] rounded-2xl border border-transparent dark:border-white/10 card-shadow overflow-hidden">
                <button onclick="toggleFAQ(${i})" class="w-full flex items-center justify-between px-4 py-4 text-left active:opacity-70 transition-opacity gap-3">
                    <span class="text-sm font-bold text-black dark:text-white leading-snug">${item.q}</span>
                    <svg id="faq-chevron-${i}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-slate-400 transition-transform duration-200"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div id="faq-respuesta-${i}" class="hidden px-4 pb-4">
                    <p class="text-sm text-slate-500 dark:text-white/50 font-medium leading-relaxed">${item.a}</p>
                </div>
            </div>
        `).join('');
    }

    pantalla.classList.remove('hidden');
    requestAnimationFrame(() => {
        pantalla.style.transform = 'translateY(0)';
        pantalla.style.transition = 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)';
    });
}

function cerrarFAQ() {
    const pantalla = document.getElementById('pantalla-faq');
    pantalla.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
    pantalla.style.transform = 'translateY(100%)';
    setTimeout(() => pantalla.classList.add('hidden'), 300);
}

function toggleFAQ(index) {
    const respuesta = document.getElementById(`faq-respuesta-${index}`);
    const chevron = document.getElementById(`faq-chevron-${index}`);
    const abierto = !respuesta.classList.contains('hidden');
    respuesta.classList.toggle('hidden', abierto);
    chevron.style.transform = abierto ? 'rotate(0deg)' : 'rotate(180deg)';
}
// ============================================================
// SPLASH SCREEN
// ============================================================
function ocultarSplash() {
    const splash = document.getElementById('pantalla-splash');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => splash.classList.add('hidden'), 520);
}
// ============================================================
// TUTORIAL ONBOARDING
// ============================================================
let tutorialPaso = 0;
const TUTORIAL_TOTAL = 5;

function mostrarTutorialSiEsNecesario() {
    if (localStorage.getItem('habify_tutorial_visto')) return;
    tutorialPaso = 0;
    actualizarTutorial();
    const pantalla = document.getElementById('pantalla-tutorial');
    pantalla.classList.remove('hidden');
    pantalla.style.opacity = '0';
    requestAnimationFrame(() => {
        pantalla.style.transition = 'opacity 0.4s ease';
        pantalla.style.opacity = '1';
    });
}

function actualizarTutorial() {
    const slides = document.getElementById('tutorial-slides');
    slides.style.transform = `translateX(-${tutorialPaso * 100}%)`;

    for (let i = 0; i < TUTORIAL_TOTAL; i++) {
        const dot = document.getElementById(`tutorial-dot-${i}`);
        if (!dot) continue;
        if (i === tutorialPaso) {
            dot.style.width = '20px';
            dot.style.background = '#6C63FF';
        } else {
            dot.style.width = '8px';
            dot.style.background = 'rgba(255,255,255,0.2)';
        }
    }

    const btnSiguiente = document.getElementById('tutorial-btn-siguiente');
    const btnSaltar = document.getElementById('tutorial-btn-saltar');
    const esUltimo = tutorialPaso === TUTORIAL_TOTAL - 1;
    btnSiguiente.textContent = esUltimo ? '¡Empezar! 🚀' : 'Siguiente →';
    btnSaltar.style.opacity = esUltimo ? '0' : '1';
    btnSaltar.style.pointerEvents = esUltimo ? 'none' : '';
}

function tutorialSiguiente() {
    if (tutorialPaso < TUTORIAL_TOTAL - 1) {
        tutorialPaso++;
        actualizarTutorial();
    } else {
        cerrarTutorial();
    }
}

function cerrarTutorial() {
    localStorage.setItem('habify_tutorial_visto', '1');
    const pantalla = document.getElementById('pantalla-tutorial');
    pantalla.style.transition = 'opacity 0.35s ease';
    pantalla.style.opacity = '0';
    setTimeout(() => pantalla.classList.add('hidden'), 370);
}

// ============================================================
// ARRANCAR
// ============================================================
inicializarApp();
