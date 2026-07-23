/**
 * Utility methods for parsing Doom resources and identifying common resource formats.
 */
export default class ResourceUtility {
    // Palette and texture parsing

    /**
     * Combines indexed image frames into a horizontally arranged sprite atlas.
     *
     * @param {Array<?object>} indexedImages - Indexed image frames.
     * @returns {{
     *     type: string,
     *     indices: Uint8Array,
     *     mask: Uint8Array,
     *     width: number,
     *     height: number,
     *     frameCount: number,
     *     pivotX: number,
     *     pivotY: number
     * }} The generated indexed image atlas.
     */
    static buildIndexedImageAtlas(indexedImages) {
        let maxLeft = 0;
        let maxRight = 0;
        let maxUp = 0;
        let maxDown = 0;

        indexedImages.forEach(frame => {
            if (frame === null) {
                return;
            }

            const pivotX = frame.leftOffset ?? Math.floor(frame.width / 2);
            const pivotY = frame.topOffset ?? frame.height;

            maxLeft = Math.max(maxLeft, pivotX);
            maxRight = Math.max(maxRight, frame.width  - pivotX);
            maxUp = Math.max(maxUp, pivotY);
            maxDown = Math.max(maxDown, frame.height - pivotY);
        });

        const frameWidth = maxLeft + maxRight;
        const atlasWidth = frameWidth * indexedImages.length;
        const atlasHeight = maxUp + maxDown;

        if (frameWidth === 0 || atlasHeight === 0) {
            throw new Error('No indexed images provided');
        }

        const count = atlasWidth * atlasHeight;

        const atlasIndices = new Uint8Array(count);
        const atlasMask = new Uint8Array(count);

        indexedImages.forEach((frame, i) => {
            if (frame === null) {
                return;
            }

            const { indices, mask, width, height } = frame;

            const pivotX = frame.leftOffset ?? Math.floor(width / 2);
            const pivotY = frame.topOffset ?? height;

            const ix0 = i * frameWidth + (maxLeft - pivotX);
            const iy0 = maxUp - pivotY;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i1 = y * width + x;
                    if (mask[i1] < 1) {
                        continue;
                    }

                    const dx = ix0 + x;
                    const dy = iy0 + y;

                    if (dx < 0 || dy < 0 || dx >= atlasWidth || dy >= atlasHeight) {
                        continue;
                    }

                    const i0 = dy * atlasWidth + dx;
                    atlasIndices[i0] = indices[i1];
                    atlasMask[i0] = 1;
                }
            }
        });

        return {
            type: 'doom',
            indices: atlasIndices,
            mask: atlasMask,
            width: atlasWidth,
            height: atlasHeight,
            frameCount: indexedImages.length,
            pivotX: maxLeft,
            pivotY: maxUp,
        };
    }

    /**
     * Creates a horizontally flipped copy of an indexed image.
     *
     * @param {Object} indexedImage - Indexed image.
     * @returns {Object} Indexed image.
     */
    static flipIndexedImage(indexedImage) {
        const { indices, mask, width, height, leftOffset } = indexedImage;

        const flippedIndices = new Uint8Array(indices.length);
        const flippedMask = new Uint8Array(mask.length);

        for (let y = 0; y < height; y++) {
            const i = y * width;

            for (let x = 0; x < width; x++) {
                const i0 = i + (width - 1 - x);
                const i1 = i + x;

                flippedIndices[i0] = indices[i1];
                flippedMask[i0] = mask[i1];
            }
        }

        return {
            ...indexedImage,
            indices: flippedIndices,
            mask: flippedMask,
            leftOffset: width - 1 - leftOffset,
        };
    }

    /**
     * Converts an indexed image into RGBA image data using a Doom palette.
     *
     * @param {Object} indexedImage - Indexed image.
     * @param {Uint8Array} palette - RGB palette.
     * @returns {ImageData} Image data.
     */
    static indexedImageToColorData(indexedImage, palette) {
        const { indices, mask, width, height } = indexedImage;

        const image = new ImageData(width, height);
        const pixels = image.data;
        pixels.fill(0);

        const count = width * height;

        for (let i = 0; i < count; i++) {
            if (mask[i] < 1) {
                continue;
            }

            const i0 = i * 4;
            const i1 = indices[i] * 3;

            pixels[i0 + 0] = palette[i1 + 0];
            pixels[i0 + 1] = palette[i1 + 1];
            pixels[i0 + 2] = palette[i1 + 2];
            pixels[i0 + 3] = 255;
        }

        return image;
    }

    /**
     * Converts an indexed image into RGBA data containing palette indices and mask values.
     *
     * The palette index is stored in the red channel and the alpha mask is stored in the green channel.
     *
     * @param {Object} indexedImage - Indexed image.
     * @returns {ImageData} Image data.
     */
    static indexedImageToIndexMaskData(indexedImage) {
        const { indices, mask, width, height } = indexedImage;

        const image = new ImageData(width, height);
        const pixels = image.data;
        pixels.fill(0);

        const count = width * height;

        for (let i = 0; i < count; i++) {
            const i0 = i * 4;
            pixels[i0 + 0] = indices[i];
            pixels[i0 + 1] = mask[i] < 1 ? 0 : 255;
            pixels[i0 + 3] = 255;
        }

        return image;
    }

    /**
     * Parses a COLORMAP lump into individual 256-entry palette-index mappings.
     *
     * @param {Uint8Array} data - Raw COLORMAP lump data.
     * @returns {Array<Uint8Array>} Parsed colormaps.
     */
    static parseColormaps(data) {
        if (data.byteLength < 256 || data.byteLength % 256 !== 0) {
            throw new Error('Malformed colormaps');
        }

        const mapSize = 256;
        const count = Math.floor(data.byteLength / mapSize);

        const maps = new Array(count);

        for (let i = 0; i < count; i++) {
            const start = i * mapSize;
            const end = start + mapSize;

            if (end > data.byteLength) {
                throw new Error('Malformed colormaps');
            }

            const map = new Uint8Array(mapSize);
            map.set(data.slice(start, end));

            maps[i] = map;
        }

        return maps;
    }

    /**
     * Parses a raw square flat into an indexed image.
     *
     * @param {Uint8Array} data - Raw flat data.
     * @param {number} [size=64] - Width and height.
     * @returns {{
     *     type: string,
     *     indices: Uint8Array,
     *     mask: Uint8Array,
     *     width: number,
     *     height: number
     * }} Parsed indexed flat image.
     */
    static parseFlatIndexedImage(data, size = 64) {
        const expected = size * size;

        if (data.byteLength < expected) {
            throw new Error('Malformed flat');
        }

        const indices = new Uint8Array(expected);
        indices.set(data.slice(0, expected));

        return {
            type: 'doom',
            indices,
            mask: new Uint8Array(size * size).fill(1),
            width: size,
            height: size,
        };
    }

    /**
     * Parses a PLAYPAL lump into RGB palettes.
     *
     * @param {Uint8Array} data - Raw PLAYPAL lump data.
     * @returns {Array<Uint8Array>} Parsed palettes.
     */
    static parsePlaypal(data) {
        const bytesPerPalette = 256 * 3;

        const count = Math.floor(data.byteLength / bytesPerPalette);
        if (count <= 0) {
            throw new Error('Malformed palette');
        }

        const palettes = [];
        for (let i = 0; i < count; i++) {
            const start = i * bytesPerPalette;
            const end = start + bytesPerPalette;
            if (end > data.length) {
                throw new Error('Malformed palette');
            }
            const palette = new Uint8Array(bytesPerPalette);
            palette.set(data.slice(start, end));
            palettes.push(palette);
        }

        return palettes;
    }

    /**
     * Parses a PNAMES lump into patch names.
     *
     * @param {Uint8Array} data - Raw PNAMES lump data.
     * @returns {Array<string>} Parsed patch names.
     */
    static parsePNames(data) {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const decoder = new TextDecoder();

        if (data.byteLength < 4) {
            throw new Error('Malformed patch names');
        }

        const count = view.getInt32(0, true);
        if (count < 0) {
            throw new Error('Malformed patch names');
        }

        const names = [];
        for (let i = 0; i < count; i++) {
            const offset = 4 + i * 8;
            if (offset + 8 > data.byteLength) {
                throw new Error('Malformed patch names');
            }
            const name = decoder.decode(data.slice(offset, offset + 8)).replace(/\0+$/, '');
            names.push(name);
        }

        return names;
    }

    /**
     * Parses a TEXTURE1 or TEXTURE2 lump into composite texture definitions.
     *
     * @param {Uint8Array} data - Raw texture-definition lump data.
     * @param {?Uint8Array} [pnamesData=null] - Optional PNAMES lump data.
     * @returns {Array<{
     *     name: string,
     *     width: number,
     *     height: number,
     *     patches: Array<{x: number, y: number, name: string}>
     * }>} Parsed texture definitions.
     */
    static parseTextureDefinitions(data, pnamesData = null) {
        const patchNames = pnamesData !== null ? ResourceUtility.parsePNames(pnamesData) : [];
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const decoder = new TextDecoder();

        if (data.byteLength < 4) {
            throw new Error('Malformed texture definitions');
        }

        const textureCount = view.getInt32(0, true);
        if (textureCount < 0) {
            return [];
        }

        const offsets = [];
        for (let i = 0; i < textureCount; i++) {
            const offset = 4 + i * 4;
            if (offset + 4 > data.byteLength) {
                throw new Error('Malformed texture definitions');
            }
            offsets.push(view.getInt32(offset, true));
        }

        const textures = [];
        offsets.forEach(offset => {
            if (offset < 0 || offset + 22 > data.byteLength) {
                throw new Error('Malformed texture definitions');
            }

            const name = decoder.decode(data.slice(offset, offset + 8)).replace(/\0+$/, '');
            const width = view.getInt16(offset + 12, true);
            const height = view.getInt16(offset + 14, true);
            const patchCount = view.getInt16(offset + 20, true);

            if (patchCount < 0) {
                throw new Error('Malformed texture definitions');
            }
            if (patchCount > 2048) {
                throw new Error('Malformed texture definitions');
            }

            const patches = [];
            let patchOffset = offset + 22;
            for (let p = 0; p < patchCount; p++) {
                if (patchOffset + 10 > data.byteLength) {
                    throw new Error('Malformed texture definitions');
                }
                const x = view.getInt16(patchOffset + 0, true);
                const y = view.getInt16(patchOffset + 2, true);
                const patchIndex = view.getInt16(patchOffset + 4, true);

                let patchName = null;
                if (patchIndex >= 0 && patchIndex < patchNames.length) {
                    patchName = patchNames[patchIndex];
                } else {
                    patchName = 'PATCH' + String(patchIndex);
                }

                patches.push({ x, y, name: patchName });
                patchOffset += 10;
            }

            textures.push({ name, width, height, patches });
        });

        return textures;
    }

    /** @type {Map<object, Map<number, number>} Indexed color replacement lookup per palette. */
    static #paletteColorLookup = new Map();

    /**
     * Decodes a PNG into a Doom-style indexed image.
     *
     * @param {string} name - Lump name.
     * @param {Uint8Array} data - Raw PNG data.
     * @param {Uint8Array} palette - 256-color RGB palette.
     * @returns {Promise<{
     *     type: string,
     *     indices: Uint8Array,
     *     mask: Uint8Array,
     *     width: number,
     *     height: number,
     *     leftOffset: number,
     *     topOffset: number
     * }>}
     */
    static async parsePngImageData(name, data, palette) {
        try {
            const blob = new Blob([data], { type: 'image/png' });
            const bitmap = await createImageBitmap(blob);

            const width = bitmap.width;
            const height = bitmap.height;
            const count = width * height;

            if (count === 0) {
                bitmap.close();
                throw new Error('Malformed sprite');
            }

            // Avoid searching the palette again for repeated PNG colors
            let colorLut = ResourceUtility.#paletteColorLookup.get(palette);
            if (colorLut === undefined) {
                colorLut = new Map();
                ResourceUtility.#paletteColorLookup.set(palette, colorLut);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');

            ctx.drawImage(bitmap, 0, 0);

            bitmap.close();

            const rgba = ctx.getImageData(0, 0, width, height).data;

            const indices = new Uint8Array(count);
            const mask = new Uint8Array(count);

            for (let i = 0; i < count; i++) {
                const rgbaOffset = i * 4;
                const alpha = rgba[rgbaOffset + 3];

                if (alpha === 0) {
                    continue;
                }

                mask[i] = 1;

                const red = rgba[rgbaOffset + 0];
                const green = rgba[rgbaOffset + 1];
                const blue = rgba[rgbaOffset + 2];

                const colorKey = (red << 16) | (green << 8) | blue;

                let index = colorLut.get(colorKey);

                if (index === undefined) {
                    let nearestIndex = 0;
                    let nearestDistance = Infinity;

                    for (let p = 0; p < 256; p++) {
                        const r = red - palette[p * 3 + 0];
                        const g = green - palette[p * 3 + 1];
                        const b = blue - palette[p * 3 + 2];

                        const distance = r * r + g * g + b * b;

                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestIndex = p;

                            if (distance === 0) {
                                break;
                            }
                        }
                    }

                    index = nearestIndex;
                    colorLut.set(colorKey, index);
                }

                indices[i] = index;
            }

            return {
                type: 'doom',
                indices,
                mask,
                width,
                height,
                leftOffset: 0,
                topOffset: 0,
            };
        } catch {
            console.warn(`Ignoring malformed sprite "${name}"`);
        }

        return {
            type: 'doom',
            indices: new Uint8Array(1),
            mask: new Uint8Array([0]),
            width: 1,
            height: 1,
            leftOffset: 0,
            topOffset: 0,
        };
    }

    /**
     * Parses a Doom picture or sprite lump into an indexed image.
     *
     * @param {string} name - Lump name.
     * @param {Uint8Array} data - Raw Doom picture data.
     * @returns {{
     *     type: string,
     *     indices: Uint8Array,
     *     mask: Uint8Array,
     *     width: number,
     *     height: number,
     *     leftOffset: number,
     *     topOffset: number,
     * }} Parsed indexed sprite image.
     */
    static parseSpriteIndexedImage(name, data) {
        try {
            const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

            if (data.byteLength < 8) {
                throw new Error('Malformed sprite');
            }

            const width = view.getInt16(0, true);
            const height = view.getInt16(2, true);
            const count = width * height;
            const leftOffset = view.getInt16(4, true);
            const topOffset = view.getInt16(6, true);

            if (count === 0) {
                throw new Error('Malformed sprite');
            }

            const tableBytes = 8 + width * 4;
            if (tableBytes > data.byteLength) {
                throw new Error('Malformed sprite');
            }

            const columnOffsets = [];
            for (let i = 0; i < width; i++) {
                columnOffsets.push(view.getInt32(8 + i * 4, true));
            }

            const indices = new Uint8Array(count);
            const mask = new Uint8Array(count);

            for (let column = 0; column < width; column++) {
                let position = columnOffsets[column];

                if (position < 0 || position >= data.byteLength) {
                    continue;
                }

                while (true) {
                    if (position >= data.byteLength) {
                        break;
                    }

                    const rowStart = data[position++];
                    if (rowStart === 0xFF) {
                        break;
                    }

                    if (position >= data.byteLength) {
                        break;
                    }

                    const pixelCount = data[position++];
                    // Skip unused byte
                    position += 1;

                    for (let i = 0; i < pixelCount; i++) {
                        if (position >= data.byteLength) {
                            throw new Error('Malformed sprite');
                        }

                        const colorIndex = data[position++];
                        const x = column;
                        const y = rowStart + i;

                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            const i0 = y * width + x;
                            indices[i0] = colorIndex;
                            mask[i0] = 1;
                        }
                    }

                    // Skip trailing unused byte
                    position += 1;
                }
            }

            return {
                type: 'doom',
                indices,
                mask,
                width,
                height,
                leftOffset,
                topOffset,
            };
        } catch {
            console.warn(`Ignoring malformed sprite "${name}"`);
        }

        return {
            type: 'doom',
            indices: new Uint8Array(1),
            mask: new Uint8Array([0]),
            width: 1,
            height: 1,
            leftOffset: 0,
            topOffset: 0,
        };
    }

    /**
     * Builds an indexed composite texture from a texture definition and patch images.
     *
     * @param {Object} textureDefinition - Composite texture definition.
     * @param {Map<string, object>} patches - Indexed patch images by patch name.
     * @returns {{
     *     type: string,
     *     indices: Uint8Array,
     *     mask: Uint8Array,
     *     width: number,
     *     height: number
     * }} Generated indexed texture.
     */
    static buildTextureIndexedImage(textureDefinition, patches) {
        const width = textureDefinition.width;
        const height = textureDefinition.height;

        const count = width * height;

        const indices = new Uint8Array(count);
        const mask = new Uint8Array(count);

        for (const ref of textureDefinition.patches) {
            const patch = patches.get(ref.name);
            if (patch === undefined) {
                console.warn(`Missing patch "${ref.name}"`);
                continue;
            }

            const pw = patch.width;
            const ph = patch.height;
            const pIndices = patch.indices;
            const pMask = patch.mask;

            for (let py = 0; py < ph; py++) {
                for (let px = 0; px < pw; px++) {
                    const dx = px + ref.x;
                    const dy = py + ref.y;

                    if (dx < 0 || dy < 0 || dx >= width || dy >= height) {
                        continue;
                    }

                    const i1 = py * pw + px;

                    if (pMask[i1] < 1) {
                        continue;
                    }

                    const i0 = dy * width + dx;
                    indices[i0] = pIndices[i1];
                    mask[i0] = 1;
                }
            }
        }

        return {
            type: 'doom',
            indices,
            mask,
            width,
            height,
        };
    }

    /**
     * Parses a ZDoom TEXTURES lump into texture definitions.
     *
     * @param {Object} texturesLump - Lump containing raw TEXTURES data.
     * @returns {Array<{
     *     name: string,
     *     width: number,
     *     height: number,
     *     patches: Array<{name: string, x: number, y: number}>
     * }>} Parsed texture definitions.
     */
    static parseTexturesTextLump(texturesLump) {
        const text = new TextDecoder().decode(texturesLump.data);
        const tokens = ResourceUtility.#texturesTokenize(text);
        const definitions = ResourceUtility.#texturesParse(tokens);
        return definitions;
    }

    /**
     * Tokenizes ZDoom TEXTURES syntax.
     *
     * @param {string} text - TEXTURES source text.
     * @returns {Array<{type: string, value: string}>} Parsed tokens.
     */
    static #texturesTokenize(text) {
        const tokens = [];

        let i = 0;

        while (i < text.length) {
            const c = text[i];

            if (/\s/.test(c)) {
                i += 1;
                continue;
            }

            if (c === '/' && text[i + 1] === '/') {
                while (i < text.length && text[i] !== '\n') {
                    i += 1;
                }
                continue;
            }

            if (c === '/' && text[i + 1] === '*') {
                i += 2;
                while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
                    i += 1;
                }
                i += 2;
                continue;
            }

            if (c === '{' || c === '}' || c === '=' || c === ';' || c === ',' || c === '(' || c === ')') {
                tokens.push({ type: 'punct', value: c });
                i += 1;
                continue;
            }

            if (c === '"' || c === '\'') {
                const quote = c;
                i += 1;
                let value = '';

                while (i < text.length) {
                    const ch = text[i++];
                    if (ch === '\\') {
                        const next = text[i++];
                        if (next === 'n') {
                            value += '\n';
                        } else if (next === 't') {
                            value += '\t';
                        } else if (next === 'r') {
                            value += '\r';
                        } else {
                            value += next;
                        }
                    } else if (ch === quote) {
                        break;
                    } else {
                        value += ch;
                    }
                }

                tokens.push({ type: 'string', value: value });
                continue;
            }

            let value = '';
            while (i < text.length && /[^{}\s=;(),]/.test(text[i])) {
                value += text[i++];
            }
            tokens.push({ type: 'ident', value: value });
        }

        return tokens;
    }

    /**
     * Parses tokenized ZDoom TEXTURES syntax into texture definitions.
     *
     * Unsupported properties are skipped while patch references are retained.
     *
     * @param {Array<{type: string, value: string}>} tokens - TEXTURES tokens.
     * @returns {Array<{
     *     name: string,
     *     width: number,
     *     height: number,
     *     patches: Array<{name: string, x: number, y: number}>
     * }>} Parsed texture definitions.
     */
    static #texturesParse = (tokens) => {
        let index = 0;

        const peek = () => tokens[index];

        const take = () => {
            const token = tokens[index];
            index += 1;
            return token;
        };

        const expect = value => {
            const token = take();

            if (!token || token.value !== value) {
                throw new Error(`TEXTURES parse error: expected "${value}"`);
            }
        };

        const readName = () => {
            const token = take();

            if (!token || token.type !== 'ident' && token.type !== 'string') {
                throw new Error('TEXTURES parse error: expected name');
            }

            return token.value;
        };

        const readNumber = () => {
            let sign = 1;

            const token = take();
            const value = Number(token?.value);

            if (!Number.isFinite(value)) {
                throw new Error('TEXTURES parse error: expected number');
            }

            return value * sign;
        };

        const isTextureKeyword = value => {
            const keyword = String(value).toLowerCase();

            return (
                keyword === 'texture' ||
                keyword === 'walltexture' ||
                keyword === 'sprite' ||
                keyword === 'graphic' ||
                keyword === 'flat'
            );
        };

        const skipGroup = (open, close) => {
            expect(open);

            let depth = 1;

            while (index < tokens.length && depth > 0) {
                const value = take()?.value;

                if (value === open) {
                    depth += 1;
                } else if (value === close) {
                    depth -= 1;
                }
            }

            if (depth !== 0) {
                throw new Error(`TEXTURES parse error: missing "${close}"`);
            }
        };

        const definitions = [];

        while (index < tokens.length) {
            const token = peek();

            if (token?.type !== 'ident' || !isTextureKeyword(token.value)) {
                take();
                continue;
            }

            take();

            const name = readName();

            if (peek()?.value === ',') {
                take();
            }

            const width = readNumber();
            expect(',');
            const height = readNumber();

            if (peek()?.value === '(') {
                skipGroup('(', ')');
            }

            expect('{');

            const patches = [];
            let depth = 1;

            while (index < tokens.length && depth > 0) {
                const bodyToken = take();

                if (bodyToken?.value === '{') {
                    depth += 1;
                    continue;
                }

                if (bodyToken?.value === '}') {
                    depth -= 1;
                    continue;
                }

                if (depth !== 1 ||
                    bodyToken?.type !== 'ident' ||
                    String(bodyToken.value).toLowerCase() !== 'patch') {
                    continue;
                }

                const patchName = readName();

                if (peek()?.value === ',') {
                    take();
                }

                const x = readNumber();
                expect(',');
                const y = readNumber();

                patches.push({
                    name: patchName.toUpperCase(),
                    x,
                    y,
                });

                if (peek()?.value === '{') {
                    skipGroup('{', '}');
                }

                if (peek()?.value === ';') {
                    take();
                }
            }

            if (depth !== 0) {
                throw new Error(`TEXTURES parse error: texture "${name}" is missing "}"`);
            }

            definitions.push({
                name: String(name).toUpperCase(),
                width,
                height,
                patches,
            });
        }

        return definitions;
    }

    // Thing and script parsing

    /**
     * Extracts actor definitions from a DECORATE lump.
     *
     * Existing definitions are updated by DoomEd number or class name.
     * Unknown actors are added as editor-visible custom things with default dimensions.
     *
     * @param {Object} decorateLump - Lump containing DECORATE source data.
     * @param {Array<object>} thingDefinitions - Thing definitions to update.
     */
    static parseDecorate(decorateLump, thingDefinitions) {
        const text = new TextDecoder().decode(decorateLump.data);
        const actorPattern = /ACTOR\s+([A-Za-z0-9_]+)(?:\s*:\s*([A-Za-z0-9_]+))?\s*(\d+)?\s*\{/gi;

        let match;
        while (true) {
            match = actorPattern.exec(text);
            if (match === null) {
                break;
            }

            const className = match[1];
            const idString = match[3];
            const id = idString ? parseInt(idString, 10) : null;

            let def = thingDefinitions.find(t => {
                if (id !== null && t.id === id) {
                    return true;
                }
                if (t.className === className) {
                    return true;
                }
                return false;
            });

            if (def === undefined) {
                def = {
                    id: null,
                    name: null,
                    className: null,
                    category: 'Unknown',
                    sprite: null,
                    radius: 32,
                    height: 32,
                    flags: [],
                    editorVisible: false,
                };
                thingDefinitions.push(def);
            }

            def.className = className;
            def.name = className;
            if (id !== null) {
                def.id = id;
            }
            def.category = 'Custom';
            def.editorVisible = true;
        }
    }

    /**
     * Extracts class definitions from a ZScript lump.
     *
     * Existing definitions are updated by class name.
     * Unknown classes are added as editor-visible ZScript things with default dimensions.
     *
     * @param {Object} zscriptLump - Lump containing ZScript source data.
     * @param {Array<object>} thingDefinitions - Thing definitions to update.
     */
    static parseZScript(zscriptLump, thingDefinitions) {
        const text = new TextDecoder().decode(zscriptLump.data);
        const classPattern = /class\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)?/gi;

        let match;
        while (true) {
            match = classPattern.exec(text);
            if (match === null) {
                break;
            }

            const className = match[1];

            let def = thingDefinitions.find(t => {
                if (t.className === className) {
                    return true;
                } else {
                    return false;
                }
            });

            if (def === undefined) {
                def = {
                    id: null,
                    name: null,
                    className: null,
                    category: 'Unknown',
                    sprite: null,
                    radius: 32,
                    height: 32,
                    flags: [],
                    editorVisible: false,
                };
                thingDefinitions.push(def);
            }

            def.className = className;
            def.category = 'ZScript';
            if (def.name === null) {
                def.name = className;
            }
            def.editorVisible = true;
        }
    }

    // Helpers and type checkers

    /**
     * Tests whether byte data begins with a PNG signature.
     *
     * @param {?Uint8Array} uint8 - Data.
     * @returns {boolean} Whether the data appears to be a PNG file.
     */
    static isPng(uint8) {
        if (!uint8 || uint8.byteLength < 8) {
            return false;
        }

        const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        for (let i = 0; i < 8; i++) {
            if (uint8[i] !== signature[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Tests whether byte data resembles a Doom picture.
     * This is a heuristic and may accept some false positives.
     *
     * @param {?Uint8Array} uint8 - Data.
     * @returns {boolean} Whether the data appears to be a Doom picture.
     */
    static isDoomPicture(uint8) {
        if (!uint8 || uint8.byteLength < 12) {
            return false;
        }

        const view = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
        const width = view.getInt16(0, true);
        const height = view.getInt16(2, true);

        if (width <= 0 || height <= 0) {
            return false;
        }

        const tableStart = 8;
        const needed = tableStart + width * 4;

        // May accept some false positives
        if (needed <= uint8.byteLength) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Tests whether byte data begins with RIFF/WAVE headers.
     *
     * @param {?Uint8Array} uint8 - Data.
     * @returns {boolean} Whether the data appears to be a WAV file.
     */
    static isWav(uint8) {
        if (!uint8 || uint8.byteLength < 12) {
            return false;
        }

        const isRiff = (uint8[0] === 0x52 && uint8[1] === 0x49 && uint8[2] === 0x46 && uint8[3] === 0x46);
        const isWave = (uint8[8] === 0x57 && uint8[9] === 0x41 && uint8[10] === 0x56 && uint8[11] === 0x45);

        if (isRiff && isWave) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Tests whether byte data begins with an OggS signature.
     *
     * @param {?Uint8Array} uint8 - Data.
     * @returns {boolean} Whether the data appears to be an Ogg stream.
     */
    static isOgg(uint8) {
        if (!uint8 || uint8.byteLength < 4) {
            return false;
        }

        if (uint8[0] === 0x4F && uint8[1] === 0x67 && uint8[2] === 0x67 && uint8[3] === 0x53) {
            return true;
        } else {
            return false;
        }
    }
}
