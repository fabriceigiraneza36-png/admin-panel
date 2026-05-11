export const required = (v, name = 'Field') =>
  (!v || (typeof v === 'string' && !v.trim())) ? `${name} is required` : null

export const minLength = (v, min, name = 'Field') =>
  v && v.length < min ? `${name} must be at least ${min} characters` : null

export const maxLength = (v, max, name = 'Field') =>
  v && v.length > max ? `${name} must be at most ${max} characters` : null

export const isEmail = (v) =>
  v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email address' : null

export const isUrl = (v) =>
  v && !/^https?:\/\/.+/.test(v) ? 'Invalid URL' : null

export const isNumber = (v, name = 'Field') =>
  v !== '' && v !== null && v !== undefined && isNaN(Number(v)) ? `${name} must be a number` : null

export const inRange = (v, min, max, name = 'Field') => {
  const n = Number(v)
  if (isNaN(n)) return null
  if (n < min || n > max) return `${name} must be between ${min} and ${max}`
  return null
}

export const validate = (data, rules) => {
  const errors = {}
  for (const [field, fns] of Object.entries(rules)) {
    for (const fn of fns) {
      const err = fn(data[field])
      if (err) { errors[field] = err; break }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors }
}