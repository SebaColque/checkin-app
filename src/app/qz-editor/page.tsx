'use client';

import { useState, useEffect } from 'react';
import { listPrinters, getDefaultPrinter, ensureQZ } from '../lib/print';

interface CanvasElement {
  id: string;
  type: 'name' | 'company' | 'ticket' | 'logo';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  zIndex: number;
  selected: boolean;
  textAlign?: 'left' | 'center';
}

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
  companyFontWeight: number;
  
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
  
  // Text alignment options
  nameTextAlign: 'left' | 'center';
  companyTextAlign: 'left' | 'center';
  ticketTextAlign: 'left' | 'center';
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
  companyFontWeight: 400,
  ticketFontSize: 18,
  ticketFontWeight: 700,
  ticketColor: '#000000',
  logoSize: 8,
  logoPosition: 'top-left',
  logoMargin: 2,
  fontFamily: 'Arial',
  nameTextAlign: 'left',
  companyTextAlign: 'left',
  ticketTextAlign: 'center'
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
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadPrinters();
    initializeElements();
  }, []);

  // Re-initialize elements when test data changes
  useEffect(() => {
    setElements(prev => prev.map(el => {
      if (el.type === 'name') return { ...el, content: testName };
      if (el.type === 'company') return { ...el, content: testCompany };
      if (el.type === 'ticket') return { ...el, content: testTicket.toString() };
      return el;
    }));
  }, [testName, testCompany, testTicket]);

  // Update element styles when styles change
  useEffect(() => {
    setElements(prev => prev.map(el => {
      if (el.type === 'name') {
        return { 
          ...el, 
          fontSize: styles.nameFontSize,
          fontWeight: styles.nameFontWeight,
          color: styles.nameColor,
          textAlign: styles.nameTextAlign,
          width: calculateTextWidth(el.content, styles.nameFontSize, styles.nameTextAlign),
          height: styles.nameFontSize + 4
        };
      }
      if (el.type === 'company') {
        return { 
          ...el, 
          fontSize: styles.companyFontSize,
          fontWeight: styles.companyFontWeight,
          color: styles.companyColor,
          textAlign: styles.companyTextAlign,
          width: calculateTextWidth(el.content, styles.companyFontSize, styles.companyTextAlign),
          height: styles.companyFontSize + 4
        };
      }
      if (el.type === 'ticket') {
        return { 
          ...el, 
          fontSize: styles.ticketFontSize,
          fontWeight: styles.ticketFontWeight,
          color: styles.ticketColor,
          textAlign: styles.ticketTextAlign,
          width: calculateTextWidth(el.content, styles.ticketFontSize, styles.ticketTextAlign),
          height: styles.ticketFontSize + 4
        };
      }
      if (el.type === 'logo') {
        return {
          ...el,
          width: styles.logoSize * 4,
          height: styles.logoSize * 4
        };
      }
      return el;
    }));
  }, [styles.nameFontSize, styles.nameFontWeight, styles.nameColor, styles.nameTextAlign,
      styles.companyFontSize, styles.companyFontWeight, styles.companyColor, styles.companyTextAlign,
      styles.ticketFontSize, styles.ticketFontWeight, styles.ticketColor, styles.ticketTextAlign,
      styles.logoSize]);

  // Function to calculate text width based on content and font size
  const calculateTextWidth = (text: string, fontSize: number, textAlign: 'left' | 'center' = 'left') => {
    const avgCharWidth = fontSize * 0.6; // Approximate character width
    const baseWidth = Math.max(text.length * avgCharWidth, 60); // Minimum width of 60px
    
    // If centered, add extra width for better centering
    return textAlign === 'center' ? baseWidth + 40 : baseWidth;
  };

  const initializeElements = () => {
    const initialElements: CanvasElement[] = [
      {
        id: 'name',
        type: 'name',
        x: 10,
        y: 10,
        width: calculateTextWidth(testName, styles.nameFontSize, styles.nameTextAlign),
        height: styles.nameFontSize + 4,
        content: testName,
        fontSize: styles.nameFontSize,
        fontWeight: styles.nameFontWeight,
        color: styles.nameColor,
        textAlign: styles.nameTextAlign,
        zIndex: 1,
        selected: false
      },
      {
        id: 'company',
        type: 'company',
        x: 10,
        y: 35,
        width: calculateTextWidth(testCompany, styles.companyFontSize, styles.companyTextAlign),
        height: styles.companyFontSize + 4,
        content: testCompany,
        fontSize: styles.companyFontSize,
        fontWeight: styles.companyFontWeight,
        color: styles.companyColor,
        textAlign: styles.companyTextAlign,
        zIndex: 1,
        selected: false
      },
      {
        id: 'ticket',
        type: 'ticket',
        x: 150,
        y: 120,
        width: calculateTextWidth(testTicket.toString(), styles.ticketFontSize, styles.ticketTextAlign),
        height: styles.ticketFontSize + 4,
        content: testTicket.toString(),
        fontSize: styles.ticketFontSize,
        fontWeight: styles.ticketFontWeight,
        color: styles.ticketColor,
        textAlign: styles.ticketTextAlign,
        zIndex: 1,
        selected: false
      }
    ];

    if (logoDataUrl) {
      initialElements.push({
        id: 'logo',
        type: 'logo',
        x: 10,
        y: 10,
        width: styles.logoSize * 4,
        height: styles.logoSize * 4,
        content: logoDataUrl,
        zIndex: 0,
        selected: false
      });
    }

    setElements(initialElements);
  };

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

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    setDraggedElement(elementId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    // Select the element
    setElements(prev => prev.map(el => ({
      ...el,
      selected: el.id === elementId
    })));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedElement) return;

    const canvasRect = e.currentTarget.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    setElements(prev => prev.map(el =>
      el.id === draggedElement
        ? { ...el, x: Math.max(0, newX), y: Math.max(0, newY) }
        : el
    ));
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
  };

  const selectElement = (elementId: string) => {
    setElements(prev => prev.map(el => ({
      ...el,
      selected: el.id === elementId
    })));
  };

  const updateElementContent = (elementId: string, content: string) => {
    setElements(prev => prev.map(el => {
      if (el.id === elementId) {
        const fontSize = el.fontSize || 12;
        return { 
          ...el, 
          content,
          width: calculateTextWidth(content, fontSize),
          height: fontSize + 4
        };
      }
      return el;
    }));
    
    // Update the corresponding state variables
    if (elementId === 'name') setTestName(content);
    if (elementId === 'company') setTestCompany(content);
    if (elementId === 'ticket') setTestTicket(parseInt(content) || 0);
  };

  // Save configuration to localStorage
  const saveConfiguration = () => {
    if (typeof window === 'undefined') return;
    
    const config = {
      styles,
      elements: elements.map(el => ({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        content: el.content,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        color: el.color,
        textAlign: el.textAlign,
        zIndex: el.zIndex
      })),
      logoDataUrl,
      timestamp: Date.now()
    };
    
    localStorage.setItem('qz-editor-config', JSON.stringify(config));
    alert('✅ Configuración guardada correctamente');
  };

  // Load configuration from localStorage
  const loadConfiguration = () => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('qz-editor-config');
    if (!saved) return;
    
    try {
      const config = JSON.parse(saved);
      setStyles(config.styles);
      setElements(config.elements.map((el: any) => ({ ...el, selected: false })));
      if (config.logoDataUrl) {
        setLogoDataUrl(config.logoDataUrl);
      }
      alert('✅ Configuración cargada correctamente');
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('❌ Error al cargar la configuración');
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string || '';
        setLogoDataUrl(dataUrl);
        
        // Add logo element to canvas
        const logoElement: CanvasElement = {
          id: 'logo',
          type: 'logo',
          x: 10,
          y: 10,
          width: styles.logoSize * 4,
          height: styles.logoSize * 4,
          content: dataUrl,
          zIndex: 0,
          selected: false
        };
        
        setElements(prev => {
          const withoutLogo = prev.filter(el => el.type !== 'logo');
          return [...withoutLogo, logoElement];
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoDataUrl('');
    // Remove logo element from canvas
    setElements(prev => prev.filter(el => el.type !== 'logo'));
  };

  const generateHTML = () => {
    const esc = (s: string) => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'} as any)[m]);
    
    // Convert canvas positions to mm for printing (scale factor is 4)
    const elementsHtml = elements.map(element => {
      const xMm = (element.x / 4).toFixed(2);
      const yMm = (element.y / 4).toFixed(2);
      const widthMm = (element.width / 4).toFixed(2);
      const heightMm = (element.height / 4).toFixed(2);
      
      if (element.type === 'logo') {
        return `      <img src="${element.content}" style="position:absolute;left:${xMm}mm;top:${yMm}mm;width:${widthMm}mm;height:${heightMm}mm;object-fit:contain;" />`;
      } else {
        const fontSize = element.fontSize || 12;
        const fontWeight = element.fontWeight || 400;
        const color = element.color || '#000000';
        const textAlign = element.textAlign || 'left';
        
        return `      <div style="position:absolute;left:${xMm}mm;top:${yMm}mm;width:${widthMm}mm;height:${heightMm}mm;font-size:${fontSize}pt;font-weight:${fontWeight};color:${color};display:flex;align-items:center;justify-content:${textAlign === 'center' ? 'center' : 'flex-start'};white-space:nowrap;overflow:visible;font-family:${styles.fontFamily};">${esc(element.content)}</div>`;
      }
    }).join('\n');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { 
      size: ${styles.pageWidth}mm ${styles.pageHeight}mm; 
      margin: ${styles.pageMargin}mm; 
    }
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    body { 
      width: ${styles.pageWidth}mm; 
      height: ${styles.pageHeight}mm; 
      position: relative;
      font-family: ${styles.fontFamily};
      overflow: hidden;
    }
    .container {
      width: 100%;
      height: 100%;
      position: relative;
    }
  </style>
</head>
<body>
  <div class="container">
${elementsHtml}
  </div>
</body>
</html>`;
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
                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={styles.nameTextAlign === 'center'}
                      onChange={(e) => updateStyle('nameTextAlign', e.target.checked ? 'center' : 'left')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Centrar texto</span>
                  </label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Peso Fuente</label>
                  <select
                    value={styles.companyFontWeight}
                    onChange={(e) => updateStyle('companyFontWeight', parseInt(e.target.value))}
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
                    value={styles.companyColor}
                    onChange={(e) => updateStyle('companyColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div> */}
                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={styles.companyTextAlign === 'center'}
                      onChange={(e) => updateStyle('companyTextAlign', e.target.checked ? 'center' : 'left')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Centrar texto</span>
                  </label>
                </div>
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
                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={styles.ticketTextAlign === 'center'}
                      onChange={(e) => updateStyle('ticketTextAlign', e.target.checked ? 'center' : 'left')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Centrar texto</span>
                  </label>
                </div>
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

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={saveConfiguration}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  💾 Guardar
                </button>
                <button
                  onClick={loadConfiguration}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  📂 Cargar
                </button>
              </div>
              
              <button
                onClick={initializeElements}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🔄 Reiniciar Posiciones
              </button>
              
              <button
                onClick={printTest}
                disabled={isLoading || !selectedPrinter}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isLoading ? 'Imprimiendo...' : '🖨️ Imprimir Prueba'}
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6 ">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Vista Previa</h2>
            
            {/* Instructions and Scale indicator */}
            <div className="mb-4 space-y-2">
              <div className="text-sm text-blue-600 font-medium">
                💡 Arrastra los elementos para moverlos libremente por el lienzo
              </div>
              <div className="text-sm text-gray-600">
                Escala: {styles.pageWidth}mm × {styles.pageHeight}mm (vista aproximada)
              </div>
            </div>
            
            {/* Interactive Canvas */}
            <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
              <div 
                className="bg-white border border-gray-400 mx-auto relative cursor-crosshair"
                style={{
                  width: `${Math.min(400, styles.pageWidth * 4)}px`,
                  height: `${Math.min(300, styles.pageHeight * 4)}px`,
                  fontFamily: styles.fontFamily
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {elements.map((element) => (
                  <div
                    key={element.id}
                    className={`absolute cursor-move select-none ${
                      element.selected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-400'
                    }`}
                    style={{
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      width: `${element.width}px`,
                      height: `${element.height}px`,
                      zIndex: element.zIndex,
                      fontSize: element.fontSize ? `${Math.min(element.fontSize * 0.8, 24)}px` : undefined,
                      fontWeight: element.fontWeight || 'normal',
                      color: element.color || '#000000',
                      textAlign: element.textAlign || 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: element.textAlign === 'center' ? 'center' : 'flex-start'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                    onClick={() => selectElement(element.id)}
                  >
                    {element.type === 'logo' ? (
                      <img 
                        src={element.content}
                        alt="Logo"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          pointerEvents: 'none'
                        }}
                      />
                    ) : (
                      <span className="truncate w-full">
                        {element.content}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Element Properties Panel */}
            {elements.find(el => el.selected) && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2 text-gray-900">Elemento Seleccionado</h4>
                {(() => {
                  const selectedElement = elements.find(el => el.selected);
                  if (!selectedElement) return null;
                  
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">X</label>
                          <input
                            type="number"
                            value={Math.round(selectedElement.x)}
                            onChange={(e) => {
                              const newX = parseInt(e.target.value) || 0;
                              setElements(prev => prev.map(el =>
                                el.id === selectedElement.id ? { ...el, x: newX } : el
                              ));
                            }}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Y</label>
                          <input
                            type="number"
                            value={Math.round(selectedElement.y)}
                            onChange={(e) => {
                              const newY = parseInt(e.target.value) || 0;
                              setElements(prev => prev.map(el =>
                                el.id === selectedElement.id ? { ...el, y: newY } : el
                              ));
                            }}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      {selectedElement.type !== 'logo' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Contenido</label>
                          <input
                            type="text"
                            value={selectedElement.content}
                            onChange={(e) => updateElementContent(selectedElement.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

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
