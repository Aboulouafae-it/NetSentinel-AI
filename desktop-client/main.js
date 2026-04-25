const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'NetSentinel AI',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false // Wait to show until loaded
  });

  // Load the localhost URL with an automatic infinite retry loop
  const loadFrontend = () => {
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      console.log("Waiting for NetSentinel UI to start... retrying in 3 seconds.");
      setTimeout(loadFrontend, 3000);
    });
  };

  loadFrontend();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Option: We could try to start docker compose here automatically
  console.log("Starting NetSentinel AI Desktop Client...");
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
