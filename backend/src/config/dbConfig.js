import { MongoClient } from "mongodb";

let banco;

export function getDb() {
  if (!banco) {
    throw new Error("O banco ainda não foi conectado.");
  }
  return banco;
}

export default async function conectarAoBanco(stringConexao) {
  try {
    const mongoClient = new MongoClient(stringConexao);
    console.log("Conectando ao cluster do banco de dados...");
    await mongoClient.connect();
    console.log("Conectado ao MongoDB com sucesso!");
    banco = mongoClient.db("julia_curcio");
    return mongoClient;
  } catch (erro) {
    console.error("Falha na conexão com o banco!", erro);
    process.exit(1);
  }
}
