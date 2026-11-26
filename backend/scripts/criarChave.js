import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import conectarAoBanco, { getDb } from "../src/config/dbConfig.js";
import { criarHashChave } from "../src/models/chavesModel.js";

function uriDoBanco() {
  if (process.env.STRING_CONEXAO) return process.env.STRING_CONEXAO;
  const arquivo = new URL("../.mongo-uri", import.meta.url);
  if (!fs.existsSync(arquivo)) {
    console.error("Suba o servidor ou preencha STRING_CONEXAO. A chave só é gravada no MongoDB.");
    process.exit(1);
  }
  return fs.readFileSync(arquivo, "utf8").trim();
}

const chave = crypto.randomBytes(32).toString("base64url");
const registro = await criarHashChave(chave);
const cliente = await conectarAoBanco(uriDoBanco());
const colecao = getDb().collection("chaves");

await colecao.deleteMany({});
await colecao.insertOne({ ...registro, criadoEm: new Date() });
await cliente.close();

console.log("Chave gravada no MongoDB só como hash scrypt. Copie a linha de baixo e guarde fora do projeto.");
console.log(chave);
