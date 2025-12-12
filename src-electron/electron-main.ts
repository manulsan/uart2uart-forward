import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { SerialPort } from 'serialport';
import fs from 'fs/promises';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let mainWindow: BrowserWindow | undefined;
const activePorts: Map<number, SerialPort> = new Map();

// App IPC handlers
ipcMain.on('app:quit', () => {
  app.quit();
});

// Serial port IPC handlers
ipcMain.handle('serial:list', async () => {
  try {
    const ports = await SerialPort.list();
    return { success: true, ports };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(
  'serial:open',
  async (_event, portId: number, portPath: string, baudRate: number = 9600) => {
    try {
      // Close existing port if open
      const existingPort = activePorts.get(portId);
      if (existingPort?.isOpen) {
        await new Promise<void>((resolve) => {
          existingPort.close(() => resolve());
        });
      }

      const newPort = new SerialPort({
        path: portPath,
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      return new Promise((resolve) => {
        newPort.on('open', () => {
          activePorts.set(portId, newPort);
          resolve({ success: true });
        });

        newPort.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });

        newPort.on('data', (data) => {
          mainWindow?.webContents.send(`serial:data:${portId}`, data.toString());
        });
      });
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle('serial:write', async (_event, portId: number, data: string) => {
  try {
    const port = activePorts.get(portId);
    if (!port?.isOpen) {
      return { success: false, error: 'Port is not open' };
    }

    return new Promise((resolve) => {
      port.write(data, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('serial:close', async (_event, portId: number) => {
  try {
    const port = activePorts.get(portId);
    if (port?.isOpen) {
      return new Promise((resolve) => {
        port.close((error) => {
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            activePorts.delete(portId);
            resolve({ success: true });
          }
        });
      });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Config file handlers
ipcMain.handle(
  'config:save',
  async (_event, config: { dataPrefix: string; dataSuffix: string }) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Save Configuration',
        defaultPath: 'uart2uart-config.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled) {
        return { success: false, cancelled: true };
      }

      await fs.writeFile(result.filePath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle('config:load', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Load Configuration',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    if (!result.filePaths || result.filePaths.length === 0) {
      return { success: false, error: 'No file selected' };
    }

    const filePath = result.filePaths[0]!;
    const data = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(data);
    return { success: true, config, filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Macro file handlers
ipcMain.handle('macros:save', async (_event, macros) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save Macros',
      defaultPath: 'macros.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    if (!result.filePath) {
      return { success: false, error: 'No file path provided' };
    }

    await fs.writeFile(result.filePath, JSON.stringify(macros, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('macros:load', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Load Macros',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    if (!result.filePaths || result.filePaths.length === 0) {
      return { success: false, error: 'No file selected' };
    }

    const filePath = result.filePaths[0]!;
    const data = await fs.readFile(filePath, 'utf-8');
    const macros = JSON.parse(data);
    return { success: true, macros, filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1080,
    height: 750,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  });

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL);
  } else {
    await mainWindow.loadFile('index.html');
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
  //alex code here
  Menu.setApplicationMenu(null); // remove menu bar
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh Ports',
          accelerator: 'F5',
          click: () => {
            mainWindow?.webContents.send('menu:refresh-ports');
          },
        },
        { type: 'separator' },
        {
          label: 'UART Mode',
          submenu: [
            {
              label: 'Single Mode',
              type: 'radio',
              click: () => {
                mainWindow?.webContents.send('menu:uart-mode', 'single');
              },
            },
            {
              label: 'Dual (Forwarding) Mode',
              type: 'radio',
              checked: true,
              click: () => {
                mainWindow?.webContents.send('menu:uart-mode', 'dual');
              },
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Configuration',
          submenu: [
            {
              label: 'Load',
              accelerator: 'Ctrl+O',
              click: () => {
                mainWindow?.webContents.send('menu:load-config');
              },
            },
            {
              label: 'Save',
              accelerator: 'Ctrl+S',
              click: () => {
                mainWindow?.webContents.send('menu:save-config');
              },
            },
          ],
        },
        { type: 'separator' },
        { label: 'Exit', click: () => app.quit() },
      ],
    },
    // {
    //   label: 'Edit',
    //   submenu: [
    //     { role: 'undo' },
    //     { role: 'redo' },
    //     { type: 'separator' },
    //     { role: 'cut' },
    //     { role: 'copy' },
    //     { role: 'paste' },
    //   ],
    // },
    // {
    //   label: 'View',
    //   submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }],
    // },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  //Menu.setApplicationMenu(null);
}

void app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow();
  }
});
