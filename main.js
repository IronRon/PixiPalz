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
let win_width = 192;
let win_height = 147;

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
            skipTaskbar: true, // Avoid showing in the taskbar
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        // Position the window above the taskbar
        let mainScreen = screen.getPrimaryDisplay();
        let dimensions = mainScreen.workAreaSize;
        let taskbarHeight = mainScreen.bounds.height - mainScreen.workAreaSize.height;

        // Calculate Y position based on taskbar's visibility and position
        let yPos = mainScreen.bounds.height - taskbarHeight - win.getBounds().height;

        // Set the window position to the bottom of the work area
        win.setPosition(mainScreen.workAreaSize.width - win.getBounds().width, yPos);

        const contextMenu = new Menu();
        contextMenu.append(new MenuItem({
            label: 'Feed Pet',
            click: () => { win.webContents.send('action', 'feed'); }
        }));
        contextMenu.append(new MenuItem({
            label: 'Run',
            click: () => { 
                win.webContents.send('action', 'run');
                moveWindowAcrossScreen(win);
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

        // Calculate new width and adjust x to maintain the sides centered
        const newWidth = width;
        const widthDifference = newWidth - bounds.width;
        const newX = bounds.x - widthDifference / 2;  // Adjusted to center horizontally
        
        //win_width = width;
        //win_height = newHeight;
        // Set the new size and position
        win.setBounds({
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
    win_width = width;
    win_height = height;
});

let intervalId = null;

function moveWindowAcrossScreen(window) {
   // width = win_width;
    //height = win_height;

    console.log(`move call ran`, win_width);
    let moveStop = false;

    let currentPosition = window.getBounds().x;
    let targetPosition = currentPosition; // Initialize target position
    let windowBounds = window.getBounds();
    let windowCenterX = windowBounds.x + windowBounds.width / 2;

    window.setBounds({ 
        x: currentPosition,
        y: window.getBounds().y,
        width: win_width,
        height: win_height 
    });

    // Update target position based on mouse x-coordinate
    function updateTargetPosition() {
        const point = screen.getCursorScreenPoint();
        const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
        windowBounds = window.getBounds();
        windowCenterX = Math.floor(windowBounds.x + windowBounds.width / 2);
        targetPosition = Math.max(0, Math.min(point.x, screenWidth - win_width)); // Ensure the window stays on screen

        // Determine the direction to face based on mouse position
        const direction = point.x > windowCenterX ? 'right' : 'left';
        // Send direction to renderer
        window.webContents.send('change-direction', direction);
    }
    
    function move() {
        updateTargetPosition();

        if (Math.abs(windowCenterX - targetPosition) > 40) {
            const moveStep = Math.sign(targetPosition - windowCenterX) * Math.min(10, Math.abs(targetPosition - windowCenterX));
            currentPosition += Math.floor(moveStep);
        }

        win.setBounds({ 
            x: currentPosition,
            y: window.getBounds().y,
            width: win_width,
            height: win_height 
        });
        
        // Check if target is reached and call completion function
        if (Math.abs(windowCenterX - targetPosition) <= 40) {
            if (intervalId !== null && !moveStop) {
                window.webContents.send('action', 'idle');
                moveStop = true;
            }
        } else if (Math.abs(windowCenterX - targetPosition) > 40 && moveStop) { //else if to make the character run again after reaching the mouse and the mouse moves again
            window.webContents.send('action', 'run');
            moveStop = false;
        }
    }

    // Start moving the window by setting up a polling interval
    const startFollowingMouse = () => {
        if (intervalId !== null) return; // Prevent multiple intervals
        intervalId = setInterval(move, 80); // Adjust timing for smoother or less frequent updates
    };

    startFollowingMouse();
}

// Event listener for mouse click on the window
ipcMain.on('stop-moving', () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('Mouse following stopped due to window click.');
    }
});

// win.on('closed', () => {
//     if (intervalId) clearInterval(intervalId);
// });

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});