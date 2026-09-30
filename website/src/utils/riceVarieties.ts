// Curated starter set of varieties commonly grown in the Philippines. The
// list is display order on purpose (NSIC first, then heirloom staples); farmers
// can always add a variety that is missing through the "Other" input.
export const RICE_VARIETIES: readonly string[] = Object.freeze([
  'NSIC Rc160',
  'NSIC Rc216',
  'NSIC Rc222',
  'NSIC Rc238',
  'NSIC Rc298',
  'NSIC Rc300',
  'NSIC Rc402',
  'NSIC Rc436',
  'NSIC Rc480',
  'NSIC Rc544',
  'PSB Rc82',
  'IR64',
  'Tubigan 18',
  'SL-8H',
  'Bigante Plus',
  'Mestizo 1',
  'Dinorado',
  'Sinandomeng',
  'Angelica',
  'Milagrosa',
  'Azucena',
  'Red rice',
  'Black rice',
])

export const MAX_RICE_VARIETIES = 24
export const MAX_VARIETY_NAME_LENGTH = 60

export function normalizeVarietyName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
