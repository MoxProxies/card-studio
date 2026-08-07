import Fastify from "fastify";
import { Design, PRINT_DPI } from "@card-studio/scene-schema";
import { renderDesign } from "./renderDesign.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

app.post("/render", async (request, reply) => {
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
