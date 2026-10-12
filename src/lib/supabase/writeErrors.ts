/** A lost HTTP response does not prove that the database rolled back. */
export function isDefinitiveDatabaseRejection(code: string | undefined): boolean {
  return !!code && /^(22|23|40|42)[A-Z0-9]{3}$/.test(code);
}
