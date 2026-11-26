import { ObjectId } from "mongodb";
import { getDb } from "../config/dbConfig.js";

function colecao() {
  return getDb().collection("posts");
}

export function paraCliente(doc) {
  if (!doc) return null;
  const versao = doc.imagemEm || doc.criadoEm;
  return {
    id: doc.codigo || String(doc._id),
    _id: String(doc._id),
    titulo: doc.titulo,
    descricao: doc.descricao,
    formato: doc.formato,
    imgUrl: doc.temImagem
      ? `/posts/${doc._id}/foto?v=${new Date(versao).getTime()}`
      : doc.imgUrl || "",
    inclui: doc.inclui || [],
    criadoEm: doc.criadoEm,
  };
}

export async function listarPosts(formato) {
  const filtro = formato ? { formato } : {};
  const docs = await colecao()
    .find(filtro, { projection: { imagem: 0 } })
    .sort({ ordem: 1, criadoEm: 1 })
    .toArray();
  return docs.map(paraCliente);
}

export async function buscarPost(id) {
  const doc = await encontrar(id);
  return paraCliente(doc);
}

async function encontrar(id, comImagem = false) {
  const opcoes = comImagem ? {} : { projection: { imagem: 0 } };
  if (ObjectId.isValid(id)) {
    const porId = await colecao().findOne({ _id: new ObjectId(id) }, opcoes);
    if (porId) return porId;
  }
  return colecao().findOne({ codigo: id }, opcoes);
}

export async function buscarImagem(id) {
  const doc = await encontrar(id, true);
  if (!doc?.temImagem || !doc.imagem) return null;
  const corpo = Buffer.isBuffer(doc.imagem) ? doc.imagem : Buffer.from(doc.imagem.buffer);
  return { tipo: doc.imagemTipo || "application/octet-stream", corpo };
}

export async function criarPost(dados) {
  const documento = {
    codigo: dados.codigo || `post-${Date.now()}`,
    titulo: dados.titulo,
    descricao: dados.descricao,
    formato: dados.formato,
    imgUrl: dados.imgUrl || "",
    inclui: dados.inclui || [],
    temImagem: Boolean(dados.imagem),
    imagemTipo: dados.imagemTipo || "",
    imagemEm: dados.imagem ? new Date() : undefined,
    imagem: dados.imagem,
    criadoEm: new Date(),
  };
  const resultado = await colecao().insertOne(documento);
  return paraCliente({ ...documento, _id: resultado.insertedId });
}

export async function atualizarPost(id, dados) {
  const atual = await encontrar(id);
  if (!atual) return null;
  const campos = {};
  for (const chave of ["titulo", "descricao", "formato", "imgUrl", "inclui", "temImagem", "imagemTipo", "imagem", "imagemEm"]) {
    if (dados[chave] !== undefined) campos[chave] = dados[chave];
  }
  await colecao().updateOne({ _id: atual._id }, { $set: campos });
  return paraCliente({ ...atual, ...campos });
}

export async function deletarPost(id) {
  const atual = await encontrar(id);
  if (!atual) return false;
  await colecao().deleteOne({ _id: atual._id });
  return true;
}
