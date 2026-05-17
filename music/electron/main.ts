import { app, BrowserWindow, utilityProcess, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env['APP_ROOT'] = path.join(__dirname, '..')

// 🚧 Wait for the built renderer to be ready
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env['APP_ROOT'], 'dist-electron')
export const RENDERER_DIST = path.join(process.env['APP_ROOT'], 'dist')

process.env['VITE_PUBLIC'] = VITE_DEV_SERVER_URL ? path.join(process.env['APP_ROOT'], 'public') : RENDERER_DIST

let win: BrowserWindow | null
let serverProcess: any = null

function startBackend() {
  if (serverProcess) return
  
  console.log('Starting backend process...')
  const appRoot = process.env['APP_ROOT'] || path.join(__dirname, '..')
  let serverPath = path.join(appRoot, 'server', 'auth.js')
  
  // Kiểm tra nếu đang chạy từ asar và có bản unpacked thì dùng bản unpacked
  // (Cần thiết cho các module native như bcrypt và binary như yt-dlp)
  if (app.isPackaged) {
    const unpackedPath = serverPath.replace('app.asar', 'app.asar.unpacked')
    if (fs.existsSync(unpackedPath)) {
      serverPath = unpackedPath
    }
  }

  const logPath = path.join(app.getPath('userData'), 'backend.log')
  const logStream = fs.createWriteStream(logPath, { flags: 'a' })
  logStream.write(`\n--- Server starting at ${new Date().toLocaleString()} ---\n`)
  logStream.write(`App Root: ${appRoot}\n`)
  logStream.write(`Server Path: ${serverPath}\n`)
  logStream.write(`Server File Exists: ${fs.existsSync(serverPath)}\n`)
  logStream.write(`Is Packaged: ${app.isPackaged}\n`)

  try {
    serverProcess = utilityProcess.fork(serverPath, [], {
      cwd: path.dirname(serverPath),
      env: { ...process.env },
      stdio: 'pipe'
    })

    if (serverProcess) {
      serverProcess.stdout?.on('data', (data: Buffer) => {
        logStream.write(data)
      })
      serverProcess.stderr?.on('data', (data: Buffer) => {
        logStream.write(`STDERR: ${data.toString()}`)
      })

      serverProcess.on('spawn', () => {
        logStream.write(`SERVER SPAWNED: Backend is running.\n`)
      })

      serverProcess.on('exit', (code: number) => {
        logStream.write(`SERVER EXIT: Backend exited with code ${code}\n`)
        serverProcess = null
      })

      serverProcess.on('error', (err: any) => {
        logStream.write(`SERVER ERROR: ${err.message}\n`)
      })
    }
  } catch (err: any) {
    logStream.write(`FORK ERROR: ${err.message}\n`)
  }
}

function createWindow() {
  startBackend()

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
  win.webContents.openDevTools()

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
  if (serverProcess) serverProcess.kill()
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
