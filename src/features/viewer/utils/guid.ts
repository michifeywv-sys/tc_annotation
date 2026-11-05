/**
 * Generiert eine 22-stellige IFC-konforme GUID
 */
export function generateIfcGuid(): string {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  let guid = '';
  for (let i = 0; i < 22; i++) {
    guid += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return guid;
}
