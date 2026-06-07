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

    // Crear usuario
    const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ nombre, correo, password })
    });

    const data = await res.json();
    if (!res.ok) return { error: 'Error al crear usuario.' };
    return { usuario: data[0] };
}

async function loginUsuarioSupabase(correo, password) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&password=eq.${encodeURIComponent(password)}&select=*`,
        { headers }
    );
    const data = await res.json();
    if (data.length === 0) return { error: 'Correo o contraseña incorrectos.' };
    return { usuario: data[0] };
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

async function crearHabitoSupabase(usuarioId, nombre, emoji, metaSemanal, fechaCreacion, color = '#6C63FF', recordatorio = null, tipo = 'check', unidad = null, metaCantidad = null) {
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
            meta_cantidad: metaCantidad
        })
    });
    const data = await res.json();
    if (!res.ok) return { error: 'Error al crear hábito.' };
    return { habito: data[0] };
}
async function editarHabitoSupabase(habitoId, nombre, emoji, metaSemanal, color, recordatorio = null, tipo = 'check', unidad = null, metaCantidad = null) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/habitos?id=eq.${habitoId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ nombre, emoji, meta_semanal: metaSemanal, color, recordatorio, tipo, unidad, meta_cantidad: metaCantidad })
    });
    const data = await res.json();
    if (!res.ok) return { error: 'Error al editar hábito.' };
    return { habito: data[0] };
}
async function actualizarOrdenSupabase(habitoId, orden) {
    await fetch(`${SUPABASE_URL}/rest/v1/habitos?id=eq.${habitoId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ orden })
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

async function obtenerRegistrosSupabase(usuarioId) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?usuario_id=eq.${usuarioId}&select=*`,
        { headers }
    );
    return await res.json();
}

async function marcarHabitoSupabase(habitoId, usuarioId, fecha) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ habito_id: habitoId, usuario_id: usuarioId, fecha })
    });
    return res.ok;
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
        await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ habito_id: habitoId, usuario_id: usuarioId, fecha, cantidad })
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

    

async function guardarNotaSupabase(habitoId, usuarioId, fecha, nota) {
    // Intentamos actualizar primero
    const resUpdate = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?habito_id=eq.${habitoId}&fecha=eq.${fecha}`,
        {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({ nota })
        }
    );
    const updated = await resUpdate.json();

    // Si no existía el registro, lo creamos
    if (updated.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ habito_id: habitoId, usuario_id: usuarioId, fecha, nota })
        });
    }
}

async function obtenerNotaDiaSupabase(usuarioId, fecha) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?usuario_id=eq.${usuarioId}&fecha=eq.${fecha}&select=nota,habito_id`,
        { headers }
    );
    const data = await res.json();
    if (data.length === 0) return '';
    return data[0].nota || '';
}