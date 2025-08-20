export interface QZConfiguration {
  id?: string;
  name: string;
  description?: string;
  styles: any;
  elements: any[];
  logoDataUrl?: string;
  timestamp: number;
  isDefault?: boolean;
}

export interface SavedQZConfiguration {
  id: string;
  name: string;
  description?: string;
  configuration: QZConfiguration;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Cloud storage functions
export async function saveConfigurationToCloud(config: Omit<QZConfiguration, 'id'> & { isDefault?: boolean }): Promise<SavedQZConfiguration> {
  const response = await fetch('/api/qz-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: config.name,
      description: config.description,
      configuration: {
        styles: config.styles,
        elements: config.elements,
        logoDataUrl: config.logoDataUrl,
        timestamp: config.timestamp
      },
      isDefault: config.isDefault || false
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save configuration');
  }

  return response.json();
}

export async function updateConfigurationInCloud(config: QZConfiguration & { isDefault?: boolean }): Promise<SavedQZConfiguration> {
  if (!config.id) {
    throw new Error('Configuration ID is required for updates');
  }

  const response = await fetch('/api/qz-config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: config.id,
      name: config.name,
      description: config.description,
      configuration: {
        styles: config.styles,
        elements: config.elements,
        logoDataUrl: config.logoDataUrl,
        timestamp: config.timestamp
      },
      isDefault: config.isDefault || false
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update configuration');
  }

  return response.json();
}

export async function loadConfigurationFromCloud(id: string): Promise<SavedQZConfiguration> {
  const response = await fetch(`/api/qz-config?id=${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load configuration');
  }

  return response.json();
}

export async function loadDefaultConfigurationFromCloud(): Promise<SavedQZConfiguration | null> {
  const response = await fetch('/api/qz-config?default=true');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load default configuration');
  }

  return response.json();
}

export async function listConfigurationsFromCloud(): Promise<SavedQZConfiguration[]> {
  const response = await fetch('/api/qz-config');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list configurations');
  }

  return response.json();
}

export async function deleteConfigurationFromCloud(id: string): Promise<void> {
  const response = await fetch(`/api/qz-config?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete configuration');
  }
}

// Local storage functions (existing functionality)
export function saveConfigurationToLocal(config: QZConfiguration): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('qz-editor-config', JSON.stringify(config));
}

export function loadConfigurationFromLocal(): QZConfiguration | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('qz-editor-config');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Error loading configuration from localStorage:', error);
    return null;
  }
}

// Export/Import functions
export function exportConfigurationToFile(config: QZConfiguration): void {
  const dataStr = JSON.stringify(config, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `qz-config-${config.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function importConfigurationFromFile(): Promise<QZConfiguration> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          
          // Validate the configuration structure
          if (!config.styles || !config.elements || !config.timestamp) {
            throw new Error('Invalid configuration file format');
          }
          
          resolve(config);
        } catch (error) {
          reject(new Error('Failed to parse configuration file: ' + error));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    
    input.click();
  });
}
