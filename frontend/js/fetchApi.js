const API_URL = "";
const sessao = document.documentElement.dataset.sessao || "";

function pedido(rota, opcoes = {}) {
  const headers = new Headers(opcoes.headers);
  headers.set("X-Pedido", "mesmo-site");
  if (sessao) headers.set("X-Sessao", sessao);
  return fetch(`${API_URL}${rota}`, { ...opcoes, credentials: "include", headers });
}

function json(dados) {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) };
}

export function temSessao() {
  return Boolean(sessao);
}

export async function getPosts() {
  const resposta = await fetch(`${API_URL}/posts`);
  if (!resposta.ok) throw new Error("A API não respondeu.");
  return resposta.json();
}

export function upload(formData) {
  return pedido("/upload", { method: "POST", body: formData });
}

export function atualizarPost(id, formData) {
  return pedido(`/posts/${id}`, { method: "PUT", body: formData });
}

export function deletarPost(id) {
  return pedido(`/posts/${id}`, { method: "DELETE" });
}

export function entrar(chave) {
  return pedido("/login", { method: "POST", cache: "no-store", ...json({ chave }) });
}

export function sair() {
  return pedido("/logout", { method: "POST" });
}

export function conferirSessao() {
  return pedido("/sessao");
}
