/**
 * Geometry utilities for 2D map editing.
 *
 * All coordinates passed to these methods are expected to be integers.
 * Most predicates (orientation, onSegment, intersection tests)
 * rely on exact integer arithmetic and may give unreliable results
 * if provided with floating-point input.
 *
 * Methods that require division, such as segmentIntersection,
 * may produce fractional intersection coordinates.
 */
export default class Utility {
    /** @type {number} Epsilon for floating-point tests */
    static #EPSILON = 1e-12;

    /**
     * Determines the orientation of three points using the 2D cross product of (q - p) × (r - p).
     *
     * @param {number} px - X coordinate of point P.
     * @param {number} py - Y coordinate of point P.
     * @param {number} qx - X coordinate of point Q.
     * @param {number} qy - Y coordinate of point Q.
     * @param {number} rx - X coordinate of point R.
     * @param {number} ry - Y coordinate of point R.
     * @returns {number} `1` for counter-clockwise, `-1` for clockwise, or `0` when the points are collinear.
     */
    static orientation(px, py, qx, qy, rx, ry) {
        const cross = (qx - px) * (ry - py) - (qy - py) * (rx - px);
        return cross === 0 ? 0 : cross > 0 ? 1 : -1;
    }

    /**
     * Determines whether segments AB and CD intersect at a proper interior point.
     *
     * Endpoint-only contact and collinear overlap are not considered proper intersections.
     *
     * @param {number} ax - X coordinate of point A.
     * @param {number} ay - Y coordinate of point A.
     * @param {number} bx - X coordinate of point B.
     * @param {number} by - Y coordinate of point B.
     * @param {number} cx - X coordinate of point C.
     * @param {number} cy - Y coordinate of point C.
     * @param {number} dx - X coordinate of point D.
     * @param {number} dy - Y coordinate of point D.
     * @returns {boolean} `true` when the segments intersect at an interior point.
     */
    static segmentsProperlyIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
        const o1 = Utility.orientation(ax, ay, bx, by, cx, cy);
        const o2 = Utility.orientation(ax, ay, bx, by, dx, dy);
        const o3 = Utility.orientation(cx, cy, dx, dy, ax, ay);
        const o4 = Utility.orientation(cx, cy, dx, dy, bx, by);
        return o1 * o2 < 0 && o3 * o4 < 0;
    }

    /**
     * Computes the proper interior intersection point of segments AB and CD.
     *
     * Endpoint-only contact, parallel segments, and collinear segments return `null`.
     *
     * @param {number} ax - X coordinate of point A.
     * @param {number} ay - Y coordinate of point A.
     * @param {number} bx - X coordinate of point B.
     * @param {number} by - Y coordinate of point B.
     * @param {number} cx - X coordinate of point C.
     * @param {number} cy - Y coordinate of point C.
     * @param {number} dx - X coordinate of point D.
     * @param {number} dy - Y coordinate of point D.
     * @param {{x: number, y: number, t: number, u: number}} target - Target intersection point
     * @returns {{x: number, y: number, t: number, u: number} | null} - The target object or `null`.
     */
    static segmentIntersection(ax, ay, bx, by, cx, cy, dx, dy, target) {
        const epsilon = Utility.#EPSILON;

        const rpx = bx - ax, rpy = by - ay;
        const spx = dx - cx, spy = dy - cy;

        const denom = rpx * spy - rpy * spx;
        if (denom === 0) {
            return null;
        }

        const t = ((cx - ax) * spy - (cy - ay) * spx) / denom;
        const u = ((cx - ax) * rpy - (cy - ay) * rpx) / denom;

        // Exclude endpoints
        if (t <= epsilon || t >= 1 - epsilon) {
            return null;
        }
        if (u <= epsilon || u >= 1 - epsilon) {
            return null;
        }

        target.x = ax + t * rpx;
        target.y = ay + t * rpy;
        target.t = t;
        target.u = u;
        return target;
    }

    /**
     * Computes the angle from point A to point B.
     *
     * @param {number} ax - X coordinate of point A.
     * @param {number} ay - Y coordinate of point A.
     * @param {number} bx - X coordinate of point B.
     * @param {number} by - Y coordinate of point B.
     * @returns {number} Angle in radians in the range `[-PI, PI]`.
     */
    static angleTo(ax, ay, bx, by) {
        return Math.atan2(by - ay, bx - ax);
    }

    /**
     * Computes the counter-clockwise angle from angle A to angle B.
     *
     * @param {number} a - Starting angle in radians.
     * @param {number} b - Ending angle in radians.
     * @returns {number} Normalized angle in radians in the range `[0, 2 * PI)`.
     */
    static angleToCcw(a, b) {
        const tau = Math.PI * 2;
        return ((b - a) % tau + tau) % tau;
    }

    /**
     * Computes the signed area of a polygon represented by a flat XY coordinate array.
     *
     * A positive result indicates counter-clockwise winding.
     *
     * @param {Array<number>} flatXY - Flat coordinate array`.
     * @returns {number} Signed polygon area, or `0` when fewer than three vertices are provided.
     */
    static signedArea2d(flatXY) {
        const n = flatXY.length;
        if (n < 3 * 2) {
            return 0;
        }

        let sum = 0;
        for (let i = 0; i < n; i += 2) {
            const j = (i + 2) % n;
            sum += flatXY[i] * flatXY[j + 1] - flatXY[i + 1] * flatXY[j];
        }
        return 0.5 * sum;
    }

    /**
     * Creates a crosshair cursor.
     *
     * @param {string} [color="#fff"] - CSS color foreground.
     * @param {boolean} [returnDataUrl=true] - `true` = returns a CSS cursor. `false` = returns the canvas.
     * @returns {string | HTMLCanvasElement} - A CSS cursor value or the generated canvas.
     */
    static createCrosshairCursor(color = '#fff', returnDataUrl = true) {
        const s = 32, c = s / 2, a = 14, w = 3.5, r = 2.5;
        const canvas = Object.assign(document.createElement('canvas'), {
            width: s,
            height: s,
        });
        const ctx = canvas.getContext('2d');
        ctx.translate(0.5, 0.5);

        ctx.lineCap = 'round';
        ctx.lineWidth = w + 2;
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        const outline = a - 1.5;
        ctx.moveTo(c, c - outline);
        ctx.lineTo(c, c + outline);
        ctx.moveTo(c - outline, c);
        ctx.lineTo(c + outline, c);
        ctx.stroke();

        ctx.lineWidth = w;
        ctx.strokeStyle = color;
        ctx.beginPath();
        const inner = a - 2;
        ctx.moveTo(c, c - inner);
        ctx.lineTo(c, c + inner);
        ctx.moveTo(c - inner, c);
        ctx.lineTo(c + inner, c);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        return returnDataUrl ? `url(${canvas.toDataURL()}) ${c} ${c}, crosshair` : canvas;
    }

    /**
     * Creates a circular brush cursor with a crosshair center and dashed radius outline.
     *
     * @param {string} [color="#fff"] - CSS color for foreground.
     * @param {number} [radius=12] - Brush radius.
     * @returns {string} CSS cursor declaration.
     */
    static createBrushCursor(color = '#fff', radius = 12) {
        const s = Math.ceil(radius * 2 + 2);
        const c = s / 2;

        const canvas = Object.assign(document.createElement('canvas'), {
            width: s,
            height: s,
        });
        const ctx = canvas.getContext('2d');
        ctx.translate(0.5, 0.5);

        ctx.lineCap = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(c, c - 10);
        ctx.lineTo(c, c + 10);
        ctx.moveTo(c - 10, c);
        ctx.lineTo(c + 10, c);
        ctx.stroke();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(c, c - 10);
        ctx.lineTo(c, c + 10);
        ctx.moveTo(c - 10, c);
        ctx.lineTo(c + 10, c);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(c, c, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.arc(c, c, radius, 0, Math.PI * 2);
        ctx.stroke();

        return `url(${canvas.toDataURL()}) ${c} ${c}, crosshair`;
    }

    /**
     * Creates a four-direction movement cursor using arrow-shaped triangles.
     *
     * @param {string} [color="#fff"] - CSS fill color for the arrows.
     * @param {number} [radius=14] - Cursor radius.
     * @returns {string} CSS cursor declaration.
     */
    static createMoveCursor(color = '#fff', radius = 14) {
        const s = Math.ceil(radius * 2 + 2);
        const c = s / 2;

        const canvas = Object.assign(document.createElement('canvas'), {
            width: s,
            height: s,
        });
        const ctx = canvas.getContext('2d');
        ctx.translate(0.5, 0.5);

        const triangleSize = 5;
        const gap = 8;

        const triangles = [[
            [c, c - gap - triangleSize],
            [c - triangleSize, c - gap],
            [c + triangleSize, c - gap],
        ], [
            [c + gap + triangleSize, c],
            [c + gap, c - triangleSize],
            [c + gap, c + triangleSize],
        ], [
            [c, c + gap + triangleSize],
            [c - triangleSize, c + gap],
            [c + triangleSize, c + gap],
        ], [
            [c - gap - triangleSize, c],
            [c - gap, c - triangleSize],
            [c - gap, c + triangleSize],
        ]];

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = color;
        triangles.forEach(t => {
            ctx.beginPath();
            ctx.moveTo(t[0][0], t[0][1]);
            ctx.lineTo(t[1][0], t[1][1]);
            ctx.lineTo(t[2][0], t[2][1]);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        });

        return `url(${canvas.toDataURL()}) ${c} ${c}, move`;
    }

    /**
     * Creates a diagonal pen cursor using an off-screen canvas.
     *
     * @param {string} [color="#4fdcff"] - CSS fill color for the pen.
     * @param {number} [size=24] - Width and height of the cursor canvas.
     * @returns {string} CSS cursor declaration.
     */
    static createPenCursor(color = '#4fdcff', size = 24) {
        const canvas = Object.assign(document.createElement('canvas'), {
            width: size,
            height: size,
        });
        const ctx = canvas.getContext('2d');
        ctx.translate(0.5, 0.5);

        const margin = 2;
        const width = 7;
        const diagonalWidth = width * Math.sqrt(2);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(margin, size - margin - diagonalWidth * 0.5);
        ctx.lineTo(margin + diagonalWidth * 0.5, size - margin);
        ctx.lineTo(size - margin, margin + diagonalWidth * 0.5);
        ctx.lineTo(size - margin - diagonalWidth * 0.5, margin);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(margin, size - margin - diagonalWidth * 0.5);
        ctx.lineTo(margin + diagonalWidth * 0.5, size - margin);
        ctx.lineTo(margin, size - margin);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        return `url(${canvas.toDataURL()}) ${margin} ${size - margin}, crosshair`;
    }

    /**
     * Copies an ImageData object into a new canvas.
     *
     * @param {ImageData} imageData - Source pixel data.
     * @returns {HTMLCanvasElement} Canvas.
     */
    static imageDataToCanvas(imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }

    /**
     * Creates a square preview image with either a supplied background image or a checkerboard background.
     * The preview may also include a border and text labels.
     *
     * @param {Object} [options={}] - Template configuration.
     * @returns {HTMLCanvasElement} Generated preview canvas.
     */
    static createPreviewImage(options = {}) {
        const {
            backgroundColor0 = '#ffffff',
            backgroundColor1 = '#010101',
            backgroundImage = null,
            backgroundImageScale = 1,
            borderColor = '#010101',
            borderWidth = 0,
            checkersMargin = 0,
            flipY = false,
            fontSize = 8,
            labelFillColor = '#ffffff',
            labelLines = [],
            labelY = null,
            size = 128,
        } = options;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        if (flipY) {
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
        }

        if (backgroundImage !== null) {
            const imageWidth = backgroundImage.width * backgroundImageScale;
            const imageHeight = backgroundImage.height * backgroundImageScale;

            const scale = Math.min(1,
                canvas.width / imageWidth,
                canvas.height / imageHeight
            );

            const drawWidth = imageWidth * scale;
            const drawHeight = imageHeight * scale;

            ctx.drawImage(
                backgroundImage,
                (canvas.width - drawWidth) / 2,
                (canvas.height - drawHeight) / 2,
                drawWidth,
                drawHeight
            );
        } else {
            const cells = 8;
            const cell = size / cells;
            for (let y = checkersMargin; y < cells - checkersMargin; y++) {
                for (let x = checkersMargin; x < cells - checkersMargin; x++) {
                    ctx.fillStyle = (x + y) & 1
                        ? backgroundColor0
                        : backgroundColor1;
                    ctx.fillRect(x * cell, y * cell, cell, cell);
                }
            }
        }

        if (borderWidth > 0) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(
                borderWidth / 2,
                borderWidth / 2,
                canvas.width - borderWidth,
                canvas.height - borderWidth
            );
        }

        const lines = Array.isArray(labelLines) ? labelLines : [labelLines];

        if (lines.length > 0) {
            ctx.font = `${fontSize}px default-font`;
            ctx.lineJoin = 'round';
            ctx.textAlign = 'center';

            [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 2], [-1, -1],
                [1, -1], [-1, 1], [1, 1], [-1, 2], [1, 2], [0, 0]].forEach((p, j) => {
                ctx.fillStyle = j === 11 ? labelFillColor : '#010101';
                lines.forEach((line, i) => {
                    const x = Math.round(canvas.width / 2);
                    const y = Math.round((labelY ?? (canvas.height / 2 - lines.length / 2)) +
                        i * (fontSize + 2));
                    ctx.fillText(line, x + p[0], y + p[1]);
                });
            });
        }

        return canvas;
    }
}
