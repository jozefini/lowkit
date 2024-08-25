type CharsetKey = 'uppercase' | 'lowercase' | 'numbers' | 'symbols'

const generateSecretKey = (length = 32): string => {
  const charset: Record<CharsetKey, string> = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+[]{}|;:,.<>?',
  }
  const allChars = Object.values(charset).join('')
  let password = ''
  // Ensure at least one character from each set
  for (const set of Object.values(charset)) {
    password += set[Math.floor(Math.random() * set.length)]
  }
  // Fill the rest of the password
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  // Shuffle the password
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('')
}

const TextColor = {
  Black: '30',
  Red: '31',
  Green: '32',
  Yellow: '33',
  Blue: '34',
  Magenta: '35',
  Cyan: '36',
  White: '37',
} as const

const TextStyle = {
  Reset: '0',
  Bold: '1',
  Dim: '2',
  Italic: '3',
  Underline: '4',
  Blink: '5',
  Reverse: '7',
  Hidden: '8',
} as const

type TextColorKey = keyof typeof TextColor
type TextStyleKey = keyof typeof TextStyle

interface StyleOptions {
  color?: TextColorKey
  background?: TextColorKey
  styles?: TextStyleKey[]
}

const styleText = (text: string, options: StyleOptions): string => {
  const codes: string[] = []
  if (options.color) {
    codes.push(TextColor[options.color])
  }
  if (options.background) {
    codes.push((Number.parseInt(TextColor[options.background]) + 10).toString())
  }
  if (options.styles) {
    codes.push(...options.styles.map((style) => TextStyle[style]))
  }
  if (codes.length === 0) {
    return text
  }
  const styleCode = codes.join(';')
  return `\x1b[${styleCode}m${text}\x1b[0m`
}

const logStyled = (
  label: string,
  value: string,
  labelStyle: StyleOptions,
  valueStyle: StyleOptions
): void => {
  console.log(`${styleText(label, labelStyle)} ${styleText(value, valueStyle)}`)
}

// Using the helper function
logStyled(
  'GENERATED SECRET KEY =',
  generateSecretKey(),
  { color: 'White' },
  { color: 'Green', styles: ['Bold'] }
)
