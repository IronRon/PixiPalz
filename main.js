const { app, BrowserWindow, Menu, MenuItem } = require('electron');
const sizeOf = require('image-size');
const path = require('path');

function getImageSize(path) {
    try {
        const dimensions = sizeOf(path);
        return dimensions;
    } catch (error) {
        console.error('Error getting image size:', error);
        return null;
    }
}

function createWindow() {
    const imagePath = path.join(__dirname, 'assets', 'images', 'Asta-idle(3).gif');
    const imageSize = getImageSize(imagePath);

    // Ensure imageSize is not null
    if (imageSize) {

        const win = new BrowserWindow({
            width: 256, // imageSize.width,
            height: 196,// imageSize.height,
            transparent: true, // Make the background transparent
            frame: false,      // Remove the window frame
            alwaysOnTop: true, // Keep window on top of other applications
            resizable: false,  // Disable resizing
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const contextMenu = new Menu();
        contextMenu.append(new MenuItem({
            label: 'Feed Pet',
            click: () => { win.webContents.send('action', 'feed'); }
        }));
        contextMenu.append(new MenuItem({
            label: 'Close',
            click: () => { win.close(); }
        }));

        win.webContents.on('context-menu', (e, params) => {
            contextMenu.popup(win, params.x, params.y);
        });


        win.loadFile('index.html');

        // Remove the menu bar
        win.setMenu(null);

        win.setIgnoreMouseEvents(true, { forward: true });

        // Hide the taskbar icon
        win.setSkipTaskbar(true);
    } else {
        console.error("Failed to get image size. Cannot set window size.");
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});