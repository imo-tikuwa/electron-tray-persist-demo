import { app, shell, BrowserWindow, ipcMain, Tray, Menu, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  const tray = new Tray(icon)
  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'アプリを表示',
      click: (): void => mainWindow.show()
    },
    {
      label: 'アプリを終了',
      click: (): void => {
        tray.destroy()
        app.exit(0)
      }
    }
  ])
  tray.setContextMenu(trayMenu)
  tray.on('click', () => mainWindow.show())

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow.hide()

    new Notification({
      title: 'アプリはバックグラウンドで動作中です',
      body: 'ウィンドウはタスクトレイから再表示できます。完全に終了したい場合はタスクトレイのアイコン右クリックから「アプリを終了」でできます。',
      icon: icon
    }).show()
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  app.on('second-instance', () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    mainWindow.focus()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (!app.requestSingleInstanceLock()) {
  console.error('Another instance is running.')
  app.exit(0)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
