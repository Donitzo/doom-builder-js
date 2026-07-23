/**
 * Parser and serializer for Universal Doom Map Format text.
 */
export default class UdmfParser {
    /**
     * Parses UDMF text into an abstract syntax tree (Ast).
     *
     * The result contains the optional namespace, top-level fields, and nested typed blocks.
     *
     * @param {string} text - UDMF source text.
     * @returns {{
     *     namespace: ?string,
     *     blocks: Array<{type: string, fields: object}>,
     *     fields: object,
     * }} Parsed UDMF syntax tree.
     */
    static parse(text) {
        // Remove comments while preserving quoted strings
        const noComments = text.replace(
            /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g,
            '$1',
        );

        // Extract tokens
        const tokens = noComments.match(
            /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z0-9_:.+-]+|[{}=;]/g,
        );

        // Token iterator
        let index = 0;

        // Next token
        const next = () => {
            const t = tokens[index];
            index += 1;
            return t;
        };

        // Look-ahead
        const peek = () => {
            return tokens[index];
        };

        const result = {
            namespace: null,
            blocks: [],
            fields: Object.create(null),
        };

        // Empty tokens returns an empty result
        if (!tokens) {
            return result;
        }

        // Iterate tokens
        while (index < tokens.length) {
            const token = next();

            // Parse namespace: namespace = value
            if (typeof token === 'string' && token.toLowerCase() === 'namespace') {
                if (peek() !== '=') {
                    console.warn('Attempted to parse malformed UDMF tokens');
                    return result;
                }
                next();
                result.namespace = UdmfParser.#coerceValue(next());
                if (peek() === ';') {
                    next();
                }
                continue;
            }

            // Parse field
            if (peek() === '=') {
                next();
                result.fields[token] = UdmfParser.#coerceValue(next());
                if (peek() === ';') {
                    next();
                }
            }

            // Parse object
            if (peek() === '{') {
                const blockType = token;
                next();
                const fields = Object.create(null);

                // Parse nested fields
                while (peek() !== '}' && index < tokens.length) {
                    const key = next();
                    if (peek() !== '=') {
                        console.warn('Attempted to parse malformed UDMF tokens');
                        return result;
                    }
                    next();
                    const raw = next();
                    fields[key] = UdmfParser.#coerceValue(raw);
                    if (peek() === ';') {
                        next();
                    }
                }

                if (peek() !== '}') {
                    console.warn('Attempted to parse malformed UDMF tokens');
                    return result;
                }
                next();

                result.blocks.push({ type: blockType, fields: fields });
            }
        }

        return result;
    }

    /**
     * Serializes a UDMF abstract syntax tree into text.
     *
     * @param {{
     *     namespace?: ?string,
     *     blocks?: Array<{type: string, fields: object}>,
     *     fields?: object
     * }} ast - UDMF syntax tree to serialize.
     * @returns {string} Serialized UDMF text.
     */
    static serialize(ast) {
        const lines = [];

        // Add namespace
        if (ast.namespace != null) {
            lines.push(`namespace = ${this.#serializeValue(ast.namespace)};`, '');
        }

        // Add top-level fields
        for (const [key, value] of Object.entries(ast.fields ?? {})) {
            lines.push(`${key} = ${this.#serializeValue(value)};`);
        }

        if (Object.keys(ast.fields ?? {}).length > 0) {
            lines.push('');
        }

        // Add nested blocks
        for (const block of ast.blocks ?? []) {
            lines.push(`${block.type} {`);
            for (const [key, value] of Object.entries(block.fields)) {
                lines.push(`    ${key} = ${this.#serializeValue(value)};`);
            }
            lines.push('}', '');
        }

        return lines.join('\n');
    }

    /**
     * Converts a raw token into a primitive value.
     *
     * Quoted values become strings, boolean literals become booleans,
     * numeric literals become numbers, and all other values remain strings.
     *
     * @param {*} value - Raw token value.
     * @returns {*} Coerced value.
     */
    static #coerceValue(value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value !== 'string') {
            return value;
        }

        if (value.length > 1 && (value.startsWith('"') || value.startsWith('\''))) {
            return value
                .slice(1, -1)
                .replace(/\\(["'\\])/g, '$1');
        }

        const lower = value.toLowerCase();

        if (lower === 'true') {
            return true;
        }

        if (lower === 'false') {
            return false;
        }

        if (value.trim() !== '' && !isNaN(value)) {
            const number = Number(value);
            if (Number.isFinite(number)) {
                return number;
            }
        }

        return value;
    }

    /**
     * Serializes a primitive value into UDMF syntax.
     *
     * Strings are quoted and escaped, booleans use lowercase literals,
     * and numeric values are emitted without additional formatting.
     *
     * @param {*} value - Value to serialize.
     * @returns {string} Serialized UDMF value.
     */
    static #serializeValue(value) {
        switch (typeof value) {
            case 'string': {
                const escaped = value
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"');
                return `"${escaped}"`;
            }

            case 'boolean':
                return value ? 'true' : 'false';

            case 'number':
                return String(value);

            default:
                return String(value);
        }
    }
}
