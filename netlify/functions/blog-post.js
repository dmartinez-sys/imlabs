// netlify/functions/blog-post.js
// Sirve cada post del blog como HTML completo con SEO
// Google recibe el contenido ya renderizado — sin JS necesario

const SUPABASE_URL = 'https://jldvhpycybeqqyfyjsjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZHZocHljeWJlcXF5Znlqc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1OTAyNDUsImV4cCI6MjA2MTE2NjI0NX0.t3JAhJQFl6MxWrn_4PkdlJiD-SiS9l0xYfN1JD7_ZuE';

exports.handler = async (event) => {
  // Extraer slug de la URL: /blog/mi-post → mi-post
  const slug = event.path.replace('/blog/', '').replace('/.netlify/functions/blog-post/', '').split('/').pop();

  if (!slug) {
    return { statusCode: 302, headers: { Location: '/blog' } };
  }

  // Consultar Supabase
  let post;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await res.json();
    post = data[0];
  } catch (err) {
    console.error('Supabase error:', err);
  }

  // Post no encontrado → 404
  if (!post) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: pagina404()
    };
  }

  const fechaISO = post.published_at || post.created_at;
  const fechaLegible = new Date(fechaISO).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const ogImage = post.image_url || 'https://imlabs.es/logo_imlabs.svg';
  const metaDesc = post.excerpt || post.title;
  const canonicalUrl = `https://imlabs.es/blog/${post.slug}`;

  // Convertir Markdown básico a HTML si el contenido usa markdown
  const contenidoHTML = markdownToHTML(post.content || '');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
    },
    body: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO primario -->
  <title>${escapeHTML(post.title)} — imlabs</title>
  <meta name="description" content="${escapeHTML(metaDesc)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">

  <!-- Open Graph (WhatsApp, LinkedIn, Twitter) -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHTML(post.title)}">
  <meta property="og:description" content="${escapeHTML(metaDesc)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:locale" content="es_ES">
  <meta property="og:site_name" content="imlabs">
  <meta property="article:published_time" content="${fechaISO}">
  ${post.category ? `<meta property="article:section" content="${escapeHTML(post.category)}">` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHTML(post.title)}">
  <meta name="twitter:description" content="${escapeHTML(metaDesc)}">
  <meta name="twitter:image" content="${ogImage}">

  <!-- Schema.org Article (datos estructurados para Google) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${escapeJSON(post.title)}",
    "description": "${escapeJSON(metaDesc)}",
    "image": "${ogImage}",
    "datePublished": "${fechaISO}",
    "dateModified": "${post.updated_at || fechaISO}",
    "publisher": {
      "@type": "Organization",
      "name": "imlabs",
      "url": "https://imlabs.es",
      "logo": {
        "@type": "ImageObject",
        "url": "https://imlabs.es/logo_imlabs.svg"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${canonicalUrl}"
    }
  }
  </script>

  <!-- Breadcrumb Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "imlabs", "item": "https://imlabs.es"},
      {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://imlabs.es/blog"},
      {"@type": "ListItem", "position": 3, "name": "${escapeJSON(post.title)}", "item": "${canonicalUrl}"}
    ]
  }
  </script>

  <!-- Estilos -->
  <link rel="icon" href="/favicon.ico">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --navy: #0F1B35;
      --blue: #2563EB;
      --gray-50: #F8FAFC;
      --gray-100: #F1F5F9;
      --gray-200: #E2E8F0;
      --gray-400: #94A3B8;
      --gray-600: #475569;
      --gray-800: #1E293B;
    }
    body { font-family: 'Inter', sans-serif; background: #fff; color: var(--gray-800); line-height: 1.7; }

    /* NAV */
    nav {
      background: #fff;
      border-bottom: 1px solid var(--gray-200);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky; top: 0; z-index: 100;
    }
    nav a { text-decoration: none; }
    .nav-logo { display: flex; align-items: center; gap: 8px; }
    .nav-logo img { height: 26px; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { font-size: 14px; color: var(--gray-600); font-weight: 500; }
    .nav-links a:hover { color: var(--navy); }
    .nav-cta {
      font-size: 13px; font-weight: 600; color: #fff;
      background: var(--navy); padding: 8px 16px;
      border-radius: 8px;
    }

    /* HERO POST */
    .post-hero {
      background: var(--gray-50);
      border-bottom: 1px solid var(--gray-200);
      padding: 48px 24px 40px;
      text-align: center;
    }
    .breadcrumb {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; font-size: 13px; color: var(--gray-400);
      margin-bottom: 20px;
    }
    .breadcrumb a { color: var(--gray-400); text-decoration: none; }
    .breadcrumb a:hover { color: var(--blue); }
    .category-badge {
      display: inline-block;
      font-size: 11px; font-weight: 700; color: var(--blue);
      background: #EFF6FF; padding: 4px 12px; border-radius: 20px;
      letter-spacing: 0.06em; text-transform: uppercase;
      margin-bottom: 16px;
    }
    .post-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: clamp(26px, 4vw, 42px);
      font-weight: 800; color: var(--navy);
      max-width: 760px; margin: 0 auto 16px;
      line-height: 1.2;
    }
    .post-meta {
      font-size: 13px; color: var(--gray-400);
      display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
    }

    /* IMAGEN PORTADA */
    .post-cover {
      max-width: 860px; margin: 0 auto;
      padding: 0 24px;
    }
    .post-cover img {
      width: 100%; border-radius: 16px;
      margin-top: -20px;
      box-shadow: 0 8px 32px rgba(15,27,53,0.12);
      display: block;
    }

    /* CONTENIDO */
    .post-content {
      max-width: 720px;
      margin: 48px auto 80px;
      padding: 0 24px;
      font-size: 17px;
      line-height: 1.8;
      color: var(--gray-800);
    }
    .post-content h2 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 24px; font-weight: 700; color: var(--navy);
      margin: 40px 0 16px;
    }
    .post-content h3 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 20px; font-weight: 700; color: var(--navy);
      margin: 32px 0 12px;
    }
    .post-content p { margin-bottom: 20px; }
    .post-content ul, .post-content ol {
      margin: 0 0 20px 24px;
    }
    .post-content li { margin-bottom: 8px; }
    .post-content a { color: var(--blue); }
    .post-content strong { font-weight: 600; color: var(--navy); }
    .post-content blockquote {
      border-left: 3px solid var(--blue);
      margin: 24px 0; padding: 12px 20px;
      background: var(--gray-50);
      border-radius: 0 8px 8px 0;
      font-style: italic; color: var(--gray-600);
    }
    .post-content code {
      font-family: monospace; font-size: 14px;
      background: var(--gray-100); padding: 2px 6px;
      border-radius: 4px;
    }
    .post-content pre {
      background: var(--navy); color: #e2e8f0;
      padding: 20px; border-radius: 10px;
      overflow-x: auto; margin: 24px 0;
      font-size: 14px; line-height: 1.6;
    }
    .post-content pre code { background: none; padding: 0; color: inherit; }
    .post-content img { max-width: 100%; border-radius: 10px; margin: 24px 0; }
    .post-content hr { border: none; border-top: 1px solid var(--gray-200); margin: 40px 0; }

    /* CTA FINAL */
    .post-cta {
      background: linear-gradient(135deg, var(--navy), #1E3A6E);
      color: #fff;
      border-radius: 16px;
      padding: 40px;
      margin: 48px 0 0;
      text-align: center;
    }
    .post-cta h3 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 22px; font-weight: 800;
      margin-bottom: 10px; color: #fff;
    }
    .post-cta p { font-size: 15px; color: rgba(255,255,255,0.75); margin-bottom: 20px; }
    .post-cta a {
      display: inline-block;
      background: #fff; color: var(--navy);
      font-weight: 700; font-size: 14px;
      padding: 12px 24px; border-radius: 10px;
      text-decoration: none;
    }
    .post-cta a:hover { background: var(--gray-100); }

    /* FOOTER */
    footer {
      background: var(--navy); color: rgba(255,255,255,0.6);
      text-align: center; padding: 32px 24px;
      font-size: 13px;
    }
    footer a { color: rgba(255,255,255,0.6); text-decoration: none; margin: 0 8px; }
    footer a:hover { color: #fff; }

    @media (max-width: 640px) {
      .nav-links { display: none; }
      .post-content { font-size: 16px; }
    }
  </style>
</head>
<body>

  <!-- NAV -->
  <nav>
    <a href="/" class="nav-logo">
      <img src="/logo_imlabs.svg" alt="imlabs">
    </a>
    <div class="nav-links">
      <a href="/#productos">Productos</a>
      <a href="/blog">Blog</a>
      <a href="/#contacto">Contacto</a>
    </div>
    <a href="/#contacto" class="nav-cta">Hablar con el equipo</a>
  </nav>

  <!-- HERO -->
  <div class="post-hero">
    <div class="breadcrumb">
      <a href="/">imlabs</a>
      <span>›</span>
      <a href="/blog">Blog</a>
      <span>›</span>
      <span>${escapeHTML(post.title)}</span>
    </div>
    ${post.category ? `<div class="category-badge">${escapeHTML(post.category)}</div>` : ''}
    <h1 class="post-title">${escapeHTML(post.title)}</h1>
    <div class="post-meta">
      <span>📅 ${fechaLegible}</span>
      ${post.reading_time ? `<span>⏱ ${escapeHTML(post.reading_time)} de lectura</span>` : ''}
    </div>
  </div>

  <!-- IMAGEN PORTADA -->
  ${post.image_url ? `
  <div class="post-cover">
    <img src="${post.image_url}" alt="${escapeHTML(post.title)}" loading="eager">
  </div>` : ''}

  <!-- CONTENIDO -->
  <article class="post-content">
    ${contenidoHTML}

    <!-- CTA FINAL -->
    <div class="post-cta">
      <h3>¿Quieres aplicar IA en tu empresa?</h3>
      <p>En imlabs desarrollamos aplicaciones de inteligencia artificial que automatizan, captan y hacen crecer tu negocio.</p>
      <a href="https://imlabs.es/#contacto">Hablar con el equipo →</a>
    </div>
  </article>

  <!-- FOOTER -->
  <footer>
    <p style="margin-bottom:12px">
      <a href="/">imlabs.es</a>
      <a href="/blog">Blog</a>
      <a href="/politica-de-privacidad">Privacidad</a>
      <a href="/politica-de-cookies">Cookies</a>
    </p>
    <p>© ${new Date().getFullYear()} imlabs — IM Digital Marketing Expert Agency, S.L.</p>
  </footer>

  <!-- Script para usuarios: añade interactividad sin romper SEO -->
  <script>
    // El HTML ya está renderizado — este script es solo para mejoras opcionales
    // como tracking o interactividad extra
    console.log('imlabs blog post - SSR activo ✓');
  </script>

</body>
</html>`
  };
};

// ─── Helpers ───────────────────────────────────────────────

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJSON(str) {
  if (!str) return '';
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// Convierte Markdown básico a HTML
function markdownToHTML(md) {
  if (!md) return '';

  // Si ya tiene etiquetas HTML, devolverlo tal cual
  if (/<[a-z][\s\S]*>/i.test(md)) return md;

  return md
    // Encabezados
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Negrita e itálica
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Código inline
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Bloques de código
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Separador
    .replace(/^---$/gm, '<hr>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Imágenes
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')
    // Listas no ordenadas
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Listas ordenadas
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Párrafos (líneas que no son tags HTML)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Limpiar líneas vacías múltiples
    .replace(/\n{3,}/g, '\n\n');
}

function pagina404() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Post no encontrado — imlabs</title>
  <meta name="robots" content="noindex">
  <style>
    body { font-family: sans-serif; text-align: center; padding: 80px 20px; }
    h1 { font-size: 32px; color: #0F1B35; }
    p { color: #64748B; margin: 16px 0; }
    a { color: #2563EB; }
  </style>
</head>
<body>
  <h1>Post no encontrado</h1>
  <p>Este artículo no existe o ha sido eliminado.</p>
  <a href="/blog">← Volver al blog</a>
</body>
</html>`;
}
