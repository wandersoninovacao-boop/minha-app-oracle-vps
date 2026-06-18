const storageKey = "shopee-afiliados-automacao-v1";

const defaultState = {
  settings: {
    brandName: "Achadinhos Ofertas Brasil",
    tone: "Direto e popular",
    call: "Oferta pode mudar a qualquer momento. Confira preço, frete e prazo antes de comprar."
  },
  products: []
};

let state = loadState();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const sections = {
  dashboard: "Painel",
  products: "Produtos",
  queue: "Fila",
  catalog: "Catálogo",
  automation: "Automação",
  settings: "Configuração"
};

function loadState() {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : clone(defaultState);
  } catch {
    return clone(defaultState);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatMoney(value) {
  const number = parseMoney(value);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoney(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Number(normalized) || 0;
}

function slugText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function productInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function generateCopies(product) {
  const price = product.price ? ` por ${formatMoney(product.price)}` : "";
  const benefit = product.benefit || "produto útil para o dia a dia";
  const call = state.settings.call;
  const brand = state.settings.brandName;
  const hashtags = buildHashtags(product);
  const platform = product.platform || "Shopee";

  return {
    whatsapp: `${product.name}${price}\n\n${benefit}.\n\nCompre pelo link: ${product.affiliateLink}\n\n${call}`,
    telegram: `${brand}\n\n${product.name}${price}\n${benefit}.\n\nOferta no ${platform}: ${product.affiliateLink}`,
    instagram: `${product.name}${price}\n\n${benefit}. Salve para conferir depois e envie para quem gosta de oferta boa.\n\n${call}\n\n${hashtags}`,
    tiktok: `${product.name}${price}. ${benefit}. Link na bio ou descrição. ${hashtags}`,
    shortTitle: `${platform} - ${product.category}: ${product.name}`
  };
}

function buildHashtags(product) {
  const category = slugText(product.category).replace(/-/g, "");
  const name = slugText(product.name).split("-").slice(0, 2).join("");
  return `#shopee #achadinhos #ofertas #${category} #${name}`;
}

function addProduct(formData) {
  const product = normalizeProduct(formData);
  state.products.unshift(product);
  saveState();
}

function normalizeProduct(formData) {
  const product = {
    id: createId(),
    name: formData.name,
    platform: formData.platform || "Shopee",
    price: formData.price,
    commission: formData.commission,
    category: formData.category || "Produto viral",
    priority: formData.priority || "Média",
    affiliateLink: formData.affiliateLink,
    image: formData.image,
    benefit: formData.benefit,
    status: "Pronto",
    createdAt: new Date().toISOString(),
    postedAt: null
  };

  product.copies = generateCopies(product);
  return product;
}

function prepareProduct(product) {
  const prepared = {
    id: product.id || createId(),
    name: product.name || "Produto sem nome",
    platform: product.platform || "Shopee",
    price: product.price || "",
    commission: product.commission || "",
    category: product.category || "Produto viral",
    priority: product.priority || "MÃ©dia",
    affiliateLink: product.affiliateLink || "",
    image: product.image || "",
    benefit: product.benefit || "produto Ãºtil para o dia a dia",
    status: product.status || "Pronto",
    createdAt: product.createdAt || new Date().toISOString(),
    postedAt: product.postedAt || null
  };

  prepared.copies = product.copies || generateCopies(prepared);
  return prepared;
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `produto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSection(sectionId) {
  $$(".section").forEach((section) => section.classList.toggle("active", section.id === sectionId));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.section === sectionId));
  $("#pageTitle").textContent = sections[sectionId];
  renderAll();
}

function renderAll() {
  renderSettings();
  renderMetrics();
  renderProducts();
  renderToday();
  renderQueue();
  renderWeekPlan();
  renderCatalog();
  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderMetrics() {
  const products = state.products;
  $("#metricProducts").textContent = products.length;
  $("#metricReady").textContent = products.filter((item) => item.status === "Pronto").length;
  $("#metricPosted").textContent = products.filter((item) => item.status === "Postado").length;
  const commission = products.reduce((total, item) => total + parseMoney(item.commission), 0);
  $("#metricCommission").textContent = formatMoney(commission);
}

function visibleProducts() {
  const search = $("#searchInput")?.value?.trim().toLowerCase() || "";
  const status = $("#statusFilter")?.value || "Todos";
  return state.products.filter((product) => {
    const matchSearch = [product.name, product.category, product.benefit].join(" ").toLowerCase().includes(search);
    const matchStatus = status === "Todos" || product.status === status;
    return matchSearch && matchStatus;
  });
}

function renderProducts() {
  const list = $("#productList");
  if (!list) return;
  const products = visibleProducts();

  if (!products.length) {
    list.innerHTML = `<div class="empty-state">Nenhum produto encontrado. Cadastre sua primeira oferta da Shopee.</div>`;
    return;
  }

  list.innerHTML = products.map(renderProductCard).join("");
}

function renderProductCard(product) {
  const thumb = product.image
    ? `<img class="product-thumb" src="${escapeHtml(product.image)}" alt="">`
    : `<div class="product-thumb">${escapeHtml(productInitials(product.name))}</div>`;

  return `
    <article class="product-card">
      ${thumb}
      <div class="product-main">
        <div class="product-title">
          <strong>${escapeHtml(product.name)}</strong>
          <span class="tag ${statusClass(product.status)}">${product.status}</span>
        </div>
        <div class="tag-row">
          <span class="tag blue">${escapeHtml(product.category)}</span>
          <span class="tag amber">${escapeHtml(product.platform || "Shopee")}</span>
          <span class="tag">${product.priority}</span>
          <span class="tag green">${formatMoney(product.price)}</span>
        </div>
        <div class="card-actions">
          <button class="mini-button" data-copy="${product.id}" data-copy-type="whatsapp">WhatsApp</button>
          <button class="mini-button" data-copy="${product.id}" data-copy-type="instagram">Instagram</button>
          <button class="mini-button" data-copy="${product.id}" data-copy-type="telegram">Telegram</button>
          <button class="mini-button" data-status="${product.id}" data-value="Postado">Marcar postado</button>
          <button class="mini-button" data-status="${product.id}" data-value="Pausado">Pausar</button>
          <button class="mini-button" data-delete="${product.id}">Excluir</button>
        </div>
        <div class="copy-box">${escapeHtml(product.copies.whatsapp)}</div>
      </div>
    </article>
  `;
}

function statusClass(status) {
  if (status === "Postado") return "green";
  if (status === "Pausado") return "amber";
  return "blue";
}

function renderToday() {
  const list = $("#todayList");
  if (!list) return;
  const products = getTodayProducts();

  if (!products.length) {
    list.innerHTML = `<div class="empty-state">Cadastre produtos prontos para montar a fila de hoje.</div>`;
    return;
  }

  list.innerHTML = products
    .map(
      (product, index) => `
      <article class="queue-card">
        <h3>${index + 1}. ${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.copies.telegram)}</p>
      </article>
    `
    )
    .join("");
}

function getTodayProducts() {
  const priority = { Alta: 1, Média: 2, Baixa: 3 };
  return state.products
    .filter((product) => product.status === "Pronto")
    .sort((a, b) => priority[a.priority] - priority[b.priority] || parseMoney(a.price) - parseMoney(b.price))
    .slice(0, 5);
}

function getPriorityProducts() {
  const priority = { Alta: 1, Média: 2, Baixa: 3 };
  return state.products
    .filter((product) => product.status === "Pronto")
    .sort((a, b) => priority[a.priority] - priority[b.priority] || parseMoney(a.price) - parseMoney(b.price));
}

function renderQueue() {
  const list = $("#queueList");
  if (!list) return;
  const products = getTodayProducts();

  if (!products.length) {
    list.innerHTML = `<div class="empty-state">Sua fila aparece aqui quando existirem produtos prontos.</div>`;
    return;
  }

  list.innerHTML = products
    .map(
      (product, index) => `
      <article class="queue-card">
        <h3>Post ${index + 1}</h3>
        <p>${escapeHtml(product.copies.instagram)}</p>
        <button class="mini-button" data-copy="${product.id}" data-copy-type="instagram">Copiar legenda</button>
      </article>
    `
    )
    .join("");
}

function buildWeekPlan() {
  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const products = getPriorityProducts();
  return days.map((day, dayIndex) => {
    const items = [];
    for (let slot = 0; slot < 3; slot += 1) {
      const product = products[(dayIndex * 3 + slot) % products.length];
      if (product && !items.includes(product)) items.push(product);
    }
    return { day, items };
  });
}

function renderWeekPlan() {
  const plan = $("#weekPlan");
  if (!plan) return;

  if (!getPriorityProducts().length) {
    plan.innerHTML = `<div class="empty-state">Cadastre produtos prontos para montar a agenda semanal.</div>`;
    return;
  }

  plan.innerHTML = buildWeekPlan()
    .map(
      (day) => `
      <article class="day-card">
        <strong>${day.day}</strong>
        <ol>
          ${day.items.map((product) => `<li>${escapeHtml(product.name)}</li>`).join("")}
        </ol>
      </article>
    `
    )
    .join("");
}

function renderCatalog() {
  const preview = $("#catalogPreview");
  if (!preview) return;
  const products = state.products.filter((product) => product.status !== "Pausado");

  if (!products.length) {
    preview.innerHTML = `<div class="empty-state">Produtos ativos aparecerão aqui como uma vitrine simples.</div>`;
    return;
  }

  preview.innerHTML = products
    .map((product) => {
      const media = product.image
        ? `<img src="${escapeHtml(product.image)}" alt="">`
        : `<div class="catalog-fallback">${escapeHtml(productInitials(product.name))}</div>`;
      return `
        <article class="catalog-card">
          ${media}
          <div class="catalog-body">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${formatMoney(product.price)} • ${escapeHtml(product.category)}</span>
            <a href="${escapeHtml(product.affiliateLink)}" target="_blank" rel="noreferrer">Ver oferta</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSettings() {
  if (!$("#brandName")) return;
  $("#brandName").value = state.settings.brandName;
  $("#brandTone").value = state.settings.tone;
  $("#brandCall").value = state.settings.call;
}

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const field = document.createElement("textarea");
    field.value = text;
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  showToast("Texto copiado.");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportCsv() {
  const headers = ["plataforma", "nome", "preco", "comissao", "categoria", "prioridade", "status", "link_afiliado", "texto_whatsapp"];
  const rows = state.products.map((product) =>
    [product.platform || "Shopee", product.name, product.price, product.commission, product.category, product.priority, product.status, product.affiliateLink, product.copies.whatsapp]
      .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
      .join(",")
  );
  downloadFile("produtos-shopee-afiliados.csv", [headers.join(","), ...rows].join("\n"), "text/csv");
}

function exportJson() {
  downloadFile("backup-shopee-afiliados.json", JSON.stringify(state, null, 2), "application/json");
}

function exportCatalogHtml() {
  const products = state.products.filter((product) => product.status !== "Pausado");
  const cards = products
    .map((product) => {
      const image = product.image
        ? `<img src="${escapeHtml(product.image)}" alt="">`
        : `<div class="fallback">${escapeHtml(productInitials(product.name))}</div>`;
      return `
        <article class="card">
          ${image}
          <div class="body">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${formatMoney(product.price)} - ${escapeHtml(product.category)}</span>
            <p>${escapeHtml(product.benefit || "Oferta selecionada.")}</p>
            <a href="${escapeHtml(product.affiliateLink)}" target="_blank" rel="noreferrer">Ver oferta</a>
          </div>
        </article>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(state.settings.brandName)}</title>
  <style>
    body{margin:0;background:#f4f6f8;color:#17202a;font-family:Arial,Helvetica,sans-serif}
    header{padding:28px 18px;background:#111827;color:#fff}
    main{max-width:1100px;margin:0 auto;padding:22px 16px}
    h1{margin:0;font-size:30px}p{line-height:1.45}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
    .card{background:#fff;border:1px solid #d8dee7;border-radius:8px;overflow:hidden}
    img,.fallback{width:100%;aspect-ratio:4/3;object-fit:cover;background:#edf2f7;display:grid;place-items:center;color:#667085;font-weight:800}
    .body{display:grid;gap:8px;padding:13px}.body span{color:#667085}.body p{margin:0;color:#344054}
    a{display:inline-flex;min-height:40px;align-items:center;justify-content:center;border-radius:8px;background:#ee4d2d;color:#fff;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <header><main><h1>${escapeHtml(state.settings.brandName)}</h1><p>${escapeHtml(state.settings.call)}</p></main></header>
  <main><section class="grid">${cards || "<p>Nenhuma oferta ativa.</p>"}</section></main>
</body>
</html>`;

  downloadFile("vitrine-shopee-afiliados.html", html, "text/html");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function copyQueue() {
  const text = getTodayProducts()
    .map((product, index) => `POST ${index + 1}\n${product.copies.telegram}`)
    .join("\n\n---\n\n");
  copyText(text || "Sem produtos na fila.");
}

function copyWeek() {
  const text = buildWeekPlan()
    .map((day) => {
      const posts = day.items.map((product, index) => `${index + 1}. ${product.copies.telegram}`).join("\n\n");
      return `${day.day.toUpperCase()}\n${posts || "Sem produto"}`;
    })
    .join("\n\n====================\n\n");
  copyText(text || "Sem produtos na agenda.");
}

function downloadTodayPosts() {
  const text = getTodayProducts()
    .map((product, index) => `POST ${index + 1}\n${product.copies.telegram}`)
    .join("\n\n---\n\n");
  downloadFile("posts-hoje.txt", text || "Sem produtos na fila.", "text/plain");
}

function downloadWeekPosts() {
  const text = buildWeekPlan()
    .map((day) => {
      const posts = day.items.map((product, index) => `${index + 1}. ${product.copies.telegram}`).join("\n\n");
      return `${day.day.toUpperCase()}\n${posts || "Sem produto"}`;
    })
    .join("\n\n====================\n\n");
  downloadFile("posts-semana.txt", text || "Sem produtos na agenda.", "text/plain");
}

function exportAutomationData() {
  downloadFile("products.json", JSON.stringify(state, null, 2), "application/json");
}

async function robotRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || data.stderr || "Falha na automação local.");
  }
  return data;
}

async function hydrateServerState() {
  try {
    const data = await robotRequest("/admin/api/state");
    if (Array.isArray(data.products)) {
      state = {
        settings: { ...defaultState.settings, ...(data.settings || {}) },
        products: data.products.map(prepareProduct)
      };
      saveState();
    }
  } catch {
    // File mode keeps using localStorage.
  }
}

async function saveRobotData() {
  try {
    await robotRequest("/admin/api/state", {
      method: "POST",
      body: JSON.stringify(state)
    });
    showToast("Produtos salvos em data/products.json.");
  } catch (error) {
    showToast("Abra pelo start-dashboard.ps1 para salvar no robô.");
  }
}

async function generateRobotAssets() {
  try {
    await saveRobotData();
    await robotRequest("/admin/api/generate", { method: "POST", body: "{}" });
    showToast("Arquivos gerados na pasta out.");
  } catch (error) {
    showToast(error.message);
  }
}

async function sendTelegramNow() {
  try {
    await generateRobotAssets();
    await robotRequest("/admin/api/send-telegram", { method: "POST", body: "{}" });
    showToast("Mensagem enviada para Telegram.");
  } catch (error) {
    showToast("Telegram ainda não configurado.");
  }
}

function copyCatalogText() {
  const text = state.products
    .filter((product) => product.status !== "Pausado")
    .map((product) => `${product.name} - ${formatMoney(product.price)}\n${product.affiliateLink}`)
    .join("\n\n");
  copyText(text || "Sem produtos no catálogo.");
}

function wireEvents() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => setSection(button.dataset.section)));
  $$("[data-section-jump]").forEach((button) => button.addEventListener("click", () => setSection(button.dataset.sectionJump)));

  $("#productForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addProduct({
      name: $("#productName").value.trim(),
      platform: $("#productPlatform").value,
      price: $("#productPrice").value.trim(),
      commission: $("#productCommission").value.trim(),
      category: $("#productCategory").value,
      priority: $("#productPriority").value,
      affiliateLink: $("#productAffiliate").value.trim(),
      image: $("#productImage").value.trim(),
      benefit: $("#productBenefit").value.trim()
    });
    event.target.reset();
    showToast("Produto salvo e textos gerados.");
    renderAll();
  });

  $("#productList").addEventListener("click", handleProductAction);
  $("#queueList").addEventListener("click", handleProductAction);
  $("#searchInput").addEventListener("input", renderProducts);
  $("#statusFilter").addEventListener("change", renderProducts);

  $("#saveSettingsButton").addEventListener("click", () => {
    state.settings.brandName = $("#brandName").value.trim() || defaultState.settings.brandName;
    state.settings.tone = $("#brandTone").value;
    state.settings.call = $("#brandCall").value.trim() || defaultState.settings.call;
    state.products = state.products.map((product) => ({ ...product, copies: generateCopies(product) }));
    saveState();
    showToast("Configuração salva.");
    renderAll();
  });

  $("#exportCsvButton").addEventListener("click", exportCsv);
  $("#exportJsonButton").addEventListener("click", exportJson);
  $("#importJsonButton").addEventListener("click", () => $("#backupInput").click());
  $("#copyQueueButton").addEventListener("click", copyQueue);
  $("#copyWeekButton").addEventListener("click", copyWeek);
  $("#copyCatalogButton").addEventListener("click", copyCatalogText);
  $("#exportCatalogButton").addEventListener("click", exportCatalogHtml);
  $("#exportAutomationButton").addEventListener("click", exportAutomationData);
  $("#downloadTodayButton").addEventListener("click", downloadTodayPosts);
  $("#downloadWeekButton").addEventListener("click", downloadWeekPosts);
  $("#saveRobotButton").addEventListener("click", saveRobotData);
  $("#generateRobotButton").addEventListener("click", generateRobotAssets);
  $("#sendTelegramButton").addEventListener("click", sendTelegramNow);
  $("#buildTodayButton").addEventListener("click", () => {
    setSection("queue");
    showToast("Fila montada com os melhores produtos prontos.");
  });

  $("#loadExampleButton").addEventListener("click", () => {
    $("#bulkInput").value = [
      "Mercado Livre; Fone Bluetooth; 49,90; 3,00; Eletrônicos baratos; Alta; https://mercadolivre.com.br/seu-link; ; bom para usar no dia a dia",
      "Mercado Livre; Organizador de cabos; 12,90; 1,20; Organização; Média; https://mercadolivre.com.br/seu-link; ; deixa carregadores e fios mais arrumados",
      "Shopee; Suporte articulado para celular; 24,90; 2,10; Acessórios para celular; Alta; https://s.shopee.com.br/seu-link; ; ajuda a gravar vídeo e assistir sem segurar"
    ].join("\n");
  });

  $("#importBulkButton").addEventListener("click", () => {
    const lines = $("#bulkInput").value.split("\n").map((line) => line.trim()).filter(Boolean);
    const products = lines
      .map(parseBulkLine)
      .filter((product) => product.name && product.affiliateLink)
      .map(normalizeProduct);

    if (!products.length) {
      showToast("Nenhum produto válido encontrado.");
      return;
    }

    state.products = [...products, ...state.products];
    saveState();
    $("#bulkInput").value = "";
    showToast(`${products.length} produto(s) importado(s).`);
    renderAll();
  });

  $("#clearButton").addEventListener("click", () => {
    if (!confirm("Deseja apagar todos os produtos cadastrados?")) return;
    state.products = [];
    saveState();
    renderAll();
  });

  $("#backupInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const content = await file.text();
    const imported = JSON.parse(content);
    state = imported;
    saveState();
    renderAll();
    showToast("Backup importado.");
  });
}

function parseBulkLine(line) {
  const parts = line.split(";").map((part) => part.trim());
  if (["Shopee", "Mercado Livre", "Magalu", "Amazon", "AliExpress", "Temu"].includes(parts[0])) {
    const [platform, name, price, commission, category, priority, affiliateLink, image, benefit] = parts;
    return { platform, name, price, commission, category, priority, affiliateLink, image, benefit };
  }
  const [name, price, commission, category, priority, affiliateLink, image, benefit] = parts;
  return { platform: "Shopee", name, price, commission, category, priority, affiliateLink, image, benefit };
}

function handleProductAction(event) {
  const copyButton = event.target.closest("[data-copy]");
  const statusButton = event.target.closest("[data-status]");
  const deleteButton = event.target.closest("[data-delete]");

  if (copyButton) {
    const product = state.products.find((item) => item.id === copyButton.dataset.copy);
    copyText(product.copies[copyButton.dataset.copyType]);
  }

  if (statusButton) {
    const product = state.products.find((item) => item.id === statusButton.dataset.status);
    product.status = statusButton.dataset.value;
    product.postedAt = product.status === "Postado" ? new Date().toISOString() : product.postedAt;
    saveState();
    renderAll();
  }

  if (deleteButton) {
    state.products = state.products.filter((item) => item.id !== deleteButton.dataset.delete);
    saveState();
    renderAll();
  }
}

wireEvents();
hydrateServerState().finally(renderAll);
