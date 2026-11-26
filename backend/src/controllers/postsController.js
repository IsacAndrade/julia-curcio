import {
  atualizarPost,
  buscarPost,
  criarPost,
  deletarPost,
  listarPosts,
} from "../models/postsModel.js";

const formatos = ["Vídeo", "Fotografia", "Eventos", "Redes"];

function linhas(valor) {
  if (Array.isArray(valor)) return valor.map((item) => String(item).trim()).filter(Boolean);
  if (typeof valor !== "string" || !valor.trim()) return [];
  return valor.split("\n").map((item) => item.trim()).filter(Boolean);
}

function imagemSegura(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  if (texto.startsWith("/uploads/") || texto.startsWith("/fotos/") || texto.startsWith("fotos/")) {
    if (texto.includes("..") || texto.includes("\\")) return null;
    return texto;
  }
  try {
    const url = new URL(texto);
    if (url.protocol === "https:" && !url.username && !url.password) return texto;
  } catch {
    return null;
  }
  return null;
}

function validar(dados, parcial = false) {
  const erros = [];
  if ((!parcial || dados.titulo !== undefined) && String(dados.titulo || "").trim().length < 2) {
    erros.push("Informe o título.");
  }
  if ((!parcial || dados.descricao !== undefined) && String(dados.descricao || "").trim().length < 8) {
    erros.push("Informe a descrição.");
  }
  if ((!parcial || dados.formato !== undefined) && !formatos.includes(dados.formato)) {
    erros.push("O formato precisa ser Vídeo, Fotografia, Eventos ou Redes.");
  }
  return erros;
}

async function salvarNovo(req, res, imgUrl) {
  const erros = validar(req.body);
  if (!imgUrl) erros.push("Escolha uma foto para adicionar o trabalho.");
  if (erros.length > 0) {
    return res.status(400).json({ erros });
  }
  const post = await criarPost({
    titulo: String(req.body.titulo).trim(),
    descricao: String(req.body.descricao).trim(),
    formato: req.body.formato,
    imgUrl,
    inclui: linhas(req.body.inclui),
  });
  res.status(201).json(post);
}

export async function getPosts(req, res) {
  const posts = await listarPosts(req.query.formato);
  res.status(200).json(posts);
}

export async function getPost(req, res) {
  const post = await buscarPost(req.params.id);
  if (!post) {
    return res.status(404).json({ erro: "Post não encontrado." });
  }
  res.status(200).json(post);
}

export function postPost(req, res) {
  return salvarNovo(req, res, imagemSegura(req.body.imgUrl));
}

export function postUpload(req, res) {
  return salvarNovo(req, res, req.file ? `/uploads/${req.file.filename}` : "");
}

export async function putPost(req, res) {
  const dados = {};
  if (req.body.titulo !== undefined) dados.titulo = String(req.body.titulo).trim();
  if (req.body.descricao !== undefined) dados.descricao = String(req.body.descricao).trim();
  if (req.body.formato !== undefined) dados.formato = req.body.formato;
  if (req.body.inclui !== undefined) dados.inclui = linhas(req.body.inclui);
  if (req.file) dados.imgUrl = `/uploads/${req.file.filename}`;
  else if (req.body.imgUrl) {
    const imgUrl = imagemSegura(req.body.imgUrl);
    if (imgUrl === null) {
      return res.status(400).json({ erros: ["A foto precisa ser um arquivo do site ou um endereço https."] });
    }
    dados.imgUrl = imgUrl;
  }

  const atual = await buscarPost(req.params.id);
  if (!atual) {
    return res.status(404).json({ erro: "Post não encontrado." });
  }

  const erros = validar(dados, true);
  if (!dados.imgUrl && !atual.imgUrl) erros.push("Escolha uma foto para adicionar o trabalho.");
  if (erros.length > 0) return res.status(400).json({ erros });

  const post = await atualizarPost(req.params.id, dados);
  res.status(200).json(post);
}

export async function deletePost(req, res) {
  const apagou = await deletarPost(req.params.id);
  if (!apagou) {
    return res.status(404).json({ erro: "Post não encontrado." });
  }
  res.status(204).send();
}
