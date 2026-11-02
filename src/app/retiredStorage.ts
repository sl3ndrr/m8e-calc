/** Remove only retired feature data; denied storage must not block startup. */
export function clearRetiredStorage(
  getStorage: () => Pick<Storage, 'removeItem'>,
): void {
  for (const key of [
    'm8e-calc.currency-rates',
    'm8e-calc.currency-rates.last-attempt',
  ]) {
    try {
      getStorage().removeItem(key);
    } catch {
      // Retry on the next app start if this browser denies cleanup.
    }
  }
}
