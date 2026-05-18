import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import https from 'node:https'
import { exec } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env['APP_ROOT'] = path.join(__dirname, '..')

// 🚧 Wait for the built renderer to be ready
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env['APP_ROOT'], 'dist-electron')
export const RENDERER_DIST = path.join(process.env['APP_ROOT'], 'dist')

process.env['VITE_PUBLIC'] = VITE_DEV_SERVER_URL ? path.join(process.env['APP_ROOT'], 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env['VITE_PUBLIC'] || RENDERER_DIST, 'favicon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Ẩn thanh menu (File, Edit, View...)
  win.setMenuBarVisibility(false)

  // Phóng to toàn màn hình khi khởi động
  win.maximize()

  // Mở Developer Tools để debug
  if (!app.isPackaged) {
    win.webContents.openDevTools()
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date()).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Handle window controls
ipcMain.on('window-minimize', () => {
  win?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on('window-close', () => {
  win?.close()
})

ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url)
})

// Helper to download files following HTTP 301/302 redirects
function downloadFile(url: string, destPath: string, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = (targetUrl: string) => {
      https.get(targetUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (response.headers.location) {
            request(response.headers.location);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Tải file thất bại: Status ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        response.pipe(file);

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const percent = Math.round((downloadedSize / totalSize) * 100);
            onProgress(percent);
          }
        });

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    request(url);
  });
}

// IPC listener to download and run the silent update setup
ipcMain.on('download-update', async (_, downloadUrl) => {
  try {
    const tempDir = app.getPath('temp');
    const destPath = path.join(tempDir, 'MusicPlayer-Setup-Update.exe');

    // Remove old update setup if it exists to avoid locked files
    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch (e) {}
    }

    await downloadFile(downloadUrl, destPath, (percent) => {
      win?.webContents.send('download-progress', percent);
    });

    win?.webContents.send('download-complete');

    // Run the downloaded installer in interactive mode so they see the extraction
    exec(`"${destPath}"`, (err) => {
      if (err) console.error("Failed to run installer:", err);
    });

    // Close Electron immediately so the installer can overwrite locked files
    setTimeout(() => {
      app.quit();
    }, 1500);

  } catch (err: any) {
    win?.webContents.send('download-error', err.message || 'Lỗi kết nối tải file');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
