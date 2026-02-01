// Email model exports
export {
  EmailSchema,
  EmailAddressSchema,
  EmailBodySchema,
  parseGmailMessage,
  type Email,
  type EmailAddress,
  type EmailBody,
} from './email.js';

// Label model exports
export {
  LabelSchema,
  LabelColorSchema,
  parseGmailLabel,
  isSystemLabel,
  getLabelDisplayName,
  type Label,
  type LabelColor,
} from './label.js';
