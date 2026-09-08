/**
 * Pure fake-data generation for test fixtures and UI mockups. Datasets are
 * the upstream catalog's verbatim; randomness is injected so tests are
 * deterministic and the runtime source is the platform RandomService.
 *
 * Values are explicitly fake and must never be treated as secrets: the
 * modulo pick is not rejection-sampled because uniformity is irrelevant for
 * dummy data.
 */

export const firstNames = [
  "James",
  "Mary",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
  "William",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Christopher",
  "Karen",
  "Charles",
  "Lisa",
  "Daniel",
  "Nancy",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Carol",
  "Kevin",
  "Amanda",
  "Brian",
  "Dorothy",
  "George",
  "Melissa",
  "Timothy",
  "Deborah",
  "Ronald",
  "Stephanie",
  "Edward",
  "Rebecca",
  "Jason",
  "Sharon",
  "Jeffrey",
  "Laura",
  "Ryan",
  "Cynthia",
  "Jacob",
  "Kathleen",
  "Gary",
  "Amy",
  "Nicholas",
  "Angela",
  "Eric",
  "Shirley",
  "Jonathan",
  "Anna",
  "Stephen",
  "Brenda",
  "Larry",
  "Pamela",
  "Justin",
  "Emma",
  "Scott",
  "Nicole",
  "Brandon",
  "Helen",
  "Benjamin",
  "Samantha",
  "Samuel",
  "Katherine",
  "Raymond",
  "Christine",
  "Gregory",
  "Debra",
  "Frank",
  "Rachel",
  "Alexander",
  "Carolyn",
  "Patrick",
  "Janet",
  "Jack",
  "Catherine",
  "Dennis",
  "Maria",
  "Jerry",
  "Heather",
  "Tyler",
  "Diane",
  "Aaron",
  "Ruth",
  "Jose",
  "Julie",
  "Nathan",
  "Olivia",
  "Henry",
  "Joyce",
  "Peter",
  "Virginia",
  "Adam",
  "Victoria",
  "Douglas",
  "Kelly",
  "Zachary",
  "Lauren",
  "Harold",
  "Christina",
]

export const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Stewart",
  "Morris",
  "Morales",
  "Murphy",
  "Cook",
  "Rogers",
  "Gutierrez",
  "Ortiz",
  "Morgan",
  "Cooper",
  "Peterson",
  "Bailey",
  "Reed",
  "Kelly",
  "Howard",
  "Ramos",
  "Kim",
  "Cox",
  "Ward",
  "Richardson",
  "Watson",
  "Brooks",
  "Chavez",
  "Wood",
  "James",
  "Bennett",
  "Gray",
  "Mendoza",
  "Ruiz",
  "Hughes",
  "Price",
  "Alvarez",
  "Castillo",
  "Sanders",
  "Patel",
  "Myers",
  "Long",
  "Ross",
  "Foster",
  "Jimenez",
  "Powell",
  "Jenkins",
  "Perry",
  "Russell",
  "Sullivan",
  "Wallace",
  "Soto",
  "Cole",
  "Jordan",
  "Dixon",
  "Spencer",
]

export const domains = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "protonmail.com",
  "icloud.com",
  "mail.com",
  "fastmail.com",
  "zoho.com",
  "yandex.com",
]

export const streets = [
  "Main St",
  "Oak Ave",
  "Maple Dr",
  "Cedar Ln",
  "Pine Rd",
  "Elm St",
  "Washington Blvd",
  "Park Ave",
  "Lake Dr",
  "Hill Rd",
  "Sunset Blvd",
  "River Rd",
  "Forest Ave",
  "Spring St",
  "Valley Dr",
  "Meadow Ln",
  "Highland Ave",
  "Church St",
  "Mill Rd",
  "Broadway",
]

export const cities = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "Fort Worth",
  "Columbus",
  "Charlotte",
  "San Francisco",
  "Indianapolis",
  "Seattle",
  "Denver",
  "Washington",
  "Boston",
  "Nashville",
  "Detroit",
  "Portland",
  "Memphis",
  "Louisville",
  "Milwaukee",
  "Tucson",
  "Fresno",
  "Sacramento",
]

export const countries = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Brazil",
  "India",
  "Mexico",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
  "Norway",
  "South Korea",
  "Argentina",
  "New Zealand",
]

export const fakeDataTypes = [
  { id: "name", label: "Full name" },
  { id: "email", label: "Email address" },
  { id: "phone", label: "Phone number" },
  { id: "address", label: "Street address" },
  { id: "company", label: "Company name" },
  { id: "country", label: "Country" },
] as const

export type FakeDataTypeId = (typeof fakeDataTypes)[number]["id"]

export const fakeDataCountBounds = { minimum: 1, maximum: 50 } as const

export interface FakeDataEnvironment {
  /** Secure byte source, wired from the platform RandomService. */
  randomBytes: (length: number) => Uint8Array
}

function nextByte(environment: FakeDataEnvironment): number {
  return environment.randomBytes(1)[0] ?? 0
}

function pick(environment: FakeDataEnvironment, values: readonly string[]): string {
  return values[nextByte(environment) % values.length] ?? values[0] ?? ""
}

function digit(environment: FakeDataEnvironment): string {
  return String(nextByte(environment) % 10)
}

function digits(environment: FakeDataEnvironment, count: number): string {
  return Array.from({ length: count }, () => digit(environment)).join("")
}

export function fakeFullName(environment: FakeDataEnvironment): string {
  return `${pick(environment, firstNames)} ${pick(environment, lastNames)}`
}

export function fakeEmail(environment: FakeDataEnvironment): string {
  const first = pick(environment, firstNames).toLowerCase()
  const last = pick(environment, lastNames).toLowerCase()
  const formats = [
    `${first}.${last}`,
    `${first}${digits(environment, 3)}`,
    `${first}_${last}`,
    `${first.charAt(0)}${last}`,
    `${first}.${last}${digits(environment, 2)}`,
  ]
  return `${pick(environment, formats)}@${pick(environment, domains)}`
}

export function fakePhone(environment: FakeDataEnvironment): string {
  const area = `${1 + (nextByte(environment) % 9)}${digits(environment, 2)}`
  return `(${area}) ${digits(environment, 3)}-${digits(environment, 4)}`
}

export function fakeAddress(environment: FakeDataEnvironment): string {
  const stateAbbr = ["NY", "CA", "TX", "FL", "IL", "PA", "OH", "GA", "NC", "MI"]
  const number = digits(environment, 4).replace(/^0+/, "") || "1"
  return `${number} ${pick(environment, streets)}, ${pick(environment, cities)}, ${pick(environment, stateAbbr)} ${digits(environment, 5)}`
}

export function fakeCompany(environment: FakeDataEnvironment): string {
  const prefixes = [
    "Acme",
    "Global",
    "Tech",
    "Prime",
    "Alpha",
    "Nova",
    "Apex",
    "Elite",
    "Core",
    "Vantage",
  ]
  const suffixes = [
    "Corp",
    "Inc",
    "LLC",
    "Co",
    "Group",
    "Systems",
    "Labs",
    "Solutions",
    "Industries",
    "Ventures",
  ]
  return `${pick(environment, prefixes)} ${pick(environment, suffixes)}`
}

export function fakeCountry(environment: FakeDataEnvironment): string {
  return pick(environment, countries)
}

export function generateFakeData(
  type: FakeDataTypeId,
  count: number,
  environment: FakeDataEnvironment,
): string[] {
  const generators: Record<FakeDataTypeId, () => string> = {
    name: () => fakeFullName(environment),
    email: () => fakeEmail(environment),
    phone: () => fakePhone(environment),
    address: () => fakeAddress(environment),
    company: () => fakeCompany(environment),
    country: () => fakeCountry(environment),
  }
  const bounded = Math.max(
    fakeDataCountBounds.minimum,
    Math.min(fakeDataCountBounds.maximum, Math.floor(count)),
  )
  return Array.from({ length: bounded }, generators[type])
}

export function clampFakeDataCount(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fakeDataCountBounds.minimum
  return Math.max(fakeDataCountBounds.minimum, Math.min(fakeDataCountBounds.maximum, parsed))
}
