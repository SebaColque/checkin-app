declare global { interface Window { qz: any } }

let qzConnected = false;

export async function ensureQZ() {
  if (qzConnected && window.qz?.websocket?.isActive()) return;
  await window.qz?.websocket?.connect();
  qzConnected = true;
}

export async function printLabelHtml(printerName: string, name: string, ticket: number) {
  await ensureQZ();

  // Plantilla de 60x40mm; ajustá tamaños según tu etiqueta real
  const html = `
  <div style="width:60mm;height:40mm;padding:2mm;display:flex;flex-direction:column;justify-content:center;font-family:Arial">
    <div style="font-size:14pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(name)}</div>
    <div style="font-size:28pt;font-weight:700;margin-top:2mm">#${ticket}</div>
  </div>`;

  const cfg = window.qz.configs.create(printerName || 'Xprinter'); // nombre tal cual figura en el sistema
  await window.qz.print(cfg, [{ type: 'html', format: 'html', data: html }]);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'} as any)[m]);
}
