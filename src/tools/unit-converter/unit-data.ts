export const unitCategories = [
  { id: "length", label: "Length" },
  { id: "mass", label: "Mass" },
  { id: "temperature", label: "Temperature" },
  { id: "volume", label: "Volume" },
  { id: "area", label: "Area" },
  { id: "speed", label: "Speed" },
  { id: "time", label: "Time" },
  { id: "data", label: "Digital data" },
] as const

export type UnitCategoryId = (typeof unitCategories)[number]["id"]

interface UnitDefinition {
  id: string
  label: string
  symbol: string
  toBase: (value: number) => number
  fromBase: (value: number) => number
}

const scaleUnit = (id: string, label: string, symbol: string, scale: number): UnitDefinition => ({
  id,
  label,
  symbol,
  toBase: (value) => value * scale,
  fromBase: (value) => value / scale,
})

export const units: Record<UnitCategoryId, readonly UnitDefinition[]> = {
  length: [
    scaleUnit("meter", "Meter", "m", 1),
    scaleUnit("kilometer", "Kilometer", "km", 1000),
    scaleUnit("centimeter", "Centimeter", "cm", 0.01),
    scaleUnit("millimeter", "Millimeter", "mm", 0.001),
    scaleUnit("mile", "Mile", "mi", 1609.344),
    scaleUnit("yard", "Yard", "yd", 0.9144),
    scaleUnit("foot", "Foot", "ft", 0.3048),
    scaleUnit("inch", "Inch", "in", 0.0254),
  ],
  mass: [
    scaleUnit("kilogram", "Kilogram", "kg", 1),
    scaleUnit("gram", "Gram", "g", 0.001),
    scaleUnit("milligram", "Milligram", "mg", 0.000001),
    scaleUnit("pound", "Pound", "lb", 0.45359237),
    scaleUnit("ounce", "Ounce", "oz", 0.028349523125),
    scaleUnit("metric-tonne", "Metric tonne", "t", 1000),
  ],
  temperature: [
    {
      id: "celsius",
      label: "Celsius",
      symbol: "°C",
      toBase: (value) => value,
      fromBase: (value) => value,
    },
    {
      id: "fahrenheit",
      label: "Fahrenheit",
      symbol: "°F",
      toBase: (value) => ((value - 32) * 5) / 9,
      fromBase: (value) => (value * 9) / 5 + 32,
    },
    {
      id: "kelvin",
      label: "Kelvin",
      symbol: "K",
      toBase: (value) => value - 273.15,
      fromBase: (value) => value + 273.15,
    },
  ],
  volume: [
    scaleUnit("liter", "Liter", "L", 1),
    scaleUnit("milliliter", "Milliliter", "mL", 0.001),
    scaleUnit("us-gallon", "US gallon", "gal", 3.785411784),
    scaleUnit("us-quart", "US quart", "qt", 0.946352946),
    scaleUnit("us-pint", "US pint", "pt", 0.473176473),
    scaleUnit("us-cup", "US cup", "cup", 0.2365882365),
  ],
  area: [
    scaleUnit("square-meter", "Square meter", "m²", 1),
    scaleUnit("square-kilometer", "Square kilometer", "km²", 1_000_000),
    scaleUnit("square-mile", "Square mile", "mi²", 2_589_988.110336),
    scaleUnit("square-foot", "Square foot", "ft²", 0.09290304),
    scaleUnit("acre", "Acre", "ac", 4046.8564224),
    scaleUnit("hectare", "Hectare", "ha", 10_000),
  ],
  speed: [
    scaleUnit("meter-per-second", "Meter per second", "m/s", 1),
    scaleUnit("kilometer-per-hour", "Kilometer per hour", "km/h", 1 / 3.6),
    scaleUnit("mile-per-hour", "Mile per hour", "mph", 0.44704),
    scaleUnit("knot", "Knot", "kn", 0.5144444444444445),
  ],
  time: [
    scaleUnit("second", "Second", "s", 1),
    scaleUnit("minute", "Minute", "min", 60),
    scaleUnit("hour", "Hour", "h", 3600),
    scaleUnit("day", "Day", "d", 86_400),
    scaleUnit("week", "Week", "wk", 604_800),
  ],
  data: [
    scaleUnit("byte", "Byte", "B", 1),
    scaleUnit("kilobyte", "Kilobyte", "KB", 1024),
    scaleUnit("megabyte", "Megabyte", "MB", 1024 ** 2),
    scaleUnit("gigabyte", "Gigabyte", "GB", 1024 ** 3),
    scaleUnit("terabyte", "Terabyte", "TB", 1024 ** 4),
    scaleUnit("bit", "Bit", "bit", 1 / 8),
  ],
}

export function convertUnit(
  value: number,
  fromId: string,
  toId: string,
  category: UnitCategoryId,
): number {
  const from = units[category].find((unit) => unit.id === fromId)
  const to = units[category].find((unit) => unit.id === toId)
  if (!from || !to || !Number.isFinite(value)) return Number.NaN
  return to.fromBase(from.toBase(value))
}

export function formatConvertedValue(value: number): string {
  if (!Number.isFinite(value)) return ""
  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value)
}
