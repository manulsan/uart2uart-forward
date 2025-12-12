declare namespace NodeJS {
  interface ProcessEnv {
    QUASAR_PUBLIC_FOLDER: string;
    QUASAR_ELECTRON_PRELOAD_FOLDER: string;
    QUASAR_ELECTRON_PRELOAD_EXTENSION: string;
    APP_URL: string;
  }
}

interface PortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

interface SerialResponse {
  success: boolean;
  error?: string;
  ports?: PortInfo[];
}

interface Window {
  serialAPI: {
    listPorts: () => Promise<SerialResponse>;
    open: (portId: number, portPath: string, baudRate?: number) => Promise<SerialResponse>;
    write: (portId: number, data: string) => Promise<SerialResponse>;
    close: (portId: number) => Promise<SerialResponse>;
    onData: (portId: number, callback: (data: string) => void) => void;
    removeDataListener: (portId: number) => void;
  };
  electronAPI: {
    quit: () => void;
    onMenuRefreshPorts?: (callback: () => void) => void;
    onMenuLoadConfig?: (callback: () => void) => void;
    onMenuSaveConfig?: (callback: () => void) => void;
    onMenuUartMode?: (callback: (mode: string) => void) => void;
    saveConfig: (config: {
      dataPrefix: string;
      dataSuffix: string;
      port1?: { selectedPort: string; baudRate: number };
      port2?: { selectedPort: string; baudRate: number };
      autoForward?: boolean;
    }) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
    loadConfig: () => Promise<{
      success: boolean;
      config?: {
        dataPrefix: string;
        dataSuffix: string;
        port1?: { selectedPort: string; baudRate: number };
        port2?: { selectedPort: string; baudRate: number };
        autoForward?: boolean;
      };
      filePath?: string;
      cancelled?: boolean;
      error?: string;
    }>;
    saveMacros: (macros: unknown) => Promise<{
      success: boolean;
      filePath?: string;
      cancelled?: boolean;
      error?: string;
    }>;
    loadMacros: () => Promise<{
      success: boolean;
      macros?: unknown;
      filePath?: string;
      cancelled?: boolean;
      error?: string;
    }>;
  };
}
