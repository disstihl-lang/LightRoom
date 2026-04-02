// imageLayer.js

class ImageLayer {
    constructor(imageSrc) {
        this.imageSrc = imageSrc;
        this.imageElement = new Image();
        this.loadImage();
    }

    loadImage() {
        this.imageElement.src = this.imageSrc;
        this.imageElement.onload = () => {
            console.log('Image loaded successfully.');
        };
        this.imageElement.onerror = () => {
            console.error('Error loading image.');
        };
    }

    transform(scale, rotation) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.imageElement.width * scale;
        canvas.height = this.imageElement.height * scale;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.drawImage(this.imageElement, -this.imageElement.width / 2, -this.imageElement.height / 2, this.imageElement.width, this.imageElement.height);

        return canvas.toDataURL();
    }

    applyFilter(filterType) {
        // Simple filtering functionality
        console.log(`Applying filter: ${filterType}`);
        // Implementation of filter will depend on the specific type of filter chosen.
    }
}

export default ImageLayer;
