const { app, BrowserWindow, Menu, MenuItem, ipcMain, screen} = require('electron');
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

let win; // Define win at module scope

function createWindow() {
    const imagePath = path.join(__dirname, 'assets', 'images', 'Asta-idle(3).gif');
    const imageSize = getImageSize(imagePath);

    // Ensure imageSize is not null
    if (imageSize) {

        win = new BrowserWindow({
            width: 192, // imageSize.width,
            height: 147,// imageSize.height,
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
            label: 'Run',
            click: () => { 
                win.webContents.send('action', 'run'); 
            }
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

        //win.setIgnoreMouseEvents(true, { forward: true });

        // Hide the taskbar icon
        win.setSkipTaskbar(true);
    } else {
        console.error("Failed to get image size. Cannot set window size.");
    }
}

ipcMain.on('resize-window', (event, { width, height }) => {
    console.log(`resize ran`);
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
        // Get current window bounds
        const bounds = window.getBounds();

        // Calculate new height and maintain the bottom position
        const newHeight = height;
        const heightDifference = newHeight - bounds.height;
        const newY = bounds.y - heightDifference;

        // Set the new size and position
        window.setBounds({
            x: bounds.x,
            y: newY,
            width: width,
            height: newHeight
        });
    } else {
        console.error("No focused window available.");
    }
});

ipcMain.on('start-run', (event, { width, height }) => {
    moveWindowAcrossScreen(win, width, height, () => {
        event.sender.send('run-complete');
    });
});

function moveWindowAcrossScreen(window, width, height, onMovementComplete) {
    console.log(`move call ran`);
    let currentPosition = window.getBounds().x;
    const endPosition = screen.getPrimaryDisplay().workAreaSize.width - window.getBounds().width;

    function move() {
        if (currentPosition < endPosition) {
            currentPosition += 10;  // Adjust speed by changing the increment
            //console.log(`Setting width to ${window.getBounds().width}`);
            window.setBounds({ 
                x: currentPosition,
                y: window.getBounds().y,
                width: width,
                height: height 
            });
            setTimeout(move, 80);  // Adjust timing for smoother animation
        } else {
            if (typeof onMovementComplete === 'function') {
                onMovementComplete(); // Callback to signal completion
            }
        }
    }

    move();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});