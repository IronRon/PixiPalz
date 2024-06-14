const { ipcRenderer } = require('electron');
const Container = document.querySelector('.container');
const carouselItems = document.querySelectorAll('.carousel-item');

class Carousel {

    constructor(container, items) {
        this.carouselContainer = container;
        this.carouselArray = [...items];
    }

    updateGallery() {
        console.log("update");
        this.carouselArray.forEach(el => {
            el.classList.remove(
                'carousel-item-1',
                'carousel-item-2',
                'carousel-item-3',
                'carousel-item-4',
                'carousel-item-5'
            );
        });

        this.carouselArray.slice(0, 5).forEach((el, i) => {
            el.classList.add(`carousel-item-${i + 1}`);
        });
    }

    setCurrentState(direction) {
        if (direction === 'previous') {
            this.carouselArray.unshift(this.carouselArray.pop());
        } else {
            this.carouselArray.push(this.carouselArray.shift());
        }
        this.updateGallery();
    }
}

const characterSelectCarousel = new Carousel(Container, carouselItems)

document.addEventListener('DOMContentLoaded', function () {

    document.querySelector('.next').addEventListener('click', function () {
        characterSelectCarousel.setCurrentState('next');
    });

    document.querySelector('.prev').addEventListener('click', function () {
        characterSelectCarousel.setCurrentState('previous');
    });

    // Handle select buttons
    document.querySelectorAll('.select-button').forEach(button => {
        button.addEventListener('click', function () {
            const pixipal = this.getAttribute('data-pixipal');
            ipcRenderer.send('launch-pixipal', pixipal);
        });
    });

});