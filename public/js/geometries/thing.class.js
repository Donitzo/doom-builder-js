import Geometry from '../geometry.class.js';
import ThingProperties from '../properties/thingproperties.class.js';

/**
 * Represents a Thing such as a player start, monster, decoration or pickup.
 */
export default class Thing extends Geometry {
    /** @type {number} */
    #x = 0;
    /** @type {number} X coordinate. */
    get x() {
        return this.#x;
    }

    /** @type {number} */
    #y = 0;
    /** @type {number} Y coordinate. */
    get y() {
        return this.#y;
    }

    /** @type {ThingProperties} */
    #properties = new ThingProperties();
    /** @type {ThingProperties} Thing properties. */
    get properties() {
        return this.#properties;
    }

    /**
     * Creates a Thing at the given position.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @param {number} [z=0] - The z-coordinate.
     * @param {number} [typeId=1] - The Thing type identifier.
     * @param {number} [angle=0] - The Thing angle.
     */
    constructor(x, y, z = 0, typeId = 1, angle = 0) {
        super({
            min: { x, y },
            max: { x, y },
        });

        this.#x = x;
        this.#y = y;
        this.#properties.setValue('z', z);
        this.#properties.setValue('type', typeId);
        this.#properties.setValue('angle', angle);
    }

    /**
     * Serializes the Thing position and properties.
     *
     * @returns {Object} The serialized Thing data.
     */
    serialize() {
        return [this.#x, this.#y, this.#properties.serialize()];
    }

    /**
     * Creates a Thing from serialized data.
     *
     * @param {Object} data - The serialized Thing data.
     * @returns {Thing} The deserialized Thing.
     */
    static deserialize(data) {
        const [x, y, properties] = data;
        const thing = new Thing(x, y);
        thing.#properties.deserialize(properties);
        return thing;
    }

    /**
     * Tests whether the Thing lies inside a circle.
     *
     * @param {number} x - The circle center x-coordinate.
     * @param {number} y - The circle center y-coordinate.
     * @param {number} radius - The circle radius.
     * @returns {boolean} Whether the Thing lies inside the circle.
     */
    isInsideCircle(x, y, radius) {
        const dx = this.#x - x;
        const dy = this.#y - y;
        return dx * dx + dy * dy <= radius * radius;
    }

    /**
     * Tests whether the Thing lies inside an axis-aligned rectangle.
     *
     * @param {number} x0 - The first rectangle x-coordinate.
     * @param {number} y0 - The first rectangle y-coordinate.
     * @param {number} x1 - The opposite rectangle x-coordinate.
     * @param {number} y1 - The opposite rectangle y-coordinate.
     * @param {boolean} [intersects=false] - Whether partial intersection is sufficient.
     * @returns {boolean} Whether the Thing satisfies the rectangle test.
     */
    isInsideRectangle(x0, y0, x1, y1, intersects = false) {
        const margin = intersects ? 32 : 0;

        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        return (
            this.#x >= minX - margin && this.#x <= maxX + margin &&
            this.#y >= minY - margin && this.#y <= maxY + margin);
    }

    /**
     * @returns {string} The Thing description.
     */
    toString() {
        return `Thing(type=${this.#properties.getValue('type')}, position=(${this.#x}, ${this.#y}, ${this.#properties.getValue('z')}))`;
    }

    /**
     * Creates a lookup key from this Thing's identifying values.
     *
     * @returns {string} The lookup key.
     */
    toKey() {
        return Thing.createKey(
            this.x,
            this.y,
            this.#properties.getValue('z'),
            this.#properties.getValue('type'),
            this.#properties.getValue('angle')
        );
    }

    /**
     * Creates a lookup key for a Thing.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @param {number} z - The z-coordinate.
     * @param {number} typeId - The Thing type identifier.
     * @param {number} angle - The Thing angle.
     * @returns {string} The lookup key.
     */
    static createKey(x, y, z, typeId, angle) {
        return `${x},${y},${z},${typeId},${angle}`;
    }
}
