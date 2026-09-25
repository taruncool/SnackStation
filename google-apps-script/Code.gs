/**
 * SnackStation — Google Sheets backend
 * -------------------------------------
 * Paste this whole file into Extensions > Apps Script (in your Google Sheet),
 * replacing the default Code.gs content. See SETUP.md for full instructions.
 *
 * Endpoints (after deploying as a Web App):
 *   GET  {url}?sheet=Products              -> all rows in the "Products" tab as JSON
 *   POST {url}  { sheet, action, data }    -> action: "add" | "addMany" | "update" | "updateMany" | "delete"
 *
 * Every sheet/tab must have a header row. Rows are matched for update/delete
 * by a column named "id".
 */

/**
 * Adds a "SnackStation" menu to the Google Sheet itself (next to File, Edit,
 * View...) so you can seed the data with one click from the Sheet — no need
 * to hunt through the Apps Script editor's toolbar at all. This runs
 * automatically every time you open the Sheet, once the script is saved.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SnackStation')
    .addItem('Seed Demo Data', 'seedSnackStationData')
    .addItem('Seed Sample Sales History', 'seedSampleSalesHistory')
    .addToUi();
}

function doGet(e) {
  var sheetName = e.parameter.sheet;
  if (!sheetName) return jsonResponse({ error: 'Missing sheet parameter' });
  return jsonResponse(readSheet(sheetName));
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' });
  }

  var sheetName = body.sheet;
  var action = body.action;
  var data = body.data;
  if (!sheetName || !action) return jsonResponse({ error: 'Missing sheet or action' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ error: 'Sheet not found: ' + sheetName });

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (action === 'add') {
    sheet.appendRow(rowFromObject(headers, data));
    return jsonResponse({ success: true });
  }

  if (action === 'addMany') {
    var rows = (data || []).map(function (item) {
      return rowFromObject(headers, item);
    });
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
    }
    return jsonResponse({ success: true, count: rows.length });
  }

  if (action === 'update') {
    var idColUpdate = headers.indexOf('id') + 1;
    var rowIndexUpdate = findRowById(sheet, idColUpdate, data.id);
    if (rowIndexUpdate === -1) return jsonResponse({ error: 'Row not found' });
    sheet
      .getRange(rowIndexUpdate, 1, 1, headers.length)
      .setValues([rowFromObject(headers, data)]);
    return jsonResponse({ success: true });
  }

  if (action === 'updateMany') {
    var idColUpdateMany = headers.indexOf('id') + 1;
    var itemsUpdateMany = data || [];
    var updatedCount = 0;
    for (var u = 0; u < itemsUpdateMany.length; u++) {
      var rowIndexMany = findRowById(sheet, idColUpdateMany, itemsUpdateMany[u].id);
      if (rowIndexMany === -1) continue;
      sheet
        .getRange(rowIndexMany, 1, 1, headers.length)
        .setValues([rowFromObject(headers, itemsUpdateMany[u])]);
      updatedCount++;
    }
    return jsonResponse({ success: true, count: updatedCount });
  }

  if (action === 'delete') {
    var idColDelete = headers.indexOf('id') + 1;
    var rowIndexDelete = findRowById(sheet, idColDelete, data.id);
    if (rowIndexDelete === -1) return jsonResponse({ error: 'Row not found' });
    sheet.deleteRow(rowIndexDelete);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Unknown action: ' + action });
}

function rowFromObject(headers, obj) {
  return headers.map(function (h) {
    return obj && obj[h] !== undefined ? obj[h] : '';
  });
}

function findRowById(sheet, idCol, id) {
  if (sheet.getLastRow() < 2) return -1;
  var values = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function readSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var range = sheet.getDataRange().getValues();
  var headers = range[0];
  var rows = [];
  for (var i = 1; i < range.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = range[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * ------------------------------------------------------------------------
 * ONE-CLICK SEED: run this once (Run > seedSnackStationData, in the Apps
 * Script editor toolbar) to create every tab with the right headers and
 * pre-fill Products/Categories/Customers/Offers/Expenses with the same
 * demo data the app shipped with, so you're not typing it all in by hand.
 * SalesHistory is created with the right headers but starts empty — the
 * app appends rows there itself.
 * ------------------------------------------------------------------------
 */
function seedSnackStationData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  setSheetData(ss, 'Products',
    ['id', 'name', 'category', 'sku', 'costPrice', 'sellingPrice', 'gst', 'unit', 'stockQty', 'minStock', 'expiryDate', 'status', 'image'],
    [
      ['P001', 'Chicken Pop Corn', 'Snacks', 'SS-SN-001', 60, 99, 5, 'box', 42, 10, '2026-11-30', 'active', 'Chicken-Pop-corn'],
      ['P002', 'Chicken Classic', 'Fast Food', 'SS-FF-001', 78, 129, 5, 'box', 18, 10, '2026-10-31', 'active', 'Chicken-CLassic'],
      ['P003', 'Chicken Wings', 'Snacks', 'SS-SN-002', 90, 149, 5, 'plate', 27, 10, '2026-11-30', 'active', 'Chicken-Wings'],
      ['P004', 'Chicken Wrap', 'Fast Food', 'SS-FF-002', 72, 119, 5, 'wrap', 16, 10, '2026-10-31', 'active', 'Chicken-Wrap'],
      ['P005', 'Chicken Strips', 'Snacks', 'SS-SN-003', 84, 139, 5, 'box', 24, 10, '2026-11-30', 'active', 'Chicken-strips'],
      ['P006', 'Classic Chicken Burger', 'Fast Food', 'SS-FF-003', 102, 169, 5, 'piece', 31, 10, '2026-10-31', 'active', 'Classic-Chicken-Burger'],
      ['P007', 'Classic Hot Dog', 'Fast Food', 'SS-FF-004', 78, 129, 5, 'piece', 22, 10, '2026-10-31', 'active', 'Classic-Hot-Dog'],
      ['P008', 'Crunchy Chicken Burger', 'Fast Food', 'SS-FF-005', 96, 159, 5, 'piece', 15, 10, '2026-10-31', 'active', 'Crunchy-Chicken-Burger'],
      ['P009', 'Eggnator', 'Fast Food', 'SS-FF-006', 90, 149, 5, 'piece', 20, 10, '2026-10-31', 'active', 'EGGNATOR'],
      ['P010', 'French Fries', 'Snacks', 'SS-SN-004', 35, 69, 5, 'box', 65, 10, '2026-11-30', 'active', 'French-Fries'],
      ['P011', 'Kinley', 'Beverages', 'SS-BV-001', 12, 20, 12, 'bottle', 90, 10, '2027-03-01', 'active', 'Kinley'],
      ['P012', 'Mix Veg Wrap', 'Fast Food', 'SS-FF-007', 60, 99, 5, 'wrap', 19, 10, '2026-10-31', 'active', 'MIX-VEG-WRAP'],
      ['P013', 'Mix Veg Supreme Wrap', 'Fast Food', 'SS-FF-008', 72, 119, 5, 'wrap', 14, 10, '2026-10-31', 'active', 'Mix-Veg-Supreme-Wrap'],
      ['P014', 'Nugget Wrap', 'Fast Food', 'SS-FF-009', 66, 109, 5, 'wrap', 17, 10, '2026-10-31', 'active', 'Nugget-Wrap'],
      ['P015', 'Nuggets', 'Snacks', 'SS-SN-005', 70, 119, 5, 'box', 8, 10, '2026-11-30', 'active', 'Nuggets'],
      ['P016', 'Peri Peri Fries', 'Snacks', 'SS-SN-006', 50, 89, 5, 'box', 30, 10, '2026-11-30', 'active', 'Peri-Peri-fries'],
      ['P017', 'Sausage Wrap', 'Fast Food', 'SS-FF-010', 66, 109, 5, 'wrap', 12, 10, '2026-10-31', 'active', 'Sausage-Wrap'],
      ['P018', 'Sheek Kebab Hot Dog', 'Fast Food', 'SS-FF-011', 84, 139, 5, 'piece', 16, 10, '2026-10-31', 'active', 'Sheek-Kebab-Hot-Dog'],
      ['P019', 'Sheek Kebab Wrap', 'Fast Food', 'SS-FF-012', 78, 129, 5, 'wrap', 13, 10, '2026-10-31', 'active', 'Sheek-kebab-Wrap'],
      ['P020', 'Stuffed Hot Dog', 'Fast Food', 'SS-FF-013', 90, 149, 5, 'piece', 21, 10, '2026-10-31', 'active', 'Stuffed-Hot-Dog'],
      ['P021', 'Supreme Veg Burger', 'Fast Food', 'SS-FF-014', 84, 139, 5, 'piece', 25, 10, '2026-10-31', 'active', 'Supreme-Veg-Burger'],
      ['P022', 'Thums Up', 'Beverages', 'SS-BV-002', 22, 40, 12, 'bottle', 75, 10, '2027-03-01', 'active', 'Thums-Up'],
      ['P023', 'Veg Burger', 'Fast Food', 'SS-FF-015', 66, 109, 5, 'piece', 28, 10, '2026-10-31', 'active', 'Veg-Burger'],
      ['P024', 'Veg Classic Burger', 'Fast Food', 'SS-FF-016', 78, 129, 5, 'piece', 20, 10, '2026-10-31', 'active', 'Veg-Classic-Burger'],
    ]
  );

  setSheetData(ss, 'Categories',
    ['id', 'name', 'icon', 'productCount'],
    [
      ['cat-01', 'Snacks', 'fast-food-outline', 6],
      ['cat-02', 'Fast Food', 'pizza-outline', 16],
      ['cat-03', 'Beverages', 'cafe-outline', 2],
      ['cat-04', 'Ice Cream', 'snow-outline', 0],
    ]
  );

  setSheetData(ss, 'Customers',
    ['id', 'name', 'phone', 'email', 'loyaltyPoints', 'outstandingAmount', 'group', 'totalOrders'],
    [
      ['C001', 'Ravi Teja', '9876543210', 'ravi.teja@example.com', 320, 0, 'VIP', 24],
      ['C002', 'Priya Sharma', '9123456780', 'priya.sharma@example.com', 85, 150, 'Regular', 6],
      ['C003', 'Arjun Kumar', '9988776655', 'arjun.kumar@example.com', 12, 0, 'New', 1],
      ['C004', 'Sneha Reddy', '9012345678', 'sneha.reddy@example.com', 540, 0, 'VIP', 41],
    ]
  );

  setSheetData(ss, 'Offers',
    ['id', 'title', 'type', 'description', 'value', 'active'],
    [
      ['OFF01', 'Weekend Combo', 'Combo Offer', 'Chicken Popcorn + Fries + Coke at a flat price', '₹149', true],
      ['OFF02', 'Happy Hour 4-6 PM', 'Percentage Discount', '20% off on all snacks', '20%', true],
      ['OFF03', 'Buy 1 Get 1 - Wings', 'BOGO', 'Buy one plate of Juicy Wings, get one free', 'BOGO', false],
      ['OFF04', 'Birthday Treat', 'Loyalty Offer', 'Free Crunchy Burger on your birthday', 'Free item', true],
    ]
  );

  // Sales history starts empty — the app appends rows here every time
  // "Submit Today's Sales" is tapped in the Sales Count page. costAtSale is
  // captured per row so Reports can compute each day's margin.
  setSheetData(ss, 'SalesHistory',
    ['id', 'date', 'productId', 'productName', 'qty', 'priceAtSale', 'costAtSale', 'submittedAt'],
    []
  );

  // Expenses / Inventory — Raw Material, Kitchen Appliances (equipment,
  // depreciated via usefulLifeMonths), Store Expenses, Salaries, Transport
  // Charges, Utility, Miscellaneous. Seeded with a few starter entries.
  setSheetData(ss, 'Expenses',
    ['id', 'date', 'category', 'name', 'amount', 'notes', 'usefulLifeMonths'],
    [
      ['E001', '2026-09-01', 'Kitchen Appliances', 'Commercial Gas Stove (4-burner)', 18000, 'One-time kitchen setup', 36],
      ['E002', '2026-09-01', 'Kitchen Appliances', 'LPG Gas Connection', 3500, 'Deposit + first cylinder', 36],
      ['E003', '2026-09-02', 'Kitchen Appliances', 'Cooking Utensils & Tools Set', 6500, 'Pans, ladles, tongs, fryer basket', 36],
      ['E004', '2026-09-10', 'Raw Material', 'Chicken (bulk, 20kg)', 4200, '', ''],
      ['E005', '2026-09-10', 'Raw Material', 'Burger buns & wraps (200 pcs)', 1800, '', ''],
      ['E006', '2026-09-12', 'Utility', 'LPG Cylinder Refill', 1100, '', ''],
      ['E007', '2026-09-01', 'Store Expenses', 'Shop Rent', 12000, 'September rent', ''],
      ['E008', '2026-09-05', 'Salaries', 'Kitchen Staff Wages', 15000, '2 staff, weekly payout', ''],
      ['E009', '2026-09-08', 'Transport Charges', 'Ingredient Delivery / Pickup', 800, '', ''],
      ['E010', '2026-09-15', 'Miscellaneous', 'Packaging Boxes & Bags', 1400, '', ''],
    ]
  );

  Logger.log('SnackStation sheet tabs created and seeded successfully.');
  try {
    // Works when run via the Sheet's own "SnackStation" menu; if you instead
    // ran this from the Apps Script editor's Run button, there's no Sheet UI
    // to pop an alert into, so this is just skipped — check the Execution
    // log above instead.
    SpreadsheetApp.getUi().alert('SnackStation sheet tabs created and seeded ✅');
  } catch (err) {
    // no-op — see comment above
  }
}

/**
 * Fills the SalesHistory tab with realistic demo sales spanning today, this
 * week, this month, and earlier this year — so Dashboard/Reports' Day, Week,
 * Month, and Year tabs all have something to show instead of ₹0 everywhere.
 * Dates are computed relative to whenever you run this (not hardcoded), so
 * it looks right no matter when you seed it.
 *
 * SEPARATE from "Seed Demo Data" on purpose: this ONLY touches SalesHistory,
 * so re-running it later never wipes your real Products/Customers/etc, and
 * you can safely run it again if you want a fresh batch of demo sales.
 * (It DOES overwrite whatever is currently in SalesHistory, so don't run
 * this once you have real sales you want to keep — that's what "Submit
 * Today's Sales" in the app is for.)
 */
function seedSampleSalesHistory() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone() || 'Etc/UTC';
  var today = new Date();

  // A handful of real products (id/name/price/cost must match the Products
  // tab) to spread sample sales across.
  var sampleProducts = [
    { id: 'P001', name: 'Chicken Pop Corn', price: 99, cost: 60 },
    { id: 'P002', name: 'Chicken Classic', price: 129, cost: 78 },
    { id: 'P005', name: 'Chicken Strips', price: 139, cost: 84 },
    { id: 'P006', name: 'Classic Chicken Burger', price: 169, cost: 102 },
    { id: 'P010', name: 'French Fries', price: 69, cost: 35 },
    { id: 'P011', name: 'Kinley', price: 20, cost: 12 },
  ];
  // Base quantity per product, and how many days back from today each
  // "sales day" is, with a rough multiplier so numbers vary a bit rather
  // than repeating identically.
  var baseQty = [6, 4, 5, 3, 7, 9];
  var salesDays = [
    { daysAgo: 0, mult: 1.0 }, // today
    { daysAgo: 1, mult: 0.9 },
    { daysAgo: 2, mult: 1.1 },
    { daysAgo: 3, mult: 0.8 }, // still this week
    { daysAgo: 6, mult: 1.2 },
    { daysAgo: 12, mult: 0.9 }, // still this month
    { daysAgo: 20, mult: 1.0 },
    { daysAgo: 45, mult: 0.8 }, // earlier this year
    { daysAgo: 90, mult: 1.1 },
  ];

  var rows = [];
  salesDays.forEach(function (day) {
    var d = new Date(today.getTime() - day.daysAgo * 24 * 60 * 60 * 1000);
    var dateStr = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    var submittedAt = d.toISOString();
    sampleProducts.forEach(function (p, idx) {
      var qty = Math.max(1, Math.round(baseQty[idx] * day.mult));
      rows.push([
        dateStr + '-' + p.id + '-demo' + day.daysAgo,
        dateStr,
        p.id,
        p.name,
        qty,
        p.price,
        p.cost,
        submittedAt,
      ]);
    });
  });

  setSheetData(
    ss,
    'SalesHistory',
    ['id', 'date', 'productId', 'productName', 'qty', 'priceAtSale', 'costAtSale', 'submittedAt'],
    rows
  );

  Logger.log('Seeded ' + rows.length + ' sample SalesHistory rows.');
  try {
    SpreadsheetApp.getUi().alert('Seeded ' + rows.length + ' sample sales rows across today/this week/this month/this year ✅');
  } catch (err) {
    // no-op — see comment in seedSnackStationData
  }
}

function setSheetData(ss, name, headers, rows) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
}
