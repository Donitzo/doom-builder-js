import Client from './client.class.js';
import DoomMap from './doommap.class.js';
import Editor3D from './editor3d.class.js';
import Input from './input.class.js';
import ImageManager from './imagemanager.class.js';
import Interface from './interface.class.js';
import VectorEditor from './vectoreditor.class.js';
import ResourceManager from './wad/resourcemanager.class.js';

/**
 * Main application.
 */
export default class App {
    /** @type {boolean} Whether to replace the document body with any error stack. */
    static #ALERT_ERRORS = true;

    /**
     * Loads required fonts and images, then creates the application after the document has finished loading.
     */
    static {
        window.addEventListener('load', () => {
            const fonts = [new FontFace('default-font', 'url(./fonts/PixelOperatorMono8-Bold.ttf)')];

            fonts.forEach(font => {
                document.fonts.add(font);
            });

            Promise.all(fonts.map(font => font.load()))
                .then(() => {
                    return ImageManager.asyncLoadImages(['player.png']);
                })
                .then(() => {
                    new App();
                });
        });
    }

    /** @type {?VectorEditor} 2D map editor. */
    #vectorEditor = null;
    /** @type {?Editor3D} 3D map editor. */
    #editor3d = null;

    /** @type {?FrameRequestCallback} Bound animation-frame update callback. */
    #boundUpdate = null;

    /** @type {?number} Timestamp of the previous animation frame, in milliseconds. */
    #lastTime = null;

    /**
     * Creates the map, client, editors, and user interface, then starts the main loop.
     */
    constructor() {
        window.addEventListener('contextmenu', e => {
            e.preventDefault();
        });

        if (App.#ALERT_ERRORS) {
            window.onerror = (message, file, line, column, errorObj) => {
                alert(errorObj?.stack ?? `${message}\n${file}:${line}:${column}`);
                return false;
            };
        }

        const canvas2D = document.querySelector('.editor_2d');
        const canvas3D = document.querySelector('.editor_3d');

        const resourceManager = new ResourceManager();
        const map = new DoomMap();
        const client = new Client(map);
        this.#editor3d = new Editor3D(canvas3D, resourceManager, map, client);
        this.#vectorEditor = new VectorEditor(canvas2D, resourceManager, map, client, this.#editor3d);
        this.#editor3d.vectorEditor = this.#vectorEditor;
        new Interface(resourceManager, map, this.#editor3d, this.#vectorEditor, client);

        this.#boundUpdate = this.update.bind(this);
        requestAnimationFrame(this.#boundUpdate);
    }

    /**
     * Updates the application for one animation frame.
     *
     * @param {DOMHighResTimeStamp} time - Current animation-frame timestamp, in milliseconds.
     */
    update(time) {
        const dt = Math.min(Math.max((time - (this.#lastTime ?? time)) / 1000, 1e-6), 1);
        this.#lastTime = time;

        this.#vectorEditor.update(dt);
        this.#editor3d.update(dt);

        Input.resetState();

        requestAnimationFrame(this.#boundUpdate);
    }
}
