(() => {
  const AUTH_KEY = "zb_admin_auth";
  const DATA_KEY = "zb_admin_products";
  const CAT_KEY = "zb_admin_categories";
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "zonablue";

  const authScreen = document.getElementById("adminAuth");
  const panel = document.getElementById("adminPanel");
  const loginForm = document.getElementById("adminLoginForm");
  const adminError = document.getElementById("adminError");
  const statsEl = document.getElementById("adminStats");
  const listEl = document.getElementById("adminList");
  const editorForm = document.getElementById("adminEditorForm");
  const editorTitle = document.getElementById("adminEditorTitle");
  const logoutBtn = document.getElementById("adminLogout");
  const saveBtn = document.getElementById("adminSave");
  const cancelBtn = document.getElementById("adminCancel");
  const newBtn = document.getElementById("adminNew");
  const catEl = document.getElementById("adminCategories");

  const getProducts = () => {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return window.ZB_PRODUCTS || [];
  };

  const saveProducts = (list) => localStorage.setItem(DATA_KEY, JSON.stringify(list));

  const isAuthed = () => localStorage.getItem(AUTH_KEY) === "1";
  const doLogin = (user, pass) => user === ADMIN_USER && pass === ADMIN_PASS;
  const doLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    panel.hidden = true;
    authScreen.hidden = false;
    editorForm.reset();
    editorForm.hidden = true;
  };

  const num = (v) => {
    const n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const splitList = (v) =>
    String(v || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const slugify = (s) =>
    String(s || "producto")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "producto";

  function productFromForm() {
    const id = document.getElementById("f-id").value || slugify(document.getElementById("f-name").value);
    const colors = splitList(document.getElementById("f-colors").value);
    const sizes = splitList(document.getElementById("f-sizes").value);
    const details = splitList(document.getElementById("f-details").value);
    const images = document.getElementById("f-image").value
      ? [document.getElementById("f-image").value]
      : [];
    return {
      id,
      name: document.getElementById("f-name").value.trim(),
      category: document.getElementById("f-category").value.trim(),
      price: num(document.getElementById("f-price").value),
      oldPrice: num(document.getElementById("f-oldPrice").value),
      promo: document.getElementById("f-promo").checked,
      tag: document.getElementById("f-tag").value.trim() || null,
      colors: colors.length ? colors : ["Unico"],
      sizes: sizes.length ? sizes : ["U"],
      description: document.getElementById("f-desc").value.trim(),
      details: details.length ? details : ["Novedad"],
      images: images.length ? images : ["assets/products/canva/p6-1.jpg"],
      imagePos: document.getElementById("f-imagePos").value.trim() || "center 38%",
    };
  }

  function fillEditor(product) {
    document.getElementById("f-id").value = product.id || "";
    document.getElementById("f-name").value = product.name || "";
    document.getElementById("f-category").value = product.category || "";
    document.getElementById("f-price").value = product.price == null ? "" : String(product.price);
    document.getElementById("f-oldPrice").value = product.oldPrice == null ? "" : String(product.oldPrice);
    document.getElementById("f-tag").value = product.tag || "";
    document.getElementById("f-image").value = (product.images && product.images[0]) || "";
    document.getElementById("f-imagePos").value = product.imagePos || "center 38%";
    document.getElementById("f-colors").value = (product.colors || []).join(", ");
    document.getElementById("f-sizes").value = (product.sizes || []).join(", ");
    document.getElementById("f-desc").value = product.description || "";
    document.getElementById("f-details").value = (product.details || []).join(", ");
    document.getElementById("f-promo").checked = !!product.promo;
  }

  function renderList() {
    const list = getProducts();
    if (!list.length) {
      listEl.innerHTML = '<p class="admin-empty">No hay productos todavia.</p>';
      return;
    }
    listEl.innerHTML = list
      .map((p) => {
        const promo = p.promo ? `<span class="admin-badge">PROMO</span>` : "";
        const cat = p.category || "";
        const old = p.oldPrice ? `<span class="admin-old">Antes: $${p.oldPrice}</span>` : "";
        const img = p.images && p.images[0] ? p.images[0] : "";
        return `
          <div class="admin-card" data-id="${p.id}">
            <button type="button" class="btn btn--small admin-card-del" data-action="del" data-id="${p.id}">Borrar</button>
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

  function renderStats() {
    const list = getProducts();
    const promos = list.filter((p) => p.promo).length;
    const cats = new Set(list.map((p) => p.category).filter(Boolean));
    statsEl.innerHTML = `
      <div class="admin-stat"><span class="admin-stat-num">${list.length}</span><span class="admin-stat-label">Productos</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${promos}</span><span class="admin-stat-label">En promocion</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${cats.size}</span><span class="admin-stat-label">Categorias</span></div>`;
  }

  function refreshAll() {
    renderStats();
    renderList();
  }

  function showPanel() {
    authScreen.hidden = true;
    panel.hidden = false;
    refreshAll();
  }

  function showAuth() {
    panel.hidden = true;
    authScreen.hidden = false;
  }

  function boot() {
    if (isAuthed()) showPanel();
    else showAuth();
    refreshAll();

    // Categorías: desde productos + las guardadas en storage
    const storedCats = JSON.parse(localStorage.getItem(CAT_KEY) || "[]");
    const productCats = [...new Set(getProducts().map((p) => p.category).filter(Boolean))];
    const allCats = [...new Set([...storedCats, ...productCats])];

    const catEl = document.getElementById("adminCategories");
    if (catEl) {
      catEl.innerHTML = allCats.map((c) => `<option value="${c}"></option>`).join("");
    }

    // Botón agregar categoría
    const addCategoryBtn = document.getElementById("addCategory");
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener("click", () => {
        const val = document.getElementById("newCategory").value.trim();
        if (!val) return;
        const cats = JSON.parse(localStorage.getItem(CAT_KEY) || "[]");
        if (!cats.includes(val)) cats.push(val);
        localStorage.setItem(CAT_KEY, JSON.stringify(cats));
        // Actualizar DOM al instante
        if (catEl) {
          const opt = document.createElement("option");
          opt.value = val;
          opt.textContent = val;
          catEl.appendChild(opt);
        }
        document.getElementById("newCategory").value = "";
      });
    }
  }

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

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const list = getProducts();
    if (btn.dataset.action === "edit") {
      const p = list.find((x) => x.id === id);
      if (!p) return;
      fillEditor(p);
      editorTitle.textContent = `Editando: ${p.name}`;
      editorForm.hidden = false;
    } else if (btn.dataset.action === "del") {
      saveProducts(list.filter((x) => x.id !== id));
      refreshAll();
    }
  });

  saveBtn.addEventListener("click", () => {
    const product = productFromForm();
    if (!product.name) return;
    const list = getProducts();
    const idx = list.findIndex((x) => x.id === product.id);
    if (idx >= 0) list[idx] = product;
    else list.push(product);
    saveProducts(list);
    refreshAll();
    editorForm.hidden = true;
  });

  cancelBtn.addEventListener("click", () => {
    editorForm.hidden = true;
  });

  newBtn.addEventListener("click", () => {
    fillEditor({
      id: slugify("admin-" + Date.now().toString(36)),
      name: "",
      category: "",
      price: null,
      oldPrice: null,
      promo: false,
      tag: "",
      colors: ["Unico"],
      sizes: ["U"],
      description: "",
      details: [],
      images: ["assets/products/canva/p6-1.jpg"],
      imagePos: "center 38%",
    });
    editorTitle.textContent = "Nuevo producto";
    editorForm.hidden = false;
  });

  document.addEventListener("DOMContentLoaded", boot);
})();
