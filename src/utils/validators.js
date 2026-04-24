export const required = (value) => {
  return value ? undefined : 'This field is required';
};

export const email = (value) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value) ? undefined : 'Invalid email address';
};

export const minLength = (min) => (value) => {
  return value && value.length >= min
    ? undefined
    : `Must be at least ${min} characters`;
};

export const maxLength = (max) => (value) => {
  return value && value.length <= max
    ? undefined
    : `Must be no more than ${max} characters`;
};

export const url = (value) => {
  try {
    new URL(value);
    return undefined;
  } catch {
    return 'Invalid URL';
  }
};

export const phoneNumber = (value) => {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(value) ? undefined : 'Invalid phone number';
};

export const number = (value) => {
  return !isNaN(value) ? undefined : 'Must be a number';
};

export const positiveNumber = (value) => {
  return !isNaN(value) && value > 0 ? undefined : 'Must be a positive number';
};

export const alphanumeric = (value) => {
  const re = /^[a-zA-Z0-9]+$/;
  return re.test(value) ? undefined : 'Must contain only letters and numbers';
};

export const composeValidators = (...validators) => (value) => {
  return validators.reduce(
    (error, validator) => error || validator(value),
    undefined
  );
};