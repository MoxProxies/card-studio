import Fastify from "fastify";
import { Design, PRINT_DPI } from "@card-studio/scene-schema";
import { renderDesign } from "./renderDesign.js";
import { registerEmbeddedFonts } from "./fontAssets.js";

registerEmbeddedFonts();

const app = Fastify({ logger: true });

// Server-to-server only — this is meant to be called by a trusted backend
// (e.g. moxproxies-website's Laravel app), never reachable from a browser
// directly, so there's no per-user auth concept here at all, just one
// shared secret proving the caller is that backend. RENDER_SHARED_SECRET
// unset (the default for local dev/CI) skips the check entirely; set it
// in any environment where this service is reachable from outside a
// trusted private network, since /render otherwise happily rasterizes
// arbitrary attacker-supplied Design JSON for free (a cheap DoS lever)
// with no other gate in front of it.
const sharedSecret = process.env.RENDER_SHARED_SECRET;

app.get("/health", async () => ({ status: "ok" }));

app.post("/render", async (request, reply) => {
  if (sharedSecret && request.headers["x-render-secret"] !== sharedSecret) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const body = request.body as { design?: unknown; dpi?: number };
  const parsed = Design.safeParse(body.design);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid design payload", issues: parsed.error.issues });
  }

  const dpi = body.dpi ?? PRINT_DPI;
  const png = await renderDesign(parsed.data, dpi);

  reply.header("Content-Type", "image/png");
  return reply.send(png);
});

const port = Number(process.env.PORT ?? 3001);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
