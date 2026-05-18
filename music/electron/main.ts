import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
