/**
 * Native Desktop Bridge for DeepSeek Harness.
 * Provides system directory picker dialogs, secure external link handling,
 * drag-strip injection, and theme synchronization.
 */

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  shell,
} from 'electron'

let bridgeInstalled = false

export function installDesktopNativeBridge(): void {
  if (bridgeInstalled) return
  bridgeInstalled = true

  // Native folder picker
  ipcMain.handle('desktop:pick-directory', async (event, defaultPath?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: '选择工作区目录 (Select Workspace Directory)',
      defaultPath: defaultPath || app.getPath('home'),
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // Open external links in default OS browser
  ipcMain.handle('desktop:open-external', async (_event, url: string) => {
    if (typeof url !== 'string') return
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
        await shell.openExternal(parsed.href)
      }
    } catch {
      // Ignored
    }
  })

  // System info
  ipcMain.handle('desktop:get-system-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      isPackaged: app.isPackaged,
      isDark: nativeTheme.shouldUseDarkColors,
    }
  })
}

/**
 * Configure secure navigation and window behaviors on the main window.
 */
export function secureHarnessWindow(window: BrowserWindow): void {
  // Disallow arbitrary new window creation; route external links to OS default browser
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
        void shell.openExternal(parsed.href)
      }
    } catch {
      // Ignored
    }
    return { action: 'deny' }
  })

  // Theme synchronization and native drag region injection
  window.webContents.on('did-finish-load', () => {
    if (window.isDestroyed()) return
    const isDark = nativeTheme.shouldUseDarkColors
    window.setBackgroundColor(isDark ? '#141416' : '#ffffff')

    // Inject native drag region helper for seamless custom window dragging
    void window.webContents.executeJavaScript(`
      (() => {
        if (window.__dshNativeBridgeInjected) return;
        window.__dshNativeBridgeInjected = true;

        // Add macOS / Windows native drag region on top header
        const dragStrip = document.createElement('div');
        dragStrip.id = 'dsh-native-drag-strip';
        dragStrip.setAttribute('aria-hidden', 'true');
        Object.assign(dragStrip.style, {
          position: 'fixed',
          top: '0',
          left: ${process.platform === 'darwin' ? "'80px'" : "'0'"},
          right: ${process.platform === 'win32' ? "'140px'" : "'0'"},
          height: '28px',
          zIndex: '99999',
          background: 'transparent',
          pointerEvents: 'auto',
          userSelect: 'none',
        });
        dragStrip.style.setProperty('-webkit-app-region', 'drag');
        document.body.appendChild(dragStrip);

        // Prevent dragging on interactive elements inside header
        document.addEventListener('mouseover', (e) => {
          const target = e.target;
          if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'A' || target.closest('button, input, a, [role="button"]'))) {
            dragStrip.style.pointerEvents = 'none';
          } else {
            dragStrip.style.pointerEvents = 'auto';
          }
        }, { passive: true });
      })()
    `).catch(() => {})
  })
}
