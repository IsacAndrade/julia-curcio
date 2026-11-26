import { atualizarPost, conferirSessao, deletarPost, getPosts, sair, temSessao, upload } from "./fetchApi.js";

function escapeHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[caractere]);
}

const menuBotao = document.querySelector(".menu-botao");
const menu = document.querySelector("#menu");

function abrirMenu(aberto) {
  menu.classList.toggle("aberto", aberto);
  menuBotao.setAttribute("aria-expanded", String(aberto));
  menuBotao.setAttribute("aria-label", aberto ? "Fechar" : "Menu");
}

menuBotao.addEventListener("click", () => abrirMenu(!menu.classList.contains("aberto")));
menu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => abrirMenu(false));
});

const observador = new IntersectionObserver(
  (entradas) => {
    const visivel = entradas
      .filter((entrada) => entrada.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visivel) return;
    menu.querySelectorAll("a").forEach((link) => {
      const ativo = link.getAttribute("href") === `#${visivel.target.id}`;
      link.setAttribute("aria-current", ativo ? "true" : "false");
    });
  },
  { rootMargin: "-28% 0px -55% 0px", threshold: [0.05, 0.2, 0.45] },
);
["oficio", "quem-sou", "trabalho", "contato"].forEach((id) => observador.observe(document.getElementById(id)));

const lista = document.querySelector("#lista-posts");
const detalhe = document.querySelector("#detalhe");
const aviso = document.querySelector("#aviso-posts");
const editor = document.querySelector("#editor-trabalho");
const formEditor = editor.querySelector("form");
const erroEditor = editor.querySelector(".erro");
let posts = [];
let formatoAtual = "Tudo";
let selecionado = null;
let liberado = false;

function aspecto(src) {
  if (src.includes("livro") || src.includes("espuma")) return "proporcao-1-1";
  if (src.includes("orla")) return "proporcao-4-5";
  return "proporcao-3-4";
}

function quadro(src, alt) {
  if (!src) return `<div class="vazio proporcao-3-4">(foto exemplo)</div>`;
  return `<figure class="quadro ${aspecto(src)}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" /></figure>`;
}

function desenhar() {
  const visiveis = formatoAtual === "Tudo" ? posts : posts.filter((post) => post.formato === formatoAtual);
  lista.innerHTML = "";
  if (visiveis.length === 0) {
    fecharDetalhe();
    lista.innerHTML = `<li><p>Nada neste formato ainda.</p></li>`;
    return;
  }
  visiveis.forEach((post) => {
    const item = document.createElement("li");
    const acoes = liberado
      ? `<div class="acoes"><button type="button" class="botao" data-editar>Editar</button><button type="button" class="botao" data-apagar>Apagar</button></div>`
      : "";
    item.innerHTML = `
      <button type="button" class="abre">${quadro(post.imgUrl, post.titulo)}</button>
      <button type="button" class="legenda-abre">
        <span class="legenda">
          <small>${escapeHtml(post.formato)}</small>
          <span class="titulo">${escapeHtml(post.titulo)}</span>
        </span>
      </button>
      ${acoes}`;
    item.querySelectorAll(".abre, .legenda-abre").forEach((botao) => {
      botao.addEventListener("click", () => mostrar(post));
    });
    item.querySelector("[data-editar]")?.addEventListener("click", () => abrirEditor(post));
    item.querySelector("[data-apagar]")?.addEventListener("click", () => apagarTrabalho(post));
    lista.appendChild(item);
  });
  if (selecionado && !visiveis.some((post) => post.id === selecionado.id)) fecharDetalhe();
}

function fecharDetalhe() {
  selecionado = null;
  detalhe.hidden = true;
  detalhe.innerHTML = "";
}

function mostrar(post) {
  selecionado = post;
  const itens = (post.inclui || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  detalhe.hidden = false;
  detalhe.innerHTML = `
    ${quadro(post.imgUrl, post.titulo)}
    <div>
      <small>${escapeHtml(post.formato)}</small>
      <h2>${escapeHtml(post.titulo)}</h2>
      <p>${escapeHtml(post.descricao)}</p>
      <ul>${itens}</ul>
      <a class="botao" href="https://www.instagram.com/linha.1989/" target="_blank" rel="noreferrer">Ver @linha.1989</a>
    </div>`;
}

document.querySelectorAll(".filtro").forEach((botao) => {
  botao.addEventListener("click", () => {
    formatoAtual = botao.dataset.formato;
    document.querySelectorAll(".filtro").forEach((item) => item.classList.toggle("ativo", item === botao));
    desenhar();
  });
});

async function carregarPosts() {
  try {
    posts = await getPosts();
    aviso.hidden = true;
    desenhar();
  } catch {
    aviso.hidden = false;
    aviso.textContent = "A API não respondeu. Os trabalhos aparecem quando o backend está no ar.";
  }
}

function abrirEditor(post) {
  const criando = !post?.imgUrl;
  const formatos = [...formEditor.formato.options].map((opcao) => opcao.value);
  editor.hidden = false;
  editor.querySelector("#editor-titulo").textContent = criando ? "Adicionar uma foto" : "Editar trabalho";
  formEditor.querySelector("button[type=submit]").textContent = criando ? "Adicionar" : "Salvar";
  formEditor.id.value = post?.id || "";
  formEditor.titulo.value = post?.titulo || "";
  formEditor.formato.value = [post?.formato, formatoAtual].find((formato) => formatos.includes(formato)) || "Fotografia";
  formEditor.descricao.value = post?.descricao || "";
  formEditor.inclui.value = (post?.inclui || []).join("\n");
  formEditor.imagem.value = "";
  formEditor.imagem.required = criando;
  erroEditor.textContent = "";
  editor.querySelector("#editor-foto").innerHTML = quadro(post?.imgUrl, post?.titulo || "");
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function salvarTrabalho(evento) {
  evento.preventDefault();
  erroEditor.textContent = "";
  const dados = new FormData(formEditor);
  const id = dados.get("id");
  const temFoto = dados.get("imagem")?.size > 0;
  const jaTemFoto = posts.some((post) => post.id === id && post.imgUrl);
  if (!temFoto && !jaTemFoto) {
    erroEditor.textContent = "Escolha uma foto para adicionar o trabalho.";
    return;
  }
  dados.delete("id");
  const resposta = id ? await atualizarPost(id, dados) : await upload(dados);
  if (!resposta.ok) {
    if (resposta.status === 401) window.location.replace("/login");
    const corpo = await resposta.json().catch(() => ({}));
    erroEditor.textContent = (corpo.erros || [corpo.erro || "Não deu para salvar."]).join(" ");
    return;
  }
  editor.hidden = true;
  await carregarPosts();
}

async function apagarTrabalho(post) {
  if (!window.confirm(`Apagar “${post.titulo}”? A foto sai da seção Trabalho.`)) return;
  const resposta = await deletarPost(post.id);
  if (!resposta.ok) {
    aviso.hidden = false;
    aviso.textContent = "Não deu para apagar este trabalho.";
    return;
  }
  if (selecionado?.id === post.id) fecharDetalhe();
  await carregarPosts();
}

async function prepararAdm() {
  if (location.pathname !== "/adm") return;
  window.addEventListener("pageshow", (evento) => {
    if (evento.persisted) window.location.replace("/login");
  });
  const resposta = temSessao() ? await conferirSessao() : null;
  if (!resposta?.ok) {
    window.location.replace("/login");
    return;
  }
  liberado = true;
  document.querySelector("#barra-adm").hidden = false;
  document.querySelector("#adicionar-trabalho").hidden = false;
  document.querySelector("#adicionar-trabalho").addEventListener("click", () => abrirEditor(null));
  document.querySelector("#sair-adm").addEventListener("click", async () => {
    await sair();
    window.location.replace("/login");
  });
  document.querySelector("#cancelar-editor").addEventListener("click", () => {
    editor.hidden = true;
  });
  formEditor.addEventListener("submit", salvarTrabalho);
  desenhar();
}

const gradeInstagram = document.querySelector("#instagram-grade");
const visorInstagram = document.querySelector("#instagram-visor");
let publicacoes = [];
let indiceInstagram = 0;

function mostrarPublicacao(indice) {
  if (!publicacoes.length) return;
  indiceInstagram = (indice + publicacoes.length) % publicacoes.length;
  const post = publicacoes[indiceInstagram];
  const foto = visorInstagram.querySelector("img");
  const link = visorInstagram.querySelector("a");
  foto.src = post.imagem;
  foto.alt = post.video ? "Vídeo de @linha.1989" : "Publicação de @linha.1989";
  link.href = `https://www.instagram.com/p/${post.codigo}/`;
  if (!visorInstagram.open) visorInstagram.showModal();
}

async function carregarInstagram() {
  const resposta = await fetch("/instagram");
  if (!resposta.ok) return;
  const perfil = await resposta.json();
  const nome = document.querySelector("#instagram-nome");
  const foto = document.querySelector("#instagram-foto");
  if (nome) nome.textContent = perfil.nome || "@linha.1989";
  if (foto && perfil.foto) {
    foto.src = perfil.foto;
    foto.alt = "";
    foto.hidden = false;
  }
  publicacoes = perfil.posts || [];
  gradeInstagram.innerHTML = "";
  publicacoes.forEach((post, indice) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.video = post.video ? "true" : "false";
    botao.setAttribute("aria-label", post.video ? "Abrir vídeo" : "Abrir publicação");
    botao.innerHTML = `<img src="${escapeHtml(post.imagem)}" alt="" />`;
    botao.addEventListener("click", () => mostrarPublicacao(indice));
    gradeInstagram.appendChild(botao);
  });
}

visorInstagram.querySelector("[data-fechar]").addEventListener("click", () => visorInstagram.close());
visorInstagram.querySelector("[data-anterior]").addEventListener("click", () => mostrarPublicacao(indiceInstagram - 1));
visorInstagram.querySelector("[data-proximo]").addEventListener("click", () => mostrarPublicacao(indiceInstagram + 1));
visorInstagram.addEventListener("keydown", (evento) => {
  if (evento.key === "ArrowLeft") mostrarPublicacao(indiceInstagram - 1);
  if (evento.key === "ArrowRight") mostrarPublicacao(indiceInstagram + 1);
});
visorInstagram.addEventListener("click", (evento) => {
  if (evento.target === visorInstagram) visorInstagram.close();
});

carregarPosts();
prepararAdm();
carregarInstagram();
