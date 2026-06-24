const {
  idParam,
  isEmail,
  isOtp,
  isPhone,
  numberInRange,
  optionalEnum,
  optionalStringMax,
  requiredEnum,
  requiredStringMax,
} = require('../middleware/validate.middleware');

const registerRules = [
  { field: 'name', check: requiredStringMax(80), message: 'Name is required and must be under 80 characters.' },
  { field: 'email', check: isEmail, message: 'Please enter a valid email address.' },
  { field: 'password', check: value => String(value || '').length >= 6, message: 'Password must be at least 6 characters.' },
  { field: 'phone', check: isPhone, message: 'Please enter a valid phone number.' },
  { field: 'role', check: optionalEnum(['patient', 'nurse', 'admin']), message: 'Invalid role.' },
  { field: 'address', check: optionalStringMax(300), message: 'Address must be under 300 characters.' },
  { field: 'city', check: optionalStringMax(80), message: 'City must be under 80 characters.' },
];

const loginRules = [
  { field: 'email', check: isEmail, message: 'Please enter a valid email address.' },
  { field: 'password', check: value => String(value || '').length >= 1, message: 'Password is required.' },
];

const nurseProfileRules = [
  { field: 'experience', check: value => value === undefined || numberInRange(value, 0, 60), message: 'Experience must be between 0 and 60 years.' },
  { field: 'bio', check: optionalStringMax(1000), message: 'Bio must be under 1000 characters.' },
  { field: 'hourlyRate', check: value => value === undefined || numberInRange(value, 0, 100000), message: 'Hourly rate is invalid.' },
  { field: 'availability', check: value => value === undefined || typeof value === 'boolean', message: 'Availability must be true or false.' },
];

const createRequestRules = [
  { field: 'mode', check: requiredEnum(['temporary', 'longterm']), message: 'Mode must be temporary or longterm.' },
  { field: 'problem', check: requiredStringMax(2000), message: 'Problem description is required and must be under 2000 characters.' },
  { field: 'address', check: optionalStringMax(300), message: 'Address must be under 300 characters.' },
  { field: 'city', check: optionalStringMax(80), message: 'City must be under 80 characters.' },
  { field: 'patientAge', check: value => value === undefined || value === '' || numberInRange(value, 0, 120), message: 'Patient age is invalid.' },
  { field: 'triageLevel', check: optionalEnum(['low', 'medium', 'high']), message: 'Invalid triage level.' },
  { field: 'requirements', check: optionalStringMax(2000), message: 'Requirements must be under 2000 characters.' },
  { field: 'notes', check: optionalStringMax(2000), message: 'Notes must be under 2000 characters.' },
];

const statusRules = [
  idParam(),
  { field: 'status', check: requiredEnum(['pending', 'matched', 'interview-scheduled', 'in-progress', 'completed', 'cancelled']), message: 'Invalid request status.' },
];

const ratingRules = [
  idParam(),
  { field: 'score', check: value => numberInRange(value, 1, 5), message: 'Rating must be between 1 and 5.' },
  { field: 'behavior', check: optionalEnum(['excellent', 'good', 'average', 'poor']), message: 'Invalid behavior rating.' },
  { field: 'careQuality', check: optionalEnum(['excellent', 'good', 'average', 'poor']), message: 'Invalid care quality rating.' },
  { field: 'comment', check: optionalStringMax(1000), message: 'Comment must be under 1000 characters.' },
];

const otpRules = [
  idParam(),
  { field: 'otp', check: isOtp, message: 'A valid 6 digit OTP is required.' },
];

const patientReportRules = [
  idParam(),
  { field: 'respectful', check: optionalEnum(['respectful', 'rude', 'harassment_concern']), message: 'Invalid behavior value.' },
  { field: 'environment', check: optionalEnum(['safe', 'unsafe']), message: 'Invalid environment value.' },
  { field: 'familyBehavior', check: optionalStringMax(1000), message: 'Family behavior must be under 1000 characters.' },
  { field: 'comment', check: optionalStringMax(1000), message: 'Comment must be under 1000 characters.' },
  { field: 'paymentIssue', check: value => value === undefined || typeof value === 'boolean', message: 'Payment issue must be true or false.' },
  { field: 'unsafeFlag', check: value => value === undefined || typeof value === 'boolean', message: 'Unsafe flag must be true or false.' },
];

const adminNoteRules = [
  idParam(),
  { field: 'reason', check: optionalStringMax(1000), message: 'Reason must be under 1000 characters.' },
  { field: 'note', check: optionalStringMax(1000), message: 'Note must be under 1000 characters.' },
];

const aiTriageRules = [
  { field: 'messages', check: value => Array.isArray(value) && value.length > 0 && value.length <= 20, message: 'Messages are required and limited to 20 turns.' },
  { field: 'language', check: optionalEnum(['en', 'hi', 'hinglish']), message: 'Invalid language.' },
];

const emailRules = [
  { field: 'type', check: requiredEnum(['nurse_approval', 'booking_confirmation', 'custom']), message: 'Invalid email type.' },
  { field: 'to', check: value => Array.isArray(value) ? value.every(isEmail) : isEmail(value), message: 'Valid recipient email is required.' },
];

module.exports = {
  adminNoteRules,
  aiTriageRules,
  createRequestRules,
  emailRules,
  loginRules,
  nurseProfileRules,
  otpRules,
  patientReportRules,
  ratingRules,
  registerRules,
  statusRules,
};
