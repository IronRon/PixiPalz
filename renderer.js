const { ipcRenderer } = require('electron');
const fs = require('fs');

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

        const response = await fetch(filePath);
        const data = await response.json();
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
        this.spriteContainer.style.backgroundImage = `url('assets/characters/Noelle/${data.meta.image}')`;
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

// Example usage:
const manager = new AnimationManager('pixipal-image');
manager.setAnimation('idle', 'assets/characters/Noelle/idle.json');

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
    await manager.setAnimation('idle', 'assets/characters/Noelle/idle.json');
}


// Function to trigger the run animation
async function runPixiPal(manager) {
    // Switch to run animation
    manager.frameRate = 80;
    await manager.setAnimation('run', 'assets/characters/Noelle/run.json');
    // Trigger the window move in main
    ipcRenderer.send('start-run', { 
        width: parseInt(manager.spriteContainer.style.width, 10), 
        height: parseInt(manager.spriteContainer.style.height, 10)
    });
}

// Function to trigger the taunt animation
async function feedPixiPal(manager) {
    // Switch to taunt animation
    manager.frameRate = 200;
    await manager.setAnimation('taunt', 'assets/characters/Noelle/taunt.json');

    // Optionally, wait for the taunt animation to complete before switching back
    // This requires knowing the duration of the animation
    const tauntDuration = manager.calculateAnimationDuration('taunt');
    setTimeout(async () => {
        // Switch back to idle animation after the taunt completes
        await manager.setAnimation('idle', 'assets/characters/Noelle/idle.json');
    }, tauntDuration);
}

document.addEventListener('DOMContentLoaded', () => {
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

