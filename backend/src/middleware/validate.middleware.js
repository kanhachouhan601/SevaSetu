const mongoose = require('mongoose');

const isEmail = value => /^\S+@\S+\.\S+$/.test(String(value || ''));
const isOtp = value => /^\d{6}$/.test(String(value || ''));
const isPhone = value => !value || /^[+\d\s-]{8,16}$/.test(String(value));
const isObjectId = value => mongoose.Types.ObjectId.isValid(String(value || ''));
const isNonEmpty = value => String(value || '').trim().length > 0;
const numberInRange = (value, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
};

const optionalStringMax = max => value => value === undefined || value === null || String(value).length <= max;
const requiredStringMax = max => value => isNonEmpty(value) && String(value).length <= max;
const optionalEnum = values => value => value === undefined || value === null || value === '' || values.includes(value);
const requiredEnum = values => value => values.includes(value);

const validate = (rules = []) => (req, res, next) => {
  const details = [];

  for (const rule of rules) {
    const source = rule.source || 'body';
    const value = req[source]?.[rule.field];
    const valid = rule.check(value, req);
    if (!valid) details.push({ field: `${source}.${rule.field}`, message: rule.message });
  }

  if (details.length) {
    return res.status(400).json({
      success: false,
      error: details[0].message,
      code: 'VALIDATION_ERROR',
      details,
      requestId: req.requestId,
    });
  }

  next();
};

const idParam = (field = 'id') => ({
  source: 'params',
  field,
  check: isObjectId,
  message: 'Invalid resource id.',
});

module.exports = {
  idParam,
  isEmail,
  isOtp,
  isPhone,
  numberInRange,
  optionalEnum,
  optionalStringMax,
  requiredEnum,
  requiredStringMax,
  validate,
};
