(() => {
  const AUTH_KEY = "zb_admin_auth";
  const DATA_KEY = "zb_admin_products";
  const CAT_KEY = "zb_admin_categories";
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "zonablue";

  // Elementos del DOM
  const authScreen = document.getElementById("adminAuth");
  const panel = document.getElementById("adminPanel");
  const loginForm = document.getElementById("adminLoginForm");
  const adminError = document.getElementById("adminError");
  const statsEl = document.getElementById("adminStats");
  const adminSection = document.getElementById("adminSection");
  const adminList = document.getElementById("adminList");
  const productModal = document.getElementById("productModal");
  const productForm = document.getElementById("productForm");
  const modalTitle = document.getElementById("modalTitle");
  const formId = document.getElementById("formId");
  const formName = document.getElementById("formName");
  const formCategory = document.getElementById("formCategory");
  const formPrice = document.getElementById("formPrice");
  const formOldPrice = document.getElementById("formOldPrice");
  const formTag = document.getElementById("formTag");
  const formColors = document.getElementById("formColors");
  const formSizes = document.getElementById("formSizes");
  const formDesc = document.getElementById("formDesc");
  const formDetails = document.getElementById("formDetails");
  const formPromo = document.getElementById("formPromo");
  const formImage = document.getElementById("formImage");
  const formImagePos = document.getElementById("formImagePos");
  const modalClose = productModal.querySelector("[data-modal-close]");
  const modalBackdrop = productModal.querySelector("[data-modal-close]"); // uso mismo elemento

  // --- Auth ---
  const isAuthed = () => localStorage.getItem(AUTH_KEY) === "1";
  const doLogin = (user, pass) => user === ADMIN_USER && pass === ADMIN_PASS;
  const doLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    panel.hidden = true;
    authScreen.hidden = false;
    closeModal();
    resetForm();
  };

  // --- Modal ---
  function openModal( product = null ) {
    productModal.hidden = false;
    productModal.style.display = "block";
    modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";

    if ( product ) {
      // Modo editar
      modalTitle.textContent = `Editando: ${product.name}`;
      formId.value = product.id || "";
      formName.value = product.name || "";
      formCategory.value = product.category || "";
      formPrice.value = product.price == null ? "" : String(product.price);
      formOldPrice.value = product.oldPrice == null ? "" : String(product.oldPrice);
      formTag.value = product.tag || "";
      formColors.value = (product.colors || []).join(", ");
      formSizes.value = (product.sizes || []).join(", ");
      formDesc.value = product.description || "";
      formDetails.value = (product.details || []).join(", ");
      formPromo.checked = !!product.promo;
      formImage.value = (product.images && product.images[0]) || "";
      formImagePos.value = product.imagePos || "center 38%";
    } else {
      // Modo nuevo
      modalTitle.textContent = "Nuevo producto";
      formId.value = "";
      formName.value = "";
      formCategory.value = "";
      formPrice.value = "";
      formOldPrice.value = "";
      formTag.value = "";
      formColors.value = "";
      formSizes.value = "";
      formDesc.value = "";
      formDetails.value = "";
      formPromo.checked = false;
      formImage.value = "";
      formImagePos.value = "center 38%";
    }

    // Llenar categorías en el select
    const allCats = getAllCategories();
    formCategory.innerHTML = allCats.map(c => `<option value="${c}">${c}</option>`).join("");

    productModal.style.display = "block";
    modalBackdrop.hidden = false;
  }

  function closeModal() {
    productModal.hidden = true;
    productModal.style.display = "none";
    modalBackdrop.hidden = true;
    document.body.style.overflow = "";
    resetForm();
  }

  function resetForm() {
    formId.value = "";
    productForm.reset();
    formImagePos.value = "center 38%";
    // ReLlenar categorías vacías
    const catEl = document.getElementById("formCategory");
    if (catEl) {
      const allCats = getAllCategories();
      catEl.innerHTML = allCats.map(c => `<option value="${c}"></option>`).join("");
    }
  }

  // --- Helper: obtener categorías (de products + storage) ---
  function getAllCategories() {
    const storedCats = JSON.parse(localStorage.getItem(CAT_KEY) || "[]");
    const productCats = [...new Set(getProducts().map((p) => p.category).filter(Boolean))];
    return [...new Set([...storedCats, ...productCats])];
  }

  // --- Producto from form ---
  function productFromForm() {
    const id = formId.value || slugify(formName.value);
    const colors = formColors.value.split(","").map(s => s.trim()).filter(Boolean) || ["Unico"];
    const sizes = formSizes.value.split(","").map(s => s.trim()).filter(Boolean) || ["U"];
    const details = formDetails.value.split(","").map(s => s.trim()).filter(Boolean) || ["Novedad"];
    const images = formImage.value ? [formImage.value] : ["assets/products/canva/p6-1.jpg"];
    return {
      id,
      name: formName.value.trim(),
      category: formCategory.value.trim(),
      price: formPrice.value !== "" ? Number(formPrice.value) : null,
      oldPrice: formOldPrice.value !== "" ? Number(formOldPrice.value) : null,
      promo: formPromo.checked,
      tag: formTag.value.trim() || null,
      colors: colors.length ? colors : ["Unico"],
      sizes: sizes.length ? sizes : ["U"],
      description: formDesc.value.trim(),
      details: details.length ? details : ["Novedad"],
      images: images.length ? images : ["assets/products/canva/p6-1.jpg"],
      imagePos: formImagePos.value || "center 38%",
    };
  }

  // --- renderList ---
  function renderList() {
    const list = getProducts();
    if (!list.length) {
      adminList.innerHTML = '<p class="admin-empty">No hay productos todavia.</p>';
      return;
    }
    adminList.innerHTML = list
      .map((p) => {
        const promo = p.promo ? `<span class="admin-badge">PROMO</span>` : "";
        const cat = p.category || "";
        const old = p.oldPrice ? `<span class="admin-old">Antes: $${p.oldPrice}</span>` : "";
        const img = p.images && p.images[0] ? p.images[0] : "";
        return `
          <div class="admin-card" data-id="${p.id}">
            <button type="button" class="btn btn--small admin-card-edit" data-action="edit" data-id="${p.id}">Editar</button>
            <div class="admin-card-media">
              <img src="${img}" alt="${p.name}" loading="lazy" />
              ${promo}
            </div>
            <div class="admin-card-body">
              <strong>${p.name}</strong>
              <span>${cat} · ${p.price == null ? "Precio por WhatsApp" : "$" + p.price} ${promo}</span>
              ${old}
            </div>
          </div>`;
      })
      .join("");
  }

  // --- Stats ---
  function renderStats() {
    const list = getProducts();
    const promos = list.filter((p) => p.promo).length;
    const cats = new Set(list.map((p) => p.category).filter(Boolean));
    statsEl.innerHTML = `
      <div class="admin-stat"><span class="admin-stat-num">${list.length}</span><span class="admin-stat-label">Productos</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${promos}</span><span class="admin-stat-label">En promocion</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${cats.size}</span><span class="admin-stat-label">Categorias</span></div>`;
  }

  // --- Refresh ---
  function refreshAll() {
    renderStats();
    renderList();
    // Actualizar select en modal si está abierto
    if (!productModal.hidden) {
      const allCats = getAllCategories();
      formCategory.innerHTML = allCats.map(c => `<option value="${c}"></option>`).join("");
    }
  }

  // --- Boot ---
  function showPanel() {
    authScreen.hidden = true;
    panel.hidden = false;
    refreshAll();
  }

  function showAuth() {
    panel.hidden = true;
    authScreen.hidden = false;
    closeModal();
  }

  function boot() {
    if (isAuthed()) showPanel();
    else showAuth();

    // Eventos
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = document.getElementById("adminUser").value.trim();
      const pass = document.getElementById("adminPass").value;
      if (!doLogin(user, pass)) {
        adminError.hidden = false;
        return;
      }
      localStorage.setItem(AUTH_KEY, "1");
      showPanel();
    });

    logoutBtn.addEventListener("click", () => {
      doLogout();
      location.reload();
    });

    modalClose.addEventListener("click", closeModal);
    productModal.addEventListener("click", (e) => {
      if (e.target === productModal) closeModal();
    });

    // Form submit
    productForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const product = productFromForm();
      if (!product.name) return;
      const list = getProducts();
      const idx = list.findIndex((x) => x.id === product.id);
      if (idx >= 0) list[idx] = product;
      else list.push(product);
      saveProducts(list);
      refreshAll();
      closeModal();
    });

    // Inicial
    if (isAuthed()) showPanel();
    else showAuth();

    // Cargar categorías iniciales
    const allCats = getAllCategories();
    const catEl = document.getElementById("formCategory");
    if (catEl) catEl.innerHTML = allCats.map(c => `<option value="${c}"></option>`).join("");
    const catEl2 = document.getElementById("adminCategories");
    if (catEl2) catEl2.innerHTML = allCats.map(c => `<option value="${c}"></option>`).join("");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();