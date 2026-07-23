import Geometry from '../geometry.class.js';

/**
 * Represents a 2D vertex.
 */
export default class Vertex extends Geometry {
    static #tmpEntries = [];

    /** @type {Array<Line>} */
    #lines = [];
    /** @type {Array<Line>} Lines currently connected to this vertex. */
    get lines() {
        return this.#lines;
    }
    /** @type {Array<number>} */
    #lineAngles = [];
    /** @type {Array<number>} Clockwise-ordered line angles. */
    get lineAngles() {
        return this.#lineAngles;
    }

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

    /**
     * Constructs a vertex.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     */
    constructor(x, y) {
        super({
            min: { x, y },
            max: { x, y },
        });

        this.#x = x;
        this.#y = y;
    }

    /**
     * Copies the vertex coordinates into a vector.
     *
     * @param {{x: number, y: number}} vector - The vector object to update.
     * @returns {{x: number, y: number}} The vector object.
     */
    copyTo(vector) {
        vector.x = this.#x;
        vector.y = this.#y;
        return vector;
    }

    /**
     * Serializes the vertex coordinates.
     *
     * @returns {Object} The serialized vertex data.
     */
    serialize() {
        return [this.#x, this.#y];
    }

    /**
     * Creates a vertex from serialized coordinates.
     *
     * @param {Object} data - The serialized vertex data.
     * @returns {Vertex} The deserialized vertex.
     */
    static deserialize(data) {
        const [x, y] = data;
        return new Vertex(x, y);
    }

    /**
     * Connects a line to this vertex.
     *
     * @param {Line} line - The line to connect.
     */
    addLine(line) {
        this.#lines.push(line);

        this.#orderLines();
    }

    /**
     * Disconnects a line from this vertex.
     *
     * @param {Line} line - The line to disconnect.
     */
    removeLine(line) {
        const i = this.#lines.indexOf(line);
        if (i === -1) {
            console.error(`Attempted to remove non-existent ${line} from ${this}`);
            throw new Error(`Attempted to remove non-existent ${line} from ${this}`);
        }
        this.#lines.splice(i, 1);

        this.#orderLines();
    }

    /**
     * Orders connected lines and their angles clockwise by descending angle.
     */
    #orderLines() {
        if (this.#lines.length === 0) {
            this.#lineAngles.length = 0;
            return;
        }

        const cx = this.#x;
        const cy = this.#y;

        const entries = Vertex.#tmpEntries;
        entries.length = 0;

        this.#lines.forEach(line => {
            const other = line.v0 === this ? line.v1 : line.v0;
            const dx = other.x - cx;
            const dy = other.y - cy;
            entries.push([line, Math.atan2(dy, dx)]);
        });

        entries.sort((a, b) => b[1] - a[1]);

        this.#lines.length = 0;
        this.#lineAngles.length = 0;

        entries.forEach(entry => {
            this.#lines.push(entry[0]);
            this.#lineAngles.push(entry[1]);
        });
    }

    /**
     * Tests whether the vertex lies inside a circle.
     *
     * @param {number} x - The circle center x-coordinate.
     * @param {number} y - The circle center y-coordinate.
     * @param {number} radius - The circle radius.
     * @returns {boolean} Whether the vertex lies inside the circle.
     */
    isInsideCircle(x, y, radius) {
        const dx = this.#x - x;
        const dy = this.#y - y;
        return dx * dx + dy * dy <= radius * radius;
    }

    /**
     * Tests whether the vertex lies inside an axis-aligned rectangle.
     *
     * @param {number} x0 - The first x-coordinate.
     * @param {number} y0 - The first y-coordinate.
     * @param {number} x1 - The opposite x-coordinate.
     * @param {number} y1 - The opposite y-coordinate.
     * @param {boolean} [intersects=false] - Whether partial intersection is sufficient.
     * @returns {boolean} Whether the vertex lies inside the rectangle.
     */
    isInsideRectangle(x0, y0, x1, y1, intersects = false) {
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        return (
            this.#x >= minX && this.#x <= maxX &&
            this.#y >= minY && this.#y <= maxY);
    }

    /**
     * @returns {string} The vertex description.
     */
    toString() {
        return `Vertex(${this.#x}, ${this.#y}, lines=${this.#lines.length})`;
    }
}
