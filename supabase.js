// ============================================================
// SUPABASE - Conexión y operaciones con la base de datos
// ============================================================

const SUPABASE_URL = 'https://isatsfcbjsqpnkuytjvp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYXRzZmNianNxcG5rdXl0anZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTE1NzYsImV4cCI6MjA5NjAyNzU3Nn0.hbESKyQrRj_62fdhrzvB6sb6Nx65SkHJoVLOz6UavMM';

const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
};

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ============================================================
// USUARIOS
// ============================================================

async function registrarUsuarioSupabase(nombre, correo, password) {
    // Verificar si el correo ya existe
    const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&select=id`,
        { headers }
    );
    const existe = await checkRes.json();
    if (existe.length > 0) {
        return { error: 'Este correo ya está registrado.' };
    }

    const hash = await hashPassword(password);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ nombre, correo, password: hash })
    });

    const data = await res.json();
    if (!res.ok) return { error: 'Error al crear usuario.' };
    return { usuario: data[0] };
}

async function loginUsuarioSupabase(correo, password) {
    // Busca solo por correo para no exponer la contraseña en la URL
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&select=*`,
        { headers }
    );
    const data = await res.json();
    if (data.length === 0) return { error: 'Correo o contraseña incorrectos.' };

    const usuario = data[0];
    const hash = await hashPassword(password);

    if (usuario.password === hash) {
        return { usuario };
    }
    // Migración: cuenta existente con contraseña en texto plano
    if (usuario.password === password) {
        await actualizarUsuario(usuario.id, { password: hash });
        return { usuario };
    }
    return { error: 'Correo o contraseña incorrectos.' };
}

// ============================================================
// PUSH SUBSCRIPTIONS
// ============================================================
async function guardarSuscripcionPush(usuarioId, endpoint, p256dh, auth, timezone) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
            usuario_id: usuarioId,
            endpoint,
            p256dh,
            auth,
            timezone,
            user_agent: navigator.userAgent
        })
    });
    if (!res.ok) console.warn('Error guardando suscripción push:', await res.text());
}

// ============================================================
// HÁBITOS
// ============================================================

async function obtenerHabitosSupabase(usuarioId) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/habitos?usuario_id=eq.${usuarioId}&select=*&order=orden.asc,created_at.asc`,
        { headers }
    );
    return await res.json();
}

async function crearHabitoSupabase(usuarioId, nombre, emoji, metaSemanal, fechaCreacion, color = '#6C63FF', recordatorio = null, tipo = 'check', unidad = null, metaCantidad = null, diasSemana = null) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/habitos`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
            usuario_id: usuarioId,
            nombre,
            emoji,
            meta_semanal: metaSemanal,
            fecha_creacion: fechaCreacion,
            color,
            recordatorio,
            orden: 0,
            tipo,
            unidad,
            meta_cantidad: metaCantidad,
            dias_semana: diasSemana
        })
    });
    const data = await res.json();
    if (!res.ok) return { error: 'Error al crear hábito.' };
    return { habito: data[0] };
}
async function editarHabitoSupabase(habitoId, nombre, emoji, metaSemanal, color, recordatorio = null, tipo = 'check', unidad = null, metaCantidad = null, diasSemana = null) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/habitos?id=eq.${habitoId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ nombre, emoji, meta_semanal: metaSemanal, color, recordatorio, tipo, unidad, meta_cantidad: metaCantidad, dias_semana: diasSemana })
    });
    const data = await res.json();
    if (!res.ok) return { error: 'Error al editar hábito.' };
    return { habito: data[0] };
}
async function togglePinSupabase(habitoId, pinneado) {
    await fetch(`${SUPABASE_URL}/rest/v1/habitos?id=eq.${habitoId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ pinneado })
    });
}
async function eliminarHabitoSupabase(habitoId) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/habitos?id=eq.${habitoId}`, {
        method: 'DELETE',
        headers
    });
    return res.ok;
}

// ============================================================
// REGISTROS DIARIOS
// ============================================================

async function obtenerRegistrosSupabase(usuarioId, desde = null) {
    let url = `${SUPABASE_URL}/rest/v1/registros?usuario_id=eq.${usuarioId}&select=*`;
    if (desde) url += `&fecha=gte.${desde}`;
    const res = await fetch(url, { headers });
    return await res.json();
}

async function marcarHabitoSupabase(habitoId, usuarioId, fecha) {
    const ahora = new Date();
    const hora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ habito_id: habitoId, usuario_id: usuarioId, fecha, hora })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0]?.id || null;
}

async function actualizarUsuario(usuarioId, campos) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${usuarioId}`,
        {
            method: 'PATCH',
            headers,
            body: JSON.stringify(campos)
        }
    );
    return res.ok;
}

async function subirFotoPerfil(usuarioId, archivoBlob) {
    const nombreArchivo = `${usuarioId}/avatar_${Date.now()}.jpg`;
    const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/profile-photos/${nombreArchivo}`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'image/jpeg',
            },
            body: archivoBlob
        }
    );
    if (!res.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/profile-photos/${nombreArchivo}`;
}

async function enviarCorreoRecuperacion(correo) {
    // Buscar usuario por correo
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&select=id,nombre`,
        { headers }
    );
    const data = await res.json();
    return data.length > 0;
}

async function subirFotoRegistro(registroId, archivoBlob, usuarioId) {
    const nombreArchivo = `${usuarioId}/${registroId}_${Date.now()}.jpg`;
    const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/habit-photos/${nombreArchivo}`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'image/jpeg',
            },
            body: archivoBlob
        }
    );
    if (!res.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/habit-photos/${nombreArchivo}`;
}

async function guardarFotoEnRegistro(registroId, fotoUrl) {
    await fetch(
        `${SUPABASE_URL}/rest/v1/registros?id=eq.${registroId}`,
        {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ foto_url: fotoUrl })
        }
    );
}

async function eliminarFotoDeRegistro(registroId) {
    await fetch(
        `${SUPABASE_URL}/rest/v1/registros?id=eq.${registroId}`,
        {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ foto_url: null })
        }
    );
}

async function desmarcarHabitoSupabase(habitoId, fecha) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?habito_id=eq.${habitoId}&fecha=eq.${fecha}`,
        { method: 'DELETE', headers }
    );
    return res.ok;
}

async function guardarCantidadSupabase(habitoId, usuarioId, fecha, cantidad) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?habito_id=eq.${habitoId}&fecha=eq.${fecha}`,
        { headers }
    );
    const data = await res.json();

    if (data.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/registros?habito_id=eq.${habitoId}&fecha=eq.${fecha}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ cantidad })
        });
    } else {
        const ahora = new Date();
        const hora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
        await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ habito_id: habitoId, usuario_id: usuarioId, fecha, cantidad, hora })
        });
    }
}

async function obtenerCantidadDiaSupabase(habitoId, fecha) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?habito_id=eq.${habitoId}&fecha=eq.${fecha}&select=cantidad`,
        { headers }
    );
    const data = await res.json();
    return data.length > 0 ? (data[0].cantidad || 0) : 0;
}



