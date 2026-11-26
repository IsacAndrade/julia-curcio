import crypto from "crypto";

const NOME = "entrada";
const entradas = new Map();
const paginas = new Map();

function limparVencidas(mapa) {
  const agora = Date.now();
  for (const [id, sessao] of mapa) {
    if (sessao.exp <= agora) mapa.delete(id);
  }
}

function lerCookie(req) {
  const header = req.headers.cookie || "";
  for (const parte of header.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === NOME) return decodeURIComponent(resto.join("="));
  }
  return "";
}

function cookie(req, valor, maxAge) {
  const seguro = req.secure || req.headers["x-forwarded-proto"] === "https";
  const partes = [
    `${NOME}=${encodeURIComponent(valor)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ];
  if (seguro) partes.push("Secure");
  return partes.join("; ");
}

function tokenDaPagina(req) {
  return req.get("X-Sessao") || "";
}

export function gravarEntrada(req, res) {
  limparVencidas(entradas);
  const id = crypto.randomBytes(32).toString("base64url");
  entradas.set(id, { exp: Date.now() + 2 * 60 * 1000 });
  res.setHeader("Set-Cookie", cookie(req, id, 120));
}

export function limparEntrada(req, res) {
  res.setHeader("Set-Cookie", cookie(req, "", 0));
}

export function consumirEntrada(req) {
  limparVencidas(entradas);
  const id = lerCookie(req);
  if (!entradas.has(id)) return "";
  entradas.delete(id);
  const pagina = crypto.randomBytes(32).toString("base64url");
  paginas.set(pagina, { exp: Date.now() + 2 * 60 * 60 * 1000 });
  return pagina;
}

export function paginaValida(req) {
  limparVencidas(paginas);
  const token = tokenDaPagina(req);
  return Boolean(token && paginas.has(token));
}

export function encerrarPagina(req) {
  paginas.delete(tokenDaPagina(req));
}

export function exigirPedido(req, res, next) {
  if (req.get("X-Pedido") !== "mesmo-site") {
    return res.status(403).json({ erro: "Pedido recusado." });
  }
  next();
}

export function exigirLogin(req, res, next) {
  if (!paginaValida(req)) {
    return res.status(401).json({ erro: "Entre com a chave para continuar." });
  }
  next();
}
