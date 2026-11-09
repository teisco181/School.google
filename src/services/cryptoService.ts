/**
 * Zero-cloud local cryptographic security service
 * Utilizes standard Web Crypto API (SubtleCrypto) on ChromeOS / browser
 */

export class CryptoService {
  public static generateSalt(): string {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public static async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt + 'chromeos_local_vault_key');
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  public static async verifyPassword(
    password: string,
    salt: string,
    expectedHash: string
  ): Promise<boolean> {
    const computed = await this.hashPassword(password, salt);
    return computed === expectedHash;
  }
}
