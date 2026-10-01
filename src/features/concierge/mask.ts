/**
 * Masks contact details before a conversation is stored (kept 30 days to improve the
 * assistant). Best effort by design: email addresses and phone numbers are replaced, while
 * dates, prices and booking codes stay readable because they are what the review needs.
 */
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
/** Numbers starting with +, 00 or 0 (international or national), e.g. +49 170 1234567, 0532 000 00 01 */
const PHONE_PREFIXED = /(?<![\p{L}\p{N}])(?:\+|00|0)\d[\d\s()/-]{6,}\d/gu;
/** Turkish mobiles written without the leading 0, e.g. 532 000 00 01 */
const PHONE_TR_MOBILE =
  /(?<![\p{L}\p{N}])5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?![\p{L}\p{N}])/gu;

function maskPhones(text: string, pattern: RegExp): string {
  return text.replace(pattern, (match) => {
    const digits = match.replace(/\D/g, "").length;
    return digits >= 9 && digits <= 15 ? "[phone]" : match;
  });
}

export function maskPersonalData(text: string): string {
  return maskPhones(maskPhones(text.replace(EMAIL, "[email]"), PHONE_PREFIXED), PHONE_TR_MOBILE);
}
