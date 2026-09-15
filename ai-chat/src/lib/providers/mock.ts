import type { StreamEvent } from "../../types";
import { createMockStream } from "../stream";
import type { StreamRequest } from "./types";

/**
 * The free default: a simulated streaming assistant that needs no API key and
 * never charges anything. Keeps the whole demo usable offline. Injected via the
 * "mock" provider, which is also the fallback whenever a selected provider has
 * no configured key.
 */
export async function* mockStream(
  req: StreamRequest,
): AsyncGenerator<StreamEvent> {
  yield* createMockStream(req.prompt, { seed: Date.now() }, req.signal);
}
