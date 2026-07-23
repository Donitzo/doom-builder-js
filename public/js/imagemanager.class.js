import * as THREE from './lib/three.js/three.module.js';

/**
 * Manages loaded image assets and lazily creates corresponding Three.js textures.
 */
export default class ImageManager {
    /** @type {Map<string, HTMLImageElement>} Loaded images keyed by their original filenames. */
    static #images = new Map();
    /** @type {Map<string, THREE.Texture>} Cached Three.js textures keyed by image filename. */
    static #textures = new Map();

    /**
     * Loads a collection of image files from the application's images directory.
     *
     * @param {Array<string>} imageFilenames
     * Filenames relative to the `./images/` directory.
     * @returns {Promise}
     */
    static asyncLoadImages(imageFilenames) {
        return Promise.all(imageFilenames.map(filename => {
            const url = `./images/${filename}`;

            return new Promise((resolve, reject) => {
                const image = new Image();
                image.addEventListener('load', () => {
                    ImageManager.#images.set(filename, image);

                    resolve();
                });
                image.addEventListener('error', () => {
                    reject(new Error(`Error loading image file "${url}"`));
                });
                image.src = url;
            });
        }));
    }

    /**
     * Returns the filenames of all loaded images.
     *
     * @returns {Array<string>} Image filenames.
     */
    static getImageNames() {
        return Array.from(ImageManager.#images.keys());
    }

    /**
     * Retrieves a image by filename.
     *
     * @param {string} name - Filename.
     * @returns {HTMLImageElement} Image element.
     */
    static getImage(name) {
        const image = ImageManager.#images.get(name);
        if (image === undefined) {
            throw new Error(`Image "${name}" does not exist`);
        }
        return image;
    }

    /**
     * Retrieves or creates a Three.js texture for a loaded image.
     *
     * Textures are created lazily and cached by image name.
     *
     * @param {string} name - Filename.
     * @param {number} [encoding=THREE.LinearEncoding] - Three.js texture encoding.
     * @returns {THREE.Texture} The cached or newly created texture.
     */
    static getThreeTexture(name, encoding = THREE.LinearEncoding) {
        if (ImageManager.#textures.has(name)) {
            return ImageManager.#textures.get(name);
        }

        const image = ImageManager.getImage(name);
        const texture = new THREE.Texture(image);
        texture.encoding = encoding;
        texture.needsUpdate = true;
        ImageManager.#textures.set(name, texture);
        return texture;
    }
}
