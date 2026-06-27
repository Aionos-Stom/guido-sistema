/* =============================================================
   PLANTILLA DE EXPORTACIÓN XLS — GUIDO · Siempre cerca de ti
   HTML-to-XLS con diseño corporativo navy/rojo dominicano.
   Sin dependencias externas (no necesita XLSX.js ni jsPDF).

   CÓMO ADAPTAR AL OTRO SISTEMA:
   1. Llama a exportToExcelPlantilla(voters, currentUser, opciones)
   2. `voters`      → array de objetos con los campos listados abajo
   3. `currentUser` → { name, role, username, id }
   4. `opciones`    → { mostrarGrupos: true/false, nombreOrg: '...' }
      - mostrarGrupos: true  → muestra separadores por rol/registrador (para admins)
      - mostrarGrupos: false → solo filas de datos planas
   5. Ajusta NOMBRE_ORG y SUBTITULO si cambia la organización.
   ============================================================= */

/* ── Campos esperados en cada objeto de `voters` ──────────────
   v.name                → nombre completo del simpatizante
   v.cedula              → cédula (formato 000-0000000-0)
   v.phone               → teléfono
   v.region              → región
   v.province            → provincia
   v.municipio           → municipio
   v.distrito            → distrito municipal
   v.zone                → zona
   v.sector              → sector
   v.mesa                → mesa
   v.recinto             → recinto
   v.observacion         → observación (opcional)
   v.registered_by_name  → nombre completo del registrador
   v.registered_by       → username del registrador
   v.registered_by_role  → rol del registrador
   v.registered_by_zone  → zona del registrador
   v.registered_by_province → provincia del registrador
   v.updated_at / v.created_at → fecha ISO
   ============================================================= */

async function exportToExcelPlantilla(voters, currentUser, opciones) {
  opciones = opciones || {};
  var mostrarGrupos = opciones.mostrarGrupos !== false; // default true
  var nombreOrg     = opciones.nombreOrg     || 'GUIDO';
  var subtitulo     = opciones.subtitulo     || 'Reporte de Registros de Simpatizantes';
  var pie           = opciones.pie           || 'Documento de uso interno · Sistema de Gestion Territorial · Siempre cerca de ti';
  var nombreArchivo = opciones.nombreArchivo; // si no se pasa, se genera automático

  if (!voters || !voters.length) {
    alert('No hay datos para exportar.');
    return;
  }

  /* ── Ordenar: rol → registrador → provincia → municipio → nombre ── */
  var ordered = voters.slice().sort(function(a, b) {
    if (a.registered_by_role  !== b.registered_by_role)  return (a.registered_by_role  || '').localeCompare(b.registered_by_role  || '', 'es');
    if (a.registered_by_name  !== b.registered_by_name)  return (a.registered_by_name  || '').localeCompare(b.registered_by_name  || '', 'es');
    if (a.province !== b.province) return (a.province || '').localeCompare(b.province || '', 'es');
    if (a.municipio !== b.municipio) return (a.municipio || '').localeCompare(b.municipio || '', 'es');
    return (a.name || '').localeCompare(b.name || '', 'es');
  });

  var fechaReporte = new Intl.DateTimeFormat('es-DO', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  var total = ordered.length;
  var C = 17; // número de columnas

  /* ── Anchos de columna en px ─────────────────────────────── */
  var widths = [38, 175, 115, 95, 85, 105, 110, 90, 82, 100, 62, 125, 145, 150, 95, 140, 110];

  /* ── CSS ────────────────────────────────────────── */
  var css = [
    'body  { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #0d1b2e; margin: 0; }',
    'table { border-collapse: collapse; }',

    /* Encabezado del reporte */
    '.H1   { font-size: 20px; font-weight: bold; color: #071a44; text-align: center; padding: 16px 10px 2px; border: none; }',
    '.H2   { font-size: 11px; font-weight: bold; color: #1457c4; text-align: center; padding: 2px 10px 4px; border: none; text-transform: uppercase; letter-spacing: 1px; }',
    '.H3   { font-size: 9.5px; color: #6a80a0; text-align: center; padding: 1px 10px 2px; border: none; }',
    '.BAND { height: 4px; padding: 0; border: none; background-color: #071a44; }',
    '.BAND2{ height: 3px; padding: 0; border: none; background-color: #e0262b; }',
    '.META { font-size: 9.5px; color: #4a6080; padding: 5px 14px; border: none; text-align: left; }',
    '.METAR{ font-size: 9.5px; color: #4a6080; padding: 5px 14px; border: none; text-align: right; }',
    '.GAP  { border: none; padding: 4px; }',

    /* Encabezados de columna */
    '.CH { background-color: #071a44; color: #ffffff; font-size: 9.5px; font-weight: bold; text-align: center; padding: 9px 6px; border: 1px solid #051027; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }',
    '.CH-num { background-color: #051027; }',

    /* Filas alternas */
    '.DA { background-color: #ffffff; }',
    '.DB { background-color: #f3f7fd; }',

    /* Celdas de datos */
    'td     { border: 1px solid #cddcee; padding: 7px 9px; vertical-align: middle; font-size: 10.5px; color: #1a2a3a; }',
    '.num   { text-align: center; color: #8fa0b8; font-size: 10px; font-weight: bold; }',
    '.name  { font-weight: 700; color: #071a44; }',
    ".ced   { font-family: 'Courier New', Courier, monospace; text-align: center; letter-spacing: 1px; color: #1a3a6c; }",
    '.tel   { text-align: center; color: #2a4a6a; }',
    '.geo   { text-align: center; color: #2a3a50; }',
    '.obs   { color: #6a7a90; font-style: italic; }',
    '.reg   { color: #071a44; font-weight: 600; font-size: 10.5px; }',
    '.usr   { color: #6a80a0; font-size: 9.5px; }',
    '.rol   { text-align: center; color: #2a4060; font-size: 10px; }',
    '.dat   { text-align: center; color: #6a80a0; font-size: 9.5px; white-space: nowrap; }',
    '.empty { color: #b0bfd0; text-align: center; }',

    /* Separadores de grupo (solo cuando mostrarGrupos = true) */
    '.GR { background-color: #071a44; }',
    '.GR td { color: #ffffff; font-weight: bold; font-size: 10px; padding: 7px 10px; border: 1px solid #051027; text-transform: uppercase; letter-spacing: 0.8px; }',
    '.GR .num { color: rgba(255,255,255,0.3); }',
    '.GS { background-color: #ddeaff; }',
    '.GS td { color: #071a44; font-weight: 600; font-size: 9.5px; padding: 5px 10px; border: 1px solid #b8ccee; }',
    '.GS .num { color: #9ab0cc; }',

    /* Fila de totales y pie */
    '.FT { background-color: #071a44; }',
    '.FT td { color: #ffffff; font-weight: bold; font-size: 10.5px; padding: 9px 12px; border: 1px solid #051027; }',
    '.FT .num  { color: rgba(255,255,255,0.5); font-size: 10px; }',
    '.FT .name { color: #90d0ff; font-weight: 700; }',
    '.FN td { border: none; font-size: 9px; color: #8fa0b8; text-align: center; padding: 8px; }',
  ].join('\n');

  /* ── Colgroup ────────────────────────────────────────────── */
  var cg = widths.map(function(w) { return '<col style="width:' + w + 'px">'; }).join('');

  /* ── Encabezado del documento ────────────────────────────── */
  var generadoPor = currentUser ? esc(currentUser.name) + ' &nbsp;·&nbsp; Rol: ' + esc(currentUser.role) : 'Sistema';

  var html = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office"',
    'xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="UTF-8"><style>' + css + '</style></head>',
    '<body><table><colgroup>' + cg + '</colgroup>',

    '<tr><td class="H1"  colspan="' + C + '">' + esc(nombreOrg) + '</td></tr>',
    '<tr><td class="H2"  colspan="' + C + '">' + esc(subtitulo) + '</td></tr>',
    '<tr><td class="H3"  colspan="' + C + '">República Dominicana &nbsp;·&nbsp; Siempre cerca de ti</td></tr>',
    '<tr><td class="BAND"  colspan="' + C + '"></td></tr>',
    '<tr><td class="BAND2" colspan="' + C + '"></td></tr>',
    '<tr>',
    '  <td class="META"  colspan="9">Generado por: &nbsp;<b>' + generadoPor + '</b></td>',
    '  <td class="METAR" colspan="8">Fecha: ' + fechaReporte + ' &nbsp;·&nbsp; Total: <b>' + total + '</b> registros</td>',
    '</tr>',
    '<tr><td class="GAP" colspan="' + C + '"></td></tr>',

    /* Fila de encabezados de columna */
    '<tr>',
    '  <td class="CH CH-num">N&deg;</td>',
    '  <td class="CH">Nombre Completo</td>',
    '  <td class="CH">Cedula</td>',
    '  <td class="CH">Telefono</td>',
    '  <td class="CH">Region</td>',
    '  <td class="CH">Provincia</td>',
    '  <td class="CH">Municipio</td>',
    '  <td class="CH">Distrito</td>',
    '  <td class="CH">Zona</td>',
    '  <td class="CH">Sector</td>',
    '  <td class="CH">Mesa</td>',
    '  <td class="CH">Recinto</td>',
    '  <td class="CH">Observacion</td>',
    '  <td class="CH">Registrado Por</td>',
    '  <td class="CH">Usuario</td>',
    '  <td class="CH">Rol del Registrador</td>',
    '  <td class="CH">Fecha de Registro</td>',
    '</tr>',
  ].join('\n');

  /* ── Filas de datos ──────────────────────────────────────── */
  var n = 0, curRole = '', curReg = '';

  ordered.forEach(function(v) {
    /* Separadores de grupo (rol y registrador) */
    if (mostrarGrupos) {
      if (v.registered_by_role !== curRole) {
        curRole = v.registered_by_role; curReg = '';
        html += '<tr class="GR">' +
          '<td class="num"></td>' +
          '<td colspan="' + (C - 1) + '">ROL: ' + esc(v.registered_by_role) + '</td>' +
          '</tr>\n';
      }
      if (v.registered_by_name !== curReg) {
        curReg = v.registered_by_name;
        html += '<tr class="GS">' +
          '<td class="num"></td>' +
          '<td colspan="3">Registrador: &nbsp;<b>' + esc(v.registered_by_name) + '</b> &nbsp;(@' + esc(v.registered_by) + ')</td>' +
          '<td colspan="4">Zona: ' + esc(v.registered_by_zone || '—') + '</td>' +
          '<td colspan="' + (C - 8) + '">Provincia: ' + esc(v.registered_by_province || '—') + '</td>' +
          '</tr>\n';
      }
    }

    n++;
    var rc = n % 2 === 0 ? 'DB' : 'DA';

    function geo(val) {
      return val
        ? '<td class="geo">' + esc(val) + '</td>'
        : '<td class="empty geo">—</td>';
    }

    html += '<tr class="' + rc + '">\n' +
      '  <td class="num">' + n + '</td>\n' +
      '  <td class="name">' + esc(v.name) + '</td>\n' +
      '  <td class="ced">'  + esc(v.cedula) + '</td>\n' +
      '  <td class="tel">'  + esc(v.phone) + '</td>\n' +
      '  ' + geo(v.region) + '\n' +
      '  <td class="geo">'  + esc(v.province) + '</td>\n' +
      '  <td class="geo">'  + esc(v.municipio) + '</td>\n' +
      '  ' + geo(v.distrito) + '\n' +
      '  ' + geo(v.zone) + '\n' +
      '  <td class="geo">'  + esc(v.sector) + '</td>\n' +
      '  <td class="geo">'  + esc(v.mesa) + '</td>\n' +
      '  <td class="geo">'  + esc(v.recinto) + '</td>\n' +
      '  <td class="obs">'  + esc(v.observacion || '—') + '</td>\n' +
      '  <td class="reg">'  + esc(v.registered_by_name) + '</td>\n' +
      '  <td class="usr">@' + esc(v.registered_by) + '</td>\n' +
      '  <td class="rol">'  + esc(v.registered_by_role) + '</td>\n' +
      '  <td class="dat">'  + esc(formatFecha(v.updated_at || v.created_at)) + '</td>\n' +
      '</tr>\n';
  });

  /* ── Pie del reporte ─────────────────────────────────────── */
  html += [
    '<tr><td class="GAP" colspan="' + C + '"></td></tr>',
    '<tr class="FT">',
    '  <td class="num">&nbsp;</td>',
    '  <td class="name" colspan="3">TOTAL DE REGISTROS</td>',
    '  <td colspan="' + (C - 4) + '" style="text-align:right;color:#7ab0f0;font-size:13px;font-weight:bold;">' + total + '</td>',
    '</tr>',
    '<tr class="FN"><td colspan="' + C + '">' + esc(pie) + '</td></tr>',
    '</table></body></html>',
  ].join('\n');

  /* ── Descargar ───────────────────────────────────────────── */
  var blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  var ts   = new Date().toISOString().slice(0, 10);
  a.download = nombreArchivo || ('reporte_' + ts + '.xls');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Helpers internos ────────────────────────────────────────── */

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Formatea fecha ISO → "DD/MM/AAAA HH:MM"
   Reemplaza esta función por la que usa tu sistema si ya tienes una. */
function formatFecha(isoStr) {
  if (!isoStr) return '—';
  try {
    var d = new Date(isoStr);
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  } catch(e) { return isoStr; }
}

/* =============================================================
   EJEMPLO DE USO:

   // Admin/super → muestra grupos por rol y registrador
   exportToExcelPlantilla(listaDeVotantes, usuarioActual, {
     mostrarGrupos: true,
     nombreOrg:     'Mi Organización',
     subtitulo:     'Reporte de Simpatizantes',
     nombreArchivo: 'reporte_general_2026-04-18.xls'
   });

   // Usuario normal → solo sus registros, sin separadores de grupo
   exportToExcelPlantilla(misRegistros, usuarioActual, {
     mostrarGrupos: false,
     nombreArchivo: 'mis_registros_usuario_2026-04-18.xls'
   });
   ============================================================= */
