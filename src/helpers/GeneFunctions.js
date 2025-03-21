import { ApiState } from "../states/ApiState";
import { fetchDataFromAPI } from "./APIClient";

export function getGene(gene) {
    return fetchDataFromAPI(gene, ApiState.value.prefix);
}

// for two genes
function interpolatePercentages(percent1, percent2) {

    // Define colors
    const white = { r: 255, g: 255, b: 255 };
    const green = { r: 0, g: 255, b: 0 };
    const magenta = { r: 255, g: 0, b: 255 };

    // Interpolate between red and white based on the first percentage
    const interpolatedRed = {
        r: Math.round(green.r + (white.r - green.r) * percent2),
        g: Math.round(green.g + (white.g - green.g) * percent2),
        b: Math.round(green.b + (white.b - green.b) * percent2)
    };

    // Interpolate between cyan and white based on the second percentage
    const interpolatedCyan = {
        r: Math.round(magenta.r + (white.r - magenta.r) * percent1),
        g: Math.round(magenta.g + (white.g - magenta.g) * percent1),
        b: Math.round(magenta.b + (white.b - magenta.b) * percent1)
    };

    // Calculate the average of the interpolated colors
    const averageColor = {
        r: (interpolatedRed.r + interpolatedCyan.r) / 2,
        g: (interpolatedRed.g + interpolatedCyan.g) / 2,
        b: (interpolatedRed.b + interpolatedCyan.b) / 2
    };

    // Return CSS color string
    return `rgb(${Math.round(averageColor.r)}, ${Math.round(averageColor.g)}, ${Math.round(averageColor.b)})`;
}

/**
 * Generates a color value in the coolwarm colormap based on the input value.
 * @param {number} value - The value for which to generate the color (between 0 and 1).
 * @returns {string} - The color string in RGB format.
 */
export function coolwarm(value1, value2) {
    // Define start and end colors (cool: blue, warm: red)
    const startColor = { r: 0, g: 0, b: 255 }; // Blue
    const middleColor = { r: 255, g: 255, b: 255 }; // White
    const endColor = { r: 255, g: 0, b: 0 }; // Red

    // no second gene
    if (value2 == null) {
        if (value1 < 0.5) { // blue to white
            return `rgb(${Math.floor(middleColor.r * value1 * 2)}, ${Math.floor(middleColor.g * value1 * 2)}, ${startColor.b})`;
        } else if (value1 === 0.5) { // white
            return `rgb(${middleColor.r}, ${middleColor.g}, ${middleColor.b})`;
        } else { // white to red
            return `rgb(${endColor.r}, ${Math.floor(middleColor.g - (middleColor.g * (value1 - 0.5) * 2))}, ${Math.floor(middleColor.b - (middleColor.b * (value1 - 0.5) * 2))})`;
        }
    } else {
        return interpolatePercentages(value1, value2);
    }
}
/**
 * Calculates the value at the given percentile of the provided array.
 * @param {Array<number>} arr - The array of numerical values.
 * @param {number} percentile - The percentile to calculate (e.g., 0.99 for the 99th percentile).
 * @returns {number} - The value at the specified percentile, or null if input is invalid.
 */
export function calculateGenePercentile(arr, percentile) {
    // Check if arr is a valid array and if percentile is a number between 0 and 1
    if (!Array.isArray(arr) || typeof percentile !== 'number' || percentile < 0 || percentile > 1) {
        console.error("Invalid input:", { arr, percentile });
        return null;
    }

    // Create a copy of the array and sort it in ascending order
    const sortedArr = arr.slice().sort((a, b) => a - b);

    // Handle edge cases where the array might be empty
    if (sortedArr.length === 0) {
        console.error("Array is empty.");
        return null;
    }

    // Calculate the index for the xth percentile
    const index = Math.floor(sortedArr.length * percentile) - 1;

    // Ensure the index is within bounds
    if (index < 0) return sortedArr[0];
    if (index >= sortedArr.length) return sortedArr[sortedArr.length - 1];

    // Return the value at the calculated index
    return sortedArr[index] === 0 ? 1 : sortedArr[index];
}


/**
 * Normalizes the values in the array to a range between 0 and 1.
 * @param {Array<number>} arr - The array of numerical values.
 * @param {number} nmax - The maximum value in the array.
 * @returns {Array<number>} - The array with normalized values.
 */
export function normalizeArray(arr, nmax) {
    return arr.map(value => Math.min(value / nmax, 1));
}
