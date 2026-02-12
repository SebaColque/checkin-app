'use client';

import { useState, useEffect } from 'react';
import { listPrinters, getDefaultPrinter, ensureQZ } from '../lib/print';
import {
  saveConfigurationToCloud,
  updateConfigurationInCloud,
  loadConfigurationFromCloud,
  loadDefaultConfigurationFromCloud,
  listConfigurationsFromCloud,
  deleteConfigurationFromCloud,
  saveConfigurationToLocal,
  loadConfigurationFromLocal,
  exportConfigurationToFile,
  importConfigurationFromFile,
  QZConfiguration,
  SavedQZConfiguration
} from '../lib/qz-config';

interface CanvasElement {
  id: string;
  type: 'name' | 'company' | 'location' | 'ticket' | 'logo';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
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
  nameTextCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  nameFontFamily: string;
  nameFontStyle: 'normal' | 'italic';
  nameTextDecoration: 'none' | 'underline' | 'line-through';
  
  // Company styles
  companyFontSize: number;
  companyColor: string;
  companyFontWeight: number;
  companyTextCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  companyFontFamily: string;
  companyFontStyle: 'normal' | 'italic';
  companyTextDecoration: 'none' | 'underline' | 'line-through';

  // Location styles
  locationFontSize: number;
  locationColor: string;
  locationFontWeight: number;
  locationTextCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  locationFontFamily: string;
  locationFontStyle: 'normal' | 'italic';
  locationTextDecoration: 'none' | 'underline' | 'line-through';

  // Ticket styles
  ticketFontSize: number;
  ticketFontWeight: number;
  ticketColor: string;
  ticketFontFamily: string;
  ticketFontStyle: 'normal' | 'italic';
  ticketTextDecoration: 'none' | 'underline' | 'line-through';
  
  // Logo styles
  logoSize: number;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoMargin: number;
  
  // General
  fontFamily: string;
  
  // Text alignment options
  nameTextAlign: 'left' | 'center';
  companyTextAlign: 'left' | 'center';
  locationTextAlign: 'left' | 'center';
  ticketTextAlign: 'left' | 'center';
};

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
  nameTextCase: 'none',
  nameFontFamily: 'Arial',
  nameFontStyle: 'normal',
  nameTextDecoration: 'none',
  companyFontSize: 12,
  companyColor: '#666666',
  companyFontWeight: 400,
  companyTextCase: 'none',
  companyFontFamily: 'Arial',
  companyFontStyle: 'normal',
  companyTextDecoration: 'none',
  locationFontSize: 10,
  locationColor: '#888888',
  locationFontWeight: 400,
  locationTextCase: 'none',
  locationFontFamily: 'Arial',
  locationFontStyle: 'normal',
  locationTextDecoration: 'none',
  ticketFontSize: 18,
  ticketFontWeight: 700,
  ticketColor: '#000000',
  ticketFontFamily: 'Arial',
  ticketFontStyle: 'normal',
  ticketTextDecoration: 'none',
  logoSize: 8,
  logoPosition: 'top-left',
  logoMargin: 2,
  fontFamily: 'Arial',
  nameTextAlign: 'left',
  companyTextAlign: 'left',
  locationTextAlign: 'left',
  ticketTextAlign: 'center'
};

export default function QZEditor() {
  const [styles, setStyles] = useState<PrintStyles>(defaultStyles);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [testName, setTestName] = useState('Juan Pérez');
  const [testCompany, setTestCompany] = useState('Empresa ABC');
  const [testLocation, setTestLocation] = useState('Sala A');
  const [testTicket, setTestTicket] = useState(123);
  const [isPrinting, setIsPrinting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cloudConfigs, setCloudConfigs] = useState<SavedQZConfiguration[]>([]);
  const [selectedCloudConfig, setSelectedCloudConfig] = useState<string>('');
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [snapGuides, setSnapGuides] = useState<{x: number[], y: number[]}>({x: [] as number[], y: [] as number[]});
  const [showSnapGuides, setShowSnapGuides] = useState(false);

  useEffect(() => {
    loadPrinters();
    initializeElements();
    loadCloudConfigurations();
    loadDefaultConfiguration();
  }, []);

  // Re-initialize elements when test data changes
  useEffect(() => {
    setElements(prev => prev.map(el => {
      if (el.type === 'name') return { ...el, content: applyTextCase(testName, styles.nameTextCase) };
      if (el.type === 'company') return { ...el, content: applyTextCase(testCompany, styles.companyTextCase) };
      if (el.type === 'location') return { ...el, content: applyTextCase(testLocation, styles.locationTextCase) };
      if (el.type === 'ticket') return { ...el, content: testTicket.toString() };
      return el;
    }));
  }, [testName, testCompany, testLocation, testTicket, styles.nameTextCase, styles.companyTextCase, styles.locationTextCase]);

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
          fontFamily: styles.nameFontFamily,
          fontStyle: styles.nameFontStyle,
          textDecoration: styles.nameTextDecoration,
          ...(() => {
            const dims = calculateTextDimensions(el.content, styles.nameFontSize, styles.nameTextAlign, 180);
            return { width: dims.width, height: dims.height };
          })()
        };
      }
      if (el.type === 'company') {
        return {
          ...el,
          fontSize: styles.companyFontSize,
          fontWeight: styles.companyFontWeight,
          color: styles.companyColor,
          textAlign: styles.companyTextAlign,
          fontFamily: styles.companyFontFamily,
          fontStyle: styles.companyFontStyle,
          textDecoration: styles.companyTextDecoration,
          ...(() => {
            const dims = calculateTextDimensions(el.content, styles.companyFontSize, styles.companyTextAlign, 180);
            return { width: dims.width, height: dims.height };
          })()
        };
      }
      if (el.type === 'location') {
        return {
          ...el,
          fontSize: styles.locationFontSize,
          fontWeight: styles.locationFontWeight,
          color: styles.locationColor,
          textAlign: styles.locationTextAlign,
          fontFamily: styles.locationFontFamily,
          fontStyle: styles.locationFontStyle,
          textDecoration: styles.locationTextDecoration,
          ...(() => {
            const dims = calculateTextDimensions(el.content, styles.locationFontSize, styles.locationTextAlign, 180);
            return { width: dims.width, height: dims.height };
          })()
        };
      }
      if (el.type === 'ticket') {
        return { 
          ...el, 
          fontSize: styles.ticketFontSize,
          fontWeight: styles.ticketFontWeight,
          color: styles.ticketColor,
          textAlign: styles.ticketTextAlign,
          fontFamily: styles.ticketFontFamily,
          fontStyle: styles.ticketFontStyle,
          textDecoration: styles.ticketTextDecoration,
          ...(() => {
            const dims = calculateTextDimensions(el.content, styles.ticketFontSize, styles.ticketTextAlign, 120);
            return { width: dims.width, height: dims.height };
          })()
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
  }, [styles.nameFontSize, styles.nameFontWeight, styles.nameColor, styles.nameTextAlign, styles.nameFontFamily, styles.nameFontStyle, styles.nameTextDecoration,
      styles.companyFontSize, styles.companyFontWeight, styles.companyColor, styles.companyTextAlign, styles.companyFontFamily, styles.companyFontStyle, styles.companyTextDecoration,
      styles.locationFontSize, styles.locationFontWeight, styles.locationColor, styles.locationTextAlign, styles.locationFontFamily, styles.locationFontStyle, styles.locationTextDecoration,
      styles.ticketFontSize, styles.ticketFontWeight, styles.ticketColor, styles.ticketTextAlign, styles.ticketFontFamily, styles.ticketFontStyle, styles.ticketTextDecoration,
      styles.logoSize]);

  // Function to calculate text width and height based on content and font size
  const calculateTextDimensions = (text: string, fontSize: number, textAlign: 'left' | 'center' = 'left', maxWidth: number = 200) => {
    const avgCharWidth = fontSize * 0.6; // Approximate character width
    const minWidth = 60; // Minimum width of 60px
    
    // Calculate if text needs wrapping
    const textWidth = text.length * avgCharWidth;
    const needsWrapping = textWidth > maxWidth;
    
    if (needsWrapping) {
      // Calculate number of lines needed
      const charsPerLine = Math.floor(maxWidth / avgCharWidth);
      const lines = Math.ceil(text.length / charsPerLine);
      const height = (fontSize + 4) * lines;
      const width = textAlign === 'center' ? maxWidth + 40 : maxWidth;
      
      return { width, height, lines };
    } else {
      // Single line
      const baseWidth = Math.max(textWidth, minWidth);
      const width = textAlign === 'center' ? baseWidth + 40 : baseWidth;
      const height = fontSize + 4;
      
      return { width, height, lines: 1 };
    }
  };

  const initializeElements = () => {
    const initialElements: CanvasElement[] = [
      {
        id: 'name',
        type: 'name',
        x: 10,
        y: 10,
        ...(() => {
          const dims = calculateTextDimensions(testName, styles.nameFontSize, styles.nameTextAlign, 180);
          return { width: dims.width, height: dims.height };
        })(),
        content: applyTextCase(testName, styles.nameTextCase),
        fontSize: styles.nameFontSize,
        fontWeight: styles.nameFontWeight,
        color: styles.nameColor,
        textAlign: styles.nameTextAlign,
        fontFamily: styles.nameFontFamily,
        fontStyle: styles.nameFontStyle,
        textDecoration: styles.nameTextDecoration,
        zIndex: 1,
        selected: false
      },
      {
        id: 'company',
        type: 'company',
        x: 10,
        y: 35,
        ...(() => {
          const dims = calculateTextDimensions(testCompany, styles.companyFontSize, styles.companyTextAlign, 180);
          return { width: dims.width, height: dims.height };
        })(),
        content: applyTextCase(testCompany, styles.companyTextCase),
        fontSize: styles.companyFontSize,
        fontWeight: styles.companyFontWeight,
        color: styles.companyColor,
        textAlign: styles.companyTextAlign,
        fontFamily: styles.companyFontFamily,
        fontStyle: styles.companyFontStyle,
        textDecoration: styles.companyTextDecoration,
        zIndex: 1,
        selected: false
      },
      {
        id: 'location',
        type: 'location',
        x: 10,
        y: 55,
        ...(() => {
          const dims = calculateTextDimensions(testLocation, styles.locationFontSize, styles.locationTextAlign, 180);
          return { width: dims.width, height: dims.height };
        })(),
        content: applyTextCase(testLocation, styles.locationTextCase),
        fontSize: styles.locationFontSize,
        fontWeight: styles.locationFontWeight,
        color: styles.locationColor,
        textAlign: styles.locationTextAlign,
        fontFamily: styles.locationFontFamily,
        fontStyle: styles.locationFontStyle,
        textDecoration: styles.locationTextDecoration,
        zIndex: 1,
        selected: false
      },
      {
        id: 'ticket',
        type: 'ticket',
        x: 150,
        y: 120,
        ...(() => {
          const dims = calculateTextDimensions(testTicket.toString(), styles.ticketFontSize, styles.ticketTextAlign, 120);
          return { width: dims.width, height: dims.height };
        })(),
        content: testTicket.toString(),
        fontSize: styles.ticketFontSize,
        fontWeight: styles.ticketFontWeight,
        color: styles.ticketColor,
        textAlign: styles.ticketTextAlign,
        fontFamily: styles.ticketFontFamily,
        fontStyle: styles.ticketFontStyle,
        textDecoration: styles.ticketTextDecoration,
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
    const canvasWidth = Math.min(400, styles.pageWidth * 4);
    const canvasHeight = Math.min(300, styles.pageHeight * 4);
    
    let newX = e.clientX - canvasRect.left - dragOffset.x;
    let newY = e.clientY - canvasRect.top - dragOffset.y;
    
    const draggedEl = elements.find(el => el.id === draggedElement);
    if (!draggedEl) return;
    
    // Snap tolerance in pixels
    const snapTolerance = 8;
    const guides: {x: number[], y: number[]} = { x: [], y: [] };
    
    // Canvas center lines
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    
    // Element center
    const elementCenterX = newX + draggedEl.width / 2;
    const elementCenterY = newY + draggedEl.height / 2;
    
    // Check snap to canvas center
    if (Math.abs(elementCenterX - canvasCenterX) < snapTolerance) {
      newX = canvasCenterX - draggedEl.width / 2;
      guides.x.push(canvasCenterX);
    }
    
    if (Math.abs(elementCenterY - canvasCenterY) < snapTolerance) {
      newY = canvasCenterY - draggedEl.height / 2;
      guides.y.push(canvasCenterY);
    }
    
    // Check snap to other elements
    elements.forEach(el => {
      if (el.id === draggedElement) return;
      
      const elCenterX = el.x + el.width / 2;
      const elCenterY = el.y + el.height / 2;
      
      // Horizontal alignment with other elements
      if (Math.abs(elementCenterX - elCenterX) < snapTolerance) {
        newX = elCenterX - draggedEl.width / 2;
        guides.x.push(elCenterX);
      }
      
      // Vertical alignment with other elements
      if (Math.abs(elementCenterY - elCenterY) < snapTolerance) {
        newY = elCenterY - draggedEl.height / 2;
        guides.y.push(elCenterY);
      }
      
      // Snap to edges
      if (Math.abs(newX - el.x) < snapTolerance) {
        newX = el.x;
        guides.x.push(el.x);
      }
      
      if (Math.abs(newX + draggedEl.width - (el.x + el.width)) < snapTolerance) {
        newX = el.x + el.width - draggedEl.width;
        guides.x.push(el.x + el.width);
      }
      
      if (Math.abs(newY - el.y) < snapTolerance) {
        newY = el.y;
        guides.y.push(el.y);
      }
      
      if (Math.abs(newY + draggedEl.height - (el.y + el.height)) < snapTolerance) {
        newY = el.y + el.height - draggedEl.height;
        guides.y.push(el.y + el.height);
      }
    });
    
    // Constrain to canvas bounds
    newX = Math.max(0, Math.min(newX, canvasWidth - draggedEl.width));
    newY = Math.max(0, Math.min(newY, canvasHeight - draggedEl.height));
    
    setSnapGuides(guides);
    setShowSnapGuides(guides.x.length > 0 || guides.y.length > 0);
    
    setElements(prev => prev.map(el =>
      el.id === draggedElement
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
    setShowSnapGuides(false);
    setSnapGuides({x: [], y: []});
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
        const maxWidth = el.type === 'ticket' ? 120 : 180;
        const dims = calculateTextDimensions(content, fontSize, el.textAlign, maxWidth);
        return { 
          ...el, 
          content,
          width: dims.width,
          height: dims.height
        };
      }
      return el;
    }));
    
    // Update the corresponding state variables
    if (elementId === 'name') setTestName(content);
    if (elementId === 'company') setTestCompany(content);
    if (elementId === 'ticket') setTestTicket(parseInt(content) || 0);
  };

  // Center alignment function
  const centerElementHorizontally = (elementId: string) => {
    const canvasWidth = Math.min(400, styles.pageWidth * 4);
    
    setElements(prev => prev.map(el => {
      if (el.id === elementId) {
        const centerX = (canvasWidth - el.width) / 2;
        return { ...el, x: centerX };
      }
      return el;
    }));
  };

  const centerAllElementsHorizontally = () => {
    const canvasWidth = Math.min(400, styles.pageWidth * 4);
    
    setElements(prev => prev.map(el => {
      const centerX = (canvasWidth - el.width) / 2;
      return { ...el, x: centerX };
    }));
  };

  // Load cloud configurations
  const loadCloudConfigurations = async () => {
    try {
      const configs = await listConfigurationsFromCloud();
      setCloudConfigs(configs);
    } catch (error) {
      console.error('Error loading cloud configurations:', error);
    }
  };

  // Load default configuration on startup
  const loadDefaultConfiguration = async () => {
    try {
      const defaultConfig = await loadDefaultConfigurationFromCloud();
      if (defaultConfig) {
        applyConfiguration(defaultConfig.configuration);
      } else {
        // Fallback to localStorage
        const localConfig = loadConfigurationFromLocal();
        if (localConfig) {
          applyConfiguration(localConfig);
        }
      }
    } catch (error) {
      console.error('Error loading default configuration:', error);
      // Fallback to localStorage
      const localConfig = loadConfigurationFromLocal();
      if (localConfig) {
        applyConfiguration(localConfig);
      }
    }
  };

  // Apply configuration to current state
  const applyConfiguration = (config: QZConfiguration) => {
    // Asegurar valores por defecto para propiedades que pueden no existir en configuraciones antiguas
    const mergedStyles = {
      ...config.styles,
      // Location defaults
      locationFontSize: config.styles.locationFontSize ?? 10,
      locationFontWeight: config.styles.locationFontWeight ?? 400,
      locationColor: config.styles.locationColor ?? '#888888',
      locationTextCase: config.styles.locationTextCase ?? 'none',
      locationTextAlign: config.styles.locationTextAlign ?? 'left',
      locationFontFamily: config.styles.locationFontFamily ?? 'Arial',
      locationFontStyle: config.styles.locationFontStyle ?? 'normal',
      locationTextDecoration: config.styles.locationTextDecoration ?? 'none',
      // Name defaults
      nameFontFamily: config.styles.nameFontFamily ?? 'Arial',
      nameFontStyle: config.styles.nameFontStyle ?? 'normal',
      nameTextDecoration: config.styles.nameTextDecoration ?? 'none',
      // Company defaults
      companyFontFamily: config.styles.companyFontFamily ?? 'Arial',
      companyFontStyle: config.styles.companyFontStyle ?? 'normal',
      companyTextDecoration: config.styles.companyTextDecoration ?? 'none',
      // Ticket defaults
      ticketFontFamily: config.styles.ticketFontFamily ?? 'Arial',
      ticketFontStyle: config.styles.ticketFontStyle ?? 'normal',
      ticketTextDecoration: config.styles.ticketTextDecoration ?? 'none'
    };
    setStyles(mergedStyles);

    // Asegurar que siempre haya un elemento location y migrar propiedades faltantes
    const existingElements = config.elements.map((el: any) => ({ 
      ...el, 
      selected: false,
      // Migrar propiedades nuevas que pueden no existir en configuraciones antiguas
      fontFamily: el.fontFamily ?? styles.fontFamily ?? 'Arial',
      fontStyle: el.fontStyle ?? 'normal',
      textDecoration: el.textDecoration ?? 'none'
    }));
    const hasLocation = existingElements.some((el: any) => el.type === 'location');

    let finalElements = existingElements;
    if (!hasLocation) {
      const locationEl: CanvasElement = {
        id: 'location',
        type: 'location',
        x: 10,
        y: 55,
        ...(() => {
          const dims = calculateTextDimensions(testLocation, mergedStyles.locationFontSize, mergedStyles.locationTextAlign, 180);
          return { width: dims.width, height: dims.height };
        })(),
        content: applyTextCase(testLocation, mergedStyles.locationTextCase),
        fontSize: mergedStyles.locationFontSize,
        fontWeight: mergedStyles.locationFontWeight,
        color: mergedStyles.locationColor,
        textAlign: mergedStyles.locationTextAlign,
        fontFamily: mergedStyles.locationFontFamily,
        fontStyle: mergedStyles.locationFontStyle,
        textDecoration: mergedStyles.locationTextDecoration,
        zIndex: 1,
        selected: false
      };
      finalElements = [...existingElements, locationEl];
    }

    setElements(finalElements);
    if (config.logoDataUrl) {
      setLogoDataUrl(config.logoDataUrl);
    }
  };

  // Save configuration to localStorage (quick save)
  const saveConfigurationLocal = () => {
    const config: QZConfiguration = {
      name: 'Local Configuration',
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
        fontFamily: el.fontFamily,
        fontStyle: el.fontStyle,
        textDecoration: el.textDecoration,
        zIndex: el.zIndex
      })),
      logoDataUrl,
      timestamp: Date.now()
    };
    
    saveConfigurationToLocal(config);
    alert('✅ Configuración guardada localmente');
  };

  // Load configuration from localStorage
  const loadConfigurationLocal = () => {
    const config = loadConfigurationFromLocal();
    if (config) {
      applyConfiguration(config);
      alert('✅ Configuración local cargada correctamente');
    } else {
      alert('❌ No se encontró configuración local');
    }
  };

  // Save configuration to cloud
  const saveConfigurationCloud = async () => {
    if (!configName.trim()) {
      alert('❌ Por favor ingresa un nombre para la configuración');
      return;
    }

    setIsSaving(true);
    try {
      const config: Omit<QZConfiguration, 'id'> & { isDefault?: boolean } = {
        name: configName.trim(),
        description: configDescription.trim() || undefined,
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
          fontFamily: el.fontFamily,
          fontStyle: el.fontStyle,
          textDecoration: el.textDecoration,
          zIndex: el.zIndex
        })),
        logoDataUrl,
        timestamp: Date.now(),
        isDefault: false
      };

      await saveConfigurationToCloud(config);
      await loadCloudConfigurations();
      setShowSaveDialog(false);
      setConfigName('');
      setConfigDescription('');
      alert('✅ Configuración guardada en la nube correctamente');
    } catch (error) {
      console.error('Error saving configuration to cloud:', error);
      alert('❌ Error al guardar la configuración: ' + error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load configuration from cloud
  const loadConfigurationCloud = async () => {
    if (!selectedCloudConfig) {
      alert('❌ Por favor selecciona una configuración');
      return;
    }

    setIsLoadingConfig(true);
    try {
      const config = await loadConfigurationFromCloud(selectedCloudConfig);
      applyConfiguration(config.configuration);
      setShowLoadDialog(false);
      setSelectedCloudConfig('');
      alert('✅ Configuración cargada desde la nube correctamente');
    } catch (error) {
      console.error('Error loading configuration from cloud:', error);
      alert('❌ Error al cargar la configuración: ' + error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Delete configuration from cloud
  const deleteConfigurationCloud = async (configId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta configuración?')) {
      return;
    }

    try {
      await deleteConfigurationFromCloud(configId);
      await loadCloudConfigurations();
      alert('✅ Configuración eliminada correctamente');
    } catch (error) {
      console.error('Error deleting configuration:', error);
      alert('❌ Error al eliminar la configuración: ' + error);
    }
  };

  // Export configuration to file
  const exportConfiguration = () => {
    const config: QZConfiguration = {
      name: configName || 'Exported Configuration',
      description: configDescription,
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
        fontFamily: el.fontFamily,
        fontStyle: el.fontStyle,
        textDecoration: el.textDecoration,
        zIndex: el.zIndex
      })),
      logoDataUrl,
      timestamp: Date.now()
    };

    exportConfigurationToFile(config);
  };

  // Import configuration from file
  const importConfiguration = async () => {
    try {
      const config = await importConfigurationFromFile();
      applyConfiguration(config);
      alert('✅ Configuración importada correctamente');
    } catch (error) {
      console.error('Error importing configuration:', error);
      alert('❌ Error al importar la configuración: ' + error);
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
        const fontFamily = element.fontFamily || styles.fontFamily || 'Arial';
        const fontStyle = element.fontStyle === 'italic' ? 'italic' : 'normal';
        const textDecoration = element.textDecoration === 'underline' ? 'underline' : element.textDecoration === 'line-through' ? 'line-through' : 'none';
        
        // Build container style (positioning only)
        const containerStyle = `position:absolute;left:${xMm}mm;top:${yMm}mm;width:${widthMm}mm;height:${heightMm}mm;`;
        
        // Build text style with basic font properties
        let textStyle = `font-size:${fontSize}pt;font-weight:${fontWeight};color:${color};font-family:'${fontFamily}',Arial,sans-serif;font-style:${fontStyle};`;
        if (textDecoration !== 'none') {
          textStyle += `text-decoration:${textDecoration};`;
        }
        
        // Wrap content with appropriate HTML elements for better compatibility
        let contentHtml = esc(element.content);
        if (fontStyle === 'italic') {
          contentHtml = `<i>${contentHtml}</i>`;
        }
        if (textDecoration === 'underline') {
          contentHtml = `<u>${contentHtml}</u>`;
        } else if (textDecoration === 'line-through') {
          contentHtml = `<s>${contentHtml}</s>`;
        }
        
        // Container for layout, span for text styling
        return `      <div style="${containerStyle}display:flex;align-items:flex-start;justify-content:${textAlign === 'center' ? 'center' : 'flex-start'};"><span style="${textStyle}word-wrap:break-word;overflow-wrap:break-word;line-height:1.2;">${contentHtml}</span></div>`;
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

    setIsPrinting(true);
    try {
      // Import the print function dynamically to avoid SSR issues
      const { ensureQZ } = await import('../lib/print');
      
      // Ensure QZ connection (reuses existing connection if available)
      await ensureQZ();
      
      // Create a custom print function with our dynamic styles
      const html = generateHTML();
      
      // Debug: log first text element to verify styles
      const firstTextElement = elements.find(el => el.type !== 'logo');
      if (firstTextElement) {
        console.log('Elemento a imprimir:', {
          type: firstTextElement.type,
          fontStyle: firstTextElement.fontStyle,
          textDecoration: firstTextElement.textDecoration,
          fontFamily: firstTextElement.fontFamily
        });
      }
      
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
      setIsPrinting(false);
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Formato de Texto</label>
                  <select
                    value={styles.nameTextCase}
                    onChange={(e) => updateStyle('nameTextCase', e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Sin cambios</option>
                    <option value="uppercase">MAYÚSCULAS</option>
                    <option value="lowercase">minúsculas</option>
                    <option value="capitalize">Tipo Oración</option>
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Fuente</label>
                  <select
                    value={styles.nameFontFamily}
                    onChange={(e) => updateStyle('nameFontFamily', e.target.value)}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Estilo</label>
                  <select
                    value={styles.nameFontStyle}
                    onChange={(e) => updateStyle('nameFontStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Cursiva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Decoración</label>
                  <select
                    value={styles.nameTextDecoration}
                    onChange={(e) => updateStyle('nameTextDecoration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Ninguna</option>
                    <option value="underline">Subrayado</option>
                    <option value="line-through">Tachado</option>
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Formato de Texto</label>
                  <select
                    value={styles.companyTextCase}
                    onChange={(e) => updateStyle('companyTextCase', e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Sin cambios</option>
                    <option value="uppercase">MAYÚSCULAS</option>
                    <option value="lowercase">minúsculas</option>
                    <option value="capitalize">Tipo Oración</option>
                  </select>
                </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Fuente</label>
                  <select
                    value={styles.companyFontFamily}
                    onChange={(e) => updateStyle('companyFontFamily', e.target.value)}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Estilo</label>
                  <select
                    value={styles.companyFontStyle}
                    onChange={(e) => updateStyle('companyFontStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Cursiva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Decoración</label>
                  <select
                    value={styles.companyTextDecoration}
                    onChange={(e) => updateStyle('companyTextDecoration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Ninguna</option>
                    <option value="underline">Subrayado</option>
                    <option value="line-through">Tachado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location Styles */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 text-gray-900">Estilo de la Ubicación</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Tamaño Fuente (pt)</label>
                  <input
                    type="number"
                    value={styles.locationFontSize}
                    onChange={(e) => updateStyle('locationFontSize', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Peso Fuente</label>
                  <select
                    value={styles.locationFontWeight}
                    onChange={(e) => updateStyle('locationFontWeight', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={400}>Normal</option>
                    <option value={500}>Medium</option>
                    <option value={600}>Semi Bold</option>
                    <option value={700}>Bold</option>
                    <option value={800}>Extra Bold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Formato de Texto</label>
                  <select
                    value={styles.locationTextCase}
                    onChange={(e) => updateStyle('locationTextCase', e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Sin cambios</option>
                    <option value="uppercase">MAYÚSCULAS</option>
                    <option value="lowercase">minúsculas</option>
                    <option value="capitalize">Tipo Oración</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={styles.locationTextAlign === 'center'}
                      onChange={(e) => updateStyle('locationTextAlign', e.target.checked ? 'center' : 'left')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Centrar texto</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Fuente</label>
                  <select
                    value={styles.locationFontFamily}
                    onChange={(e) => updateStyle('locationFontFamily', e.target.value)}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Estilo</label>
                  <select
                    value={styles.locationFontStyle}
                    onChange={(e) => updateStyle('locationFontStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Cursiva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Decoración</label>
                  <select
                    value={styles.locationTextDecoration}
                    onChange={(e) => updateStyle('locationTextDecoration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Ninguna</option>
                    <option value="underline">Subrayado</option>
                    <option value="line-through">Tachado</option>
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Fuente</label>
                  <select
                    value={styles.ticketFontFamily}
                    onChange={(e) => updateStyle('ticketFontFamily', e.target.value)}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Estilo</label>
                  <select
                    value={styles.ticketFontStyle}
                    onChange={(e) => updateStyle('ticketFontStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Cursiva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-900">Decoración</label>
                  <select
                    value={styles.ticketTextDecoration}
                    onChange={(e) => updateStyle('ticketTextDecoration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Ninguna</option>
                    <option value="underline">Subrayado</option>
                    <option value="line-through">Tachado</option>
                  </select>
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
              {/* Local Storage Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={saveConfigurationLocal}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  💾 Local
                </button>
                <button
                  onClick={loadConfigurationLocal}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  📂 Local
                </button>
              </div>

              {/* Cloud Storage Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  ☁️ Guardar
                </button>
                <button
                  onClick={() => setShowLoadDialog(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  ☁️ Cargar
                </button>
              </div>

              {/* Import/Export Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportConfiguration}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  📤 Exportar
                </button>
                <button
                  onClick={importConfiguration}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  📥 Importar
                </button>
              </div>
              
              <button
                onClick={centerAllElementsHorizontally}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                ↔️ Centrar Todo Horizontalmente
              </button>
              
              <button
                onClick={initializeElements}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🔄 Reiniciar Posiciones
              </button>
              
              <button
                onClick={printTest}
                disabled={isPrinting || !selectedPrinter}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isPrinting ? 'Imprimiendo...' : '🖨️ Imprimir Prueba'}
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6 ">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Vista Previa</h2>
            
            {/* Instructions and Scale indicator */}
            <div className="mb-4 space-y-2">
              <div className="text-sm text-blue-600 font-medium">
                💡 Arrastra los elementos para moverlos - se ajustarán automáticamente a guías de alineación
              </div>
              <div className="text-sm text-green-600 font-medium">
                ↔️ Usa los botones de centrado para alinear elementos horizontalmente
              </div>
              <div className="text-sm text-purple-600 font-medium">
                📏 Las líneas azules aparecen cuando los elementos se alinean entre sí o con el centro
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
                      fontFamily: element.fontFamily || styles.fontFamily,
                      fontStyle: element.fontStyle || 'normal',
                      textDecoration: element.textDecoration || 'none',
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
                      <div 
                        className="w-full overflow-hidden"
                        style={{
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                          lineHeight: '1.2'
                        }}
                      >
                        {element.content}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Snap Guide Lines */}
                {showSnapGuides && (
                  <>
                    {snapGuides.x.map((x, index) => (
                      <div
                        key={`x-guide-${index}`}
                        className="absolute bg-blue-500 pointer-events-none"
                        style={{
                          left: `${x}px`,
                          top: '0px',
                          width: '1px',
                          height: '100%',
                          zIndex: 1000,
                          opacity: 0.7
                        }}
                      />
                    ))}
                    {snapGuides.y.map((y, index) => (
                      <div
                        key={`y-guide-${index}`}
                        className="absolute bg-blue-500 pointer-events-none"
                        style={{
                          left: '0px',
                          top: `${y}px`,
                          width: '100%',
                          height: '1px',
                          zIndex: 1000,
                          opacity: 0.7
                        }}
                      />
                    ))}
                  </>
                )}
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
                      <div className="mt-2">
                        <button
                          onClick={() => centerElementHorizontally(selectedElement.id)}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-2 rounded text-xs transition-colors"
                        >
                          ↔️ Centrar Horizontalmente
                        </button>
                      </div>
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

        {/* Save to Cloud Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Guardar Configuración en la Nube</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="Mi configuración personalizada"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={configDescription}
                    onChange={(e) => setConfigDescription(e.target.value)}
                    placeholder="Descripción opcional de la configuración..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setConfigName('');
                    setConfigDescription('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveConfigurationCloud}
                  disabled={isSaving || !configName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load from Cloud Dialog */}
        {showLoadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Cargar Configuración desde la Nube</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Configuración</label>
                  <select
                    value={selectedCloudConfig}
                    onChange={(e) => setSelectedCloudConfig(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {cloudConfigs.map(config => (
                      <option key={config.id} value={config.id}>
                        {config.name} {config.is_default ? '(Por defecto)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedCloudConfig && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    {(() => {
                      const config = cloudConfigs.find(c => c.id === selectedCloudConfig);
                      if (!config) return null;
                      return (
                        <div className="text-sm text-gray-600">
                          <p><strong>Descripción:</strong> {config.description || 'Sin descripción'}</p>
                          <p><strong>Actualizado:</strong> {new Date(config.updated_at).toLocaleString()}</p>
                        </div>
                      );
                    })()} 
                  </div>
                )}
                
                {cloudConfigs.length > 0 && (
                  <div className="text-sm text-gray-500">
                    <p>Configuraciones disponibles: {cloudConfigs.length}</p>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {cloudConfigs.map(config => (
                        <div key={config.id} className="flex justify-between items-center py-1">
                          <span className="truncate">{config.name}</span>
                          <button
                            onClick={() => deleteConfigurationCloud(config.id)}
                            className="text-red-500 hover:text-red-700 text-xs ml-2"
                            title="Eliminar configuración"
                            style={{background: '#dc2626'}}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowLoadDialog(false);
                    setSelectedCloudConfig('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={loadConfigurationCloud}
                  disabled={isLoadingConfig || !selectedCloudConfig}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                >
                  {isLoadingConfig ? 'Cargando...' : 'Cargar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
