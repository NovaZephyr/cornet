import { customAlphabet } from "nanoid";

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para que los links se lean bien.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Genera códigos tipo "as5f23gS" para usar en /watch?v=...
export const generateVideoCode = customAlphabet(alphabet, 8);
