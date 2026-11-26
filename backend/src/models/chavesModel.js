import crypto from "crypto";
import { getDb } from "../config/dbConfig.js";

const PARAMETROS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function colecao() {
  return getDb().collection("chaves");
}

function scrypt(chave, salt, tamanho) {
  return new Promise((resolver, rejeitar) => {
    crypto.scrypt(chave, salt, tamanho, PARAMETROS, (erro, resultado) => {
      if (erro) rejeitar(erro);
      else resolver(resultado);
    });
  });
}

export function listarChaves() {
  return colecao().find({}, { projection: { hash: 1, salt: 1, algoritmo: 1 } }).toArray();
}

export async function criarHashChave(chave) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(chave, salt, 64);
  return {
    algoritmo: "scrypt",
    salt: salt.toString("base64url"),
    hash: hash.toString("base64url"),
  };
}

export async function chaveConfere(chave, registro) {
  if (!registro || registro.algoritmo !== "scrypt" || !registro.salt || !registro.hash) return false;
  const guardado = Buffer.from(registro.hash, "base64url");
  const calculado = await scrypt(chave, Buffer.from(registro.salt, "base64url"), guardado.length);
  return calculado.length === guardado.length && crypto.timingSafeEqual(calculado, guardado);
}
