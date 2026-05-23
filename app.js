const CONFIG_URL = "https://caduinoo.github.io/caduflix-catalogo/config.json";

let config = null;
let filmes = [];
let filmesFiltrados = [];

const statusEl = document.getElementById("status");
const gradeEl = document.getElementById("grade");
const buscaEl = document.getElementById("busca");

const modal = document.getElementById("modal");
const fecharModal = document.getElementById("fecharModal");
const modalBanner = document.getElementById("modalBanner");
const modalCapa = document.getElementById("modalCapa");
const modalTitulo = document.getElementById("modalTitulo");
const modalDescricao = document.getElementById("modalDescricao");
const modalGeneros = document.getElementById("modalGeneros");
const modalOpcoes = document.getElementById("modalOpcoes");
const player = document.getElementById("player");

function imagemOuPlaceholder(url) {
  return url || "https://via.placeholder.com/500x750?text=Sem+Capa";
}

async function carregarJson(url) {
  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error(`Erro ao carregar: ${url}`);
  }

  return resposta.json();
}

async function iniciar() {
  try {
    statusEl.textContent = "Carregando configuração...";

    config = await carregarJson(CONFIG_URL);

    statusEl.textContent = "Carregando filmes...";

    filmes = await carregarJson(config.catalogo.filmes);
    filmesFiltrados = filmes;

    statusEl.textContent = `${filmes.length} filmes carregados.`;
    renderizarFilmes(filmesFiltrados.slice(0, 200));
  } catch (erro) {
    console.error(erro);
    statusEl.textContent = "Erro ao carregar catálogo. Veja o console.";
  }
}

function renderizarFilmes(lista) {
  gradeEl.innerHTML = "";

  for (const filme of lista) {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${imagemOuPlaceholder(filme.capa)}" alt="${filme.titulo}">
      <div class="card-info">
        <h3>${filme.titulo}</h3>
        <p>${filme.generos?.slice(0, 2).join(", ") || ""}</p>
      </div>
    `;

    card.addEventListener("click", () => abrirDetalhes(filme));

    gradeEl.appendChild(card);
  }
}

function abrirDetalhes(filme) {
  modal.classList.remove("escondido");

  player.pause();
  player.removeAttribute("src");
  player.load();
  player.classList.add("escondido");

  modalBanner.src = imagemOuPlaceholder(filme.banner || filme.capa);
  modalCapa.src = imagemOuPlaceholder(filme.capa);
  modalTitulo.textContent = filme.titulo;
  modalDescricao.textContent = filme.descricao || "Sem descrição.";

  modalGeneros.innerHTML = "";
  for (const genero of filme.generos || []) {
    const span = document.createElement("span");
    span.className = "genero";
    span.textContent = genero;
    modalGeneros.appendChild(span);
  }

  modalOpcoes.innerHTML = "";

  for (const opcao of filme.opcoes || []) {
    const botao = document.createElement("button");
    botao.textContent = opcao.nome || "Assistir";
    botao.addEventListener("click", () => assistirFilme(opcao));
    modalOpcoes.appendChild(botao);
  }
}

async function assistirFilme(opcao) {
  try {
    const url = new URL(config.api.play);

    url.searchParams.set("tipo", "movie");
    url.searchParams.set("id", opcao.xtreamId);
    url.searchParams.set("container", opcao.container || "mp4");

    modalOpcoes.querySelectorAll("button").forEach(btn => {
      btn.disabled = true;
      btn.textContent = "Carregando...";
    });

    const resposta = await fetch(url.toString());

    if (!resposta.ok) {
      throw new Error("Erro ao buscar link de reprodução.");
    }

    const dados = await resposta.json();

    if (!dados.url) {
      throw new Error("Worker não retornou URL.");
    }

    player.src = dados.url;
    player.classList.remove("escondido");
    player.play();

    abrirDetalhesUltimoEstadoBotoes();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao tentar reproduzir. Veja o console.");
    abrirDetalhesUltimoEstadoBotoes();
  }
}

function abrirDetalhesUltimoEstadoBotoes() {
  const botoes = modalOpcoes.querySelectorAll("button");

  botoes.forEach((btn, index) => {
    btn.disabled = false;

    const filmeAtual = filmes.find(f => f.titulo === modalTitulo.textContent);
    const opcao = filmeAtual?.opcoes?.[index];

    btn.textContent = opcao?.nome || "Assistir";
  });
}

buscaEl.addEventListener("input", () => {
  const termo = buscaEl.value.trim().toLowerCase();

  if (!termo) {
    filmesFiltrados = filmes;
  } else {
    filmesFiltrados = filmes.filter((filme) =>
      filme.titulo.toLowerCase().includes(termo)
    );
  }

  statusEl.textContent = `${filmesFiltrados.length} resultado(s). Mostrando até 200.`;
  renderizarFilmes(filmesFiltrados.slice(0, 200));
});

fecharModal.addEventListener("click", () => {
  modal.classList.add("escondido");
  player.pause();
  player.removeAttribute("src");
  player.load();
});

iniciar();