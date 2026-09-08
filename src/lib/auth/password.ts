import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// A sign in attempt for an address with no account has to cost the same as one
// for an existing account. Skipping bcrypt when the lookup misses makes the
// response measurably faster and turns the login form into an account oracle.
// Comparing against a decoy hash burns the same work. The decoy is built on
// first use so no hash literal has to sit in the source.
let decoyHash: string | undefined;

export async function verifyPasswordDecoy(plain: string): Promise<false> {
  decoyHash ??= bcrypt.hashSync("no-such-account", ROUNDS);
  await bcrypt.compare(plain, decoyHash);
  return false;
}
