import {coefficient_r, coefficient_g, coefficient_b} from './coefficients';
import {calculateGamma} from './computeBrightness';

export function adjustGamma(rgb: [number, number, number], gamma: number): [number, number, number] {
    // Destructure the input RGB array
    let [r, g, b] = rgb;

    let calculateGammaValue = calculateGamma(r, g, b);

    let target_gamma_coefficient = gamma/ calculateGammaValue;
    
    // Calculate the new RGB values

    r = Math.round(r * target_gamma_coefficient);
    g = Math.round(g * target_gamma_coefficient);
    b = Math.round(b * target_gamma_coefficient);

    // Return the new RGB values as an array
    return [r, g, b];
  }