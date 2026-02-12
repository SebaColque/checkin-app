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
    if (!saved) return null;
    
    const config = JSON.parse(saved);
    
    // Asegurar que siempre exista un elemento location
    if (config && config.elements) {
      const hasLocation = config.elements.some((e: any) => e.type === 'location');
      if (!hasLocation) {
        // Agregar elemento location por defecto
        config.elements.push({
          id: 'location',
          type: 'location',
          x: 10,
          y: 55,
          width: 160,
          height: 20,
          content: '',
          fontSize: config.styles?.locationFontSize || 10,
          fontWeight: config.styles?.locationFontWeight || 400,
          color: config.styles?.locationColor || '#888',
          textAlign: config.styles?.locationTextAlign || 'center',
          zIndex: 1,
          selected: false
        });
      }
      // Asegurar estilos por defecto para location
      if (!config.styles) config.styles = {};
      config.styles.locationFontSize = config.styles.locationFontSize ?? 10;
      config.styles.locationFontWeight = config.styles.locationFontWeight ?? 400;
      config.styles.locationColor = config.styles.locationColor ?? '#888888';
      config.styles.locationTextCase = config.styles.locationTextCase ?? 'none';
      config.styles.locationTextAlign = config.styles.locationTextAlign ?? 'center';
    }
    
    return config;
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
export async function printLabelHtml(printerName: string, name: string, company: string, location: string, ticket: number) {
  await ensureQZ();

  const savedConfig = loadSavedConfig();
  let html: string;
  let pageWidth = 55;
  let pageHeight = 44;

  if (savedConfig && savedConfig.styles) {
    const { styles, elements = [], logoDataUrl } = savedConfig;
    pageWidth = styles.pageWidth;
    pageHeight = styles.pageHeight;

    // Buscar elementos configurados en el editor
    const logoEl    = elements.find((e: any) => e.type === 'logo');
    const nameEl    = elements.find((e: any) => e.type === 'name');
    const companyEl = elements.find((e: any) => e.type === 'company');
    const locationEl = elements.find((e: any) => e.type === 'location');
    const ticketEl  = elements.find((e: any) => e.type === 'ticket');

    // Logo (usa mm del editor si existen; sino, fallback centrado arriba)
    let logoHtml = '';
    if (logoEl?.content || logoDataUrl) {
      if (logoEl) {
        const xMm = (logoEl.x / 4).toFixed(2);
        const yMm = (logoEl.y / 4).toFixed(2);
        const wMm = (logoEl.width / 4).toFixed(2);
        const hMm = (logoEl.height / 4).toFixed(2);
        logoHtml = `<img src="${logoEl.content}" style="position:absolute;left:${xMm}mm;top:-3mm;width:${wMm}mm;height:${hMm}mm;object-fit:contain;" />`;
      } else {
        // centrado por defecto
        logoHtml = `<img src="${logoDataUrl}" style="position:absolute;left:0;top:2mm;width:100%;height:8mm;object-fit:contain;" />`;
      }
    }

    // Top del bloque de textos: tomamos el y del 'name' si existe, o del 'company', o 12mm

    const blockTop = '12'

      // nameEl ? (nameEl.y / 4).toFixed(2)
      // : companyEl ? (companyEl.y / 4).toFixed(2)
      // : '12';

    const nameSize   = nameEl?.fontSize ?? 14;
    const nameWeight = nameEl?.fontWeight ?? 600;
    const nameColor  = nameEl?.color ?? '#000';
    const nameAlign  = (nameEl?.textAlign ?? 'center') as 'left'|'center'|'right';
    const nameTextCase = styles.nameTextCase ?? 'none';

    const compSize   = companyEl?.fontSize ?? 12;
    const compWeight = companyEl?.fontWeight ?? 400;
    const compColor  = companyEl?.color ?? '#666';
    const compAlign  = (companyEl?.textAlign ?? 'center') as 'left'|'center'|'right';
    const companyTextCase = styles.companyTextCase ?? 'none';

    const locSize   = locationEl?.fontSize ?? 10;
    const locWeight = locationEl?.fontWeight ?? 400;
    const locColor  = locationEl?.color ?? '#888';
    const locAlign  = (locationEl?.textAlign ?? 'center') as 'left'|'center'|'right';
    const locationTextCase = styles.locationTextCase ?? 'none';

    // Ticket: si el editor tiene posición, la usamos; sino abajo-derecha
    let ticketHtml = '';
    if (ticketEl) {
      const xMm = (ticketEl.x / 4).toFixed(2);
      const yMm = (ticketEl.y / 4).toFixed(2);
      const wMm = (ticketEl.width / 4).toFixed(2);
      const hMm = (ticketEl.height / 4).toFixed(2);
      const tSize = ticketEl.fontSize ?? 18;
      const tWeight = ticketEl.fontWeight ?? 700;
      const tColor = ticketEl.color ?? '#000';
      const tAlign = (ticketEl.textAlign ?? 'center') as 'left'|'center'|'right';
      const jc = tAlign === 'center' ? 'center' : (tAlign === 'right' ? 'flex-end' : 'flex-start');
      ticketHtml = `
        <div style="position:absolute;left:${xMm}mm;top:${yMm}mm;width:${wMm}mm;height:${hMm}mm;display:flex;align-items:center;justify-content:${jc};
                    font-size:${tSize}pt;font-weight:${tWeight};color:${tColor};font-family:${styles.fontFamily};">
          ${ticket}
        </div>`;
    } else {
      ticketHtml = `<div class="ticket">${ticket}</div>`;
    }

    html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: ${pageWidth}mm ${pageHeight}mm; margin: ${styles.pageMargin}mm; }
    * { box-sizing: border-box; margin:0; padding:0; }
    body { width:${pageWidth}mm; height:${pageHeight}mm; position:relative; overflow:hidden; font-family:${styles.fontFamily}; }
    .container { width:100%; height:100%; position:relative; display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;  }
    .block {
       left:0; width:100%;
      display:flex; flex-direction:column; align-items:center; text-align:center;
    }
    .name {
      font-size:${nameSize}pt; font-weight:${nameWeight}; color:${nameColor};
      text-align:${nameAlign}; white-space:normal; word-wrap:break-word; overflow-wrap:break-word; line-height:1.2;
    }
    .company {
      font-size:${compSize}pt; font-weight:${compWeight}; color:${compColor}; margin-top:1mm;padding-left:3mm;padding-right:3mm;
      text-align:${compAlign}; white-space:normal; word-wrap:break-word; overflow-wrap:break-word; line-height:1.2;
    }
    .location {
      font-size:${locSize}pt; font-weight:${locWeight}; color:${locColor}; margin-top:0.5mm;
      text-align:${locAlign}; white-space:normal; word-wrap:break-word; overflow-wrap:break-word; line-height:1.2;
    }
    .ticket { position:absolute; bottom:2mm; right:2mm; font-size:18pt; font-weight:700; }
  </style>
</head>
<body>
  <div class="container">
    ${logoHtml}
    <div class="block">
      <div class="name">${esc(applyTextCase(name, nameTextCase))}</div>
      <div class="company">${esc(applyTextCase(company, companyTextCase))}</div>
      ${location ? `<div class="location">${esc(applyTextCase(location, locationTextCase))}</div>` : ''}
    </div>
    ${ticketHtml}
  </div>
</body>
</html>`;
  } else {
    // Fallback sin config guardada
    html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @page { size:55mm 44mm; margin:0; }
  body { margin:0; width:55mm; height:44mm; overflow:hidden; position:relative; font-family:Arial; }
  .logo { position:absolute; left:0; top:-10mm; width:100%; height:8mm; object-fit:contain; }
  .block { position:absolute; left:0; top:12mm; width:100%; display:flex; flex-direction:column; align-items:center; text-align:center; }
  .name { font-size:14pt; font-weight:600; line-height:1.2; white-space:normal; word-wrap:break-word; overflow-wrap:break-word; }
  .company { font-size:12pt; color:#666; margin-top:1mm; line-height:1.2; white-space:normal; word-wrap:break-word; overflow-wrap:break-word; }
  .location { font-size:10pt; color:#888; margin-top:0.5mm; line-height:1.2; white-space:normal; word-wrap:break-word; overflow-wrap:break-word; }
  .ticket { position:absolute; bottom:2mm; right:2mm; font-size:18pt; font-weight:700; }
</style></head>
<body>
  <div class="block">
    <div class="name">${esc(name)}</div>
    <div class="company">${esc(company)}</div>
    ${location ? `<div class="location">${esc(location)}</div>` : ''}
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

  const payload = [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }];
  await window.qz.print(cfg, payload);
}


// Utility function to apply text case transformations
const applyTextCase = (text: string, textCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize'): string => {
  switch (textCase) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    case 'none':
    default:
      return text;
  }
};

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