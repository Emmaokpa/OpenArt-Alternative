import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults are enough for a hello-world Worker. Caching bindings and R2
// incremental cache get added when the real pages arrive (Phase 3/6).
export default defineCloudflareConfig({});
