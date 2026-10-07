const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const mongoStore = require('./mongo-store');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const CUSTOM_MENU_FILE = path.join(__dirname, 'data', 'custom-menu.json');
const MENU_PRICES_FILE = path.join(__dirname, 'data', 'menu-prices.json');
const DELETED_MENU_FILE = path.join(__dirname, 'data', 'deleted-menu.json');
const SYSTEM_THEME_FILE = path.join(__dirname, 'data', 'system-theme.json');
const EXPENSES_FILE = path.join(__dirname, 'data', 'expenses.json');
const MONTHLY_ACCOUNT_FILE = path.join(__dirname, 'data', 'monthly-account.json');
const SYSTEM_AUTH_FILE = path.join(__dirname, 'data', 'system-auth.json');
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'zar123@@';
const PROTECTED_SECTION_PASSWORD = process.env.PROTECTED_SECTION_PASSWORD || 'zar4321@@';

const DEFAULT_SYSTEM_THEME = { primary: '#0f766e', accent: '#2563eb' };

function readManagerPasswordRecord() {
  try {
    const value = JSON.parse(fs.readFileSync(SYSTEM_AUTH_FILE, 'utf8'));
    if (value?.salt && value?.hash) return value;
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read system login settings:', error.message);
  }
  return null;
}

function verifyManagerLoginPassword(password) {
  const candidate = String(password || '');
  const record = readManagerPasswordRecord();
  if (!record) return candidate === MANAGER_PASSWORD;

  try {
    const expected = Buffer.from(record.hash, 'hex');
    const actual = crypto.scryptSync(candidate, record.salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch (_) {
    return false;
  }
}

function writeManagerLoginPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const record = {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString('hex'),
    updatedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(SYSTEM_AUTH_FILE), { recursive: true });
  const temporaryFile = `${SYSTEM_AUTH_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryFile, SYSTEM_AUTH_FILE);
}

function readSystemTheme() {
  try {
    const value = JSON.parse(fs.readFileSync(SYSTEM_THEME_FILE, 'utf8'));
    return {
      primary: /^#[0-9a-f]{6}$/i.test(value.primary) ? value.primary : DEFAULT_SYSTEM_THEME.primary,
      accent: /^#[0-9a-f]{6}$/i.test(value.accent) ? value.accent : DEFAULT_SYSTEM_THEME.accent
    };
  } catch (_) {
    return { ...DEFAULT_SYSTEM_THEME };
  }
}

function writeSystemTheme(theme) {
  fs.mkdirSync(path.dirname(SYSTEM_THEME_FILE), { recursive: true });
  fs.writeFileSync(SYSTEM_THEME_FILE, `${JSON.stringify(theme, null, 2)}\n`, 'utf8');
}

function readExpenses() {
  return mongoStore.getExpenses();
}

function writeExpenses(expenses) {
  fs.mkdirSync(path.dirname(EXPENSES_FILE), { recursive: true });
  fs.writeFileSync(EXPENSES_FILE, `${JSON.stringify(expenses, null, 2)}\n`, 'utf8');
}

function emptyMonthlyAccount() {
  return {
    startedAt: new Date().toISOString(),
    salesTotal: 0,
    saleCount: 0,
    unitsTotal: 0,
    items: {},
    expensesTotal: 0,
    expenses: []
  };
}

function summarizeMonthlyAccount(value = {}) {
  const account = emptyMonthlyAccount();
  account.startedAt = normalizeText(value.startedAt, account.startedAt);
  account.expenses = Array.isArray(value.expenses) ? value.expenses : [];
  account.expensesTotal = Number.isFinite(Number(value.expensesTotal))
    ? Number(value.expensesTotal)
    : account.expenses.reduce((sum, expense) => sum + normalizeNumber(expense.amount, 0), 0);

  if (value.items && typeof value.items === 'object' && !Array.isArray(value.items)) {
    account.salesTotal = normalizeNumber(value.salesTotal, 0);
    account.saleCount = Math.max(0, Math.round(normalizeNumber(value.saleCount, 0)));
    account.unitsTotal = Math.max(0, normalizeNumber(value.unitsTotal, 0));
    account.items = value.items;
    return account;
  }

  // One-time migration from the original full-bill format to compact totals.
  (Array.isArray(value.sales) ? value.sales : []).forEach((bill) => {
    account.salesTotal += normalizeNumber(bill.total, 0);
    account.saleCount += 1;
    (bill.items || []).forEach((item) => addMonthlyItem(account, item));
  });
  return account;
}

function addMonthlyItem(account, item = {}) {
  const name = simplifyItemName(item.name) || 'Menu item';
  const key = normalizeText(item.id, name).toLocaleLowerCase();
  const quantity = Math.max(0, normalizeNumber(item.qty ?? item.quantity, 0));
  const revenue = Math.max(0, normalizeNumber(item.lineTotal, normalizeNumber(item.price, 0) * quantity));
  const current = account.items[key] || { name, quantity: 0, revenue: 0 };
  current.quantity += quantity;
  current.revenue += revenue;
  account.items[key] = current;
  account.unitsTotal += quantity;
}

function readMonthlyAccount() {
  return mongoStore.monthly();
}

function writeMonthlyAccount(account) {
  fs.mkdirSync(path.dirname(MONTHLY_ACCOUNT_FILE), { recursive: true });
  const temporaryFile = `${MONTHLY_ACCOUNT_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(account, null, 2), 'utf8');
  fs.renameSync(temporaryFile, MONTHLY_ACCOUNT_FILE);
}

function readMenuPrices() {
  try {
    const value = JSON.parse(fs.readFileSync(MENU_PRICES_FILE, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read menu prices:', error.message);
    return {};
  }
}

function writeMenuPrices(prices) {
  fs.mkdirSync(path.dirname(MENU_PRICES_FILE), { recursive: true });
  const temporaryFile = `${MENU_PRICES_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(prices, null, 2), 'utf8');
  fs.renameSync(temporaryFile, MENU_PRICES_FILE);
}

function readCustomMenu() {
  try {
    const value = JSON.parse(fs.readFileSync(CUSTOM_MENU_FILE, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read custom menu:', error.message);
    return [];
  }
}

function writeCustomMenu(items) {
  fs.mkdirSync(path.dirname(CUSTOM_MENU_FILE), { recursive: true });
  const temporaryFile = `${CUSTOM_MENU_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(temporaryFile, CUSTOM_MENU_FILE);
}

function readDeletedMenu() {
  try {
    const value = JSON.parse(fs.readFileSync(DELETED_MENU_FILE, 'utf8'));
    return Array.isArray(value) ? value.filter((itemId) => typeof itemId === 'string') : [];
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read deleted menu:', error.message);
    return [];
  }
}

function writeDeletedMenu(itemIds) {
  fs.mkdirSync(path.dirname(DELETED_MENU_FILE), { recursive: true });
  const temporaryFile = `${DELETED_MENU_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(itemIds, null, 2), 'utf8');
  fs.renameSync(temporaryFile, DELETED_MENU_FILE);
}

function requireManager(req, res, next) {
  if (req.get('x-manager-password') !== MANAGER_PASSWORD) {
    return res.status(403).json({ ok: false, message: 'یوازې مدیر یا کونټر مینیو بدلولای شي.' });
  }
  next();
}

function requireProtectedSectionPassword(req, res, next) {
  if (req.get('x-manager-password') !== PROTECTED_SECTION_PASSWORD) {
    return res.status(403).json({ ok: false, message: 'د حساب د حذف پاسورډ ناسم دی.' });
  }
  next();
}

app.use(express.json({ limit: '3mb' }));

const restaurantIndex = path.join(__dirname, 'public', 'index.html');
app.get(['/', '/restaurant'], (_req, res) => res.sendFile(restaurantIndex));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/protected-section/login', (req, res) => {
  if (req.body?.password !== PROTECTED_SECTION_PASSWORD) {
    return res.status(403).json({ ok: false, message: 'پاسورډ ناسم دی.' });
  }
  res.json({ ok: true });
});

app.post('/api/auth/manager-login', (req, res) => {
  if (!verifyManagerLoginPassword(req.body?.password)) {
    return res.status(403).json({ ok: false, message: 'پاسورډ ناسم دی.' });
  }
  res.json({ ok: true, role: 'counter' });
});

app.put('/api/auth/manager-password', (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!verifyManagerLoginPassword(currentPassword)) {
    return res.status(403).json({ ok: false, message: 'اوسنی پاسورډ ناسم دی.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, message: 'نوی پاسورډ باید لږ تر لږه ۸ توري ولري.' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ ok: false, message: 'نوی پاسورډ باید له اوسني پاسورډ څخه بدل وي.' });
  }

  writeManagerLoginPassword(newPassword);
  res.json({ ok: true, message: 'د مدیر د لاګین پاسورډ بدل شو.' });
});

let activeOrders = [];
let orderHistory = [];

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function simplifyItemName(value) {
  let text = normalizeText(value, '');
  if (!text) return '';

  if (text.includes('·')) {
    const parts = text.split('·').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 2) {
      text = parts.slice(2).join(' ');
    } else {
      text = parts.join(' ');
    }
  }

  if (text.includes('/')) {
    const parts = text.split('/').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      text = parts[0];
    }
  }

  return text.replace(/\s+/g, ' ').trim();
}

function normalizeItem(item) {
  const qty = Math.max(0, Math.round(normalizeNumber(item.qty ?? item.quantity, 0)));
  const price = Math.max(0, normalizeNumber(item.price, 0));
  const name = simplifyItemName(item.name) || 'Menu item';
  const id = normalizeText(item.id, name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const image = normalizeText(item.image ?? item.img, '');

  return {
    id,
    name,
    price,
    qty,
    quantity: qty,
    image,
    img: image,
    lineTotal: price * qty
  };
}

function normalizeOrderId(payload = {}) {
  return normalizeText(payload.orderId ?? payload.order_id ?? payload.id, '');
}

function normalizeOrderItems(items = []) {
  const merged = new Map();

  items.map(normalizeItem).forEach((item) => {
    if (item.qty <= 0) return;

    const existing = merged.get(item.id);
    if (existing) {
      existing.qty += item.qty;
      existing.quantity = existing.qty;
      existing.lineTotal = existing.price * existing.qty;
      return;
    }

    merged.set(item.id, item);
  });

  return [...merged.values()];
}

function markOrderEdited(order, payload = {}, updatedAt = new Date().toISOString()) {
  order.status = 'updated';
  order.message = 'edited/updated';
  order.updateMessage = 'edited/updated';
  order.readyAt = null;
  order.updatedAt = updatedAt;
  order.lastUpdatedBy = normalizeText(payload.waiterName ?? payload.waiter, order.waiterName);
}

function normalizeOrder(payload = {}) {
  const orderType = normalizeText(payload.orderType ?? payload.type, 'table').toLowerCase();
  const isCounterOrder = ['counter', 'counter-order', 'counter_order'].includes(orderType);
  const isFakeOrder = ['fake', 'fake-order', 'fake_order', 'fiq', 'fiq-order', 'fiq_order'].includes(orderType);
  const hasDeliveryDetails = Boolean(
    normalizeText(payload.customerPhone ?? payload.phone, '')
    || normalizeText(payload.deliveryAddress ?? payload.address, '')
  );
  const rawTable = normalizeText(payload.tableNumber ?? payload.table, '');
  const isDelivery = orderType === 'delivery'
    || (!isCounterOrder && !isFakeOrder && (hasDeliveryDetails || rawTable.toUpperCase().startsWith('DEL')));
  const tableNumber = isDelivery
    ? normalizeText(payload.tableNumber ?? payload.table, makeId('DEL'))
    : isCounterOrder || isFakeOrder
      ? normalizeText(payload.tableNumber ?? payload.table, makeId(isFakeOrder ? 'FIQ' : 'CO'))
      : Math.round(normalizeNumber(payload.tableNumber ?? payload.table, 0));
  const waiterName = normalizeText(payload.waiterName ?? payload.waiter, 'Waiter');
  const items = normalizeOrderItems(payload.items || []);

  if (!isDelivery && !isCounterOrder && !isFakeOrder && (!tableNumber || tableNumber < 1)) {
    throw new Error('Please select a valid table.');
  }

  if (!items.length) {
    throw new Error('Please add at least one menu item.');
  }

  const createdAt = new Date().toISOString();
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    id: normalizeText(payload.id, makeId('ORD')),
    tableNumber,
    table: tableNumber,
    waiterName,
    waiter: waiterName,
    items,
    note: normalizeText(payload.note, ''),
    orderType: isDelivery ? 'delivery' : isFakeOrder ? 'fake' : isCounterOrder ? 'counter' : 'table',
    customerName: normalizeText(payload.customerName, ''),
    customerPhone: normalizeText(payload.customerPhone ?? payload.phone, ''),
    deliveryAddress: normalizeText(payload.deliveryAddress ?? payload.address, ''),
    status: 'new',
    total,
    timestamp: createdAt,
    createdAt,
    readyAt: null
  };
}

function buildSnapshot() {
  const totalRevenue = orderHistory.filter((bill) => bill.paymentStatus !== 'outstanding').reduce((sum, bill) => sum + normalizeNumber(bill.total, 0), 0);
  const activeTotal = activeOrders.reduce((sum, order) => sum + normalizeNumber(order.total, 0), 0);
  const activeTables = new Set(activeOrders.map((order) => order.tableNumber));
  const readyOrders = activeOrders.filter((order) => order.status === 'ready');

  return {
    generatedAt: new Date().toISOString(),
    activeOrders,
    orderHistory: orderHistory.slice(0, 200),
    outstandingDebts: mongoStore.getOutstandingDebts(),
    expenses: readExpenses().slice(0, 500),
    monthlyAccount: readMonthlyAccount(),
    totalRevenue,
    totalRevenueAmount: totalRevenue,
    stats: {
      activeOrderCount: activeOrders.length,
      activeTableCount: activeTables.size,
      readyOrderCount: readyOrders.length,
      activeTotal,
      paidBillCount: orderHistory.filter((bill) => bill.paymentStatus !== 'outstanding').length
    }
  };
}

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  const virtualNames = ['loopback', 'vmware', 'virtualbox', 'vethernet', 'npcap', 'hyper-v'];

  Object.entries(interfaces).forEach(([name, entries]) => {
    (entries || []).forEach((entry) => {
      if (entry.family !== 'IPv4' || entry.internal) return;
      addresses.push({
        name,
        address: entry.address,
        preferred: !entry.address.startsWith('169.254.')
          && !virtualNames.some((keyword) => name.toLowerCase().includes(keyword)),
        url: `http://${entry.address}:${PORT}`
      });
    });
  });

  const preferred = addresses.filter((entry) => entry.preferred);
  return (preferred.length ? preferred : addresses)
    .sort((a, b) => getNetworkPriority(a.name) - getNetworkPriority(b.name))
    .map(({ preferred: _preferred, ...entry }) => entry);
}

function getNetworkPriority(name) {
  const value = name.toLowerCase();
  if (value.includes('wi-fi') || value.includes('wifi') || value.includes('wlan') || value.includes('wireless')) return 0;
  if (value.includes('ethernet')) return 1;
  return 2;
}

function emitSnapshot(target = io) {
  const snapshot = buildSnapshot();
  target.emit('snapshot', snapshot);

  // Legacy event names kept so older local pages/scripts do not crash.
  target.emit('initial_data', snapshot);
  target.emit('initial_data_dump', snapshot);
  target.emit('active_orders', snapshot.activeOrders);
  target.emit('order_history', snapshot.orderHistory);
  target.emit('total_revenue', snapshot.totalRevenue);
}

function emitFinancialAccounts(target = io, year = new Date().getFullYear()) {
  const expenses = readExpenses();
  const monthlyAccount = readMonthlyAccount();
  const annualAccount = mongoStore.annual(year);
  target.emit('expenses_updated', expenses);
  target.emit('monthly_account_updated', monthlyAccount);
  const accounts = {
    generatedAt: new Date().toISOString(),
    expenses,
    pocketDeposits: mongoStore.getPocketDeposits(),
    monthlyAccount,
    annualAccount,
    outstandingDebts: mongoStore.getOutstandingDebts(),
    employees: mongoStore.getEmployees(),
    payroll: mongoStore.getPayroll(),
    rents: mongoStore.getRents(),
    inventory: mongoStore.getInventory(),
    inventoryMovements: mongoStore.getInventoryMovements().slice(0, 100),
    manualInventory: mongoStore.getManualInventory(),
    manualInventoryMovements: mongoStore.getManualInventoryMovements().slice(0, 200)
  };
  target.emit('financial_accounts_updated', accounts);
  return accounts;
}

function findOrderForReady(payload = {}) {
  const orderId = normalizeOrderId(payload);
  if (orderId) {
    return activeOrders.find((order) => order.id === orderId);
  }

  const tableNumber = Math.round(normalizeNumber(payload.tableNumber ?? payload.table, 0));
  return activeOrders.find((order) => order.tableNumber === tableNumber && order.status !== 'ready')
    || activeOrders.find((order) => order.tableNumber === tableNumber);
}

function markOrderReady(payload = {}) {
  const order = findOrderForReady(payload);

  if (!order) {
    throw new Error('Order not found.');
  }

  order.status = 'ready';
  order.readyAt = new Date().toISOString();
  return order;
}

function summarizeItemChanges(previousItems, nextItems) {
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const nextById = new Map(nextItems.map((item) => [item.id, item]));
  const changes = [];

  nextItems.forEach((item) => {
    const previous = previousById.get(item.id);

    if (!previous) {
      changes.push({
        type: 'added',
        itemId: item.id,
        name: item.name,
        price: item.price,
        beforeQty: 0,
        afterQty: item.qty,
        deltaQty: item.qty,
        deltaTotal: item.lineTotal
      });
      return;
    }

    if (previous.qty !== item.qty) {
      changes.push({
        type: item.qty > previous.qty ? 'increased' : 'decreased',
        itemId: item.id,
        name: item.name,
        price: item.price,
        beforeQty: previous.qty,
        afterQty: item.qty,
        deltaQty: item.qty - previous.qty,
        deltaTotal: item.lineTotal - previous.lineTotal
      });
    }
  });

  previousItems.forEach((item) => {
    if (nextById.has(item.id)) return;
    changes.push({
      type: 'removed',
      itemId: item.id,
      name: item.name,
      price: item.price,
      beforeQty: item.qty,
      afterQty: 0,
      deltaQty: -item.qty,
      deltaTotal: -item.lineTotal
    });
  });

  return changes;
}

function updateOrder(payload = {}) {
  const orderId = normalizeOrderId(payload);
  const order = activeOrders.find((item) => item.id === orderId);

  if (!order) {
    throw new Error('Order not found.');
  }

  const items = normalizeOrderItems(payload.items || []);

  if (!items.length) {
    throw new Error('Please keep at least one menu item on the order.');
  }

  const previousItems = order.items.map((item) => ({ ...item }));
  const previousTotal = normalizeNumber(order.total, 0);
  const changes = summarizeItemChanges(previousItems, items);

  if (!changes.length) {
    return { order, changes, previousTotal, totalDelta: 0, updatedAt: order.updatedAt || null };
  }

  const updatedAt = new Date().toISOString();
  order.items = items;
  order.total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  markOrderEdited(order, payload, updatedAt);

  return {
    order,
    changes,
    previousTotal,
    totalDelta: order.total - previousTotal,
    updatedAt
  };
}

function buildOrderUpdateData(result) {
  const { order, changes, previousTotal, totalDelta, updatedAt } = result;
  return {
    orderId: order.id,
    tableNumber: order.tableNumber,
    table: order.tableNumber,
    waiterName: order.waiterName,
    waiter: order.waiterName,
    items: order.items,
    previousTotal,
    total: order.total,
    totalDelta,
    changes,
    updatedAt: updatedAt || new Date().toISOString(),
    lastUpdatedBy: order.lastUpdatedBy || order.waiterName
  };
}

function broadcastOrderUpdate(result) {
  const updateData = buildOrderUpdateData(result);

  if (result.changes.length) {
    io.emit('order_updated', updateData);
    io.emit('order_updated_notification', updateData);
    io.emit('display_order_in_counter', result.order);
  }

  emitSnapshot(io);
  return updateData;
}

function mergeTableOrder(existingOrder, incomingOrder) {
  const previousItems = existingOrder.items.map((item) => ({ ...item }));
  const previousTotal = normalizeNumber(existingOrder.total, 0);
  const items = normalizeOrderItems([...(existingOrder.items || []), ...(incomingOrder.items || [])]);
  const changes = summarizeItemChanges(previousItems, items);
  const updatedAt = new Date().toISOString();

  existingOrder.items = items;
  existingOrder.total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  existingOrder.note = normalizeText([existingOrder.note, incomingOrder.note].filter(Boolean).join(' · '), existingOrder.note);
  markOrderEdited(existingOrder, { waiterName: incomingOrder.waiterName }, updatedAt);

  return {
    order: existingOrder,
    changes,
    previousTotal,
    totalDelta: existingOrder.total - previousTotal,
    updatedAt
  };
}

async function checkoutOrders(payload = {}) {
  const orderId = payload.orderId;
  const tableNumber = Math.round(normalizeNumber(payload.tableNumber ?? payload.table, 0));
  const selectedOrders = activeOrders.filter((order) => {
    if (orderId) return order.id === orderId;
    return order.tableNumber === tableNumber;
  });

  if (!selectedOrders.length) {
    throw new Error('No open orders found for checkout.');
  }

  const checkoutAt = new Date().toISOString();
  const isCredit = normalizeText(payload.paymentStatus).toLowerCase() === 'outstanding' || normalizeText(payload.paymentMethod).toLowerCase() === 'credit';
  const firstOrder = selectedOrders[0];
  const waiterNames = [...new Set(selectedOrders.map((order) => order.waiterName))].join(', ');
  const customerNotes = [...new Set(selectedOrders.map((order) => normalizeText(order.note, '')).filter(Boolean))];
  const customerNote = normalizeText(payload.note, customerNotes.join(' · '));
  const checkoutItems = (Array.isArray(payload.items) ? payload.items : []).map((item) => ({
    ...item,
    name: simplifyItemName(item.name) || normalizeText(item.name, 'Menu item')
  }));

  if (checkoutItems.length) {
    const checkoutPayload = {
      tableNumber: firstOrder.tableNumber,
      orderId: ['delivery', 'counter', 'fake'].includes(firstOrder.orderType) ? firstOrder.id : '',
      items: checkoutItems
    };

    try {
      updateCounterPrices(checkoutPayload);
    } catch (error) {
      // Checkout should still continue if the best-effort price sync fails.
    }
  }

  const total = selectedOrders.reduce((sum, order) => sum + order.total, 0);
  const billItems = selectedOrders.flatMap((order) => order.items.map((item) => ({
    ...item,
    name: simplifyItemName(item.name) || item.name
  })));
  const bill = {
    id: makeId('BILL'),
    orderIds: selectedOrders.map((order) => order.id),
    tableNumber: firstOrder.tableNumber,
    table: firstOrder.tableNumber,
    waiterName: waiterNames,
    waiter: waiterNames,
    orderType: firstOrder.orderType || 'table',
    customerName: firstOrder.customerName || '',
    customerPhone: firstOrder.customerPhone || '',
    deliveryAddress: firstOrder.deliveryAddress || '',
    items: billItems,
    total,
    orderCount: selectedOrders.length,
    paymentMethod: isCredit ? 'Credit' : normalizeText(payload.paymentMethod, 'Cash'),
    paymentStatus: isCredit ? 'outstanding' : 'paid',
    debtorName: isCredit ? normalizeText(payload.debtorName, firstOrder.customerName || `Table ${firstOrder.tableNumber}`).slice(0, 100) : '',
    note: customerNote,
    notes: customerNotes,
    createdAt: selectedOrders[0].createdAt,
    paidAt: isCredit ? null : checkoutAt,
    checkoutTimestamp: isCredit ? null : checkoutAt,
    ...(isCredit ? { creditAt: checkoutAt } : {})
  };

  // A paid bill must be durable before its open order is removed.
  await mongoStore.addSale(bill);
  const paidOrderIds = new Set(selectedOrders.map((order) => order.id));
  activeOrders = activeOrders.filter((order) => !paidOrderIds.has(order.id));
  orderHistory.unshift(bill);
  return bill;
}

function updateCounterPrices(payload = {}) {
  const payloadOrderId = normalizeOrderId(payload);
  const tableNumber = Math.round(normalizeNumber(payload.tableNumber ?? payload.table, 0));

  if (!payloadOrderId && (!tableNumber || tableNumber < 1)) {
    throw new Error('Please select a valid table.');
  }

  const updates = Array.isArray(payload.items) ? payload.items : [];
  if (!updates.length) {
    throw new Error('No price updates provided.');
  }

  const affectedOrderIds = new Set();

  updates.forEach((entry) => {
    const orderId = normalizeText(entry.orderId, payloadOrderId);
    const itemId = normalizeText(entry.itemId, '');
    const price = Math.max(0, normalizeNumber(entry.price, 0));

    const order = activeOrders.find((item) => item.id === orderId && (payloadOrderId || item.tableNumber === tableNumber));
    if (!order) return;

    const item = order.items.find((line) => line.id === itemId);
    if (!item) return;

    item.price = price;
    item.lineTotal = price * item.qty;
    affectedOrderIds.add(order.id);
  });

  if (!affectedOrderIds.size) {
    throw new Error('No matching items found for this table.');
  }

  const orders = activeOrders.filter((order) => affectedOrderIds.has(order.id));
  orders.forEach((order) => {
    order.total = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
    order.updatedAt = new Date().toISOString();
    order.lastUpdatedBy = 'Counter';
  });

  return { tableNumber, orderId: payloadOrderId, orders };
}

function freeTable(payload = {}) {
  const tableNumber = Math.round(normalizeNumber(payload.tableNumber ?? payload.table, 0));

  if (!tableNumber || tableNumber < 1) {
    throw new Error('Please select a valid table.');
  }

  const freedAt = new Date().toISOString();
  const removedOrders = activeOrders.filter((order) => order.tableNumber === tableNumber);
  activeOrders = activeOrders.filter((order) => order.tableNumber !== tableNumber);

  return {
    tableNumber,
    table: tableNumber,
    waiterName: normalizeText(payload.waiterName ?? payload.waiter, 'Waiter'),
    reason: normalizeText(payload.reason, 'Customer left'),
    removedOrderCount: removedOrders.length,
    removedOrderIds: removedOrders.map((order) => order.id),
    removedTotal: removedOrders.reduce((sum, order) => sum + normalizeNumber(order.total, 0), 0),
    freedAt
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, ...buildSnapshot().stats });
});

app.get('/api/menu/custom', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, items: readCustomMenu() });
});

app.get('/api/menu/prices', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    prices: readMenuPrices(),
    customItems: readCustomMenu(),
    deletedItemIds: readDeletedMenu()
  });
});

app.get('/api/system/theme', (_req, res) => {
  res.json({ ok: true, theme: readSystemTheme() });
});

app.put('/api/system/theme', requireManager, (req, res) => {
  const primary = normalizeText(req.body?.primary);
  const accent = normalizeText(req.body?.accent);
  if (!/^#[0-9a-f]{6}$/i.test(primary) || !/^#[0-9a-f]{6}$/i.test(accent)) {
    return res.status(400).json({ ok: false, message: 'رنګونه سم نه دي ټاکل شوي.' });
  }
  const theme = { primary, accent };
  writeSystemTheme(theme);
  io.emit('system_theme_updated', theme);
  res.json({ ok: true, theme });
});

app.get('/api/expenses', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, expenses: readExpenses() });
});

app.get('/api/monthly-account', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, monthlyAccount: readMonthlyAccount() });
});

app.get('/api/finance', requireManager, (req, res) => {
  const year = Math.round(normalizeNumber(req.query.year, new Date().getFullYear()));
  const month = /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : undefined;
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    monthlyAccount: mongoStore.monthly(month),
    outstandingDebts: mongoStore.getOutstandingDebts(),
    annualAccount: mongoStore.annual(year),
    financialYears: mongoStore.financialYears(),
    expenses: mongoStore.getExpenses(),
    pocketDeposits: mongoStore.getPocketDeposits(),
    employees: mongoStore.getEmployees(),
    payroll: mongoStore.getPayroll(),
    rents: mongoStore.getRents(),
    capitalAssets: mongoStore.getCapitalAssets(),
    inventory: mongoStore.getInventory(),
    inventoryMovements: mongoStore.getInventoryMovements().slice(0, 100),
    manualInventory: mongoStore.getManualInventory(),
    manualInventoryMovements: mongoStore.getManualInventoryMovements().slice(0, 200)
  });
});

app.post('/api/pocket-deposits', requireManager, async (req, res) => {
  const amount = Math.round(normalizeNumber(req.body?.amount, 0) * 100) / 100;
  const source = normalizeText(req.body?.source, 'د مدیر جېب').slice(0, 100);
  const note = normalizeText(req.body?.note, 'له شخصي جېبه رستورانت ته نغدي جمع').slice(0, 200);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.date || '') ? req.body.date : new Date().toISOString().slice(0, 10);
  const depositedAt = `${date}T12:00:00.000Z`;
  if (amount <= 0 || amount > 100000000) {
    return res.status(400).json({ ok: false, message: 'له جېبه د جمع کېدونکو پیسو سمه اندازه ولیکئ.' });
  }
  if (Number.isNaN(new Date(depositedAt).getTime())) {
    return res.status(400).json({ ok: false, message: 'د پیسو د جمع سمه نېټه وټاکئ.' });
  }
  const deposit = {
    id: makeId('POCKET'),
    source,
    note,
    amount,
    period: date.slice(0, 7),
    depositedAt,
    createdAt: new Date().toISOString()
  };
  await mongoStore.addPocketDeposit(deposit);
  const financialAccounts = emitFinancialAccounts(io, Number(date.slice(0, 4)));
  res.status(201).json({
    ok: true,
    deposit,
    pocketDeposits: mongoStore.getPocketDeposits(),
    monthlyAccount: mongoStore.monthly(deposit.period),
    annualAccount: mongoStore.annual(Number(date.slice(0, 4))),
    financialAccounts
  });
});

app.delete('/api/pocket-deposits/:depositId', requireManager, async (req, res) => {
  const depositId = normalizeText(req.params.depositId);
  const deposit = mongoStore.getPocketDeposits().find((item) => item.id === depositId);
  if (!deposit) return res.status(404).json({ ok: false, message: 'له جېبه جمع شوې پیسې پیدا نه شوې.' });
  if (!await mongoStore.deletePocketDeposit(depositId)) {
    return res.status(400).json({ ok: false, message: 'دا ثبت حذف کېدای نشي.' });
  }
  const year = Number(String(deposit.period).slice(0, 4)) || new Date(deposit.depositedAt || deposit.createdAt).getFullYear();
  const financialAccounts = emitFinancialAccounts(io, year);
  res.json({ ok: true, depositId, pocketDeposits: mongoStore.getPocketDeposits(), financialAccounts });
});

app.post('/api/debts/:debtId/settle', requireManager, async (req, res) => {
  const debt = await mongoStore.settleDebt(normalizeText(req.params.debtId));
  if (!debt) return res.status(404).json({ ok: false, message: 'دا پور پیدا نه شو یا مخکې رسید شوی دی.' });
  const historyBill = orderHistory.find((bill) => bill.id === debt.id);
  if (historyBill) Object.assign(historyBill, debt);
  const financialAccounts = emitFinancialAccounts(io, new Date(debt.paidAt).getFullYear());
  io.emit('debt_settled', debt);
  io.emit('history_updated_globally', buildSnapshot());
  emitSnapshot(io);
  res.json({ ok: true, debt, outstandingDebts: mongoStore.getOutstandingDebts(), financialAccounts });
});

app.delete('/api/finance/month/:month', requireProtectedSectionPassword, async (req, res) => {
  const month = normalizeText(req.params.month);
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ ok: false, message: 'سمه میاشت وټاکئ.' });
  const deleted = await mongoStore.deleteFinancialPeriod({ month });
  const financialAccounts = emitFinancialAccounts(io, Number(month.slice(0, 4)));
  io.emit('payroll_updated', mongoStore.getPayroll());
  io.emit('rents_updated', mongoStore.getRents());
  io.emit('inventory_updated', mongoStore.getInventory());
  res.json({ ok: true, deleted, monthlyAccount: mongoStore.monthly(month), annualAccount: mongoStore.annual(Number(month.slice(0, 4))), financialAccounts });
});

app.delete('/api/finance/year/:year', requireProtectedSectionPassword, async (req, res) => {
  const year = normalizeText(req.params.year);
  if (!/^\d{4}$/.test(year) || Number(year) < 2020 || Number(year) > 2100) return res.status(400).json({ ok: false, message: 'سم کال وټاکئ.' });
  const deleted = await mongoStore.deleteFinancialPeriod({ year });
  const financialAccounts = emitFinancialAccounts(io, Number(year));
  io.emit('payroll_updated', mongoStore.getPayroll());
  io.emit('rents_updated', mongoStore.getRents());
  io.emit('inventory_updated', mongoStore.getInventory());
  res.json({ ok: true, deleted, annualAccount: mongoStore.annual(Number(year)), financialAccounts });
});

app.post('/api/expenses', requireManager, async (req, res) => {
  const name = normalizeText(req.body?.name);
  const allowedCategories = ['chicken', 'meat', 'rice_flour', 'oil_ghee', 'vegetables', 'dairy', 'spices', 'beverages', 'bakery', 'frozen', 'ingredients', 'packaging', 'cleaning', 'gas_fuel', 'kitchen_supplies', 'transport', 'utilities', 'maintenance', 'marketing', 'general'];
  const category = allowedCategories.includes(req.body?.category) ? req.body.category : 'general';
  const categoryNames = {
    chicken: 'چرګ او د چرګ غوښه', meat: 'د پسه، غوا او نورې غوښې', rice_flour: 'وریجې، اوړه او غلې دانې', oil_ghee: 'غوړي، غوړ او ګی',
    vegetables: 'سبزي، مېوه او تازه مواد', dairy: 'شیدې، مستې، پنیر او هګۍ', spices: 'مصالحې، مالګه او ساسونه', beverages: 'مشروبات، اوبه، چای او قهوه',
    bakery: 'ډوډۍ او نانوایي مواد', frozen: 'کنګل شوي او تیار مواد', ingredients: 'نور خوراکي مواد او اجناس', packaging: 'بسته بندي، پلاستیک او کارتن',
    cleaning: 'پاک کاري او حفظ الصحه', gas_fuel: 'ګاز، تېل او سون توکي', kitchen_supplies: 'د پخلنځي واړه وسایل', transport: 'ترانسپورټ او کرایه موټر',
    utilities: 'برېښنا، اوبه، انټرنېټ او خدمات', maintenance: 'ترمیم او ساتنه', marketing: 'اعلانونه او بازارموندنه', general: 'نور ورځنی مصرف'
  };
  const allowedUnits = ['کیلو', 'ګرام', 'دانه', 'لیټر', 'ملي لیټر', 'بورۍ', 'کارتن', 'پاکټ', 'بوتل', 'بنډل', 'بکس', 'سلنډر', 'متر', 'سفر', 'خدمت'];
  const quantity = Math.round(Math.max(0, normalizeNumber(req.body?.quantity, 0)) * 1000) / 1000;
  const unitPrice = Math.round(Math.max(0, normalizeNumber(req.body?.unitPrice, 0)) * 100) / 100;
  const unit = allowedUnits.includes(req.body?.unit) ? req.body.unit : 'دانه';
  const hasPurchaseBreakdown = quantity > 0 || unitPrice > 0;
  const amount = hasPurchaseBreakdown ? Math.round(quantity * unitPrice * 100) / 100 : Math.round(normalizeNumber(req.body?.amount, 0) * 100) / 100;
  const defaultNote = hasPurchaseBreakdown ? `${categoryNames[category]}: ${name} — ${quantity} ${unit} × ${unitPrice} AFN` : `${categoryNames[category]}: ${name}`;
  const note = normalizeText(req.body?.note, defaultNote);
  if (!name || name.length > 100) {
    return res.status(400).json({ ok: false, message: 'د مصرف نوم ولیکئ.' });
  }
  if (amount <= 0 || amount > 10000000) {
    return res.status(400).json({ ok: false, message: 'د مصرف سمه اندازه ولیکئ.' });
  }
  if (hasPurchaseBreakdown && (!quantity || !unitPrice)) {
    return res.status(400).json({ ok: false, message: 'تعداد او د یوه واحد قیمت دواړه سم ولیکئ.' });
  }
  const expense = {
    id: makeId('EXP'),
    name,
    note: note.slice(0, 200),
    amount,
    category,
    ...(hasPurchaseBreakdown ? { quantity, unitPrice, unit } : {}),
    period: mongoStore.monthly().period,
    createdAt: new Date().toISOString()
  };
  await mongoStore.addExpense(expense);
  const expenses = readExpenses();
  const monthlyAccount = readMonthlyAccount();
  emitFinancialAccounts();
  res.status(201).json({ ok: true, expense, expenses, monthlyAccount, annualAccount: mongoStore.annual(new Date(expense.createdAt).getFullYear()) });
});

app.delete('/api/expenses', requireManager, async (_req, res) => {
  const deletedCount = await mongoStore.hideManualExpensesFromDaily();
  const expenses = readExpenses();
  const monthlyAccount = readMonthlyAccount();
  emitFinancialAccounts();
  res.json({ ok: true, deletedCount, expenses, monthlyAccount });
});

app.delete('/api/expenses/:expenseId', requireManager, async (req, res) => {
  const expenseId = normalizeText(req.params.expenseId);
  const expense = readExpenses().find((item) => item.id === expenseId);
  if (!expense) {
    return res.status(404).json({ ok: false, message: 'مصرف پیدا نه شو.' });
  }
  if (expense.sourceType) return res.status(400).json({ ok: false, message: 'د معاش یا کرایې رسید له خپل اړوند لست څخه اداره کړئ.' });
  if (!await mongoStore.deleteExpense(expenseId)) return res.status(400).json({ ok: false, message: 'دا مصرف حذف کېدای نشي.' });
  const nextExpenses = readExpenses();
  const monthlyAccount = readMonthlyAccount();
  emitFinancialAccounts();
  res.json({ ok: true, expenseId, expenses: nextExpenses, monthlyAccount, annualAccount: mongoStore.annual(new Date(expense.createdAt).getFullYear()) });
});

app.post('/api/employees', requireManager, async (req, res) => {
  const name = normalizeText(req.body?.name);
  const role = normalizeText(req.body?.role);
  const monthlySalary = Math.round(normalizeNumber(req.body?.monthlySalary, 0));
  const phone = normalizeText(req.body?.phone).slice(0, 30);
  if (name.length < 2 || name.length > 100 || role.length < 2 || role.length > 100) return res.status(400).json({ ok: false, message: 'د کارمند نوم او دنده سم ولیکئ.' });
  if (monthlySalary <= 0 || monthlySalary > 10000000) return res.status(400).json({ ok: false, message: 'سم میاشتنی معاش ولیکئ.' });
  const employee = { id: makeId('EMP'), name, role, phone, monthlySalary, active: true, createdAt: new Date().toISOString() };
  await mongoStore.addEmployee(employee);
  const employees = mongoStore.getEmployees();
  io.emit('employees_updated', employees);
  res.status(201).json({ ok: true, employee, employees });
});

app.delete('/api/employees/:employeeId', requireManager, async (req, res) => {
  if (!await mongoStore.deleteEmployee(normalizeText(req.params.employeeId))) return res.status(404).json({ ok: false, message: 'کارمند پیدا نه شو.' });
  const employees = mongoStore.getEmployees();
  io.emit('employees_updated', employees);
  res.json({ ok: true, employees });
});

app.post('/api/payroll', requireManager, async (req, res) => {
  const employee = mongoStore.getEmployees().find((item) => item.id === normalizeText(req.body?.employeeId));
  const amount = Math.round(normalizeNumber(req.body?.amount, employee?.monthlySalary || 0));
  const period = /^\d{4}-\d{2}$/.test(req.body?.period) ? req.body.period : new Date().toISOString().slice(0, 7);
  if (!employee) return res.status(404).json({ ok: false, message: 'کارمند پیدا نه شو.' });
  if (amount <= 0 || amount > 10000000) return res.status(400).json({ ok: false, message: 'د معاش سمه اندازه ولیکئ.' });
  const paidBefore = mongoStore.getExpenses()
    .filter((item) => item.sourceType === 'payroll' && item.period === period && (item.employeeId === employee.id || (!item.employeeId && item.name === `معاش: ${employee.name}`)))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const monthlySalary = Number(employee.monthlySalary) || 0;
  const remainingBefore = Math.max(0, monthlySalary - paidBefore);
  if (remainingBefore <= 0) return res.status(409).json({ ok: false, message: `د ${employee.name} د ${period} میاشتې ټول معاش مخکې رسید شوی.` });
  if (amount > remainingBefore) return res.status(400).json({ ok: false, message: `یوازې ${remainingBefore.toLocaleString()} AFN معاش پاتې دی.` });
  const paidAt = new Date().toISOString();
  const paidTotal = paidBefore + amount;
  const remainingAmount = Math.max(0, monthlySalary - paidTotal);
  const payment = { id: makeId('PAY'), employeeId: employee.id, employeeName: employee.name, monthlySalary, amount, paidBefore, paidTotal, remainingAmount, period, note: normalizeText(req.body?.note).slice(0, 200), paidAt, createdAt: paidAt };
  const reason = normalizeText(req.body?.note, `د ${employee.name} د ${period} میاشتې معاش`).slice(0, 200);
  payment.note = reason;
  const expense = { id: makeId('EXP'), name: `معاش: ${employee.name}`, employeeId: employee.id, amount, note: reason, period, category: 'salary', sourceType: 'payroll', sourceId: payment.id, createdAt: paidAt };
  await mongoStore.addPayrollReceipt(payment, expense);
  const financialAccounts = emitFinancialAccounts(io, Number(period.slice(0, 4)));
  const payroll = mongoStore.getPayroll();
  io.emit('payroll_updated', payroll);
  res.status(201).json({ ok: true, payment, payroll, expenses: readExpenses(), financialAccounts });
});

app.delete('/api/payroll/:paymentId', requireManager, async (req, res) => {
  const payment = await mongoStore.deletePayrollReceipt(normalizeText(req.params.paymentId));
  if (!payment) return res.status(404).json({ ok: false, message: 'د معاش رسید پیدا نه شو.' });
  const financialAccounts = emitFinancialAccounts(io, Number(String(payment.period).slice(0, 4)) || new Date().getFullYear());
  const payroll = mongoStore.getPayroll();
  io.emit('payroll_updated', payroll);
  res.json({ ok: true, paymentId: payment.id, payroll, financialAccounts });
});

app.post('/api/rents', requireManager, async (req, res) => {
  const amount = Math.round(normalizeNumber(req.body?.amount, 0));
  const period = /^\d{4}-\d{2}$/.test(req.body?.period) ? req.body.period : new Date().toISOString().slice(0, 7);
  const shopName = normalizeText(req.body?.shopName, 'د دوکان کرایه').slice(0, 100);
  if (amount <= 0 || amount > 10000000) return res.status(400).json({ ok: false, message: 'د کرایې سمه اندازه ولیکئ.' });
  const rentAlreadyAccounted = mongoStore.getExpenses().some((item) => item.sourceType === 'rent' && item.period === period && item.name === `کرایه: ${shopName}`);
  if (mongoStore.getRents().some((item) => item.period === period && item.shopName === shopName) || rentAlreadyAccounted) return res.status(409).json({ ok: false, message: 'د دې دوکان د همدې میاشتې کرایه مخکې په مالي حساب کې ثبت شوې.' });
  const paidAt = new Date().toISOString();
  const landlord = normalizeText(req.body?.landlord, 'د دوکان مالک').slice(0, 100);
  const reason = normalizeText(req.body?.note, `د ${shopName} د ${period} میاشتې کرایه، مالک: ${landlord}`).slice(0, 200);
  const rent = { id: makeId('RENT'), shopName, landlord, amount, period, note: reason, paidAt, createdAt: paidAt };
  const expense = { id: makeId('EXP'), name: `کرایه: ${shopName}`, amount, note: reason, period, category: 'rent', sourceType: 'rent', sourceId: rent.id, createdAt: paidAt };
  await mongoStore.addRentReceipt(rent, expense);
  const financialAccounts = emitFinancialAccounts(io, Number(period.slice(0, 4)));
  const rents = mongoStore.getRents();
  io.emit('rents_updated', rents);
  res.status(201).json({ ok: true, rent, rents, expenses: readExpenses(), financialAccounts });
});

app.delete('/api/rents/:rentId', requireManager, async (req, res) => {
  const rent = await mongoStore.deleteRentReceipt(normalizeText(req.params.rentId));
  if (!rent) return res.status(404).json({ ok: false, message: 'د کرایې رسید پیدا نه شو.' });
  const financialAccounts = emitFinancialAccounts(io, Number(String(rent.period).slice(0, 4)) || new Date().getFullYear());
  const rents = mongoStore.getRents();
  io.emit('rents_updated', rents);
  res.json({ ok: true, rentId: rent.id, rents, financialAccounts });
});

app.post('/api/capital-assets', requireManager, async (req, res) => {
  const type = req.body?.type === 'capital' ? 'capital' : 'asset';
  const name = normalizeText(req.body?.name).slice(0, 100);
  const quantity = Math.max(1, Math.round(normalizeNumber(req.body?.quantity, 1)));
  const currency = req.body?.currency === 'USD' ? 'USD' : 'AFN';
  const unitPriceOriginal = normalizeNumber(req.body?.unitPrice, normalizeNumber(req.body?.amount, 0));
  const exchangeRate = normalizeNumber(req.body?.exchangeRate, 0);
  const precise = (value) => Number(Number(value).toFixed(4));
  const totalOriginal = precise(unitPriceOriginal * quantity);
  if (name.length < 2) return res.status(400).json({ ok: false, message: 'د پانګې یا جنس نوم ولیکئ.' });
  if (unitPriceOriginal < 0 || totalOriginal > 100000000) return res.status(400).json({ ok: false, message: 'سم اصلي قیمت ولیکئ.' });
  if (exchangeRate <= 0 || exchangeRate > 1000000) return res.status(400).json({ ok: false, message: 'د نن ورځې سم نرخ ولیکئ: 1 USD څو AFN دی؟' });
  const unitPrice = precise(currency === 'USD' ? unitPriceOriginal * exchangeRate : unitPriceOriginal);
  const totalAmount = precise(unitPrice * quantity);
  const totalUsd = precise(currency === 'USD' ? totalOriginal : totalAmount / exchangeRate);
  if (totalAmount > 1000000000) return res.status(400).json({ ok: false, message: 'بدل شوی ټول قیمت ډېر لوړ دی؛ نرخ او قیمت وګورئ.' });
  const entry = { id: makeId(type === 'capital' ? 'CAP' : 'ASSET'), type, name, currency, exchangeRate: precise(exchangeRate), unitPriceOriginal: precise(unitPriceOriginal), totalOriginal, unitPrice, totalAmount, totalUsd, amount: totalAmount, quantity, note: normalizeText(req.body?.note).slice(0, 200), acquiredAt: req.body?.acquiredAt || new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
  await mongoStore.addCapitalAsset(entry);
  res.status(201).json({ ok: true, entry, capitalAssets: mongoStore.getCapitalAssets() });
});

app.delete('/api/capital-assets/:entryId', requireManager, async (req, res) => {
  if (!await mongoStore.deleteCapitalAsset(normalizeText(req.params.entryId))) return res.status(404).json({ ok: false, message: 'ثبت شوی جنس یا پانګه پیدا نه شوه.' });
  res.json({ ok: true, capitalAssets: mongoStore.getCapitalAssets() });
});

app.post('/api/inventory/receive', requireManager, async (req, res) => {
  const itemId = normalizeText(req.body?.itemId);
  const itemName = normalizeText(req.body?.itemName).slice(0, 120);
  const groupId = normalizeText(req.body?.groupId);
  const quantity = Math.round(normalizeNumber(req.body?.quantity, 0));
  const reorderLevel = Math.max(0, Math.round(normalizeNumber(req.body?.reorderLevel, 5)));
  const allowedUnits = ['دانه', 'کیلو', 'ګرام', 'لیټر', 'ملی لیټر', 'بوتل', 'پاکټ', 'کارتن', 'بوجۍ', 'ډبي', 'جوړه', 'درجن'];
  const unit = allowedUnits.includes(req.body?.unit) ? req.body.unit : 'دانه';
  const purchasePrice = Math.round(normalizeNumber(req.body?.purchasePrice, 0));
  const salePrice = Math.round(normalizeNumber(req.body?.salePrice, 0));
  if (!itemId || !itemName) return res.status(400).json({ ok: false, message: 'د مینیو جنس انتخاب کړئ.' });
  if (!['large-bottles', 'small-bottles'].includes(groupId)) return res.status(400).json({ ok: false, message: 'په سټاک کې یوازې واړه او غټ مشروبات ثبتېږي.' });
  if (quantity <= 0 || quantity > 1000000) return res.status(400).json({ ok: false, message: 'د داخل شوي جنس سم تعداد ولیکئ.' });
  if (purchasePrice < 0 || purchasePrice > 10000000) return res.status(400).json({ ok: false, message: 'د یو واحد د پېر سم قیمت ولیکئ.' });
  if (salePrice < 0 || salePrice > 10000000) return res.status(400).json({ ok: false, message: 'د خرڅلاو سم قیمت ولیکئ.' });
  if (mongoStore.getInventory().some((item) => item.itemId === itemId)) {
    return res.status(409).json({ ok: false, message: 'دا جنس مخکې سټاک ته داخل شوی؛ د بیا داخلولو لپاره لومړی اوسنی سټاک حذف کړئ.' });
  }
  const createdAt = new Date().toISOString();
  try {
    await mongoStore.receiveStock({ movementId: makeId('MOV'), itemId, itemName, groupId, quantity, reorderLevel, unit, purchasePrice, totalPurchaseAmount: purchasePrice * quantity, salePrice, note: normalizeText(req.body?.note).slice(0, 200), createdAt });
  } catch (error) {
    if (error?.code === 11000 || error?.code === 'STOCK_ALREADY_EXISTS') {
      return res.status(409).json({ ok: false, message: 'دا جنس مخکې سټاک ته داخل شوی؛ د بیا داخلولو لپاره لومړی اوسنی سټاک حذف کړئ.' });
    }
    throw error;
  }
  const inventory = mongoStore.getInventory();
  const inventoryMovements = mongoStore.getInventoryMovements().slice(0, 100);
  io.emit('inventory_updated', inventory);
  io.emit('inventory_movements_updated', inventoryMovements);
  res.status(201).json({ ok: true, inventory, inventoryMovements });
});

app.delete('/api/inventory/:itemId', requireManager, async (req, res) => {
  const itemId = normalizeText(req.params.itemId);
  const deleted = await mongoStore.deleteInventoryItem(itemId);
  if (!deleted) return res.status(404).json({ ok: false, message: 'دا مشروب په سټاک کې پیدا نه شو.' });
  const inventory = mongoStore.getInventory();
  const inventoryMovements = mongoStore.getInventoryMovements().slice(0, 100);
  io.emit('inventory_updated', inventory);
  io.emit('inventory_movements_updated', inventoryMovements);
  const financialAccounts = emitFinancialAccounts(io, new Date().getFullYear());
  res.json({ ok: true, deleted, inventory, inventoryMovements, financialAccounts });
});

app.post('/api/manual-inventory', requireManager, async (req, res) => {
  const name = normalizeText(req.body?.name).slice(0, 120);
  const quantity = Math.round(normalizeNumber(req.body?.quantity, 0) * 1000) / 1000;
  const unitPrice = Math.round(normalizeNumber(req.body?.unitPrice, 0));
  const allowedUnits = ['کیلو', 'ګرام', 'لیټر', 'ملی لیټر', 'دانه', 'بوتل', 'پاکټ', 'کارتن', 'بوجۍ', 'ډبي', 'جوړه', 'درجن', 'من'];
  const unit = allowedUnits.includes(req.body?.unit) ? req.body.unit : 'کیلو';
  const note = normalizeText(req.body?.note, `د ${name} لومړنی سټاک`).slice(0, 200);
  if (name.length < 2) return res.status(400).json({ ok: false, message: 'د مینول سټاک د جنس نوم ولیکئ.' });
  if (quantity <= 0 || quantity > 1000000) return res.status(400).json({ ok: false, message: 'د مینول سټاک سم مقدار ولیکئ.' });
  if (unitPrice < 0 || unitPrice > 10000000) return res.status(400).json({ ok: false, message: 'د یو واحد سم قیمت ولیکئ.' });
  const nameKey = name.toLocaleLowerCase();
  if (mongoStore.getManualInventory().some((item) => item.nameKey === nameKey && item.unit === unit)) {
    return res.status(409).json({ ok: false, message: 'دا جنس له همدې واحد سره مخکې په مینول سټاک کې شته؛ د هغه له کارت څخه مقدار اضافه کړئ.' });
  }
  const createdAt = new Date().toISOString();
  try {
    await mongoStore.addManualInventoryItem({ id: makeId('MST'), movementId: makeId('MSM'), name, nameKey, quantity, unit, unitPrice, note, createdAt, updatedAt: createdAt });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ ok: false, message: 'دا جنس له همدې واحد سره مخکې په مینول سټاک کې شته.' });
    throw error;
  }
  const manualInventory = mongoStore.getManualInventory();
  const manualInventoryMovements = mongoStore.getManualInventoryMovements().slice(0, 200);
  io.emit('manual_inventory_updated', manualInventory);
  io.emit('manual_inventory_movements_updated', manualInventoryMovements);
  res.status(201).json({ ok: true, manualInventory, manualInventoryMovements });
});

app.post('/api/manual-inventory/:itemId/movements', requireManager, async (req, res) => {
  const itemId = normalizeText(req.params.itemId);
  const type = req.body?.type === 'out' ? 'out' : 'in';
  const quantity = Math.round(normalizeNumber(req.body?.quantity, 0) * 1000) / 1000;
  const note = normalizeText(req.body?.note, type === 'out' ? 'له مینول سټاک څخه ووت' : 'مینول سټاک ته اضافه شو').slice(0, 200);
  if (quantity <= 0 || quantity > 1000000) return res.status(400).json({ ok: false, message: 'سم داخل یا وتلی مقدار ولیکئ.' });
  try {
    const result = await mongoStore.adjustManualInventory(itemId, { id: makeId('MSM'), type, quantity, note, createdAt: new Date().toISOString() });
    if (!result) return res.status(404).json({ ok: false, message: 'د مینول سټاک جنس پیدا نه شو.' });
  } catch (error) {
    if (error?.code === 'INSUFFICIENT_MANUAL_STOCK') return res.status(400).json({ ok: false, message: 'د وتلو مقدار له پاتې سټاک څخه زیات دی.' });
    throw error;
  }
  const manualInventory = mongoStore.getManualInventory();
  const manualInventoryMovements = mongoStore.getManualInventoryMovements().slice(0, 200);
  io.emit('manual_inventory_updated', manualInventory);
  io.emit('manual_inventory_movements_updated', manualInventoryMovements);
  res.json({ ok: true, manualInventory, manualInventoryMovements });
});

app.delete('/api/manual-inventory/:itemId', requireManager, async (req, res) => {
  const deleted = await mongoStore.deleteManualInventoryItem(normalizeText(req.params.itemId));
  if (!deleted) return res.status(404).json({ ok: false, message: 'د مینول سټاک جنس پیدا نه شو.' });
  const manualInventory = mongoStore.getManualInventory();
  const manualInventoryMovements = mongoStore.getManualInventoryMovements().slice(0, 200);
  io.emit('manual_inventory_updated', manualInventory);
  io.emit('manual_inventory_movements_updated', manualInventoryMovements);
  res.json({ ok: true, deleted, manualInventory, manualInventoryMovements });
});

app.get('/menu-custom.js', (_req, res) => {
  const items = JSON.stringify(readCustomMenu()).replace(/</g, '\\u003c');
  const prices = JSON.stringify(readMenuPrices()).replace(/</g, '\\u003c');
  const deletedItemIds = JSON.stringify(readDeletedMenu()).replace(/</g, '\\u003c');
  res.set('Cache-Control', 'no-store');
  res.type('application/javascript').send(`window.AsadBurgerKingCustomMenu = ${items}; window.AsadBurgerKingMenuPrices = ${prices}; window.AsadBurgerKingDeletedMenuItems = ${deletedItemIds};`);
});

app.put('/api/menu/prices/:itemId', requireManager, (req, res) => {
  const itemId = normalizeText(req.params.itemId);
  const price = Math.round(normalizeNumber(req.body.price, 0));
  if (!/^[a-z0-9-]+$/i.test(itemId)) {
    return res.status(400).json({ ok: false, message: 'خوراک سم نه دی ټاکل شوی.' });
  }
  if (price <= 0 || price > 1000000) {
    return res.status(400).json({ ok: false, message: 'قیمت باید له صفر څخه لوی وي.' });
  }

  const customItems = readCustomMenu();
  const customItem = customItems.find((item) => item.id === itemId);
  if (customItem) {
    customItem.price = price;
    customItem.updatedAt = new Date().toISOString();
    writeCustomMenu(customItems);
  } else {
    const prices = readMenuPrices();
    prices[itemId] = price;
    writeMenuPrices(prices);
  }

  const update = { action: 'price_updated', itemId, price };
  io.emit('menu_updated', update);
  res.json({ ok: true, ...update });
});

app.post('/api/menu/custom', requireManager, (req, res) => {
  const groupId = normalizeText(req.body.groupId);
  const name = normalizeText(req.body.name);
  const englishName = normalizeText(req.body.englishName, name);
  const price = Math.round(normalizeNumber(req.body.price, 0));

  if (!/^[a-z0-9-]+$/i.test(groupId)) {
    return res.status(400).json({ ok: false, message: 'سمه کټګوري انتخاب کړئ.' });
  }
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ ok: false, message: 'د خوراک سم نوم ولیکئ.' });
  }
  if (price <= 0 || price > 1000000) {
    return res.status(400).json({ ok: false, message: 'قیمت باید له صفر څخه لوی وي.' });
  }

  const items = readCustomMenu();
  const item = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    groupId,
    name,
    englishName,
    price,
    createdAt: new Date().toISOString()
  };
  items.push(item);
  writeCustomMenu(items);
  io.emit('menu_updated', { action: 'added', item });
  res.status(201).json({ ok: true, item });
});

app.delete('/api/menu/custom/:itemId', requireManager, (req, res) => {
  const itemId = normalizeText(req.params.itemId);
  if (!/^[a-z0-9-]+$/i.test(itemId)) {
    return res.status(400).json({ ok: false, message: 'خوراک سم نه دی ټاکل شوی.' });
  }
  const items = readCustomMenu();
  const nextItems = items.filter((item) => item.id !== itemId);
  if (nextItems.length !== items.length) {
    writeCustomMenu(nextItems);
  } else {
    const deletedItemIds = readDeletedMenu();
    if (!deletedItemIds.includes(itemId)) {
      deletedItemIds.push(itemId);
      writeDeletedMenu(deletedItemIds);
    }
  }
  const prices = readMenuPrices();
  Object.keys(prices).forEach((priceId) => {
    if (priceId === itemId || priceId.startsWith(`${itemId}-option-`)) delete prices[priceId];
  });
  writeMenuPrices(prices);
  io.emit('menu_updated', { action: 'deleted', itemId });
  res.json({ ok: true, action: 'deleted', itemId });
});

function handleHttpOrderUpdate(req, res) {
  try {
    const result = updateOrder({
      ...req.body,
      orderId: req.params.orderId || req.body.orderId || req.body.order_id
    });
    const updateData = broadcastOrderUpdate(result);
    res.json({ ok: true, order: result.order, changes: result.changes, update: updateData });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
}

app.post('/update_order', handleHttpOrderUpdate);
app.post('/edit_order', handleHttpOrderUpdate);
app.put('/update_order', handleHttpOrderUpdate);
app.put('/edit_order', handleHttpOrderUpdate);
app.post('/api/update_order', handleHttpOrderUpdate);
app.post('/api/edit_order', handleHttpOrderUpdate);
app.put('/api/orders/:orderId', handleHttpOrderUpdate);
app.post('/api/orders/:orderId/update', handleHttpOrderUpdate);
app.put('/update_order/:orderId', handleHttpOrderUpdate);
app.put('/edit_order/:orderId', handleHttpOrderUpdate);
app.post('/update_order/:orderId', handleHttpOrderUpdate);
app.post('/edit_order/:orderId', handleHttpOrderUpdate);

app.get('/network-info', (_req, res) => {
  res.json({
    ok: true,
    port: PORT,
    host: HOST,
    localUrl: `http://127.0.0.1:${PORT}`,
    lanUrls: getLanAddresses(),
    offlineReady: true
  });
});

io.on('connection', (socket) => {
  socket.emit('connected', { id: socket.id });
  emitSnapshot(socket);
  emitFinancialAccounts(socket);

  socket.on('request_snapshot', () => {
    emitSnapshot(socket);
    emitFinancialAccounts(socket);
  });
  socket.on('request_initial_data', () => {
    emitSnapshot(socket);
    emitFinancialAccounts(socket);
  });

  function handleNewOrder(payload, ack) {
    try {
      const order = normalizeOrder(payload);
      const existingTableOrders = order.orderType === 'table'
        ? activeOrders.filter((item) => item.orderType === 'table' && Number(item.tableNumber) === Number(order.tableNumber))
        : [];
      const additionalOrderCount = existingTableOrders.length;

      if (additionalOrderCount) {
        const existingOrder = existingTableOrders.find((item) => !item.isAdditionalOrder) || existingTableOrders[0];
        const result = mergeTableOrder(existingOrder, order);
        const updateData = broadcastOrderUpdate(result);

        io.emit('additional_table_order', {
          orderId: result.order.id,
          mergedIntoOrderId: result.order.id,
          tableNumber: result.order.tableNumber,
          table: result.order.tableNumber,
          waiterName: order.waiterName,
          waiter: order.waiterName,
          orderType: result.order.orderType,
          items: order.items,
          total: order.total,
          createdAt: order.createdAt,
          additionalOrderCount: additionalOrderCount + 1,
          merged: true
        });

        if (typeof ack === 'function') ack({ ok: true, order: result.order, update: updateData, merged: true });
        return;
      }

      activeOrders.push(order);

      io.emit('order_created', order);
      io.emit('new_order', order);
      io.emit('display_order_in_counter', order);
      if (order.isAdditionalOrder) {
        io.emit('additional_table_order', {
          orderId: order.id,
          tableNumber: order.tableNumber,
          table: order.tableNumber,
          waiterName: order.waiterName,
          waiter: order.waiterName,
          orderType: order.orderType,
          items: order.items,
          total: order.total,
          createdAt: order.createdAt,
          additionalOrderCount: order.additionalOrderCount
        });
      }
      if (order.orderType === 'delivery') {
        io.emit('delivery_order_created', order);
      }
      emitSnapshot(io);

      if (typeof ack === 'function') ack({ ok: true, order });
    } catch (error) {
      socket.emit('app_error', { message: error.message });
      if (typeof ack === 'function') ack({ ok: false, message: error.message });
    }
  }

  socket.on('new_order', handleNewOrder);
  socket.on('new_delivery_order', (payload, ack) => {
    handleNewOrder({ ...payload, orderType: 'delivery' }, ack);
  });

  function handleReady(payload, ack) {
    try {
      const order = markOrderReady(payload);
      const readyData = {
        orderId: order.id,
        tableNumber: order.tableNumber,
        table: order.tableNumber,
        waiterName: order.waiterName,
        waiter: order.waiterName,
        orderType: order.orderType || 'table',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        deliveryAddress: order.deliveryAddress || '',
        items: order.items,
        total: order.total,
        readyAt: order.readyAt
      };

      io.emit('order_ready_notification', readyData);
      io.emit('notify_waiter_ready', readyData);
      if (order.orderType === 'delivery') {
        io.emit('delivery_order_ready', readyData);
      }
      emitSnapshot(io);

      if (typeof ack === 'function') ack({ ok: true, order });
    } catch (error) {
      socket.emit('app_error', { message: error.message });
      if (typeof ack === 'function') ack({ ok: false, message: error.message });
    }
  }

  socket.on('mark_order_ready', handleReady);
  socket.on('order_ready', handleReady);

  function handleOrderUpdate(payload, ack) {
    try {
      const result = updateOrder(payload);
      const updateData = broadcastOrderUpdate(result);

      if (typeof ack === 'function') ack({ ok: true, order: result.order, changes: result.changes, update: updateData });
    } catch (error) {
      socket.emit('app_error', { message: error.message });
      if (typeof ack === 'function') ack({ ok: false, message: error.message });
    }
  }

  socket.on('update_order', handleOrderUpdate);
  socket.on('edit_order', handleOrderUpdate);

  socket.on('counter_update_prices', (payload, ack) => {
    try {
      const result = updateCounterPrices(payload);
      emitSnapshot(io);

      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (error) {
      socket.emit('app_error', { message: error.message });
      if (typeof ack === 'function') ack({ ok: false, message: error.message });
    }
  });

  async function handleCheckout(payload, ack) {
    try {
      const bill = await checkoutOrders(payload);

      io.emit(bill.paymentStatus === 'outstanding' ? 'bill_credit_confirm' : 'bill_paid_confirm', { table: bill.tableNumber, tableNumber: bill.tableNumber, bill });
      io.emit('history_updated_globally', buildSnapshot());
      const financialAccounts = emitFinancialAccounts();
      io.emit('inventory_updated', mongoStore.getInventory());
      io.emit('inventory_movements_updated', mongoStore.getInventoryMovements().slice(0, 100));
      emitSnapshot(io);

      if (typeof ack === 'function') ack({ ok: true, bill, financialAccounts });
    } catch (error) {
      socket.emit('app_error', { message: error.message });
      if (typeof ack === 'function') ack({ ok: false, message: error.message });
    }
  }

  socket.on('checkout_table', handleCheckout);
  socket.on('checkout_order', handleCheckout);
  socket.on('checkout_table_server', handleCheckout);
  socket.on('bill_paid', handleCheckout);

  socket.on('free_table', (payload, ack) => {
    try {
      const result = freeTable(payload);
      io.emit('table_freed', result);
      emitSnapshot(io);

      if (typeof ack === 'function') ack({ ok: true, table: result });
    } catch (error) {
      socket.emit('app_error', { message: error.message });
      if (typeof ack === 'function') ack({ ok: false, message: error.message });
    }
  });

  socket.on('clear_all_history', (ack) => {
    orderHistory = [];
    io.emit('history_cleared_globally');
    emitSnapshot(io);
    if (typeof ack === 'function') ack({ ok: true });
  });
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    await mongoStore.connect();
    server.listen(PORT, HOST, () => {
    console.log(`Zarchinar Restaurant server is running on http://127.0.0.1:${PORT}`);
      const lanAddresses = getLanAddresses();
      if (lanAddresses.length) {
        console.log('Open from other offline LAN devices:');
        lanAddresses.forEach((item) => console.log(`- ${item.name}: ${item.url}`));
      }
    });
  } catch (error) {
    console.error('MongoDB connection failed. Start MongoDB or set MONGODB_URI.', error.message);
    process.exitCode = 1;
  }
}

startServer();
