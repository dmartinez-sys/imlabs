// netlify/functions/educabot-webhook.js
// Recibe leads del chatbot educabot y los guarda en Supabase

const SUPABASE_URL = 'https://jldvhpycybeqqyfyjsjt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZHZocHljeWJlcXF5Znlqc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTE0NDEsImV4cCI6MjA5MjUyNzQ0MX0.On7QpPnXyVs8WnoOrBtsbnkaOGgc-POJUK-LEziLVRY';

exports.handler = async (event) => {

  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    // Acepta tanto JSON como form-urlencoded
    const contentType = event.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      payload = JSON.parse(event.body);
    } else {
      // x-www-form-urlencoded
      payload = Object.fromEntries(new URLSearchParams(event.body));
    }
  } catch (err) {
    console.error('Error parsing payload:', err);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid payload' }) };
  }

  console.log('Educabot webhook received:', JSON.stringify(payload));

  // Mapear campos de educabot a nuestra tabla leads
  const nombre = payload.nombre || payload.name || '';
  const nombreParts = nombre.trim().split(' ');
  const primerNombre = nombreParts[0] || '';
  const apellidos = nombreParts.slice(1).join(' ') || null;

  const lead = {
    nombre: primerNombre,
    apellidos: apellidos,
    email: payload.email || null,
    telefono: payload.telefono1 || payload.phone || null,
    empresa: null,
    cargo: null,
    sector: 'Educacion / Formacion',
    necesidad: payload.comentarios || payload.summary || null,
    producto_interes: payload.id_curso || null,
    fuente: 'educabot',
    notas: [
      payload.comentarios ? `Resumen IA: ${payload.comentarios}` : null,
      payload.iso_pais ? `Pais: ${payload.iso_pais}` : null,
      payload.id_campanya ? `Campana: ${payload.id_campanya}` : null,
    ].filter(Boolean).join('\n') || null,
    estado: 'nuevo',
  };

  // Guardar en Supabase
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(lead)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase error:', res.status, errText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error saving lead', detail: errText })
      };
    }

    console.log('Lead saved successfully from educabot');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Lead recibido y guardado' })
    };

  } catch (err) {
    console.error('Fetch error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
