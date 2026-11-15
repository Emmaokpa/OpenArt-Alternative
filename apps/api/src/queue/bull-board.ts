import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Router } from "express";
import type { Queues } from "./queues.js";

/**
 * Queue dashboard for admins. The router is mounted behind `requireAdmin`; it
 * reads Redis directly and never touches job data in Postgres.
 */
export function createQueueBoardRouter(queues: Queues, basePath = "/v1/admin/queues"): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [
      new BullMQAdapter(queues.providerJobs),
      new BullMQAdapter(queues.mediaJobs),
      new BullMQAdapter(queues.maintenance),
    ],
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
