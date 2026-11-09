(() => {
  const cfg = window.ZB_CONFIG;
  const products = window.ZB_PRODUCTS;
  let activeFilter = "all";
  let selectedProduct = null;
  let selectedSize = null;
  let selectedColor = null;

  const catalogEl = document.getElementById("catalog");
  const promosCatalogEl = document.getElementById("promos-catalog");
  const filtersEl = document.getElementById("filters");
  const modal = document.getElementById("productModal");
  const toast = document.getElementById("toast");
  const navToggle = document.getElementById("navToggle");
  const navDrawer = document.getElementById("navDrawer");

  const money = (n) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);

  const waLink = (text) => {
    const msg = encodeURIComponent(text);
    return `https://wa.me/${cfg.whatsapp}?text=${msg}`;
  };

  const defaultWaText =
    "Hola Zona Blue 👋 Vi el catálogo y quiero más info / hacer un pedido.";

  function setWaHrefs() {
    const href = waLink(defaultWaText);
    ["waMain", "fabWa", "heroWa"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("href", href);
    });
  }

  function isPromo(p) {
    return Boolean(p.oldPrice && p.oldPrice > p.price) || Boolean(p.tag);
  }

  function filteredProducts() {
    if (activeFilter === "all") return products;
    if (activeFilter === "promo") return products.filter(isPromo);
    return products.filter((p) => p.category === activeFilter);
  }

  function buildProductCard(p, i) {
    const tagClass =
      p.tag && /hot|liquidación|50%/i.test(p.tag) ? "product__tag--hot" : "";
    const tag = p.tag ? `<span class="product__tag ${tagClass}">${p.tag}</span>` : "";
    const old = p.oldPrice
      ? `<span class="product__old">${money(p.oldPrice)}</span>`
      : "";
    return `
    <button type="button" class="product" data-open="${p.id}" style="animation-delay:${i * 40}ms" aria-label="Ver ${p.name}">
      <div class="product__media">
        ${tag}
        <img src="${p.image}" alt="" loading="lazy" style="object-position:${p.imagePos || "center"}" />
      </div>
      <div class="product__body">
        <h3 class="product__name">${p.name}</h3>
        <div class="product__prices">
          <span class="product__price">${money(p.price)}</span>
          ${old}
        </div>
        <span class="product__cta">Ver detalle</span>
      </div>
    </button>`;
  }

  function bindTilt(container) {
    if (window.matchMedia("(hover: none)").matches) return; // skip touch devices
    container.querySelectorAll(".product").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1 to 1
        const y = ((e.clientY - r.top)  / r.height - 0.5) * -2; // -1 to 1
        card.style.transform = `perspective(700px) rotateY(${x * 7}deg) rotateX(${y * 5}deg) scale(1.03)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  function renderCatalog() {
    const list = filteredProducts();
    if (!list.length) {
      catalogEl.innerHTML = `<p class="empty">No hay prendas en esta categoría por ahora.</p>`;
      return;
    }
    catalogEl.innerHTML = list.map((p, i) => buildProductCard(p, i)).join("");
    catalogEl.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.open));
    });
    bindTilt(catalogEl);
  }

  function renderPromos() {
    if (!promosCatalogEl) return;
    const list = products.filter(isPromo);
    if (!list.length) {
      promosCatalogEl.innerHTML = `<p class="empty">No hay promos activas en este momento. ¡Volvemos pronto!</p>`;
      return;
    }
    promosCatalogEl.innerHTML = list.map((p, i) => buildProductCard(p, i)).join("");
    promosCatalogEl.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.open));
    });
    bindTilt(promosCatalogEl);
  }


  function openModal(id) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    selectedProduct = product;
    selectedSize = product.sizes[0];
    selectedColor = product.colors[0];

    document.getElementById("modalImage").src = product.image;
    document.getElementById("modalImage").alt = product.name;
    document.getElementById("modalImage").style.objectPosition =
      product.imagePos || "center";
    document.getElementById("modalTitle").textContent = product.name;
    document.getElementById("modalDesc").textContent = product.description;
    document.getElementById("modalPrice").textContent = money(product.price);

    const oldEl = document.getElementById("modalOld");
    if (product.oldPrice) {
      oldEl.textContent = money(product.oldPrice);
      oldEl.hidden = false;
    } else {
      oldEl.hidden = true;
    }

    const tagEl = document.getElementById("modalTag");
    tagEl.textContent = product.tag || product.category;
    tagEl.style.display = "inline-block";

    document.getElementById("modalSizes").innerHTML = product.sizes
      .map(
        (s) =>
          `<button type="button" class="option${s === selectedSize ? " is-selected" : ""}" data-size="${s}">${s}</button>`
      )
      .join("");

    document.getElementById("modalColors").innerHTML = product.colors
      .map(
        (c) =>
          `<button type="button" class="option${c === selectedColor ? " is-selected" : ""}" data-color="${c}">${c}</button>`
      )
      .join("");

    document.getElementById("modalDetails").innerHTML = (product.details || [])
      .map((d) => `<li>${d}</li>`)
      .join("");

    updateModalWa();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function updateModalWa() {
    if (!selectedProduct) return;
    const text = `Hola Zona Blue 👋 Quiero pedir:
• Producto: ${selectedProduct.name}
• Talla: ${selectedSize}
• Color: ${selectedColor}
• Precio: ${money(selectedProduct.price)}
¿Está disponible?`;
    document.getElementById("modalWa").href = waLink(text);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    selectedProduct = null;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-show"), 1800);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Copiado ✓");
    } catch {
      showToast("No se pudo copiar");
    }
  }

  /* Events */
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    filtersEl.querySelectorAll(".filter-chip").forEach((chip) => {
      const on = chip === btn;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderCatalog();
  });

  catalogEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    openModal(btn.dataset.open);
  });

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-modal]")) closeModal();

    const sizeBtn = e.target.closest("[data-size]");
    if (sizeBtn) {
      selectedSize = sizeBtn.dataset.size;
      modal.querySelectorAll("[data-size]").forEach((b) =>
        b.classList.toggle("is-selected", b === sizeBtn)
      );
      updateModalWa();
    }

    const colorBtn = e.target.closest("[data-color]");
    if (colorBtn) {
      selectedColor = colorBtn.dataset.color;
      modal.querySelectorAll("[data-color]").forEach((b) =>
        b.classList.toggle("is-selected", b === colorBtn)
      );
      updateModalWa();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.dataset.copy));
  });

  navToggle.addEventListener("click", () => {
    const open = !navDrawer.classList.contains("is-open");
    navDrawer.classList.toggle("is-open", open);
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navDrawer.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      navDrawer.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* Reveal on scroll */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* Sync config into DOM */
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("contactPhone").textContent = cfg.whatsappDisplay;
  document.getElementById("nequiValue").textContent = cfg.payments.nequi;
  document.getElementById("nuValue").textContent = cfg.payments.nu;
  document.getElementById("nequiKeyValue").textContent = cfg.payments.nequiKey;
  document.getElementById("payHolder").textContent = cfg.payments.holder;

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    if (btn.dataset.copy === "3106598295") btn.dataset.copy = cfg.payments.nequi;
    if (btn.dataset.copy === "1014991618") btn.dataset.copy = cfg.payments.nu;
    if (btn.dataset.copy === "@3106598295") btn.dataset.copy = cfg.payments.nequiKey;
  });

  setWaHrefs();
  renderCatalog();
  renderPromos();
})();
