const db = require('./db/index.js');

class Character {
    constructor(name, level, health, strength, defense, speed) {
        this.name = name;
        this.level = level;
        this.health = health;
        this.strength = strength;
        this.defense = defense;
        this.speed = speed;
    }

    // Method to level up
    levelUp() {
        this.level++;
        this.health += 10;
        this.strength += 5;
        this.defense += 5;
        this.speed += 3;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const params = new URLSearchParams(window.location.search);
    const characterName = params.get('character');

    if (characterName) {
        document.getElementById('character-Gif').src = `assets/characters/${characterName}/${characterName}_idle.gif`;

        const character = await db.getCharacter(characterName);
        if (character) {
            document.getElementById('character-name').textContent = character.name;
            document.getElementById('character-level').textContent = character.level;
            document.getElementById('character-health').textContent = character.health;
            document.getElementById('character-strength').textContent = character.attack;
            document.getElementById('character-defense').textContent = character.defense;
            document.getElementById('character-speed').textContent = character.speed;
        } else {
            document.getElementById('character-name').textContent = 'Character not found';
            document.querySelectorAll('.character-stat').forEach(elem => elem.textContent = '');
        }
    }
});

async function run() {
    await db.initDB();
    //saveInitialCharacters();
    await db.logAllData('CharactersDB', 'characters');
}

// Example of saving characters initially
async function saveInitialCharacters() {
    await db.saveCharacter(new Character("Asta", 1, 100, 15, 10, 5));
    await db.saveCharacter(new Character("Noelle", 1, 120, 10, 12, 6));
}

run();