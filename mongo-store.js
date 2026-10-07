const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGODB_DB || 'pizza_point';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

let db;
let expenses = [];
let pocketDeposits = [];
let employees = [];
let payroll = [];
let rents = [];
let sales = [];
let capitalAssets = [];
let inventory = [];
let inventoryMovements = [];
let manualInventory = [];
let manualInventoryMovements = [];

function clean(document) {
  if (!document) return document;
  const { _id, ...value } = document;
  return value;
}

function readJson(fileName, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', fileName), 'utf8'));
  } catch (_) {
    return fallback;
  }
}

async function loadCollection(name) {
  return (await db.collection(name).find({}).sort({ createdAt: -1 }).toArray()).map(clean);
}

async function reloadFinancialCaches() {
  expenses = await loadCollection('expenses');
  pocketDeposits = await loadCollection('pocket_deposits');
  payroll = await loadCollection('payroll');
  rents = await loadCollection('rents');
  sales = await loadCollection('sales');
}

async function repairLinkedFinancialExpenses() {
  const [savedPayroll, savedRents] = await Promise.all([
    db.collection('payroll').find({}).toArray(),
    db.collection('rents').find({}).toArray()
  ]);
  const operations = [];
  savedPayroll.forEach((payment) => operations.push({
    updateOne: {
      filter: { sourceType: 'payroll', sourceId: payment.id },
      update: { $setOnInsert: {
        id: `EXP-REPAIR-${payment.id}`,
        name: `معاش: ${payment.employeeName || 'کارمند'}`,
        amount: Number(payment.amount) || 0,
        note: payment.note || `د ${payment.employeeName || 'کارمند'} د ${payment.period || ''} میاشتې معاش`,
        period: payment.period,
        category: 'salary',
        sourceType: 'payroll',
        sourceId: payment.id,
        createdAt: payment.paidAt || payment.createdAt || new Date().toISOString()
      } },
      upsert: true
    }
  }));
  savedRents.forEach((rent) => operations.push({
    updateOne: {
      filter: { sourceType: 'rent', sourceId: rent.id },
      update: { $setOnInsert: {
        id: `EXP-REPAIR-${rent.id}`,
        name: `کرایه: ${rent.shopName || 'دوکان'}`,
        amount: Number(rent.amount) || 0,
        note: rent.note || `د ${rent.shopName || 'دوکان'} د ${rent.period || ''} میاشتې کرایه`,
        period: rent.period,
        category: 'rent',
        sourceType: 'rent',
        sourceId: rent.id,
        createdAt: rent.paidAt || rent.createdAt || new Date().toISOString()
      } },
      upsert: true
    }
  }));
  if (operations.length) await db.collection('expenses').bulkWrite(operations, { ordered: false });
}

async function connect() {
  await client.connect();
  db = client.db(databaseName);
  await Promise.all([
    db.collection('expenses').createIndex({ id: 1 }, { unique: true }),
    db.collection('pocket_deposits').createIndex({ id: 1 }, { unique: true }),
    db.collection('pocket_deposits').createIndex({ period: 1, excludedFromMonthly: 1, excludedFromAnnual: 1 }),
    db.collection('employees').createIndex({ id: 1 }, { unique: true }),
    db.collection('payroll').createIndex({ id: 1 }, { unique: true }),
    db.collection('rents').createIndex({ id: 1 }, { unique: true }),
    db.collection('sales').createIndex({ id: 1 }, { unique: true }),
    db.collection('capital_assets').createIndex({ id: 1 }, { unique: true }),
    db.collection('capital_assets').createIndex({ type: 1, acquiredAt: -1 }),
    db.collection('inventory').createIndex({ itemId: 1 }, { unique: true }),
    db.collection('inventory_movements').createIndex({ id: 1 }, { unique: true }),
    db.collection('manual_inventory').createIndex({ id: 1 }, { unique: true }),
    db.collection('manual_inventory').createIndex({ nameKey: 1, unit: 1 }, { unique: true }),
    db.collection('manual_inventory_movements').createIndex({ id: 1 }, { unique: true }),
    db.collection('manual_inventory_movements').createIndex({ itemId: 1, createdAt: -1 }),
    db.collection('expenses').createIndex({ createdAt: -1 }),
    db.collection('expenses').createIndex({ category: 1, createdAt: -1 }),
    db.collection('expenses').createIndex({ period: 1, category: 1 }),
    db.collection('expenses').createIndex({ period: 1, excludedFromMonthly: 1, excludedFromAnnual: 1 }),
    db.collection('expenses').createIndex({ sourceType: 1, sourceId: 1 }),
    db.collection('payroll').createIndex({ period: 1, employeeId: 1 }),
    db.collection('rents').createIndex({ period: 1, shopName: 1 }),
    db.collection('sales').createIndex({ paidAt: -1 }),
    db.collection('sales').createIndex({ paymentStatus: 1, creditAt: -1 }),
    db.collection('sales').createIndex({ period: 1, excludedFromMonthly: 1, excludedFromAnnual: 1 }),
    db.collection('inventory_movements').createIndex({ period: 1, type: 1, excludedFromMonthly: 1, excludedFromAnnual: 1 }),
    db.collection('inventory_movements').createIndex({ referenceId: 1 })
  ]);
  await db.collection('system_meta').updateOne(
    { key: 'database_schema' },
    { $set: { version: 8, design: 'linked financial ledger with pocket deposits, outstanding debt recognition, automatic beverage inventory and independent manual inventory', collections: ['sales', 'expenses', 'pocket_deposits', 'employees', 'payroll', 'rents', 'inventory', 'inventory_movements', 'manual_inventory', 'manual_inventory_movements', 'capital_assets'], updatedAt: new Date().toISOString() } },
    { upsert: true }
  );

  const legacyMigration = await db.collection('system_meta').findOne({ key: 'legacy_json_migration' });
  if (!legacyMigration?.completed) {
    if (await db.collection('expenses').countDocuments() === 0) {
      const oldExpenses = readJson('expenses.json', []);
      if (Array.isArray(oldExpenses) && oldExpenses.length) {
        await db.collection('expenses').insertMany(oldExpenses.map((item) => ({ ...item, category: item.category || 'general' })));
      }
    }
    if (await db.collection('sales').countDocuments() === 0) {
      const oldAccount = readJson('monthly-account.json', null);
      if (oldAccount && Number(oldAccount.salesTotal) > 0) {
        const items = Object.entries(oldAccount.items || {}).map(([id, item]) => ({ id, name: item.name, quantity: item.quantity, qty: item.quantity, lineTotal: item.revenue }));
        const paidAt = oldAccount.startedAt || new Date().toISOString();
        await db.collection('sales').insertOne({ id: `MIGRATED-${Date.now()}`, total: Number(oldAccount.salesTotal), items, period: monthKey(paidAt), paidAt, createdAt: paidAt, migratedFromJson: true });
      }
    }
    await db.collection('system_meta').updateOne(
      { key: 'legacy_json_migration' },
      { $set: { completed: true, completedAt: new Date().toISOString(), source: 'data/*.json' } },
      { upsert: true }
    );
  }

  await repairLinkedFinancialExpenses();
  expenses = await loadCollection('expenses');
  pocketDeposits = await loadCollection('pocket_deposits');
  employees = await loadCollection('employees');
  payroll = await loadCollection('payroll');
  rents = await loadCollection('rents');
  sales = await loadCollection('sales');
  capitalAssets = await loadCollection('capital_assets');
  inventory = (await db.collection('inventory').find({}).sort({ itemName: 1 }).toArray()).map(clean);
  inventoryMovements = await loadCollection('inventory_movements');
  manualInventory = (await db.collection('manual_inventory').find({}).sort({ name: 1 }).toArray()).map(clean);
  manualInventoryMovements = await loadCollection('manual_inventory_movements');
  console.log(`MongoDB connected: ${databaseName}`);
}

function monthKey(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function yearOf(value) {
  return new Date(value).getFullYear();
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function summarize(period = monthKey(), scope = 'monthly') {
  const excludedFlag = scope === 'annual' ? 'excludedFromAnnual' : 'excludedFromMonthly';
  const periodSales = sales.filter((sale) => sale.paymentStatus !== 'outstanding' && !sale[excludedFlag] && (sale.period || monthKey(sale.paidAt || sale.createdAt)) === period);
  const periodDebts = sales.filter((sale) => sale.paymentStatus === 'outstanding' && monthKey(sale.creditAt || sale.createdAt) === period);
  const periodExpenses = expenses.filter((expense) => !expense[excludedFlag] && (expense.period ? expense.period === period : monthKey(expense.createdAt) === period));
  const periodPocketDeposits = pocketDeposits.filter((deposit) => !deposit[excludedFlag] && (deposit.period ? deposit.period === period : monthKey(deposit.depositedAt || deposit.createdAt) === period));
  const periodStockOut = inventoryMovements.filter((movement) => movement.type === 'out' && !movement.excludedFromFinance && !movement[excludedFlag] && (movement.period || monthKey(movement.createdAt)) === period);
  const items = {};
  let unitsTotal = 0;
  periodSales.forEach((sale) => (sale.items || []).forEach((item) => {
    const key = item.id || item.name;
    const quantity = Number(item.qty ?? item.quantity) || 0;
    const revenue = Number(item.lineTotal) || (Number(item.price) || 0) * quantity;
    items[key] ||= { name: item.name, quantity: 0, revenue: 0 };
    items[key].quantity += quantity;
    items[key].revenue += revenue;
    unitsTotal += quantity;
  }));
  const inventoryCostTotal = periodStockOut.reduce((sum, item) => sum + (Number(item.costTotal) || 0), 0);
  const salesTotal = periodSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
  const expensesTotal = periodExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const pocketDepositsTotal = periodPocketDeposits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const daysInMonth = new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${period}-${String(index + 1).padStart(2, '0')}`;
    const dailySales = periodSales.filter((sale) => dateKey(sale.paidAt || sale.createdAt) === date);
    const dailyExpenses = periodExpenses.filter((expense) => dateKey(expense.createdAt || `${expense.period}-01`) === date);
    const dailyPocketDeposits = periodPocketDeposits.filter((deposit) => dateKey(deposit.depositedAt || deposit.createdAt || `${deposit.period}-01`) === date);
    const dailyStockOut = periodStockOut.filter((movement) => dateKey(movement.createdAt) === date);
    const sales = dailySales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const expenses = dailyExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const pocketDeposits = dailyPocketDeposits.reduce((sum, deposit) => sum + (Number(deposit.amount) || 0), 0);
    const inventoryCost = dailyStockOut.reduce((sum, movement) => sum + (Number(movement.costTotal) || 0), 0);
    const dailyDebts = periodDebts.filter((sale) => dateKey(sale.creditAt || sale.createdAt) === date);
    const debtTotal = dailyDebts.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    return { date, sales, pocketDeposits, expenses, inventoryCost, profit: sales - expenses - inventoryCost, availableCash: sales + pocketDeposits - expenses - inventoryCost, saleCount: dailySales.length, debtTotal, debtCount: dailyDebts.length };
  });
  return {
    period,
    startedAt: `${period}-01T00:00:00.000Z`,
    salesTotal,
    saleCount: periodSales.length,
    unitsTotal,
    items,
    expensesTotal,
    pocketDepositsTotal,
    inventoryCostTotal,
    exactProfit: salesTotal - expensesTotal - inventoryCostTotal,
    availableCash: salesTotal + pocketDepositsTotal - expensesTotal - inventoryCostTotal,
    debtTotal: periodDebts.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0),
    debtCount: periodDebts.length,
    debts: periodDebts,
    expenses: periodExpenses,
    pocketDeposits: periodPocketDeposits,
    days
  };
}

function annual(year = new Date().getFullYear()) {
  const selectedSales = sales.filter((item) => item.paymentStatus !== 'outstanding' && !item.excludedFromAnnual && (item.period ? Number(String(item.period).slice(0, 4)) === Number(year) : yearOf(item.paidAt || item.createdAt) === Number(year)));
  const selectedExpenses = expenses.filter((item) => !item.excludedFromAnnual && (item.period ? Number(String(item.period).slice(0, 4)) === Number(year) : yearOf(item.createdAt) === Number(year)));
  const selectedPocketDeposits = pocketDeposits.filter((item) => !item.excludedFromAnnual && (item.period ? Number(String(item.period).slice(0, 4)) === Number(year) : yearOf(item.depositedAt || item.createdAt) === Number(year)));
  const months = Array.from({ length: 12 }, (_, index) => {
    const period = `${year}-${String(index + 1).padStart(2, '0')}`;
    const account = summarize(period, 'annual');
    return { period, sales: account.salesTotal, pocketDeposits: account.pocketDepositsTotal, expenses: account.expensesTotal, inventoryCost: account.inventoryCostTotal, profit: account.exactProfit, availableCash: account.availableCash };
  });
  const salesTotal = selectedSales.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const expensesTotal = selectedExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const pocketDepositsTotal = selectedPocketDeposits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const inventoryCostTotal = months.reduce((sum, month) => sum + (Number(month.inventoryCost) || 0), 0);
  const expensesByCategory = selectedExpenses.reduce((result, item) => {
    const category = item.category || 'general';
    result[category] = (result[category] || 0) + (Number(item.amount) || 0);
    return result;
  }, {});
  return { year: Number(year), salesTotal, pocketDepositsTotal, expensesTotal, inventoryCostTotal, profit: salesTotal - expensesTotal - inventoryCostTotal, availableCash: salesTotal + pocketDepositsTotal - expensesTotal - inventoryCostTotal, months, expensesByCategory, expenseDetails: selectedExpenses, pocketDepositDetails: selectedPocketDeposits };
}

function financialYears() {
  const values = [...sales, ...expenses, ...pocketDeposits, ...inventoryMovements]
    .map((item) => Number(String(item.period || dateKey(item.paidAt || item.createdAt)).slice(0, 4)))
    .filter((year) => year >= 2020 && year <= 2100);
  values.push(new Date().getFullYear());
  return [...new Set(values)].sort((a, b) => b - a);
}

async function insert(name, value, cache) {
  await db.collection(name).insertOne(value);
  cache.unshift(value);
  return value;
}

async function remove(name, id, cache) {
  const result = await db.collection(name).deleteOne({ id });
  if (!result.deletedCount) return false;
  const index = cache.findIndex((item) => item.id === id);
  if (index >= 0) cache.splice(index, 1);
  return true;
}

async function insertFinancialReceipt(collectionName, receipt, receiptCache, expense) {
  await db.collection(collectionName).insertOne(receipt);
  try {
    await db.collection('expenses').insertOne(expense);
  } catch (error) {
    await db.collection(collectionName).deleteOne({ id: receipt.id });
    throw error;
  }
  receiptCache.unshift(receipt);
  expenses.unshift(expense);
  return receipt;
}

module.exports = {
  connect,
  close: () => client.close(),
  getExpenses: () => expenses,
  getPocketDeposits: () => pocketDeposits,
  getEmployees: () => employees,
  getPayroll: () => payroll,
  getRents: () => rents,
  getCapitalAssets: () => capitalAssets,
  getInventory: () => inventory,
  getInventoryMovements: () => inventoryMovements,
  getManualInventory: () => manualInventory,
  getManualInventoryMovements: () => manualInventoryMovements,
  getOutstandingDebts: () => sales.filter((sale) => sale.paymentStatus === 'outstanding'),
  monthly: summarize,
  annual,
  financialYears,
  addExpense: (value) => insert('expenses', value, expenses),
  deleteExpense: (id) => remove('expenses', id, expenses),
  addPocketDeposit: (value) => insert('pocket_deposits', value, pocketDeposits),
  deletePocketDeposit: (id) => remove('pocket_deposits', id, pocketDeposits),
  hideExpenseFromDaily: async (id) => {
    const result = await db.collection('expenses').updateOne({ id, sourceType: { $exists: false } }, { $set: { hiddenFromDaily: true, hiddenFromDailyAt: new Date().toISOString() } });
    if (!result.matchedCount) return false;
    const item = expenses.find((expense) => expense.id === id);
    if (item) { item.hiddenFromDaily = true; item.hiddenFromDailyAt = new Date().toISOString(); }
    return true;
  },
  hideManualExpensesFromDaily: async () => {
    const filter = { $or: [{ sourceType: { $exists: false } }, { sourceType: null }, { sourceType: '' }] };
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const isToday = (value) => { const date = new Date(value); return date >= start && date < end; };
    const hiddenFromDailyAt = new Date().toISOString();
    const result = await db.collection('expenses').updateMany({ $and: [filter, { createdAt: { $gte: start.toISOString(), $lt: end.toISOString() } }, { hiddenFromDaily: { $ne: true } }] }, { $set: { hiddenFromDaily: true, hiddenFromDailyAt } });
    expenses.forEach((item) => { if (!item.sourceType && isToday(item.createdAt)) { item.hiddenFromDaily = true; item.hiddenFromDailyAt = hiddenFromDailyAt; } });
    return result.modifiedCount;
  },
  deleteFinancialPeriod: async ({ month, year }) => {
    const isMonth = /^\d{4}-\d{2}$/.test(month || '');
    const prefix = isMonth ? month : String(year || '');
    if (!isMonth && !/^\d{4}$/.test(prefix)) throw new Error('Invalid financial period.');
    const datePattern = new RegExp(`^${prefix}`);
    const periodPattern = isMonth ? new RegExp(`^${month}$`) : new RegExp(`^${prefix}-`);
    const excludedFlag = isMonth ? 'excludedFromMonthly' : 'excludedFromAnnual';
    const deletedAtField = isMonth ? 'monthlyDeletedAt' : 'annualDeletedAt';
    const periodConditions = [{ period: periodPattern }, { paidAt: datePattern }, { createdAt: datePattern }];
    const recordFilter = { $and: [{ $or: periodConditions }, { [excludedFlag]: { $ne: true } }, { paymentStatus: { $ne: 'outstanding' } }] };
    const movementFilter = { $and: [{ type: 'out' }, { $or: [{ period: periodPattern }, { createdAt: datePattern }] }, { [excludedFlag]: { $ne: true } }] };
    const deletedAt = new Date().toISOString();
    const update = { $set: { [excludedFlag]: true, [deletedAtField]: deletedAt } };
    const [salesResult, expensesResult, pocketDepositsResult, movementsResult] = await Promise.all([
      db.collection('sales').updateMany(recordFilter, update),
      db.collection('expenses').updateMany(recordFilter, update),
      db.collection('pocket_deposits').updateMany(recordFilter, update),
      db.collection('inventory_movements').updateMany(movementFilter, update)
    ]);
    await reloadFinancialCaches();
    inventoryMovements = await loadCollection('inventory_movements');
    return { scope: isMonth ? 'monthly' : 'annual', sales: salesResult.modifiedCount, expenses: expensesResult.modifiedCount, pocketDeposits: pocketDepositsResult.modifiedCount, inventoryMovements: movementsResult.modifiedCount, receiptsPreserved: true };
  },
  addEmployee: (value) => insert('employees', value, employees),
  deleteEmployee: (id) => remove('employees', id, employees),
  addPayroll: (value) => insert('payroll', value, payroll),
  addPayrollReceipt: (payment, expense) => insertFinancialReceipt('payroll', payment, payroll, expense),
  deletePayrollReceipt: async (id) => {
    const payment = payroll.find((item) => item.id === id);
    if (!payment) return null;
    await db.collection('payroll').deleteOne({ id });
    payroll = payroll.filter((item) => item.id !== id);
    return payment;
  },
  addRent: (value) => insert('rents', value, rents),
  addRentReceipt: (rent, expense) => insertFinancialReceipt('rents', rent, rents, expense),
  deleteRentReceipt: async (id) => {
    const rent = rents.find((item) => item.id === id);
    if (!rent) return null;
    await db.collection('rents').deleteOne({ id });
    rents = rents.filter((item) => item.id !== id);
    return rent;
  },
  addCapitalAsset: (value) => insert('capital_assets', value, capitalAssets),
  deleteCapitalAsset: (id) => remove('capital_assets', id, capitalAssets),
  receiveStock: async (value) => {
    const existing = await db.collection('inventory').findOne({ itemId: value.itemId });
    if (existing) {
      const error = new Error('Stock item already exists.');
      error.code = 'STOCK_ALREADY_EXISTS';
      throw error;
    }
    const movement = { ...value, id: value.movementId, type: 'in' };
    delete movement.movementId;
    const stockItem = {
      itemId: value.itemId,
      itemName: value.itemName,
      groupId: value.groupId,
      unit: value.unit,
      reorderLevel: value.reorderLevel,
      quantity: value.quantity,
      averageCost: value.purchasePrice,
      salePrice: value.salePrice,
      createdAt: value.createdAt,
      updatedAt: value.createdAt
    };
    await db.collection('inventory').insertOne(stockItem);
    try {
      await db.collection('inventory_movements').insertOne(movement);
    } catch (error) {
      await db.collection('inventory').deleteOne({ itemId: value.itemId });
      throw error;
    }
    inventory = (await db.collection('inventory').find({}).sort({ itemName: 1 }).toArray()).map(clean);
    inventoryMovements.unshift(movement);
    return movement;
  },
  deleteInventoryItem: async (itemId) => {
    const existing = inventory.find((item) => item.itemId === itemId);
    if (!existing) return null;
    const [inventoryResult, movementsResult] = await Promise.all([
      db.collection('inventory').deleteOne({ itemId }),
      db.collection('inventory_movements').deleteMany({ itemId })
    ]);
    inventory = inventory.filter((item) => item.itemId !== itemId);
    inventoryMovements = inventoryMovements.filter((item) => item.itemId !== itemId);
    return { item: existing, inventoryDeleted: inventoryResult.deletedCount, movementsDeleted: movementsResult.deletedCount };
  },
  addManualInventoryItem: async (value) => {
    const item = { ...value };
    const movement = {
      id: value.movementId,
      itemId: value.id,
      itemName: value.name,
      type: 'in',
      quantity: value.quantity,
      unit: value.unit,
      unitPrice: value.unitPrice,
      value: value.quantity * value.unitPrice,
      note: value.note,
      balanceAfter: value.quantity,
      balanceValueAfter: value.quantity * value.unitPrice,
      createdAt: value.createdAt
    };
    delete item.movementId;
    await db.collection('manual_inventory').insertOne(item);
    try {
      await db.collection('manual_inventory_movements').insertOne(movement);
    } catch (error) {
      await db.collection('manual_inventory').deleteOne({ id: value.id });
      throw error;
    }
    manualInventory = (await db.collection('manual_inventory').find({}).sort({ name: 1 }).toArray()).map(clean);
    manualInventoryMovements.unshift(movement);
    return item;
  },
  adjustManualInventory: async (itemId, value) => {
    const existing = manualInventory.find((item) => item.id === itemId);
    if (!existing) return null;
    const direction = value.type === 'out' ? 'out' : 'in';
    const quantity = Math.max(0, Number(value.quantity) || 0);
    const delta = direction === 'out' ? -quantity : quantity;
    const filter = direction === 'out' ? { id: itemId, quantity: { $gte: quantity } } : { id: itemId };
    const updatedAt = value.createdAt;
    const result = await db.collection('manual_inventory').updateOne(filter, { $inc: { quantity: delta }, $set: { updatedAt } });
    if (!result.matchedCount) {
      const error = new Error('Insufficient manual stock.');
      error.code = 'INSUFFICIENT_MANUAL_STOCK';
      throw error;
    }
    const updated = clean(await db.collection('manual_inventory').findOne({ id: itemId }));
    const movement = {
      id: value.id,
      itemId,
      itemName: existing.name,
      type: direction,
      quantity,
      unit: existing.unit,
      unitPrice: Number(existing.unitPrice) || 0,
      value: quantity * (Number(existing.unitPrice) || 0),
      note: value.note,
      balanceAfter: Number(updated.quantity) || 0,
      balanceValueAfter: (Number(updated.quantity) || 0) * (Number(existing.unitPrice) || 0),
      createdAt: value.createdAt
    };
    try {
      await db.collection('manual_inventory_movements').insertOne(movement);
    } catch (error) {
      await db.collection('manual_inventory').updateOne({ id: itemId }, { $inc: { quantity: -delta }, $set: { updatedAt: existing.updatedAt || existing.createdAt } });
      throw error;
    }
    manualInventory = manualInventory.map((item) => item.id === itemId ? updated : item);
    manualInventoryMovements.unshift(movement);
    return { item: updated, movement };
  },
  deleteManualInventoryItem: async (itemId) => {
    const existing = manualInventory.find((item) => item.id === itemId);
    if (!existing) return null;
    const [itemResult, movementsResult] = await Promise.all([
      db.collection('manual_inventory').deleteOne({ id: itemId }),
      db.collection('manual_inventory_movements').deleteMany({ itemId })
    ]);
    manualInventory = manualInventory.filter((item) => item.id !== itemId);
    manualInventoryMovements = manualInventoryMovements.filter((item) => item.itemId !== itemId);
    return { item: existing, inventoryDeleted: itemResult.deletedCount, movementsDeleted: movementsResult.deletedCount };
  },
  addSale: async (value) => {
    const now = value.paidAt || value.creditAt || new Date().toISOString();
    if (value.paymentStatus !== 'outstanding') value.period ||= monthKey(now);
    await insert('sales', value, sales);
    const soldItems = new Map();
    for (const item of value.items || []) {
      const itemId = String(item.id || '').trim();
      const quantity = Math.max(0, Number(item.qty ?? item.quantity) || 0);
      if (!itemId || !quantity) continue;
      const current = soldItems.get(itemId) || { itemId, itemName: item.name, quantity: 0, saleRevenue: 0 };
      current.quantity += quantity;
      current.saleRevenue += Number(item.lineTotal) || (Number(item.price) || 0) * quantity;
      soldItems.set(itemId, current);
    }
    const updatedStock = [];
    const createdMovements = [];
    try {
      for (const sold of soldItems.values()) {
        const stockItem = inventory.find((entry) => entry.itemId === sold.itemId);
        const result = await db.collection('inventory').updateOne({ itemId: sold.itemId }, { $inc: { quantity: -sold.quantity }, $set: { updatedAt: now } });
        if (!result.matchedCount) continue;
        updatedStock.push({ itemId: sold.itemId, quantity: sold.quantity });
        const unitCost = Number(stockItem?.averageCost) || 0;
        const movement = { id: `MOV-${value.id}-${sold.itemId}`, itemId: sold.itemId, itemName: sold.itemName, quantity: sold.quantity, unit: stockItem?.unit || 'دانه', type: 'out', unitCost, costTotal: unitCost * sold.quantity, saleRevenue: sold.saleRevenue, grossProfit: sold.saleRevenue - (unitCost * sold.quantity), referenceId: value.id, period: value.period || monthKey(now), createdAt: now, ...(value.paymentStatus === 'outstanding' ? { excludedFromFinance: true, debtPending: true } : {}) };
        await db.collection('inventory_movements').insertOne(movement);
        createdMovements.push(movement);
      }
    } catch (error) {
      await Promise.all(updatedStock.map((item) => db.collection('inventory').updateOne({ itemId: item.itemId }, { $inc: { quantity: item.quantity } })));
      await db.collection('inventory_movements').deleteMany({ referenceId: value.id });
      await db.collection('sales').deleteOne({ id: value.id });
      sales = sales.filter((sale) => sale.id !== value.id);
      inventory = (await db.collection('inventory').find({}).sort({ itemName: 1 }).toArray()).map(clean);
      inventoryMovements = await loadCollection('inventory_movements');
      throw error;
    }
    inventory = (await db.collection('inventory').find({}).sort({ itemName: 1 }).toArray()).map(clean);
    inventoryMovements.unshift(...createdMovements.reverse());
    return value;
  },
  settleDebt: async (id, settledAt = new Date().toISOString()) => {
    const debt = sales.find((sale) => sale.id === id && sale.paymentStatus === 'outstanding');
    if (!debt) return null;
    const period = monthKey(settledAt);
    const result = await db.collection('sales').updateOne(
      { id, paymentStatus: 'outstanding' },
      { $set: { paymentStatus: 'paid', paymentMethod: 'Cash', paidAt: settledAt, checkoutTimestamp: settledAt, settledAt, period } }
    );
    if (!result.matchedCount) return null;
    await db.collection('inventory_movements').updateMany(
      { referenceId: id, debtPending: true },
      { $set: { excludedFromFinance: false, debtPending: false, period, createdAt: settledAt, settledAt } }
    );
    Object.assign(debt, { paymentStatus: 'paid', paymentMethod: 'Cash', paidAt: settledAt, checkoutTimestamp: settledAt, settledAt, period });
    inventoryMovements.forEach((movement) => {
      if (movement.referenceId === id && movement.debtPending) Object.assign(movement, { excludedFromFinance: false, debtPending: false, period, createdAt: settledAt, settledAt });
    });
    return debt;
  }
};
