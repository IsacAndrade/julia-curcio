import { chaveConfere, listarChaves } from "../models/chavesModel.js";
import { encerrarPagina, gravarEntrada, limparEntrada } from "../middleware/sessoes.js";

const tentativas = new Map();

function recente(ip) {
  const agora = Date.now();
  const lista = (tentativas.get(ip) || []).filter((quando) => agora - quando < 15 * 60 * 1000);
  tentativas.set(ip, lista);
  return lista;
}

export async function postLogin(req, res) {
  const ip = req.ip || req.socket.remoteAddress || "local";
  const lista = recente(ip);
  if (lista.length >= 5) {
    return res.status(429).json({ erro: "Muitas tentativas. Espere alguns minutos." });
  }

  const chave = String(req.body.chave || "");
  const formatoAceito = chave.length >= 8 && chave.length <= 128;
  const registros = formatoAceito ? await listarChaves() : [];
  let ok = false;
  if (registros.length === 0) {
    await chaveConfere("recusada", { algoritmo: "scrypt", salt: "AAAAAAAAAAAAAAAAAAAAAA", hash: "A".repeat(86) }).catch(() => {});
  } else {
    for (const registro of registros) {
      if (await chaveConfere(chave, registro)) ok = true;
    }
  }

  if (!ok) {
    lista.push(Date.now());
    return res.status(401).json({ erro: "Chave não confere." });
  }

  tentativas.delete(ip);
  gravarEntrada(req, res);
  res.status(204).send();
}

export function postLogout(req, res) {
  encerrarPagina(req);
  limparEntrada(req, res);
  res.status(204).send();
}

export function getSessao(_req, res) {
  res.status(204).send();
}
