import type { Db } from "../../db/client.js";
import type { Env } from "../../env.js";
import type { RateLimiter } from "../../lib/rate-limit.js";
import type { Storage } from "../../lib/storage.js";
import type { Logger } from "../../logger.js";
import type { Auth } from "../../modules/auth/auth.js";
import type { ProviderRegistry } from "../../providers/registry.js";
import type { Queues } from "../../queue/queues.js";

/** Everything the v1 routes need, created once in `index.ts`. */
export interface ApiContext {
  env: Env;
  logger: Logger;
  db: Db;
  auth: Auth;
  storage: Storage;
  providers: ProviderRegistry;
  queues: Queues;
  rateLimiter: RateLimiter;
}
