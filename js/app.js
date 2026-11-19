(() => {
  const cfg = window.ZB_CONFIG;
  const products = window.ZB_PRODUCTS;
  const QUOTE = "Precio por WhatsApp";
  let activeFilter = "camisas";
  let selectedProduct = null;
  let selectedSize = null;
  let selectedColor = null;
  let galleryImages = [];

  const PAGE_SIZE = 9;
  let catalogExpanded = false;
  let promosExpanded = false;
  let catalogRendered = 0;
  let promosRendered = 0;

  const catalogEl = document.getElementById("catalog");
  const catalogMoreEl = document.getElementById("catalogMore");
  const promosCatalogEl = document.getElementById("promos-catalog");
  const promosMoreEl = document.getElementById("promosMore");
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

  const priceLabel = (p) => (p.price == null ? QUOTE : money(p.price));

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
    const rosa = document.getElementById("rosaWa");
    if (rosa) {
      rosa.setAttribute(
        "href",
        waLink("Hola Zona Blue 👋 Quiero ver la línea mujer (Zona Rosa). ¿Qué tienen disponible?")
      );
    }
  }

  const imagesOf = (p) => (p.images && p.images.length ? p.images : [p.image]);

  function filteredProducts() {
    if (activeFilter === "all") return products;
    if (activeFilter === "promo") return products.filter((p) => p.promo);
    return products.filter((p) => p.category === activeFilter);
  }

  function buildProductCard(p, i) {
    const tagClass =
      p.tag && /hot|liquidación|promo|50%/i.test(p.tag) ? "product__tag--hot" : "";
    const tag = p.tag ? `<span class="product__tag ${tagClass}">${p.tag}</span>` : "";
    const old =
      p.oldPrice && p.price != null
        ? `<span class="product__old">${money(p.oldPrice)}</span>`
        : "";
    const img = imagesOf(p)[0];
    const priceClass = p.price == null ? "product__price is-quote" : "product__price";
    return `
    <button type="button" class="product" data-open="${p.id}" style="animation-delay:${i * 35}ms" aria-label="Ver ${p.name}">
      <div class="product__media">
        ${tag}
        <img src="${img}" alt="${p.name}" width="450" height="800" loading="lazy" decoding="async" style="object-position:${p.imagePos || "center"}" />
      </div>
      <div class="product__body">
        <h3 class="product__name">${p.name}</h3>
        <div class="product__prices">
          <span class="${priceClass}">${priceLabel(p)}</span>
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

  function bindCards(container) {
    container.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.open));
    });
    bindTilt(container);
  }

  function appendCards(container, items, offset) {
    if (!items.length) return;
    const frag = document.createElement("div");
    frag.innerHTML = items.map((p, i) => buildProductCard(p, offset + i)).join("");
    bindCards(frag);
    while (frag.firstChild) container.appendChild(frag.firstChild);
  }

  function updateMore(el, total, key, expanded) {
    if (!el) return;
    if (total <= PAGE_SIZE) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    const hiddenCount = total - PAGE_SIZE;
    el.innerHTML = `
      <button type="button" class="btn btn--ghost catalog__more-btn" data-toggle="${key}">
        ${expanded ? "Ver menos" : "Ver más"}
        <span class="catalog__more-count">${expanded ? "−" : "+"}${hiddenCount}</span>
      </button>`;
  }

  function renderCatalog(reset = false) {
    if (reset) {
      catalogExpanded = false;
      catalogRendered = 0;
      catalogEl.innerHTML = "";
    }
    const list = filteredProducts();
    if (!list.length) {
      catalogEl.innerHTML = `<p class="empty">No hay prendas en esta categoría por ahora. Pregúntanos por WhatsApp.</p>`;
      updateMore(catalogMoreEl, 0, "catalog", false);
      return;
    }
    const target = catalogExpanded ? list.length : Math.min(PAGE_SIZE, list.length);
    if (catalogRendered < target) {
      appendCards(catalogEl, list.slice(catalogRendered, target), catalogRendered);
      catalogRendered = target;
    }
    updateMore(catalogMoreEl, list.length, "catalog", catalogExpanded);
  }

  function renderPromos(reset = false) {
    if (!promosCatalogEl) return;
    if (reset) {
      promosExpanded = false;
      promosRendered = 0;
      promosCatalogEl.innerHTML = "";
    }
    const list = products.filter((p) => p.promo);
    if (!list.length) {
      promosCatalogEl.innerHTML = `<p class="empty">No hay promos activas en este momento. ¡Volvemos pronto!</p>`;
      updateMore(promosMoreEl, 0, "promos", false);
      return;
    }
    const target = promosExpanded ? list.length : Math.min(PAGE_SIZE, list.length);
    if (promosRendered < target) {
      appendCards(promosCatalogEl, list.slice(promosRendered, target), promosRendered);
      promosRendered = target;
    }
    updateMore(promosMoreEl, list.length, "promos", promosExpanded);
  }

  function collapseCatalog() {
    Array.from(catalogEl.children).slice(PAGE_SIZE).forEach((node) => node.remove());
    catalogRendered = Math.min(PAGE_SIZE, catalogRendered);
    catalogExpanded = false;
    updateMore(catalogMoreEl, filteredProducts().length, "catalog", false);
    const top = catalogEl.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function collapsePromos() {
    const list = products.filter((p) => p.promo);
    Array.from(promosCatalogEl.children).slice(PAGE_SIZE).forEach((node) => node.remove());
    promosRendered = Math.min(PAGE_SIZE, promosRendered);
    promosExpanded = false;
    updateMore(promosMoreEl, list.length, "promos", false);
    const top = promosCatalogEl.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function paintThumbs(src) {
    document.querySelectorAll("#modalThumbs .modal__thumb").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.src === src);
    });
  }

  function setModalImage(src) {
    const img = document.getElementById("modalImage");
    img.src = src;
    img.style.objectPosition = selectedProduct?.imagePos || "center";
    paintThumbs(src);
  }

  function renderThumbs() {
    const thumbsEl = document.getElementById("modalThumbs");
    const mediaEl = modal.querySelector(".modal__media");
    mediaEl?.classList.toggle("has-gallery", galleryImages.length > 1);
    if (galleryImages.length > 1) {
      thumbsEl.hidden = false;
      thumbsEl.innerHTML = galleryImages
        .map(
          (src, i) =>
            `<button type="button" class="modal__thumb${i === 0 ? " is-active" : ""}" data-src="${src}" aria-label="Ver foto ${i + 1}">
               <img src="${src}" alt="" width="58" height="58" loading="lazy" />
             </button>`
        )
        .join("");
    } else {
      thumbsEl.hidden = true;
      thumbsEl.innerHTML = "";
    }
  }

  function openModal(id) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    selectedProduct = product;
    selectedSize = product.sizes?.[0] || null;
    selectedColor = product.colors?.[0] || null;
    galleryImages = imagesOf(product);

    const mainImg = document.getElementById("modalImage");
    mainImg.alt = product.name;
    setModalImage(galleryImages[0]);
    renderThumbs();

    document.getElementById("modalTitle").textContent = product.name;
    document.getElementById("modalDesc").textContent = product.description;

    const priceEl = document.getElementById("modalPrice");
    priceEl.textContent = priceLabel(product);
    priceEl.classList.toggle("is-quote", product.price == null);

    const oldEl = document.getElementById("modalOld");
    if (product.oldPrice && product.price != null) {
      oldEl.textContent = money(product.oldPrice);
      oldEl.hidden = false;
    } else {
      oldEl.hidden = true;
    }

    const tagEl = document.getElementById("modalTag");
    tagEl.textContent = product.tag || product.category;
    tagEl.style.display = "inline-block";

    document.getElementById("modalSizes").innerHTML = (product.sizes || [])
      .map(
        (s) =>
          `<button type="button" class="option${s === selectedSize ? " is-selected" : ""}" data-size="${s}">${s}</button>`
      )
      .join("");

    document.getElementById("modalColors").innerHTML = (product.colors || [])
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
    document.body.style.overscrollBehavior = "contain";
    modal.querySelector(".modal__sheet").scrollTop = 0;
    modal.querySelector(".modal__sheet").focus({ preventScroll: true });
  }

  function updateModalWa() {
    if (!selectedProduct) return;
    const lines = [
      "Hola Zona Blue 👋 Quiero pedir:",
      `• Producto: ${selectedProduct.name}`,
    ];
    if (selectedSize) lines.push(`• Talla: ${selectedSize}`);
    if (selectedColor) lines.push(`• Color: ${selectedColor}`);
    lines.push(
      selectedProduct.price == null
        ? "• Precio: ¿me confirmas el precio?"
        : `• Precio: ${money(selectedProduct.price)}`
    );
    lines.push("¿Está disponible?");
    const href = waLink(lines.join("\n"));
    document.getElementById("modalWa").href = href;
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.body.style.overscrollBehavior = "";
    selectedProduct = null;
    galleryImages = [];
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
  filtersEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    filtersEl.querySelectorAll(".filter-chip").forEach((chip) => {
      const on = chip === btn;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderCatalog(true);
    if (btn.dataset.filter !== "all") {
      const top = catalogEl.getBoundingClientRect().top + window.scrollY - 80;
      if (catalogEl.getBoundingClientRect().top < 0) window.scrollTo({ top, behavior: "smooth" });
    }
  });

  catalogMoreEl?.addEventListener("click", (e) => {
    if (!e.target.closest("[data-toggle]")) return;
    if (catalogExpanded) {
      collapseCatalog();
      return;
    }
    catalogExpanded = true;
    renderCatalog();
  });

  promosMoreEl?.addEventListener("click", (e) => {
    if (!e.target.closest("[data-toggle]")) return;
    if (promosExpanded) {
      collapsePromos();
      return;
    }
    promosExpanded = true;
    renderPromos();
  });

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-modal]")) closeModal();

    const thumb = e.target.closest(".modal__thumb");
    if (thumb && selectedProduct) {
      setModalImage(thumb.dataset.src);
      return;
    }

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
      const linked = selectedProduct?.colorImages?.[selectedColor];
      if (linked) setModalImage(linked);
      updateModalWa();
    }
  });

  /* Swipe gallery on mobile */
  let touchStartX = null;
  const media = modal.querySelector(".modal__media");
  media?.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  media?.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX == null || galleryImages.length < 2) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 45) return;
      const current = document.getElementById("modalImage").getAttribute("src");
      let idx = galleryImages.indexOf(current);
      if (idx < 0) idx = 0;
      idx = dx < 0 ? (idx + 1) % galleryImages.length : (idx - 1 + galleryImages.length) % galleryImages.length;
      setModalImage(galleryImages[idx]);
    },
    { passive: true }
  );

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    if (galleryImages.length > 1 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const current = document.getElementById("modalImage").getAttribute("src");
      let idx = galleryImages.indexOf(current);
      if (idx < 0) idx = 0;
      idx = e.key === "ArrowRight" ? (idx + 1) % galleryImages.length : (idx - 1 + galleryImages.length) % galleryImages.length;
      setModalImage(galleryImages[idx]);
    }
  });

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.dataset.copy));
  });

  navToggle?.addEventListener("click", () => {
    const open = !navDrawer.classList.contains("is-open");
    navDrawer.classList.toggle("is-open", open);
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  });

  navDrawer?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      navDrawer.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    });
  });

  /* Count-up stats */
  const countEls = Array.from(document.querySelectorAll(".stats__value[data-count]"));
  if (countEls.length) {
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.getAttribute("data-count") || "0", 10);
          const dur = 1600;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(target * eased));
            if (p < 1) {
              requestAnimationFrame(tick);
            } else {
              el.textContent = String(target);
            }
          };
          requestAnimationFrame(tick);
          countIO.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    countEls.forEach((el) => countIO.observe(el));
  }

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
  renderCatalog(true);
  renderPromos(true);
})();
