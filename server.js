// server.js
// App de pedidos + servidor en un SOLO archivo (Node.js nativo).
// Ejecutar: node server.js (requiere Node 18+)
const http = require('http');
const { parse } = require('url');
const PORT = process.env.PORT || 3000;
// "Base de datos" en memoria (simple para clase)
const MENU = [
  { id: 1, nombre: 'Hamburguesa Clásica', precio: 4500 },
  { id: 2, nombre: 'Pizza Muzza (porción)', precio: 3200 },
  { id: 3, nombre: 'Empanada de Carne', precio: 1200 },
  { id: 4, nombre: 'Ensalada César', precio: 3800 },
  { id: 5, nombre: 'Gaseosa 500ml', precio: 1500 },
];
const ORDERS = []; // acá guardamos pedidos recibidos (solo memoria)
// HTML incrustado (SPA muy simple)
const HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pedidos de Comida - Demo</title>
  <style>
  :root { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
  body { margin: 0; background: #f6f7fb; color: #1f2937; }
  .app { max-width: 900px; margin: 32px auto; padding: 0 16px; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  h1 { font-size: 24px; margin: 0; }
  .grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; }
  .card { background: white; border-radius: 14px; padding: 16px; box-shadow: 0 6px 20px rgba(0,0,0,0.06); }
  .menu-item { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid #eef0f4; }
  .menu-item:last-child { border-bottom: none; }
  .precio { font-weight: 600; }
  .qty { width: 64px; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 10px; text-align: center; }
  button { cursor: pointer; border: none; background: #111827; color: white; padding: 12px 14px; border-radius: 12px; font-weight: 600; }
  button.secondary { background: #e5e7eb; color: #111827; }
  .cart-item { display: grid; grid-template-columns: 1fr auto auto auto; gap: 8px; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
  .cart-item:last-child { border-bottom: none; }
  .total { display: flex; justify-content: space-between; align-items: center; font-size: 18px; margin-top: 8px; padding-top: 8px; border-top: 2px solid #f3f4f6; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .input { flex: 1; min-width: 180px; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 12px; }
  small { color: #6b7280; }
  .success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 10px 12px; border-radius: 10px; }
  .error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 10px; }
  .footer-note { color: #6b7280; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="app">
  <header>
  <h1> Pedidos de Comida (Demo)</h1>
  <small>Servidor local • <span id="server-state">conectando…</span></small>
  </header>
  <div class="grid">
  <section class="card">
  <h2>Menú</h2>
  <div id="menu"></div>
  </section>
  <aside class="card">
  <h2>Tu pedido</h2>
  <div id="cart"></div>
  <div class="row" style="margin-top:12px">
  <input id="cliente" class="input" placeholder="Nombre del cliente" />
  <input id="direccion" class="input" placeholder="Dirección de entrega" />
  </div>
  <div class="total">
  <strong>Total</strong> 
<div id="total">$0</div>
  </div>
  <div class="row" style="margin-top:10px">
  <button id="btn-enviar">Enviar pedido</button>
  <button id="btn-vaciar" class="secondary">Vaciar</button>
  </div>
  <div id="msg" style="margin-top:10px"></div>
  <p class="footer-note">Consejo: cambia cantidades con +/– y prueba enviar.</p>
  </aside>
  </div>
  </div>
  <script>
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const state = {
  menu: [],
  cart: {} // id -> { id, nombre, precio, qty }
  };
  const fmt = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  function renderMenu(){
  const cont = $('#menu');
  cont.innerHTML = '';
  state.menu.forEach(item => {
  const row = document.createElement('div');
  row.className = 'menu-item';
  row.innerHTML = \`
  <div>
  <strong>\${item.nombre}</strong><br/>
  <small>\${fmt(item.precio)}</small>
  </div>
  <input type="number" min="0" value="\${state.cart[item.id]?.qty || 0}" class="qty" data-id="\${item.id}">
  <button data-id="\${item.id}">Agregar</button>
  \`;
  cont.appendChild(row);
  });
  // Eventos
  // Solución: se quita { once: true } para que el listener de 'Agregar' funcione siempre.
  cont.addEventListener('click', (e) => { 
  if (e.target.tagName === 'BUTTON') {
  const id = Number(e.target.dataset.id);
  const qtyInput = cont.querySelector('.qty[data-id="'+id+'"]');
  const qty = Math.max(0, Number(qtyInput.value||0));
  if(qty === 0){ delete state.cart[id]; }
  else {
  const prod = state.menu.find(x => x.id === id);
  state.cart[id] = { ...prod, qty };
  }
  renderCart();
  }
  }); // NOTA: No se usa { once: true } aquí.
  }
  function renderCart(){
  const cont = $('#cart');
  cont.innerHTML = '';
  const items = Object.values(state.cart);
  if(items.length === 0){
  cont.innerHTML = '<small>Tu carrito está vacío.</small>';
  $('#total').textContent = fmt(0);
  return;
  }
  items.forEach(it => {
  const row = document.createElement('div');
  row.className = 'cart-item';
  row.innerHTML = \`
  <div>\${it.nombre}</div>
  <div>x</div>
  <div>
  <button class="secondary" data-op="dec" data-id="\${it.id}">–</button>
  <span style="display:inline-block; width:28px; text-align:center">\${it.qty}</span>
  <button class="" data-op="inc" data-id="\${it.id}">+</button>
  </div>
  <div>\${fmt(it.precio * it.qty)}</div>
  \`;
  cont.appendChild(row);
  });
  // Esto sí usa { once: true } porque renderCart se llama cada vez que cambia el carrito,
  // y reasigna el listener para los botones +/-.
  cont.addEventListener('click', (e) => {
  const op = e.target.dataset.op;
  const id = Number(e.target.dataset.id);
  if(!op) return;
  const item = state.cart[id];
  if(!item) return;
  if(op === 'inc') item.qty++;
  if(op === 'dec') item.qty = Math.max(0, item.qty - 1);
  if(item.qty === 0) delete state.cart[id];
  renderCart();
  syncQtyInputs();
  }, { once:true });
  const total = items.reduce((acc, it) => acc + it.precio * it.qty, 0);
  $('#total').textContent = fmt(total);
  }
  function syncQtyInputs(){
  $$('#menu .qty').forEach(inp => {
  const id = Number(inp.dataset.id);
  inp.value = state.cart[id]?.qty || 0;
  });
  }
  async function loadMenu(){
  try{
  const res = await fetch('/api/menu');
  const data = await res.json();
  state.menu = data;
  renderMenu();
  $('#server-state').textContent = 'ok';
  }catch(err){
  $('#server-state').textContent = 'error';
  }
  }
  async function enviarPedido(){
  const items = Object.values(state.cart);
  const cliente = $('#cliente').value.trim();
  const direccion = $('#direccion').value.trim();
  if(items.length === 0){
  showMsg('El carrito está vacío.', true); return;
  }
  if(!cliente || !direccion){
  showMsg('Completá nombre y dirección.', true); return;
  }
  try{
  const res = await fetch('/api/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cliente, direccion, items })
  });
  const data = await res.json();
  if(res.ok){
  showMsg(' Pedido enviado. Nº ' + data.orderId + ' • Total ' + fmt(data.total));
  state.cart = {};
  renderCart();
  syncQtyInputs();
  $('#cliente').value = '';
  $('#direccion').value = '';
  }else{
  showMsg('Error: ' + (data.message || 'intenta de nuevo'), true);
  }
  }catch(err){
  showMsg('Error de conexión.', true);
  }
  }
  function showMsg(text, isError=false){
  const box = $('#msg');
  box.className = isError ? 'error' : 'success';
  box.textContent = text;
  }
  $('#btn-enviar').addEventListener('click', enviarPedido);
  $('#btn-vaciar').addEventListener('click', () => { state.cart = {}; renderCart(); syncQtyInputs(); });
  loadMenu();
  </script>
</body>
</html>`;
// Utilidad para leer JSON del body
function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) { // 1MB guardrail
        req.connection.destroy();
        reject(new Error('Payload muy grande'));
      }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
  });
}
// Ruteo minimalista
const server = http.createServer(async (req, res) => {
  const { pathname } = parse(req.url, true);
  // Página principal
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }
  // API: menú
  if (req.method === 'GET' && pathname === '/api/menu') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(MENU));
  }
  // API: crear pedido
  if (req.method === 'POST' && pathname === '/api/order') {
    try {
      const body = await readJson(req);
      const { cliente, direccion, items } = body;
      if (!cliente || !direccion || !Array.isArray(items) || items.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok:false, message: 'Datos incompletos' }));
      }
      // Calcular total con seguridad (usando precios del servidor)
      let total = 0;
      const detalle = items.map(it => {
        const prod = MENU.find(p => p.id === Number(it.id));
        const qty = Math.max(0, Number(it.qty || 0));
        const precio = prod ? prod.precio : 0;
        const subtotal = precio * qty;
        total += subtotal;
        return { id: Number(it.id), nombre: prod?.nombre || 'Desconocido', qty, precio, subtotal };
      });
      const orderId = ORDERS.length + 1;
      const order = {
        id: orderId,
        cliente,
        direccion,
        detalle,
        total,
        fecha: new Date().toISOString()
      };
      ORDERS.push(order);
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ ok:true, orderId, total, message: 'Pedido recibido' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ ok:false, message: err.message || 'Error' }));
    }
  }
  // API: listar pedidos (útil para debug en clase)
  if (req.method === 'GET' && pathname === '/api/orders') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(ORDERS));
  }
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok:false, message: 'No encontrado' }));
});
// Iniciar servidor
server.listen(PORT, () => {
  console.log('Servidor escuchando en http://localhost:' + PORT);
});