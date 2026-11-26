import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { getSessao, postLogin, postLogout } from "../controllers/acessoController.js";
import {
  deletePost,
  getPost,
  getPosts,
  postPost,
  postUpload,
  putPost,
} from "../controllers/postsController.js";
import { lerMidia, obterPerfil, perfilPublico } from "../instagram.js";
import { exigirLogin, exigirPedido } from "../middleware/sessoes.js";

const pastaUploads = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads");
fs.mkdirSync(pastaUploads, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, pastaUploads);
  },
  filename(_req, file, cb) {
    const seguro = file.originalname.replace(/[^\w.\-]+/g, "-");
    cb(null, `${Date.now()}-${seguro}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Envie uma imagem JPG, PNG ou WebP."));
  },
});

function comImagem(req, res, next) {
  const tipo = req.headers["content-type"] || "";
  if (!tipo.includes("multipart/form-data")) return next();
  upload.single("imagem")(req, res, (erro) => {
    if (!erro) return next();
    const mensagem =
      erro.code === "LIMIT_FILE_SIZE"
        ? "A imagem precisa ter no máximo 8 MB."
        : erro.message || "Não foi possível receber a imagem.";
    res.status(400).json({ erros: [mensagem] });
  });
}

const adm = [exigirPedido, exigirLogin];

const routes = (app) => {
  app.post("/login", exigirPedido, postLogin);
  app.post("/logout", exigirPedido, postLogout);
  app.get("/sessao", adm, getSessao);

  app.get("/instagram", async (_req, res) => {
    try {
      res.json(perfilPublico(await obterPerfil()));
    } catch {
      res.status(502).json({ erros: ["O Instagram não respondeu."] });
    }
  });
  app.get("/instagram/midia/:codigo", async (req, res) => {
    const codigo = req.params.codigo;
    if (codigo !== "perfil" && !/^[A-Za-z0-9_-]{5,30}$/.test(codigo)) return res.status(404).end();
    try {
      const imagem = await lerMidia(codigo);
      if (!imagem) return res.status(404).end();
      res.setHeader("Content-Type", imagem.tipo);
      res.setHeader("Cache-Control", "public, max-age=600");
      res.send(imagem.corpo);
    } catch {
      res.status(404).end();
    }
  });

  app.get("/posts", getPosts);
  app.get("/posts/:id", getPost);
  app.post("/post", adm, postPost);
  app.post("/upload", adm, comImagem, postUpload);
  app.put("/posts/:id", adm, comImagem, putPost);
  app.delete("/posts/:id", adm, deletePost);
};

export default routes;
