type SliderValue = number | readonly number[] | undefined;

export function getSliderValues(
  value: SliderValue,
  defaultValue: SliderValue,
  min: number,
  max: number,
) {
  const selectedValue = [value, defaultValue].find((candidate) => candidate !== undefined) ?? [
    min,
    max,
  ];

  return Array.isArray(selectedValue) ? selectedValue : [selectedValue];
}
