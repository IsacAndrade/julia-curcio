const USUARIO = "linha.1989";
const PERFIL = `https://www.instagram.com/${USUARIO}/embed/`;
const DURACAO = 10 * 60 * 1000;

let cache = { ate: 0, perfil: null };

function urlPermitida(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && (url.hostname.endsWith(".fbcdn.net") || url.hostname.endsWith(".cdninstagram.com"));
  } catch {
    return false;
  }
}

function lerTexto(html) {
  let texto = html;
  for (let i = 0; i < 6; i += 1) {
    const proximo = texto.replaceAll('\\"', '"').replaceAll("\\/", "/").replaceAll("\\\\", "\\");
    if (proximo === texto) break;
    texto = proximo;
  }
  return texto;
}

function chaveImagem(url) {
  try {
    const caminho = new URL(url).pathname;
    return caminho.slice(caminho.lastIndexOf("/") + 1);
  } catch {
    return url;
  }
}

function montar(html) {
  const texto = lerTexto(html);
  const vistos = new Set();
  const imagens = new Set();
  const posts = [];
  const repetidas = [];
  const marcas = texto.matchAll(/"shortcode":"([A-Za-z0-9_-]+)","is_video":(true|false)[\s\S]{0,900}?"display_url":"(https:[^"]+)"/g);
  for (const item of marcas) {
    const codigo = item[1];
    const chave = chaveImagem(item[3]);
    if (vistos.has(codigo) || !urlPermitida(item[3])) continue;
    vistos.add(codigo);
    const post = { codigo, video: item[2] === "true", origem: item[3] };
    if (imagens.has(chave)) {
      repetidas.push(post);
      continue;
    }
    imagens.add(chave);
    posts.push(post);
  }
  while (posts.length < 9 && repetidas.length) posts.push(repetidas.shift());
  if (posts.length > 9) posts.length = 9;
  const indice = texto.indexOf(`"username":"${USUARIO}"`);
  const trecho = texto.slice(Math.max(0, indice - 4000), indice + 4000);
  const nome = trecho.match(/"full_name":"([^"]*)"/)?.[1] || USUARIO;
  const fotoOrigem = trecho.match(/"profile_pic_url":"(https:[^"]+)"/)?.[1] || "";
  const publicacoes = Number(texto.match(/"edge_owner_to_timeline_media":\{"count":(\d+)\}/)?.[1] || posts.length);
  if (!posts.length) throw new Error("O perfil não trouxe publicações.");
  return {
    usuario: USUARIO,
    nome,
    publicacoes,
    fotoOrigem: urlPermitida(fotoOrigem) ? fotoOrigem : "",
    posts,
  };
}

async function baixarPerfil() {
  const resposta = await fetch(PERFIL, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "pt-BR",
    },
  });
  if (!resposta.ok) throw new Error("O Instagram não respondeu.");
  return montar(await resposta.text());
}

export async function obterPerfil() {
  if (cache.perfil && cache.ate > Date.now()) return cache.perfil;
  try {
    const perfil = await baixarPerfil();
    cache = { ate: Date.now() + DURACAO, perfil };
    return perfil;
  } catch (erro) {
    if (cache.perfil) return cache.perfil;
    throw erro;
  }
}

export function perfilPublico(perfil) {
  return {
    usuario: perfil.usuario,
    nome: perfil.nome,
    publicacoes: perfil.publicacoes,
    foto: perfil.fotoOrigem ? "/instagram/midia/perfil" : "",
    posts: perfil.posts.map((post) => ({
      codigo: post.codigo,
      video: post.video,
      imagem: `/instagram/midia/${post.codigo}`,
    })),
  };
}

export async function lerMidia(codigo) {
  const perfil = await obterPerfil();
  const origem = codigo === "perfil" ? perfil.fotoOrigem : perfil.posts.find((post) => post.codigo === codigo)?.origem;
  if (!origem) return null;
  const resposta = await fetch(origem, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.instagram.com/",
    },
  });
  if (!resposta.ok) return null;
  const tipo = resposta.headers.get("content-type") || "";
  if (!tipo.startsWith("image/")) return null;
  return { tipo, corpo: Buffer.from(await resposta.arrayBuffer()) };
}
