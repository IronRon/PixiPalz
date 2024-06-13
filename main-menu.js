const { ipcRenderer } = require('electron');

document.getElementById('pixipal1').addEventListener('click', () => {
    ipcRenderer.send('launch-pixipal', 'Asta');
});

document.getElementById('pixipal2').addEventListener('click', () => {
    ipcRenderer.send('launch-pixipal', 'Noelle');
});