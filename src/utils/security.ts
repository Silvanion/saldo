export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltBuffer = enc.encode(salt);
  
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );

  return Array.from(new Uint8Array(key))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
