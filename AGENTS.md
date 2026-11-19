# Instrucciones del proyecto — Zona Blue

## Git / despliegue

- **Por defecto: todo cambio completado se commitea y se sube** a `origin/main`.
- **Excepción:** si el usuario pide implementar algo "para probar/revisar" y dice
  explícitamente que **se pueda revertir**, NO hacer push. Dejar el cambio local
  (sin commit o con commit local) hasta que el usuario confirme.
- Si hay duda sobre si un cambio entra en la excepción, preguntar antes de subir.
- Mensajes de commit descriptivos (en español).

## Contexto rápido

- Sitio estático (HTML/CSS/JS) de streetwear — Zona Blue.
- Servidor local: `http://localhost:5500`.
- Productos: `js/products.js` · imágenes: `assets/products/`.
- Script de tomas de producto: `scripts/product_shots.py` (Pillow).
