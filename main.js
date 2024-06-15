const { app, BrowserWindow, Menu, MenuItem, ipcMain, screen} = require('electron');
const sizeOf = require('image-size');
const path = require('path');
const fs = require('fs').promises;

async function getImageSize(filePath) {
    try {
        console.log(filePath);
        const data = await fs.readFile(filePath, 'utf8'); // Read the JSON file content
        const json = JSON.parse(data); // Parse JSON from file content
        const dimensions = json.frames[Object.keys(json.frames)[0]].frame; // Get the frame data
        return { width: dimensions.w, height: dimensions.h }; // Return width and height
    } catch (error) {
        console.error('Error getting image size:', error);
        return null;
    }
}

let mainWindow = null;
let isCharacterRunning = false;

function createMainMenu() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();  // Restore the window if it is minimized
        }
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('main-menu.html'); // Load the HTML file containing the menu

    mainWindow.on('closed', () => {
        mainMenuWin = null;
        console.log('Main menu window was closed');
    });
}

let win = null; // Define win at module scope
let win_width = 105;
let win_height = 162;

async function createWindow(pixipal) {
    if (win) {
        // Optionally: Update the existing window with new content instead of closing it
        //win.webContents.send('update-pixipal', pixipal);
        //return;
        win.close();
        win = null;
    }

    const pixipalDir = path.join(__dirname, 'assets', 'characters', pixipal);
    const imageSize = await getImageSize(path.join(pixipalDir, 'idle.json'));

    // Ensure imageSize is not null
    if (imageSize) {

        win = new BrowserWindow({
            width: imageSize.width,
            height: imageSize.height,
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
            label: 'Interact',
            click: () => { win.webContents.send('action', 'feed'); }
        }));
        contextMenu.append(new MenuItem({
            label: 'Run',
            click: () => { 
                if (!isCharacterRunning) {
                    isCharacterRunning = true;
                    win.webContents.send('action', 'run');
                    moveWindowAcrossScreen(win);
                } else {
                    console.log("Character already runnig");
                }
            }
        }));
        contextMenu.append(new MenuItem({
            label: 'Open Main Menu',
            click: () => { 
                createMainMenu()
            }
        }));
        contextMenu.append(new MenuItem({
            label: 'Close',
            click: () => { 
                win.close();
                win = null;
            }
        }));
        

        win.webContents.on('context-menu', (e, params) => {
            contextMenu.popup(win, params.x, params.y);
        });


        win.loadFile('pixipal.html', { query: { "pixipal": pixipal } });

        // Remove the menu bar
        win.setMenu(null);

        //win.setIgnoreMouseEvents(true, { forward: true });

    } else {
        console.error("Failed to get image size. Cannot set window size.");
    }
}

ipcMain.on('resize-window', (event, { width, height }) => {
    console.log(`resize ran`);
    if (win) {

        let mainScreen = screen.getPrimaryDisplay();
        let dimensions = mainScreen.workAreaSize;
        let taskbarHeight = mainScreen.bounds.height - mainScreen.workAreaSize.height;

        // Calculate Y position based on taskbar's visibility and position
        let yPos = mainScreen.bounds.height - taskbarHeight - height;

        // Get current window bounds
        const bounds = win.getBounds();

        // Calculate new height and maintain the bottom position
        // const newHeight = height;
        // const heightDifference = newHeight - bounds.height;
        // const newY = bounds.y - heightDifference;

        // Calculate new width and adjust x to maintain the sides centered
        const newWidth = width;
        const widthDifference = newWidth - bounds.width;
        const newX = bounds.x - widthDifference / 2;  // Adjusted to center horizontally
        
        win.setBounds({
            x: newX,
            y: yPos,
            width: newWidth,
            height: height
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
    if (!window) {
        console.error('Invalid window object provided');
        return;
    }

    //console.log(`move call ran`, win_width);
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
        if (window.isDestroyed()) return;

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
        if (window.isDestroyed()) {
            clearInterval(intervalId);
            intervalId = null;
            return;
        }
        updateTargetPosition();

        if (Math.abs(windowCenterX - targetPosition) > 40) {
            const moveStep = Math.sign(targetPosition - windowCenterX) * Math.min(10, Math.abs(targetPosition - windowCenterX));
            currentPosition += Math.floor(moveStep);
        }
        
        // Check if target is reached and call completion function
        if (Math.abs(windowCenterX - targetPosition) <= 40) {
            if (intervalId !== null && !moveStop) {
                window.webContents.send('action', 'idle');
                moveStop = true;
                return;
            } else if (intervalId !== null) {
                return;
            }
        } else if (Math.abs(windowCenterX - targetPosition) > 40 && moveStop) { //else if to make the character run again after reaching the mouse and the mouse moves again
            window.webContents.send('action', 'run');
            moveStop = false;
        }
        window.setBounds({ 
            x: currentPosition,
            y: window.getBounds().y,
            width: win_width,
            height: win_height 
        });
    }

    // Start moving the window by setting up a polling interval
    const startFollowingMouse = () => {
        if (intervalId !== null) return; // Prevent multiple intervals
        intervalId = setInterval(move, 80); // Adjust timing for smoother or less frequent updates
    };

    // Clean up on window close
    win.on('closed', () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    });

    startFollowingMouse();
}

// Event listener for mouse click on the window
ipcMain.on('stop-moving', () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('Mouse following stopped due to window click.');
    }
    isCharacterRunning = false;
});

// app.whenReady().then(createWindow);
app.whenReady().then(createMainMenu);

let dbInit = true;
ipcMain.on('init-db', async (event, args) => {
    if (dbInit) {
        dbInit = false;
        event.reply('db-init-result');
    }
});

ipcMain.on('launch-pixipal', (event, pixipal) => {
    console.log(`Launching ${pixipal}`);
    createWindow(pixipal); // Now createWindow takes a parameter to decide which Pixipal to load
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});