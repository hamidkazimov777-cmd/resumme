import { NextRequest } from "next/server";

// `req.json()` rejects when the body is empty or is not valid JSON, and the
// body is caller data, so an unhandled reject turned a bad request into a 500.
// Returning undefined hands the decision back to each route's schema, which
// already answers 400 for input it cannot read.
export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
