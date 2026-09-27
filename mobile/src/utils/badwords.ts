// Forum content filter. Whole-word matching keeps innocent substrings
// (class, assess, peste as a pest, etc.) out of the net while tolerating the
// usual evasions: mixed case, repeated letters, and leetspeak substitutions.
//
// A direct port of website/src/utils/badwords.ts — keep both files in sync.

const BANNED_WORDS: readonly string[] = Object.freeze([
  'fuck',
  'fucks',
  'fucked',
  'fucker',
  'fuckers',
  'fucking',
  'motherfucker',
  'motherfuckers',
  'shit',
  'shits',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'bastard',
  'bastards',
  'asshole',
  'assholes',
  'dick',
  'dicks',
  'pussy',
  'cunt',
  'cunts',
  'whore',
  'whores',
  'slut',
  'sluts',
  'nigger',
  'niggers',
  'nigga',
  'niggas',
  'faggot',
  'faggots',
  'retard',
  'retards',
  'jackass',
  'damn',
  'crap',
  'piss',
  'gago',
  'gaga',
  'tangina',
  'putangina',
  'puta',
  'punyeta',
  'kupal',
  'ulol',
  'tanga',
  'bobo',
  'tarantado',
  'tarantada',
  'lintik',
  'hindot',
  'jakol',
  'burat',
  'tite',
  'pekpek',
  'puki',
  'kingina',
  'buwisit',
])

const LEET_EQUIVALENTS: Readonly<Record<string, string>> = Object.freeze({
  a: 'a@4',
  b: 'b8',
  e: 'e3',
  g: 'g9',
  i: 'i1!',
  o: 'o0',
  s: 's5$',
  t: 't7',
})

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g

function buildWordPattern(word: string): string {
  const token = [...word].map((char) => {
    const equivalents = LEET_EQUIVALENTS[char]
    if (equivalents) {
      return `[${equivalents}]+`
    }
    return `${char.replace(REGEX_SPECIAL_CHARS, '\\$&')}+`
  })
  return `\\b${token.join('')}\\b`
}

const BADWORD_SOURCE = BANNED_WORDS.map(buildWordPattern).join('|')
const BADWORD_TEST_PATTERN = new RegExp(BADWORD_SOURCE, 'i')
const BADWORD_MATCH_PATTERN = new RegExp(BADWORD_SOURCE, 'gi')

export function containsBannedWords(text: string): boolean {
  return BADWORD_TEST_PATTERN.test(text)
}

export function findBannedWords(text: string): readonly string[] {
  return text.match(BADWORD_MATCH_PATTERN) ?? []
}
