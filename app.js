const CONFIG_URL = "https://caduinoo.github.io/caduflix-catalogo/config.json";

let config = null;

let indices = {
  filmes: null,
  series: null,
  canais: null,
};

let dados = {
  filmes: [],
  series: [],
  canais: [],
};

let paginasCarregadas = {
  filmes: 0,
  series: 0,
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

  limparPlayer();
  atualizarAbas();

  if (tipo === "filmes") {
    await carregarFilmes();
  }

  if (tipo === "series") {
    await carregarSeries();
  }

  if (tipo === "canais") {
    await carregarCanais();
  }

  listaAtual = dados[tipo];

  statusEl.textContent = `${listaAtual.length} ${nomeTipo(tipo)} carregados.`;
  renderizarLista(listaAtual);
}

async function carregarFilmes() {
  if (!indices.filmes) {
    statusEl.textContent = "Carregando índice de filmes...";
    indices.filmes = await carregarJson(config.catalogo.filmesIndex);
  }

  if (dados.filmes.length === 0) {
    await carregarProximaPaginaFilmes();
  }
}

async function carregarSeries() {
  if (!indices.series) {
    statusEl.textContent = "Carregando índice de séries...";
    indices.series = await carregarJson(config.catalogo.seriesIndex);
  }

  if (dados.series.length === 0) {
    await carregarProximaPaginaSeries();
  }
}

async function carregarCanais() {
  if (!indices.canais) {
    statusEl.textContent = "Carregando índice de canais...";
    indices.canais = await carregarJson(config.catalogo.canaisIndex);
  }

  if (dados.canais.length === 0) {
    statusEl.textContent = "Carregando canais...";
    dados.canais = await carregarJson(indices.canais.todos);
  }
}

async function carregarProximaPaginaFilmes() {
  if (!indices.filmes) return;

  const proxima = paginasCarregadas.filmes + 1;

  if (proxima > indices.filmes.paginas) return;

  statusEl.textContent = `Carregando filmes página ${proxima}/${indices.filmes.paginas}...`;

  const url = indices.filmes.todos.primeiraPagina.replace("page-1.json", `page-${proxima}.json`);
  const pagina = await carregarJson(url);

  dados.filmes.push(...pagina);
  paginasCarregadas.filmes = proxima;
}

async function carregarProximaPaginaSeries() {
  if (!indices.series) return;

  const proxima = paginasCarregadas.series + 1;

  if (proxima > indices.series.paginas) return;

  statusEl.textContent = `Carregando séries página ${proxima}/${indices.series.paginas}...`;

  const url = indices.series.todos.primeiraPagina.replace("page-1.json", `page-${proxima}.json`);
  const pagina = await carregarJson(url);

  dados.series.push(...pagina);
  paginasCarregadas.series = proxima;
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

  if ((tipoAtual === "filmes" || tipoAtual === "series") && !buscaEl.value.trim()) {
    adicionarBotaoCarregarMais();
  }
}

function adicionarBotaoCarregarMais() {
  const totalPaginas = tipoAtual === "filmes"
    ? indices.filmes?.paginas || 0
    : indices.series?.paginas || 0;

  const paginasAtuais = tipoAtual === "filmes"
    ? paginasCarregadas.filmes
    : paginasCarregadas.series;

  if (paginasAtuais >= totalPaginas) return;

  const wrapper = document.createElement("div");
  wrapper.className = "card";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.minHeight = "225px";

  wrapper.innerHTML = `
    <div class="card-info" style="text-align:center;">
      <h3>Carregar mais</h3>
      <p>Página ${paginasAtuais + 1} de ${totalPaginas}</p>
    </div>
  `;

  wrapper.addEventListener("click", async () => {
    try {
      if (tipoAtual === "filmes") {
        await carregarProximaPaginaFilmes();
        listaAtual = dados.filmes;
      } else {
        await carregarProximaPaginaSeries();
        listaAtual = dados.series;
      }

      statusEl.textContent = `${listaAtual.length} ${nomeTipo(tipoAtual)} carregados.`;
      renderizarLista(listaAtual);
    } catch (erro) {
      console.error(erro);
      alert("Erro ao carregar próxima página.");
    }
  });

  gradeEl.appendChild(wrapper);
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

async function abrirDetalhes(itemLista) {
  try {
    limparPlayer();

    let item = itemLista;

    if ((tipoAtual === "filmes" || tipoAtual === "series") && itemLista.detalhesUrl) {
      statusEl.textContent = "Carregando detalhes...";
      item = await carregarJson(itemLista.detalhesUrl);
    }

    itemAtual = item;

    modal.classList.remove("escondido");

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
      aviso.textContent = "Nesta versão de teste, as séries aparecem no catálogo. Os episódios entram na próxima etapa do gerador.";
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

    statusEl.textContent = `${listaAtual.length} ${nomeTipo(tipoAtual)} carregados.`;
  } catch (erro) {
    console.error(erro);
    alert("Erro ao abrir detalhes. Veja o console.");
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

  statusEl.textContent = `${filtrados.length} resultado(s). Mostrando até 300.`;
  renderizarLista(filtrados);
});

abas.forEach((aba) => {
  aba.addEventListener("click", async () => {
    try {
      await carregarTipo(aba.dataset.tipo);
    } catch (erro) {
      console.error(erro);
      statusEl.textContent = `Erro ao carregar ${aba.dataset.tipo}. Veja o console.`;
      alert(`Erro ao carregar ${aba.dataset.tipo}.`);
    }
  });
});

fecharModal.addEventListener("click", () => {
  modal.classList.add("escondido");
  limparPlayer();
});

iniciar();