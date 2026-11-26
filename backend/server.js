import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import conectarAoBanco, { getDb } from "./src/config/dbConfig.js";
import seguranca from "./src/middleware/seguranca.js";
import { consumirEntrada, limparEntrada } from "./src/middleware/sessoes.js";
import routes from "./src/routes/routes.js";
import { popularBanco } from "./scripts/seed.js";

const app = express();
const porta = Number(process.env.PORT) || 3000;
const raizServidor = path.dirname(fileURLToPath(import.meta.url));
const pastaFront = path.join(raizServidor, "..", "frontend");

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(seguranca);
app.use(express.json({ limit: "32kb" }));
const pastaUploads = path.join(raizServidor, "uploads");
fs.mkdirSync(pastaUploads, { recursive: true });
app.use("/uploads", express.static(pastaUploads));
routes(app);

const enderecosAntigos = { "/o-que-faco": "oficio", "/quem-sou": "quem-sou", "/trabalho": "trabalho", "/contato": "contato" };
for (const [antigo, ancora] of Object.entries(enderecosAntigos)) {
  app.get(antigo, (_req, res) => res.redirect(301, `/#${ancora}`));
}

app.get("/login", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(pastaFront, "login.html"));
});

app.get("/adm", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const pagina = consumirEntrada(req);
  limparEntrada(req, res);
  if (!pagina) return res.redirect(302, "/login");
  const html = fs.readFileSync(path.join(pastaFront, "index.html"), "utf8");
  res.type("html").send(html.replace('<html lang="pt-BR">', `<html lang="pt-BR" data-sessao="${pagina}">`));
});

app.use(express.static(pastaFront, { dotfiles: "deny" }));

async function iniciar() {
  if (process.env.STRING_CONEXAO) {
    await conectarAoBanco(process.env.STRING_CONEXAO);
    console.log("Banco: MongoDB Atlas (STRING_CONEXAO).");
  } else if (process.env.NODE_ENV === "production") {
    console.error("Defina STRING_CONEXAO com a URI do MongoDB Atlas.");
    process.exit(1);
  } else {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const memoria = await MongoMemoryServer.create();
    const uri = memoria.getUri();
    fs.writeFileSync(path.join(raizServidor, ".mongo-uri"), uri);
    await conectarAoBanco(uri);
    console.log("Banco: MongoDB local em memória. Preencha STRING_CONEXAO para usar o Atlas.");
  }
  await popularBanco(getDb());
  app.listen(porta, "0.0.0.0", () => {
    console.log(`API ouvindo em http://127.0.0.1:${porta}`);
  });
}

iniciar();
