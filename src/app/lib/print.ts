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

// Load saved configuration from localStorage
function loadSavedConfig() {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('qz-editor-config');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading saved config:', error);
    return null;
  }
}

// Generate HTML using saved configuration or fallback to default
// export async function printLabelHtml(printerName: string, name: string, company: string, ticket: number) {
//   await ensureQZ();
//   console.log(printerName, name, company, ticket);
  
//   const savedConfig = loadSavedConfig();
//   let html: string;
//   let pageWidth = 55; // Default fallback
//   let pageHeight = 44; // Default fallback
  
//   if (savedConfig && savedConfig.elements && savedConfig.styles) {
//     // Use saved configuration
//     const { styles, elements, logoDataUrl } = savedConfig;
//     pageWidth = styles.pageWidth;
//     pageHeight = styles.pageHeight;
    
//     // Generate elements HTML with actual data
//     const elementsHtml = elements.map((element: any) => {
//       const xMm = (element.x / 4).toFixed(2);
//       const yMm = (element.y / 4).toFixed(2);
//       const widthMm = (element.width / 4).toFixed(2);
//       const heightMm = (element.height / 4).toFixed(2);
      
//       if (element.type === 'name') {
//         const fontSize = element.fontSize || 12;
//         const fontWeight = element.fontWeight || 400;
//         const color = element.color || '#000000';
//         const textAlign = element.textAlign || 'left';
//         return `      <div style="
//     position:absolute;
//     top:${yMm}mm;
//     left:0;
//     width:100%;
//     height:auto;
//     font-size:${fontSize}pt;
//     font-weight:${fontWeight};
//     color:${color};
//     text-align:center;
//     white-space:normal;
//     word-wrap:break-word;
//     overflow-wrap:break-word;
//     line-height:1.2;
//     font-family:${styles.fontFamily};
//   ">${esc(name)}</div>`;
//       } else if (element.type === 'company') {
//         const fontSize = element.fontSize || 12;
//         const fontWeight = element.fontWeight || 400;
//         const color = element.color || '#000000';
//         const textAlign = element.textAlign || 'left';
//         return `      <div style="
//     position:absolute;
//     top:${yMm}mm;
//     left:0;
//     width:100%;
//     height:auto;
//     font-size:${fontSize}pt;
//     font-weight:${fontWeight};
//     color:${color};
//     text-align:center;
//     white-space:normal;
//     word-wrap:break-word;
//     overflow-wrap:break-word;
//     line-height:1.2;
//     font-family:${styles.fontFamily};
//   ">${esc(company)}</div>`;
//       } else if (element.type === 'ticket') {
//         const fontSize = element.fontSize || 12;
//         const fontWeight = element.fontWeight || 400;
//         const color = element.color || '#000000';
//         const textAlign = element.textAlign || 'center';
//         return `      <div style="position:absolute;left:${xMm}mm;top:${yMm}mm;width:${widthMm}mm;height:${heightMm}mm;font-size:${fontSize}pt;font-weight:${fontWeight};color:${color};display:flex;align-items:center;justify-content:${textAlign === 'center' ? 'center' : 'flex-start'};white-space:normal;word-wrap:break-word;overflow-wrap:break-word;line-height:1.2;font-family:${styles.fontFamily};">${ticket}</div>`;
//       } else if (element.type === 'logo') {
//         return `      <img src="${element.content}" style="position:absolute;left:${xMm}mm;top:${yMm}mm;width:${widthMm}mm;height:${heightMm}mm;object-fit:contain;" />`;
//       }
//       return '';
//     }).join('\n');
    
//     html = `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <style>
//     @page { 
//       size: ${pageWidth}mm ${pageHeight}mm; 
//       margin: ${styles.pageMargin}mm; 
//     }
//     * { 
//       box-sizing: border-box; 
//       margin: 0;
//       padding: 0;
//     }
//     body { 
//       width: ${pageWidth}mm; 
//       height: ${pageHeight}mm; 
//       position: relative;
//       font-family: ${styles.fontFamily};
//       overflow: hidden;
//     }
//     .container {
//       width: 100%;
//       height: 100%;
//       position: relative;
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
// ${elementsHtml}
//   </div>
// </body>
// </html>`;
//   } else {
//     // Fallback to default configuration
//     html = `<!doctype html>
//   <html><head>
//     <meta charset="utf-8">
//     <style>
//       @page { 
//         size: 55mm 44mm; 
//         margin: 0; 
//         padding: 0;
//       }
//       * { 
//         box-sizing: border-box; 
//       }
//       body { 
//         margin: 0; 
//         padding: 0; 
//         width: 55mm; 
//         height: 44mm; 
//         overflow: hidden;
//         position: relative;
//       }
//     </style>
//   </head>
//   <body>
//     <div style="width:100%;height:100%;padding:2mm;display:flex;flex-direction:column;justify-content:flex-start;font-family:Arial;position:relative">
//       <div style="font-size:14pt;font-weight:600;white-space:normal;word-wrap:break-word;overflow-wrap:break-word;line-height:1.2;text-overflow:ellipsis;margin-bottom:1mm">${esc(name)}</div>
//       <div style="font-size:12pt;white-space:normal;word-wrap:break-word;overflow-wrap:break-word;line-height:1.2;text-overflow:ellipsis;color:#666">${esc(company)}</div>
//       <div style="position:absolute;bottom:2mm;right:2mm;font-size:18pt;font-weight:700">${ticket}</div>
//     </div>
//   </body></html>`;
//   }

//   const cfg = window.qz.configs.create(printerName || undefined, {
//     units: 'mm',
//     size: { width: pageWidth, height: pageHeight },
//     margins: { top: 0, right: 0, bottom: 0, left: 0 },
//     scaleContent: false,
//     rasterize: false,
//     orientation: 'portrait'
//   });

//   const payload = [{
//     type: 'pixel',
//     format: 'html',
//     flavor: 'plain',
//     data: html,
//   }];

//   await window.qz.print(cfg, payload);
// }
export async function printLabelHtml(printerName: string, name: string, company: string, ticket: number) {
  await ensureQZ();

  const savedConfig = loadSavedConfig();
  let html: string;
  let pageWidth = 55; // Default fallback
  let pageHeight = 44; // Default fallback

  if (savedConfig && savedConfig.styles) {
    const { styles } = savedConfig;
    pageWidth = styles.pageWidth;
    pageHeight = styles.pageHeight;

    html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { 
      size: ${pageWidth}mm ${pageHeight}mm; 
      margin: ${styles.pageMargin}mm; 
    }
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    body { 
      width: ${pageWidth}mm; 
      height: ${pageHeight}mm; 
      position: relative;
      font-family: ${styles.fontFamily};
      overflow: hidden;
    }
    .container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    .block {
      position: absolute;
      top: 12mm; /* ajustá según necesites */
      left: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .name {
      font-size: 14pt;
      font-weight: 600;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
      line-height: 1.2;
    }
    .company {
      font-size: 12pt;
      color: #666;
      margin-top: 1mm;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
      line-height: 1.2;
    }
    .ticket {
      position: absolute;
      bottom: 2mm;
      right: 2mm;
      font-size: 18pt;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="block">
      <div class="name">${esc(name)}</div>
      <div class="company">${esc(company)}</div>
    </div>
    <div class="ticket">${ticket}</div>
  </div>
</body>
</html>`;
  } else {
    // Fallback si no hay configuración guardada
    html = `<!doctype html>
  <html><head>
    <meta charset="utf-8">
    <style>
      @page { size: 55mm 44mm; margin: 0; padding: 0; }
      body { margin:0; padding:0; width:55mm; height:44mm; overflow:hidden; font-family:Arial; position:relative; }
      .block {
        position: absolute;
        top: 12mm;
        left: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .name {
        font-size: 14pt;
        font-weight: 600;
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.2;
      }
      .company {
        font-size: 12pt;
        color: #666;
        margin-top: 1mm;
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.2;
      }
      .ticket {
        position: absolute;
        bottom: 2mm;
        right: 2mm;
        font-size: 18pt;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="block">
      <div class="name">${esc(name)}</div>
      <div class="company">${esc(company)}</div>
    </div>
    <div class="ticket">${ticket}</div>
  </body></html>`;
  }

  const cfg = window.qz.configs.create(printerName || undefined, {
    units: 'mm',
    size: { width: pageWidth, height: pageHeight },
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    scaleContent: false,
    rasterize: false,
    orientation: 'portrait'
  });

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