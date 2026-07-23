import DoomMap from '../doommap.class.js';
import Geometry from '../geometry.class.js';
import LineProperties from '../properties/lineproperties.class.js';
import SectorProperties from '../properties/sectorproperties.class.js';
import SideProperties from '../properties/sideproperties.class.js';

/**
 * Represents a directed line segment between two vertices.
 */
export default class Line extends Geometry {
    /** @type {Vertex} */
    #v0 = null;
    /** @type {Vertex} Starting vertex. */
    get v0() {
        return this.#v0;
    }

    /** @type {Vertex} */
    #v1 = null;
    /** @type {Vertex} Ending vertex. */
    get v1() {
        return this.#v1;
    }

    /** @type {LineProperties} */
    #properties = new LineProperties();
    /** @type {LineProperties} The line properties. */
    get properties() {
        return this.#properties;
    }

    /** @type {SideProperties} */
    #frontProperties = new SideProperties();
    /** @type {SideProperties} The front-side properties. */
    get frontProperties() {
        return this.#frontProperties;
    }

    /** @type {SideProperties} */
    #backProperties = new SideProperties();
    /** @type {SideProperties} The back-side properties. */
    get backProperties() {
        return this.#backProperties;
    }

    /** @type {SectorProperties} */
    #frontSectorProperties = new SectorProperties();
    /** @type {SectorProperties} The front-sector properties. */
    get frontSectorProperties() {
        return this.#frontSectorProperties;
    }

    /** @type {SectorProperties} */
    #backSectorProperties = new SectorProperties();
    /** @type {SectorProperties} The back-sector properties. */
    get backSectorProperties() {
        return this.#backSectorProperties;
    }

    /** @type {?Sector} */
    #frontSector = null;
    /** @type {?Sector} The sector assigned to the front side, or `null`. */
    get frontSector() {
        return this.#frontSector;
    }
    set frontSector(value) {
        this.#frontSector = value;
    }
    /** @type {?Sector} */
    #backSector = null;
    /** @type {?Sector} The sector assigned to the back side, or `null`. */
    get backSector() {
        return this.#backSector;
    }
    set backSector(value) {
        this.#backSector = value;
    }

    /** @type {boolean} */
    #frontSectorIsParent = false;
    /** @type {boolean} Whether the front sector is the parent sector. */
    get frontSectorIsParent() {
        return this.#frontSectorIsParent;
    }
    set frontSectorIsParent(value) {
        this.#frontSectorIsParent = value;
    }
    /** @type {boolean} */
    #backSectorIsParent = false;
    /** @type {boolean} Whether the back sector is the parent sector. */
    get backSectorIsParent() {
        return this.#backSectorIsParent;
    }
    set backSectorIsParent(value) {
        this.#backSectorIsParent = value;
    }

    /**
     * Constructs a line between two vertices.
     *
     * @param {Vertex} v0 - The starting vertex.
     * @param {Vertex} v1 - The ending vertex.
     */
    constructor(v0, v1) {
        super({
            min: {
                x: Math.min(v0.x, v1.x),
                y: Math.min(v0.y, v1.y),
            },
            max: {
                x: Math.max(v0.x, v1.x),
                y: Math.max(v0.y, v1.y),
            },
        });

        this.#v0 = v0;
        this.#v1 = v1;

        v0.addLine(this);
        v1.addLine(this);
    }

    /**
     * Creates a copy of this line using vertices from a vertex lookup map.
     *
     * @param {Map<string, Vertex>} vertexMap - The vertex lookup map.
     * @param {?Vertex} [v0=null] - An optional replacement starting vertex.
     * @param {?Vertex} [v1=null] - An optional replacement ending vertex.
     * @returns {?Line} The cloned line, or `null` if a required vertex is missing.
     */
    clone(vertexMap, v0 = null, v1 = null) {
        const key0 = DoomMap.createVertexKey(v0?.x ?? this.#v0.x, v0?.y ?? this.#v0.y);
        const key1 = DoomMap.createVertexKey(v1?.x ?? this.#v1.x, v1?.y ?? this.#v1.y);

        const v0_ = vertexMap.get(key0);
        const v1_ = vertexMap.get(key1);

        if (v0_ === undefined || v1_ === undefined) {
            console.warn(`Missing vertex for key "${key0}" or "${key1}"`);
            return null;
        }

        const line = new Line(v0_, v1_);
        line.#properties.copy(this.#properties);
        line.#frontProperties.copy(this.#frontProperties);
        line.#backProperties.copy(this.#backProperties);
        line.#frontSectorProperties.copy(this.#frontSectorProperties);
        line.#backSectorProperties.copy(this.#backSectorProperties);
        return line;
    }

    /**
     * Serializes the line and its property collections.
     *
     * @returns {Object} The serialized line data.
     */
    serialize() {
        return [
            this.#v0.x, this.#v0.y, this.#v1.x, this.#v1.y,
            this.#properties.serialize(),
            this.#frontProperties.serialize(),
            this.#backProperties.serialize(),
            this.#frontSectorProperties.serialize(),
            this.#backSectorProperties.serialize(),
        ];
    }

    /**
     * Creates a line from serialized data. Uses the vertex lookup map to find vertices in the map.
     *
     * @param {Object} data - The serialized line data.
     * @param {Map<string, Vertex>} vertexMap - The vertex lookup map.
     * @returns {?Line} The deserialized line, or `null` if a required vertex is missing.
     */
    static deserialize(data, vertexMap) {
        const [x0, y0, x1, y1, properties, front, back, frontSector, backSector] = data;

        const key0 = DoomMap.createVertexKey(x0, y0);
        const key1 = DoomMap.createVertexKey(x1, y1);

        const v0 = vertexMap.get(key0);
        const v1 = vertexMap.get(key1);

        if (v0 === undefined || v1 === undefined) {
            console.warn(`Missing vertex for key "${key0}" or "${key1}"`);
            return null;
        }

        const line = new Line(v0, v1);
        line.#properties.deserialize(properties);
        line.#frontProperties.deserialize(front);
        line.#backProperties.deserialize(back);
        line.#frontSectorProperties.deserialize(frontSector);
        line.#backSectorProperties.deserialize(backSector);
        return line;
    }

    /**
     * Detaches the line from both connected vertices.
     */
    removeFromVertexLines() {
        this.#v0.removeLine(this);
        this.#v1.removeLine(this);
    }

    /**
     * Tests whether a point lies exactly on the line segment.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {boolean} Whether the point lies on the line segment.
     */
    containsPoint(x, y) {
        const x0 = this.#v0.x;
        const y0 = this.#v0.y;
        const x1 = this.#v1.x;
        const y1 = this.#v1.y;

        if ((x1 - x0) * (y - y0) !== (y1 - y0) * (x - x0)) {
            return false;
        }

        return (
            x >= Math.min(x0, x1) &&
            x <= Math.max(x0, x1) &&
            y >= Math.min(y0, y1) &&
            y <= Math.max(y0, y1)
        );
    }

    /**
     * Calculates the squared perpendicular distance from a point to the line when the projected point lies
     * within the segment.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {?number} The squared distance, or `null` if the line is point is outside the line.
     */
    getDistanceSquaredToPoint(x, y) {
        const x0 = this.#v0.x;
        const y0 = this.#v0.y;
        const x1 = this.#v1.x;
        const y1 = this.#v1.y;

        const dx = x1 - x0;
        const dy = y1 - y0;
        const length2 = dx * dx + dy * dy;

        if (length2 === 0) {
            return null;
        }

        const t = ((x - x0) * dx + (y - y0) * dy) / length2;

        if (t < 0 || t > 1) {
            return null;
        }

        const dxp = x - (x0 + t * dx);
        const dyp = y - (y0 + t * dy);

        return dxp * dxp + dyp * dyp;
    }

    /**
     * Finds the closest point on the line segment.
     *
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {?object} The closest point and normalized segment position
     */
    getClosestPoint(x, y) {
        const x0 = this.#v0.x;
        const y0 = this.#v0.y;
        const x1 = this.#v1.x;
        const y1 = this.#v1.y;

        const dx = x1 - x0;
        const dy = y1 - y0;
        const length2 = dx * dx + dy * dy;

        if (length2 === 0) {
            return null;
        }

        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / length2));

        const px = x0 + t * dx;
        const py = y0 + t * dy;

        return { x: px, y: py, t };
    }

    /**
     * Tests whether the line segment intersects a circle.
     *
     * @param {number} x - The circle center x-coordinate.
     * @param {number} y - The circle center y-coordinate.
     * @param {number} radius - The circle radius.
     * @returns {boolean} Whether the line segment intersects the circle.
     */
    isInsideCircle(x, y, radius) {
        const r2 = radius * radius;

        const d2 = this.getDistanceSquaredToPoint(x, y);
        if (d2 !== null && d2 <= r2) {
            return true;
        }

        const dx0 = this.#v0.x - x;
        const dy0 = this.#v0.y - y;
        const dx1 = this.#v1.x - x;
        const dy1 = this.#v1.y - y;

        return (
            dx0 * dx0 + dy0 * dy0 <= r2 ||
            dx1 * dx1 + dy1 * dy1 <= r2
        );
    }

    /**
     * Tests whether the line is contained by or intersects a rectangle.
     *
     * @param {number} x0 - The first rectangle x-coordinate.
     * @param {number} y0 - The first rectangle y-coordinate.
     * @param {number} x1 - The opposite rectangle x-coordinate.
     * @param {number} y1 - The opposite rectangle y-coordinate.
     * @param {boolean} [intersects=false] - Whether partial intersection is sufficient.
     * @returns {boolean} Whether the line satisfies the rectangle test.
     */
    isInsideRectangle(x0, y0, x1, y1, intersects = false) {
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);

        if (this.bounds.max.x < minX || this.bounds.min.x > maxX ||
            this.bounds.max.y < minY || this.bounds.min.y > maxY) {
            return false;
        }

        const xA = this.#v0.x;
        const yA = this.#v0.y;
        const xB = this.#v1.x;
        const yB = this.#v1.y;

        const dx = xB - xA;
        const dy = yB - yA;

        let t0 = 0;
        let t1 = 1;

        const testBoundary = (p, q) => {
            if (p === 0) {
                return q >= 0;
            }
            const r = q / p;
            if (p < 0) {
                if (r > t1) {
                    return false;
                }
                if (r > t0) {
                    t0 = r;
                }
            } else {
                if (r < t0) {
                    return false;
                }
                if (r < t1) {
                    t1 = r;
                }
            }
            return true;
        };

        const hit =
            testBoundary(-dx, xA - minX) &&
            testBoundary(dx,  maxX - xA) &&
            testBoundary(-dy, yA - minY) &&
            testBoundary(dy,  maxY - yA);

        if (!hit) {
            return false;
        }

        return intersects || t0 === 0 && t1 === 1;
    }

    /**
     * @returns {string} The line description.
     */
    toString() {
        return `Line(start=(${this.#v0.x}, ${this.#v0.y}), end=(${this.#v1.x}, ${this.#v1.y}))`;
    }
}
