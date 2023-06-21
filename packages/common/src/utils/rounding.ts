/**
 * Truncates/Floors floating point numbers to the specified number of digits.
 *
 * To do this, the number is first multiplied by 10^{@link significantDigits} (shifted),
 * then floored,
 * then shifted back, divided by 10^{@link significantDigits}
 *
 * Uses scientific notation to handle the shifting
 * @param value
 * @param significantDigits
 */
export function floorDecimals(value: number, significantDigits: number) {
  ensureValidSignificantDigits(significantDigits);

  const shiftedSignificantDigits = Number(applyScientificDigits(value, significantDigits));

  const floored = Math.floor(shiftedSignificantDigits);

  const shiftedBack = applyScientificDigits(floored, significantDigits * -1);

  return Number(shiftedBack);
}

/**
 * Rounds floating point numbers to the specified number of digits.
 *
 * To do this, the number is first multiplied by 10^{@link significantDigits} (shifted),
 * then rounded,
 * then shifted back, divided by 10^{@link significantDigits}
 *
 * Uses scientific notation to handle the shifting
 * @param value
 * @param significantDigits
 */
export function roundDecimals(value: number, significantDigits: number) {
  ensureValidSignificantDigits(significantDigits);

  const shiftedSignificantDigits = Number(applyScientificDigits(value, significantDigits));

  const rounded = Math.round(shiftedSignificantDigits);

  const shiftedBack = applyScientificDigits(rounded, significantDigits * -1);

  return Number(shiftedBack);
}

/**
 * Applies the given {@link epsilonValue} to the number.
 *
 * @note When stringified, certain minuscule numbers are already formatted in scientific notation, so the new epsilon value needs
 *       to be added to the existing
 *       ex:
 *         (1.012345e-7, 4) => 1.012345e-3
 *         (1.012345e3, -4) => 1.012345e-1
 * @param value
 * @param epsilonValue
 */
function applyScientificDigits(value: number, epsilonValue: number) {
  const scientificSegments = `${value}`.split('e');

  // There's no existing epsilon value to deal with, append the desired
  if (scientificSegments.length === 1) {
    return `${value}e${epsilonValue}`;
  }

  const existingEpsilonValue = scientificSegments[1];

  // merge the epsilon values by adding them together and append to the numerical portion
  return `${scientificSegments[0]}e${existingEpsilonValue + epsilonValue}`;
}

function ensureValidSignificantDigits(significantDigits: number) {
  if (significantDigits < 0) {
    throw new Error('Cannot floor to a negative number of significant decimal digits');
  }

  if (significantDigits > 10) {
    throw new Error('Cannot round to more than 10 significant decimal digits');
  }
}
