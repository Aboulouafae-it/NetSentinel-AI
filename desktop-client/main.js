const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('no-sandbox');

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'NetSentinel AI',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#07090f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: true
  });

  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  const loadFrontend = () => {
    if (!mainWindow) return;

    mainWindow.loadURL('http://127.0.0.1:3000').catch((error) => {
      console.log(`Waiting for NetSentinel UI to start: ${error.message}. Retrying in 3 seconds.`);
      setTimeout(loadFrontend, 3000);
    });
  };

  setTimeout(loadFrontend, 1000);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log("Starting NetSentinel AI Desktop Client...");
  createWindow();

  app.on('second-instance', function () {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
