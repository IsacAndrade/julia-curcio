import "dotenv/config";
import conectarAoBanco, { getDb } from "../src/config/dbConfig.js";
import { chaveInicial } from "../src/dados/chaveInicial.js";
export async function popularBanco(db) {
  const chaves = db.collection("chaves");
  if ((await chaves.countDocuments()) === 0) {
    await chaves.insertOne({ ...chaveInicial, criadoEm: new Date() });
    console.log("Coleção chaves populada com o hash da chave.");
  }
}
if (process.argv[1]?.endsWith("seed.js")) {
  if (!process.env.STRING_CONEXAO) {
    console.error("Defina STRING_CONEXAO no backend/.env para popular o Atlas.");
    process.exit(1);
  }
  const cliente = await conectarAoBanco(process.env.STRING_CONEXAO);
  await popularBanco(getDb());
  await cliente.close();
}
