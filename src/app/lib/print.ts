declare global { interface Window { qz: any } }

let qzConnected = false;

let qzReady = false;
export async function ensureQZ() {
  if (!window.qz) throw new Error('QZ Tray no cargó');
  if (!qzReady || !window.qz.websocket.isActive()) {
    try {
      await window.qz.websocket.connect();   // primera vez pedirá permisos
      qzReady = true;
    } catch (error) {
      console.error('Error conectando con QZ Tray:', error);
      throw new Error('No se pudo conectar con QZ Tray. Asegúrate de que esté instalado y ejecutándose.');
    }
  }
}

// Tu impresión HTML queda igual:
export async function printLabelHtml(printerName: string, name: string, company: string, ticket: number) {
  await ensureQZ();
  console.log(printerName, name, company, ticket)
  const html = `<!doctype html>
  <html><head>
    <meta charset="utf-8">
    <style>
      @page { 
        size: 60mm 40mm; 
        margin: 0; 
        padding: 0;
      }
      * { 
        box-sizing: border-box; 
      }
      body { 
        margin: 0; 
        padding: 0; 
        width: 60mm; 
        height: 40mm; 
        overflow: hidden;
        position: relative;
      }
    </style>
  </head>
  <body>
    <div style="width:100%;height:100%;padding:2mm;display:flex;flex-direction:column;justify-content:flex-start;font-family:Arial;position:relative">
      <div style="font-size:14pt;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1mm">${esc(name)}</div>
      <div style="font-size:12pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#666">${esc(company)}</div>
      <div style="position:absolute;bottom:2mm;right:2mm;font-size:18pt;font-weight:700">${ticket}</div>
    </div>
  </body></html>`;

  const cfg = window.qz.configs.create(printerName || undefined, {
    units: 'mm',
    size: { width: 60, height: 40 },
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    scaleContent: false,
    rasterize: false,  // Cambiar a false para mejor control de páginas
    orientation: 'portrait'
  });

  // 👇 clave: enviar HTML CRUDO (no URL), flavor 'plain'
  const payload = [{
    type: 'pixel',
    format: 'html',
    flavor: 'plain',
    data: html,
  }];

  await window.qz.print(cfg, payload);
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'} as any)[m]);
}


export async function listPrinters(): Promise<string[]> {
    await ensureQZ();
    const p = window.qz?.printers;
    if (!p) return [];
  
    // v2.x (builds completos)
    if (typeof p.findAll === 'function') {
      return p.findAll();
    }
  
    // Fallback: si no existe findAll, al menos devolvés la default
    if (typeof p.getDefault === 'function') {
      const def = await p.getDefault().catch(() => '');
      return def ? [def] : [];
    }
    return [];
}

export async function getDefaultPrinter(): Promise<string> {
    await ensureQZ();
    const p = window.qz?.printers;
    if (p && typeof p.getDefault === 'function') {
      return p.getDefault();
    }
    return ''; // sin método → no podemos detectarla, se ingresará manualmente
}