const { ipcRenderer } = require('electron');
const fs = require('fs').promises;

let pixiPal = null;

class AnimationManager {
    constructor(spriteContainerId) {
        this.spriteContainer = document.getElementById(spriteContainerId);
        this.animations = {}; // Cache for loaded animations
        this.currentAnimation = '';
        this.frameRate = 200; // milliseconds per frame
    }

    // Load animation data from JSON
    async loadAnimation(name, filePath) {
        if (this.animations[name]) {
            return this.animations[name]; // return cached animation
        }

        const response = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(response);
        this.animations[name] = data; // cache the loaded data
        return data;
    }

    // Set animation to be displayed
    async setAnimation(name, filePath) {
        const data = await this.loadAnimation(name, filePath);
        this.setupAnimation(data);
        this.currentAnimation = name;
    }

    // Initialize or update animation frames
    setupAnimation(data) {
        ipcRenderer.send('resize-window', { 
            width: data.frames[Object.keys(data.frames)[0]].frame.w, 
            height: data.frames[Object.keys(data.frames)[0]].frame.h 
        });
        this.spriteContainer.style.backgroundImage = `url('assets/characters/${pixiPal}/${data.meta.image}')`;
        this.spriteContainer.style.width = `${data.frames[Object.keys(data.frames)[0]].frame.w}px`;
        this.spriteContainer.style.height = `${data.frames[Object.keys(data.frames)[0]].frame.h}px`;
        this.spriteContainer.style.backgroundPosition = `0px 0px`;
        //console.log(`url('assets/images/${data.meta.image}')`);
        //console.log(this.animations);

        let frames = [];
        for (let key in data.frames) {
            const frame = data.frames[key].frame;
            frames.push({x: -frame.x, y: -frame.y});
        }

        this.animate(frames);
    }

    // Handle frame update and loop
    animate(frames) {
        let currentFrame = 0;
        const totalFrames = frames.length;
        clearInterval(this.animationInterval); // Clear existing interval if any
        this.animationInterval = setInterval(() => {
            if (currentFrame >= totalFrames) {
                currentFrame = 0; // Loop animation
            }
            const frame = frames[currentFrame++];
            this.spriteContainer.style.backgroundPosition = `${frame.x}px ${frame.y}px`;
        }, this.frameRate);
    }

    calculateAnimationDuration(animationName) {
        const animation = this.animations[animationName];
        if (!animation) {
            console.error('Animation not loaded:', animationName);
            return 0;
        }
        return Object.keys(animation.frames).length * this.frameRate;
    }
}

const manager = new AnimationManager('pixipal-image');

ipcRenderer.on('action', (event, action) => {
    switch(action) {
        case 'feed':
            feedPixiPal(manager);
            console.log('PixiPal is fed!');
            break;
        case 'run':
            runPixiPal(manager);
            console.log('PixiPal is running!');
            break;
        case 'idle':
            idlePixiPal(manager);
            console.log('PixiPal is idle!');
            break;
    }
});

// Function to trigger the idle animation
async function idlePixiPal(manager) {
    // Switch to idle animation
    manager.frameRate = 200;
    await manager.setAnimation('idle', 'assets/characters/' + pixiPal + '/idle.json');
}


// Function to trigger the run animation
async function runPixiPal(manager) {
    // Switch to run animation
    manager.frameRate = 80;
    await manager.setAnimation('run', 'assets/characters/' + pixiPal + '/run.json');
    // Trigger the window move in main
    ipcRenderer.send('start-run', { 
        width: parseInt(manager.spriteContainer.style.width, 10), 
        height: parseInt(manager.spriteContainer.style.height, 10)
    });
}

// Function to trigger the taunt animation
async function feedPixiPal(manager) {
    // Switch to taunt animation
    manager.frameRate = 150;
    await manager.setAnimation('taunt', 'assets/characters/' + pixiPal + '/taunt.json');

    // Optionally, wait for the taunt animation to complete before switching back
    // This requires knowing the duration of the animation
    const tauntDuration = manager.calculateAnimationDuration('taunt');
    setTimeout(async () => {
        // Switch back to idle animation after the taunt completes
        manager.frameRate = 200;
        await manager.setAnimation('idle', 'assets/characters/' + pixiPal + '/idle.json');
    }, tauntDuration);
}

function updatePixipalImage(pixipal) {
    const pixipalImage = document.getElementById('pixipal-image');
    if (pixipalImage) {
        pixipalImage.style.backgroundImage = `url('assets/characters/${pixipal}/idle.png')`;
        manager.setAnimation('idle', 'assets/characters/' + pixiPal + '/idle.json');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Get the query parameters from the URL
    const urlParams = new URLSearchParams(window.location.search);
    pixiPal = urlParams.get('pixipal');

    // Check if pixipal parameter is present
    if (pixiPal) {
        updatePixipalImage(pixiPal);
    } else {
        console.error("No pixiPal specified");
    }


    const pixipal = document.getElementById('pixipal-image');
    pixipal.addEventListener('click', () => {
        // pixipal.classList.add('pet-animate');

        // setTimeout(() => {
        //     pixipal.classList.remove('pet-animate');
        // }, 1000);
        ipcRenderer.send('stop-moving');
        feedPixiPal(manager);
    });

    ipcRenderer.on('change-direction', (event, direction) => {
        if (direction === 'left') {
            pixipal.style.transform = 'scaleX(-1)'; // Flip sprite horizontally
        } else {
            pixipal.style.transform = 'scaleX(1)';
        }
    });
});

