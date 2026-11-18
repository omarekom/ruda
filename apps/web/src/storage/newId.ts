/**
 * A random UUID v4. `crypto.randomUUID` exists only in secure contexts (HTTPS, localhost),
 * so on plain HTTP this builds one from `getRandomValues`, which is always available.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Version 4 and the RFC 4122 variant live in bytes 6 and 8.
  const hex = Array.from(bytes, (byte, index) => {
    const fixed = index === 6 ? (byte & 0x0f) | 0x40 : index === 8 ? (byte & 0x3f) | 0x80 : byte;
    return fixed.toString(16).padStart(2, '0');
  }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
