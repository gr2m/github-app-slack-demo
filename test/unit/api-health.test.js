import test from "ava";

import { handler, healthLog } from "../../netlify/functions/health/index.js";
import { mockLog } from "../mocks.js";

test("GET /api/health handler", async (t) => {
  const logs = mockLog(healthLog);
  const result = await handler();

  t.snapshot(result, "result");
  t.snapshot(logs, "logs");
});
