import { entrar } from "./fetchApi.js";

const form = document.querySelector("#entrar");
const campo = document.querySelector("#chave");
const erro = document.querySelector("#erro");

if (!CSS.supports("-webkit-text-security", "disc")) {
  campo.type = "password";
  campo.autocomplete = "new-password";
}
campo.addEventListener("focus", () => campo.removeAttribute("readonly"));

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erro.textContent = "";
  const botao = form.querySelector("button");
  botao.disabled = true;
  try {
    const resposta = await entrar(campo.value);
    campo.value = "";
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      erro.textContent = corpo.erro || "Chave não confere.";
      return;
    }
    window.location.replace("/adm");
  } catch {
    erro.textContent = "O site não respondeu. Tente de novo.";
  } finally {
    botao.disabled = false;
  }
});
