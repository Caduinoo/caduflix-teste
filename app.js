const CONFIG_URL = "https://caduinoo.github.io/caduflix-catalogo/config.json";

let config = null;

let dados = {
  filmes: [],
  series: [],
  canais: [],
};

let tipoAtual = "filmes";
let listaAtual = [];
let itemAtual = null;

const statusEl = document.getElementById("status");
const gradeEl = document.getElementById("grade");
const buscaEl = document.getElementById("busca");
const abas = document.querySelectorAll(".aba");

const modal = document.getElementById("modal");
const fecharModal = document.getElementById("fecharModal");
const modalBanner = document.getElementById("modalBanner");
const modalCapa = document.getElementById("modalCapa");
const modalTitulo = document.getElementById("modalTitulo");
const modalDescricao = document.getElementById("modalDescricao");
const modalGeneros = document.getElementById("modalGeneros");
const modalOpcoes = document.getElementById("modalOpcoes");
const tituloOpcoes = document.getElementById("tituloOpcoes");
const player = document.getElementById("player");

function imagemOuPlaceholder(url, texto = "Sem imagem") {
  return url || `https://placehold.co/500x750/222/fff?text=${encodeURIComponent(texto)}`;
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

    await carregarTipo("filmes");
  } catch (erro) {
    console.error(erro);
    statusEl.textContent = "Erro ao carregar catálogo. Veja o console.";
  }
}

async function carregarTipo(tipo) {
  tipoAtual = tipo;
  buscaEl.value = "";

  atualizarAbas();

  if (dados[tipo].length === 0) {
    statusEl.textContent = `Carregando ${nomeTipo(tipo)}...`;

    if (tipo === "filmes") {
      dados.filmes = await carregarJson(config.catalogo.filmes);
    }

    if (tipo === "series") {
      dados.series = await carregarJson(config.catalogo.series);
    }

    if (tipo === "canais") {
      dados.canais = await carregarJson(config.catalogo.canais);
    }
  }

  listaAtual = dados[tipo];

  statusEl.textContent = `${listaAtual.length} ${nomeTipo(tipo)} carregados. Mostrando até 200.`;
  renderizarLista(listaAtual.slice(0, 200));
}

function nomeTipo(tipo) {
  if (tipo === "filmes") return "filmes";
  if (tipo === "series") return "séries";
  if (tipo === "canais") return "canais";
  return "itens";
}

function atualizarAbas() {
  abas.forEach((aba) => {
    aba.classList.toggle("ativa", aba.dataset.tipo === tipoAtual);
  });

  buscaEl.placeholder =
    tipoAtual === "filmes" ? "Buscar filme..." :
    tipoAtual === "series" ? "Buscar série..." :
    "Buscar canal...";
}

function renderizarLista(lista) {
  gradeEl.innerHTML = "";

  for (const item of lista) {
    const card = document.createElement("div");
    card.className = `card ${tipoAtual === "canais" ? "canal" : ""}`;

    const imagem = item.capa || item.banner || item.logo || item.stream_icon;

    card.innerHTML = `
      <img src="${imagemOuPlaceholder(imagem, tipoAtual === "canais" ? "Canal" : "Sem Capa")}" alt="${item.titulo}">
      <div class="card-info">
        <h3>${item.titulo}</h3>
        <p>${textoSecundario(item)}</p>
      </div>
    `;

    card.addEventListener("click", () => abrirDetalhes(item));

    gradeEl.appendChild(card);
  }
}

function textoSecundario(item) {
  if (tipoAtual === "canais") {
    return item.categoria || "";
  }

  if (Array.isArray(item.generos)) {
    return item.generos.slice(0, 2).join(", ");
  }

  return "";
}

function abrirDetalhes(item) {
  itemAtual = item;

  modal.classList.remove("escondido");

  limparPlayer();

  const imagem = item.capa || item.banner || item.logo || item.stream_icon;
  const banner = item.banner || item.capa || item.logo || item.stream_icon;

  modalBanner.src = imagemOuPlaceholder(banner, "Sem Banner");
  modalCapa.src = imagemOuPlaceholder(imagem, "Sem Capa");

  modalCapa.classList.toggle("canal", tipoAtual === "canais");

  modalTitulo.textContent = item.titulo;
  modalDescricao.textContent = item.descricao || item.plot || item.categoria || "Sem descrição.";

  modalGeneros.innerHTML = "";

  const etiquetas = tipoAtual === "canais"
    ? [item.categoria || "Canal"]
    : item.generos || [];

  for (const etiqueta of etiquetas) {
    const span = document.createElement("span");
    span.className = "genero";
    span.textContent = etiqueta;
    modalGeneros.appendChild(span);
  }

  modalOpcoes.innerHTML = "";

  if (tipoAtual === "filmes") {
    tituloOpcoes.textContent = "Opções";

    for (const opcao of item.opcoes || []) {
      const botao = document.createElement("button");
      botao.textContent = opcao.nome || "Assistir";
      botao.addEventListener("click", () => assistirFilme(opcao));
      modalOpcoes.appendChild(botao);
    }
  }

  if (tipoAtual === "series") {
    tituloOpcoes.textContent = "Séries";

    const aviso = document.createElement("p");
    aviso.textContent = "Nesta versão de teste, as séries aparecem no catálogo, mas os episódios serão organizados no gerador completo.";
    aviso.style.color = "#bbb";
    modalOpcoes.appendChild(aviso);
  }

  if (tipoAtual === "canais") {
    tituloOpcoes.textContent = "Ao vivo";

    const botao = document.createElement("button");
    botao.textContent = "Assistir canal";
    botao.addEventListener("click", () => assistirCanal(item));
    modalOpcoes.appendChild(botao);
  }
}

async function assistirFilme(opcao) {
  try {
    setBotoesCarregando(true);

    const url = new URL(config.api.play);
    url.searchParams.set("tipo", "movie");
    url.searchParams.set("id", opcao.xtreamId);
    url.searchParams.set("container", opcao.container || "mp4");

    const dadosPlay = await buscarPlayUrl(url);

    tocarVideo(dadosPlay.url);
  } catch (erro) {
    console.error(erro);
    alert("Erro ao tentar reproduzir filme. Veja o console.");
  } finally {
    setBotoesCarregando(false);
  }
}

async function assistirCanal(canal) {
  try {
    setBotoesCarregando(true);

    const id = canal.xtreamId || canal.stream_id || canal.id;

    const url = new URL(config.api.play);
    url.searchParams.set("tipo", "live");
    url.searchParams.set("id", String(id).replace("canal-", ""));

    const dadosPlay = await buscarPlayUrl(url);

    tocarVideo(dadosPlay.url);
  } catch (erro) {
    console.error(erro);
    alert("Erro ao tentar reproduzir canal. Veja o console.");
  } finally {
    setBotoesCarregando(false);
  }
}

async function buscarPlayUrl(url) {
  const resposta = await fetch(url.toString());

  if (!resposta.ok) {
    throw new Error("Erro ao buscar link de reprodução.");
  }

  const dadosPlay = await resposta.json();

  if (!dadosPlay.url) {
    throw new Error("Worker não retornou URL.");
  }

  return dadosPlay;
}

function tocarVideo(url) {
  player.src = url;
  player.classList.remove("escondido");
  player.play();
}

function limparPlayer() {
  player.pause();
  player.removeAttribute("src");
  player.load();
  player.classList.add("escondido");
}

function setBotoesCarregando(carregando) {
  const botoes = modalOpcoes.querySelectorAll("button");

  botoes.forEach((botao) => {
    botao.disabled = carregando;

    if (carregando) {
      botao.dataset.textoOriginal = botao.textContent;
      botao.textContent = "Carregando...";
    } else {
      botao.textContent = botao.dataset.textoOriginal || botao.textContent;
    }
  });
}

buscaEl.addEventListener("input", () => {
  const termo = buscaEl.value.trim().toLowerCase();

  let filtrados;

  if (!termo) {
    filtrados = listaAtual;
  } else {
    filtrados = listaAtual.filter((item) =>
      String(item.titulo || "").toLowerCase().includes(termo)
    );
  }

  statusEl.textContent = `${filtrados.length} resultado(s). Mostrando até 200.`;
  renderizarLista(filtrados.slice(0, 200));
});

abas.forEach((aba) => {
  aba.addEventListener("click", () => {
    carregarTipo(aba.dataset.tipo);
  });
});

fecharModal.addEventListener("click", () => {
  modal.classList.add("escondido");
  limparPlayer();
});

iniciar();