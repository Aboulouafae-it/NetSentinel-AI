const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-dev-shm-usage');
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

  mainWindow.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(`
        <html>
          <head>
            <title>NetSentinel AI</title>
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                background: #07090f;
                color: #f8fafc;
                font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              .panel {
                text-align: center;
                max-width: 420px;
              }
              img {
                width: 96px;
                height: 96px;
                margin-bottom: 22px;
              }
              h1 {
                margin: 0 0 8px;
                font-size: 26px;
              }
              p {
                margin: 0;
                color: #94a3b8;
                line-height: 1.6;
              }
            </style>
          </head>
          <body>
            <div class="panel">
              <img src="file://${path.join(__dirname, 'icon.png')}" alt="" />
              <h1>NetSentinel AI</h1>
              <p>Starting the local platform...</p>
            </div>
          </body>
        </html>
      `)
  );

  const loadFrontend = () => {
    if (!mainWindow) return;

    mainWindow.loadURL('http://127.0.0.1:3000').catch(() => {
      console.log("Waiting for NetSentinel UI to start... retrying in 3 seconds.");
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
