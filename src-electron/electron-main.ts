import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { SerialPort } from 'serialport';
import fs from 'fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'child_process';

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

ipcMain.handle('firmware:selectFile', async (_event, mcuType: 'stm' | 'esp32') => {
  try {
    const extensions = mcuType === 'stm' ? ['hex'] : ['bin'];
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: `Select ${mcuType === 'stm' ? 'STM MCU' : 'ESP32'} Firmware File`,
      filters: [
        { name: `${mcuType === 'stm' ? 'HEX' : 'BIN'} Files`, extensions },
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
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('firmware:writeStm', async (event, filePath: string, mcuPartNo: string) => {
  try {
    const mcuToUse = mcuPartNo || 'stm8s103f3';
    console.log('Writing STM firmware:', filePath, 'for MCU:', mcuToUse);

    // Determine stm8flash path based on environment
    let stm8flashPath: string;
    if (app.isPackaged) {
      // Production: use bundled stm8flash from resources
      stm8flashPath = path.join(
        process.resourcesPath,
        'mcu-tools',
        'stmicro',
        platform === 'win32' ? 'stm8flash.exe' : 'stm8flash',
      );
    } else {
      // Development: use local mcu-tools folder
      stm8flashPath = path.join(
        process.cwd(),
        'mcu-tools',
        'stmicro',
        platform === 'win32' ? 'stm8flash.exe' : 'stm8flash',
      );
    }

    console.log('Using stm8flash from:', stm8flashPath);

    if (!existsSync(stm8flashPath)) {
      console.error('stm8flash not found at:', stm8flashPath);
      return {
        success: false,
        error: `stm8flash not found at ${stm8flashPath}. Please ensure mcu-tools/stmicro folder contains stm8flash executable.`,
      };
    }

    console.log(
      `Starting stm8flash with command: ${stm8flashPath} -c stlinkv2 -p ${mcuToUse} -w ${filePath}`,
    );

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const stm8flash = spawn(stm8flashPath, ['-c', 'stlinkv2', '-p', mcuToUse, '-w', filePath]);

      let progressCount = 0;
      const totalSteps = 100;

      stm8flash.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('stm8flash stdout:', output);

        // Update progress based on output
        progressCount += 10;
        if (progressCount <= 90) {
          event.sender.send('firmware:progress', progressCount);
        }
        if (progressCount >= totalSteps) {
          progressCount = totalSteps;
        }
      });

      stm8flash.stderr.on('data', (data) => {
        const output = data.toString();
        console.error('stm8flash stderr:', output);
      });

      stm8flash.on('close', (code) => {
        if (code === 0) {
          event.sender.send('firmware:progress', 100);
          console.log('STM firmware write completed successfully');
          resolve({ success: true });
        } else {
          console.error(`stm8flash process exited with code ${code}`);
          resolve({ success: false, error: `stm8flash exited with code ${code}` });
        }
      });

      stm8flash.on('error', (err) => {
        console.error('Failed to start stm8flash:', err);
        resolve({
          success: false,
          error: `Failed to start stm8flash: ${err.message}. Ensure stm8flash.exe is in mcu-tools/stmicro folder.`,
        });
      });
    });
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('firmware:writeEsp32', async (event, filePath: string, port: string) => {
  try {
    const portToUse = port || 'COM10';
    console.log('Writing ESP32 firmware:', filePath, 'to port:', portToUse);

    // Determine esptool.py path based on environment
    let esptoolPath: string;
    if (app.isPackaged) {
      // Production: use bundled esptool from resources
      esptoolPath = path.join(process.resourcesPath, 'mcu-tools', 'esptool', 'esptool.py');
    } else {
      // Development: use local mcu-tools folder
      esptoolPath = path.join(process.cwd(), 'mcu-tools', 'esptool', 'esptool.py');
    }

    console.log('Using esptool from:', esptoolPath);

    if (!existsSync(esptoolPath)) {
      console.error('esptool.py not found at:', esptoolPath);
      return {
        success: false,
        error: `esptool.py not found at ${esptoolPath}. Please ensure mcu-tools folder exists.`,
      };
    }

    console.log(
      `Starting esptool with command: python ${esptoolPath} --chip esp32 --port ${portToUse} --baud 460800 --before default_reset --after hard_reset write_flash -z --flash_mode dio --flash_freq 40m --flash_size detect 0x10000`,
      filePath,
    );

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      // Use bundled esptool.py directly
      const esptool = spawn('python', [
        esptoolPath,
        '--chip',
        'esp32',
        '--port',
        portToUse,
        '--baud',
        '460800',
        '--before',
        'default_reset',
        '--after',
        'hard_reset',
        'write_flash',
        '-z',
        '--flash_mode',
        'dio',
        '--flash_freq',
        '40m',
        '--flash_size',
        'detect',
        '0x10000',
        filePath,
      ]);

      let progressCount = 0;
      let hasOutput = false;
      let errorOutput = '';
      let stdOutput = '';

      esptool.stdout.on('data', (data) => {
        hasOutput = true;
        const output = data.toString();
        stdOutput += output;
        console.log('esptool stdout:', output);

        // Parse progress from esptool output (looks for percentage)
        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
          const percent = parseInt(progressMatch[1], 10);
          console.log('Progress from stdout:', percent);
          event.sender.send('firmware:progress', percent);
        } else {
          // Fallback progress update
          progressCount += 5;
          if (progressCount <= 90) {
            console.log('Fallback progress:', progressCount);
            event.sender.send('firmware:progress', progressCount);
          }
        }
      });

      esptool.stderr.on('data', (data) => {
        hasOutput = true;
        const output = data.toString();
        errorOutput += output;
        console.log('esptool stderr:', output);

        // esptool writes progress to stderr
        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
          const percent = parseInt(progressMatch[1], 10);
          console.log('Progress from stderr:', percent);
          event.sender.send('firmware:progress', percent);
        }
      });

      esptool.on('close', (code) => {
        console.log(`esptool process closed with code ${code}, hasOutput: ${hasOutput}`);
        if (code === 0) {
          event.sender.send('firmware:progress', 100);
          console.log('ESP32 firmware write completed successfully');
          resolve({ success: true });
        } else {
          const errorMsg = errorOutput || stdOutput || `Process exited with code ${code}`;
          console.error(`esptool failed. Error output:`, errorMsg);
          resolve({
            success: false,
            error: `esptool failed (code ${code}): ${errorMsg.substring(0, 200)}`,
          });
        }
      });

      esptool.on('error', (err) => {
        console.error('Failed to start esptool:', err);
        resolve({
          success: false,
          error: `Failed to start esptool: ${err.message}. Make sure Python and esptool are installed (pip install esptool).`,
        });
      });
    });
  } catch (error) {
    console.error('Exception in firmware:writeEsp32:', error);
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

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.DEV
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: ws: http://localhost:* http://127.0.0.1:*"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
        ],
      },
    });
  });

  if (process.env.DEV) {
    // In development, retry loading the URL if it fails
    const loadDevUrl = async (retries = 10, delay = 500): Promise<void> => {
      try {
        await mainWindow!.loadURL(process.env.APP_URL);
      } catch (error) {
        if (retries > 0) {
          console.log(`Failed to load dev URL, retrying... (${retries} attempts left)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return loadDevUrl(retries - 1, delay);
        } else {
          console.error('Failed to load dev URL after multiple attempts:', error);
          throw error;
        }
      }
    };
    await loadDevUrl().catch((err) => {
      console.error('Could not load dev server:', err);
    });
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
        {
          label: 'Firmware Writing',
          submenu: [
            {
              label: 'STM MCU',
              click: () => {
                mainWindow?.webContents.send('menu:firmware-stm');
              },
            },
            {
              label: 'ESP32',
              click: () => {
                mainWindow?.webContents.send('menu:firmware-esp32');
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
