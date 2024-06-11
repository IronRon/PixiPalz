const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = 'assets\images\Asta-idle(1).json';

fs.readFile(path, { encoding: 'utf-8' }, (err, data) => {
    if (err) {
        console.error('Error reading JSON file:', err);
        console.log('Error reading JSON file:');
        return;
    }
    const spriteData = JSON.parse(data);
    setupAnimation(spriteData); 
});

function feedPixiPal() {
    const petImage = document.getElementById('pixipal-image');
    petImage.src = 'assets/images/Asta-taunt(3).gif';
    setTimeout(() => {
        petImage.src = 'assets/images/Asta-idle(3).gif';
    }, 1000);
}

ipcRenderer.on('action', (event, action) => {
    if (action === 'feed') {
        feedPixiPal()
        console.log('PixiPal is fed!');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const pixipal = document.getElementById('pixipal-image');

    pixipal.addEventListener('click', () => {
        pixipal.classList.add('pet-animate');

        setTimeout(() => {
            pixipal.classList.remove('pet-animate');
        }, 1000);
    });
});


// Function to initialize animation
function setupAnimation(data) {
    const frames = [];
    const spriteContainer = document.getElementById('pixipal-image');
    spriteContainer.style.width = `${data.frames[Object.keys(data.frames)[0]].frame.w}px`;
    spriteContainer.style.height = `${data.frames[Object.keys(data.frames)[0]].frame.h}px`;
    spriteContainer.style.backgroundImage = `url(${data.meta.image})`;

    for (let key in data.frames) {
        const frame = data.frames[key].frame;
        frames.push({x: -frame.x, y: -frame.y});
    }

    let currentFrame = 0;

    function updateFrame() {
        const frame = frames[currentFrame];
        spriteContainer.style.backgroundPosition = `${frame.x}px ${frame.y}px`;
        currentFrame = (currentFrame + 1) % frames.length;
    }

    setInterval(updateFrame, 200);
}