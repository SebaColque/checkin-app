'use client';

import { useState, useEffect } from 'react';
import { listPrinters, getDefaultPrinter, ensureQZ } from '../lib/print';

interface PrintStyles {
  // Page settings
  pageWidth: number;
  pageHeight: number;
  pageMargin: number;
  pagePadding: number;
  
  // Container styles
  containerPadding: number;
  
  // Name styles
  nameFontSize: number;
  nameFontWeight: number;
  nameColor: string;
  nameMarginBottom: number;
  
  // Company styles
  companyFontSize: number;
  companyColor: string;
  
  // Ticket styles
  ticketFontSize: number;
  ticketFontWeight: number;
  ticketColor: string;
  
  // Logo styles
  logoSize: number;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoMargin: number;
  
  // General
  fontFamily: string;
}

const defaultStyles: PrintStyles = {
  pageWidth: 55,
  pageHeight: 44,
  pageMargin: 0,
  pagePadding: 0,
  containerPadding: 2,
  nameFontSize: 14,
  nameFontWeight: 600,
  nameColor: '#000000',
  nameMarginBottom: 1,
  companyFontSize: 12,
  companyColor: '#666666',
  ticketFontSize: 18,
  ticketFontWeight: 700,
  ticketColor: '#000000',
  logoSize: 8,
  logoPosition: 'top-left',
  logoMargin: 2,
  fontFamily: 'Arial'
};

export default function QZEditor() {
  const [styles, setStyles] = useState<PrintStyles>(defaultStyles);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [testName, setTestName] = useState('Juan Pérez');
  const [testCompany, setTestCompany] = useState('Empresa ABC');
  const [testTicket, setTestTicket] = useState(123);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      const printerList = await listPrinters();
      setPrinters(printerList);
      if (printerList.length > 0) {
        const defaultPrinter = await getDefaultPrinter();
        setSelectedPrinter(defaultPrinter || printerList[0]);
      }
    } catch (error) {
      console.error('Error loading printers:', error);
    }
  };

  const updateStyle = (key: keyof PrintStyles, value: any) => {
    setStyles(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoDataUrl(e.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoDataUrl('');
  };

  const generateHTML = () => {
    const esc = (s: string) => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'} as any)[m]);
    
    const getLogoPosition = () => {
      const margin = styles.logoMargin;
      switch (styles.logoPosition) {
        case 'top-left': return `top:${margin}mm;left:${margin}mm;`;
        case 'top-right': return `top:${margin}mm;right:${margin}mm;`;
        case 'bottom-left': return `bottom:${margin}mm;left:${margin}mm;`;
        case 'bottom-right': return `bottom:${margin}mm;right:${margin}mm;`;
        default: return `top:${margin}mm;left:${margin}mm;`;
      }
    };
    
    const logoHtml = logoDataUrl ? `<img src="${logoDataUrl}" style="position:absolute;${getLogoPosition()}width:${styles.logoSize}mm;height:auto;max-height:${styles.logoSize}mm;object-fit:contain;" />` : '';
    
    return `<!doctype html>
  <html><head>
    <meta charset="utf-8">
    <style>
      @page { 
        size: ${styles.pageWidth}mm ${styles.pageHeight}mm; 
        margin: ${styles.pageMargin}mm; 
        padding: ${styles.pagePadding}mm;
      }
      * { 
        box-sizing: border-box; 
      }
      body { 
        margin: 0; 
        padding: 0; 
        width: ${styles.pageWidth}mm; 
        height: ${styles.pageHeight}mm; 
        overflow: hidden;
        position: relative;
      }
    </style>
  </head>
  <body>
    <div style="width:100%;height:100%;padding:${styles.containerPadding}mm;display:flex;flex-direction:column;justify-content:flex-start;font-family:${styles.fontFamily};position:relative">
      ${logoHtml}
      <div style="font-size:${styles.nameFontSize}pt;font-weight:${styles.nameFontWeight};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:${styles.nameMarginBottom}mm;color:${styles.nameColor}">${esc(testName)}</div>
      <div style="font-size:${styles.companyFontSize}pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${styles.companyColor}">${esc(testCompany)}</div>
      <div style="position:absolute;bottom:${styles.containerPadding}mm;right:${styles.containerPadding}mm;font-size:${styles.ticketFontSize}pt;font-weight:${styles.ticketFontWeight};color:${styles.ticketColor}">${testTicket}</div>
    </div>
  </body></html>`;
  };

  const printTest = async () => {
    if (!selectedPrinter) {
      alert('Por favor selecciona una impresora');
      return;
    }

    setIsLoading(true);
    try {
      // Import the print function dynamically to avoid SSR issues
      const { ensureQZ } = await import('../lib/print');
      
      // Ensure QZ connection (reuses existing connection if available)
      await ensureQZ();
      
      // Create a custom print function with our dynamic styles
      const html = generateHTML();
      
      const cfg = window.qz.configs.create(selectedPrinter, {
        units: 'mm',
        size: { width: styles.pageWidth, height: styles.pageHeight },
        margins: { 
          top: styles.pageMargin, 
          right: styles.pageMargin, 
          bottom: styles.pageMargin, 
          left: styles.pageMargin 
        },
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
      
    } catch (error) {
      console.error('Error printing:', error);
      alert('Error al imprimir: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Editor de Plantilla de Impresión</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Configuración</h2>
            
            {/* Test Data */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-3 text-gray-900">Datos de Prueba</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Nombre</label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Empresa</label>
                  <input
                    type="text"
                    value={testCompany}
                    onChange={(e) => setTestCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Ticket #</label>
                  <input
                    type="number"
                    value={testTicket}
                    onChange={(e) => setTestTicket(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Page Settings */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 text-gray-900">Configuración de Página</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Ancho (mm)</label>
                  <input
                    type="number"
                    value={styles.pageWidth}
                    onChange={(e) => updateStyle('pageWidth', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Alto (mm)</label>
                  <input
                    type="number"
                    value={styles.pageHeight}
                    onChange={(e) => updateStyle('pageHeight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Margen Página (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={styles.pageMargin}
                    onChange={(e) => updateStyle('pageMargin', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Padding Página (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={styles.pagePadding}
                    onChange={(e) => updateStyle('pagePadding', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Padding Contenedor (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={styles.containerPadding}
                    onChange={(e) => updateStyle('containerPadding', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Name Styles */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 text-gray-900">Estilo del Nombre</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Tamaño Fuente (pt)</label>
                  <input
                    type="number"
                    value={styles.nameFontSize}
                    onChange={(e) => updateStyle('nameFontSize', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Peso Fuente</label>
                  <select
                    value={styles.nameFontWeight}
                    onChange={(e) => updateStyle('nameFontWeight', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={400}>Normal</option>
                    <option value={500}>Medium</option>
                    <option value={600}>Semi Bold</option>
                    <option value={700}>Bold</option>
                    <option value={800}>Extra Bold</option>
                  </select>
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Color</label>
                  <input
                    type="color"
                    value={styles.nameColor}
                    onChange={(e) => updateStyle('nameColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Margen Inferior (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={styles.nameMarginBottom}
                    onChange={(e) => updateStyle('nameMarginBottom', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Company Styles */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 text-gray-900">Estilo de la Empresa</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Tamaño Fuente (pt)</label>
                  <input
                    type="number"
                    value={styles.companyFontSize}
                    onChange={(e) => updateStyle('companyFontSize', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Color</label>
                  <input
                    type="color"
                    value={styles.companyColor}
                    onChange={(e) => updateStyle('companyColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div> */}
              </div>
            </div>

            {/* Ticket Styles */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 text-gray-900">Estilo del Ticket (Esquina Inferior Derecha)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Tamaño Fuente (pt)</label>
                  <input
                    type="number"
                    value={styles.ticketFontSize}
                    onChange={(e) => updateStyle('ticketFontSize', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Peso Fuente</label>
                  <select
                    value={styles.ticketFontWeight}
                    onChange={(e) => updateStyle('ticketFontWeight', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={400}>Normal</option>
                    <option value={500}>Medium</option>
                    <option value={600}>Semi Bold</option>
                    <option value={700}>Bold</option>
                    <option value={800}>Extra Bold</option>
                  </select>
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Color</label>
                  <input
                    type="color"
                    value={styles.ticketColor}
                    onChange={(e) => updateStyle('ticketColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div> */}
              </div>
            </div>

            {/* Logo Settings */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 text-gray-900">Logo</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Subir Logo</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {logoFile && (
                      <button
                        onClick={removeLogo}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {logoFile && (
                    <p className="text-sm text-gray-600 mt-1">📁 {logoFile.name}</p>
                  )}
                </div>
                
                {logoDataUrl && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Posición</label>
                        <select
                          value={styles.logoPosition}
                          onChange={(e) => updateStyle('logoPosition', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="top-left">Arriba Izquierda</option>
                          <option value="top-right">Arriba Derecha</option>
                          <option value="bottom-left">Abajo Izquierda</option>
                          <option value="bottom-right">Abajo Derecha</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Tamaño (mm)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={styles.logoSize}
                          onChange={(e) => updateStyle('logoSize', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Margen (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={styles.logoMargin}
                          onChange={(e) => updateStyle('logoMargin', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Font Family */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Familia de Fuente</label>
              <select
                value={styles.fontFamily}
                onChange={(e) => updateStyle('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
              </select>
            </div>

            {/* Printer Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Impresora</label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar impresora...</option>
                {printers.map(printer => (
                  <option key={printer} value={printer}>{printer}</option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              onClick={printTest}
              disabled={isLoading || !selectedPrinter}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Imprimiendo...' : 'Imprimir Prueba'}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6 ">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Vista Previa</h2>
            
            {/* Scale indicator */}
            <div className="mb-4 text-sm text-gray-600">
              Escala: {styles.pageWidth}mm × {styles.pageHeight}mm (vista aproximada)
            </div>
            
            {/* Preview container */}
            <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
              <div 
                className="bg-white border border-gray-400 mx-auto relative"
                style={{
                  width: `${Math.min(400, styles.pageWidth * 4)}px`,
                  height: `${Math.min(300, styles.pageHeight * 4)}px`,
                  fontFamily: styles.fontFamily
                }}
              >
                <div 
                  className="absolute inset-0 flex flex-col justify-start"
                  style={{
                    padding: `${styles.containerPadding * 4}px`,
                  }}
                >
                  {/* Logo */}
                  {logoDataUrl && (
                    <img 
                      src={logoDataUrl}
                      alt="Logo"
                      style={{
                        position: 'absolute',
                        ...(styles.logoPosition === 'top-left' && { top: `${styles.logoMargin * 4}px`, left: `${styles.logoMargin * 4}px` }),
                        ...(styles.logoPosition === 'top-right' && { top: `${styles.logoMargin * 4}px`, right: `${styles.logoMargin * 4}px` }),
                        ...(styles.logoPosition === 'bottom-left' && { bottom: `${styles.logoMargin * 4}px`, left: `${styles.logoMargin * 4}px` }),
                        ...(styles.logoPosition === 'bottom-right' && { bottom: `${styles.logoMargin * 4}px`, right: `${styles.logoMargin * 4}px` }),
                        width: `${styles.logoSize * 4}px`,
                        height: 'auto',
                        maxHeight: `${styles.logoSize * 4}px`,
                        objectFit: 'contain'
                      }}
                    />
                  )}
                  
                  <div 
                    className="truncate"
                    style={{
                      fontSize: `${Math.min(styles.nameFontSize * 0.8, 16)}px`,
                      fontWeight: styles.nameFontWeight,
                      color: styles.nameColor,
                      marginBottom: `${styles.nameMarginBottom * 4}px`
                    }}
                  >
                    {testName}
                  </div>
                  <div 
                    className="truncate"
                    style={{
                      fontSize: `${Math.min(styles.companyFontSize * 0.8, 14)}px`,
                      color: styles.companyColor
                    }}
                  >
                    {testCompany}
                  </div>
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: `${styles.containerPadding * 4}px`,
                      right: `${styles.containerPadding * 4}px`,
                      fontSize: `${Math.min(styles.ticketFontSize * 0.8, 24)}px`,
                      fontWeight: styles.ticketFontWeight,
                      color: styles.ticketColor
                    }}
                  >
                    {testTicket}
                  </div>
                </div>
              </div>
            </div>

            {/* HTML Code Preview */}
            <div className="mt-6">
              <h3 className="font-medium mb-3 text-gray-900">Código HTML Generado</h3>
              <textarea
                value={generateHTML()}
                readOnly
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
