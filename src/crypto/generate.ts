const generateSecretKey = (length = 32) => {
  const charset = {
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
}

const TextStyle = {
  Reset: '0',
  Bold: '1',
  Dim: '2',
  Italic: '3',
  Underline: '4',
  Blink: '5',
  Reverse: '7',
  Hidden: '8',
}

const styleText = (text: string, options: any) => {
  const codes = []

  if (options.color) {
    codes.push(options.color)
  }

  if (options.background) {
    codes.push(options.background)
  }

  if (options.styles) {
    codes.push(...options.styles)
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
  labelStyle: any,
  valueStyle: any
) => {
  console.log(`${styleText(label, labelStyle)} ${styleText(value, valueStyle)}`)
}

// Using the helper function
logStyled(
  'GENERATED SECRET KEY =',
  generateSecretKey(),
  { color: TextColor.White },
  { color: TextColor.Green, styles: [TextStyle.Bold] }
)
