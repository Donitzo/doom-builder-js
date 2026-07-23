/**
 * Abstract base class for all geometry types in the map.
 */
export default class Geometry {
    /** @type {?{ min: {x:number, y:number}, max: {x:number, y:number} }} */
    #bounds = null;
    /** @type {{ min: {x:number, y:number}, max: {x:number, y:number} }} Axis-aligned bounding box. */
    get bounds() {
        return this.#bounds;

    }

    /**
     * Constructs a geometry object.
     *
     * @param {{ min: {x:number, y:number}, max: {x:number, y:number} }} bounds - Axis-aligned bounding box.
     */
    constructor(bounds) {
        this.#bounds = bounds;
    }

    /**
     * Tests whether the geometry intersects a circle.
     *
     * @param {number} x - Circle center x-coordinate.
     * @param {number} y - Circle center y-coordinate.
     * @param {number} radius - Circle radius.
     * @returns {boolean} Whether the geometry intersects the circle.
     */
    isInsideCircle(x, y, radius) {
        throw Error('Not implemented');
    }

    /**
     * Tests whether the geometry is contained by or intersects a rectangle.
     *
     * @param {number} x0 - Minimum x-coordinate.
     * @param {number} y0 - Minimum y-coordinate.
     * @param {number} x1 - Maximum x-coordinate.
     * @param {number} y1 - Maximum y-coordinate.
     * @param {boolean} [intersects=false] - When `true`, partial intersection is sufficient.
     * @returns {boolean} Whether the geometry satisfies the rectangle test.
     */
    isInsideRectangle(x0, y0, x1, y1, intersects = false) {
        throw Error('Not implemented');
    }
}
