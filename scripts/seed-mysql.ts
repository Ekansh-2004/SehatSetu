#!/usr/bin/env node
// Alias for seed-db (keeps package.json scripts compatible)
import("./seed-db").catch((e) => {
  console.error("Failed running seed-db from seed-mysql:", e);
  process.exit(1);
});
