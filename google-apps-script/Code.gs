/**
 * SnackStation — Google Sheets backend
 * -------------------------------------
 * Paste this whole file into Extensions > Apps Script (in your Google Sheet),
 * replacing the default Code.gs content. See SETUP.md for full instructions.
 *
 * Endpoints (after deploying as a Web App):
 *   GET  {url}?sheet=Products              -> all rows in the "Products" tab as JSON
 *   POST {url}  { sheet, action, data }    -> action: "add" | "addMany" | "update" | "delete"
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
 * pre-fill Products/Categories/Customers/Offers with the same demo data
 * the app shipped with, so you're not typing it all in by hand.
 * ------------------------------------------------------------------------
 */
function seedSnackStationData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  setSheetData(ss, 'Products',
    ['id', 'name', 'category', 'sku', 'purchasePrice', 'sellingPrice', 'gst', 'unit', 'stockQty', 'minStock', 'expiryDate', 'status', 'image'],
    [
      ['P001', 'Chicken Popcorn', 'Snacks', 'SS-CP-001', 60, 99, 5, 'box', 42, 10, '2026-09-15', 'active', 'chicken-popcorn'],
      ['P002', 'Chicken Nuggets', 'Snacks', 'SS-CN-002', 70, 119, 5, 'box', 8, 10, '2026-08-30', 'active', 'chicken-nuggets'],
      ['P003', 'French Fries', 'Snacks', 'SS-FF-003', 35, 69, 5, 'box', 65, 15, '2026-10-01', 'active', 'french-fries'],
      ['P004', 'Juicy Wings', 'Snacks', 'SS-JW-004', 90, 149, 5, 'plate', 27, 10, '2026-08-20', 'active', 'juicy-wings'],
      ['P005', 'Crispy Chicken Tenders', 'Snacks', 'SS-CT-005', 80, 139, 5, 'box', 5, 10, '2026-08-18', 'active', 'chicken-tenders'],
      ['P006', 'Crunchy Burger', 'Bakery', 'SS-CB-006', 75, 129, 5, 'piece', 33, 10, '2026-08-05', 'active', 'crunchy-burger'],
      ['P007', 'Coca-Cola 500ml', 'Beverages', 'SS-CC-007', 20, 40, 12, 'bottle', 120, 30, '2027-01-01', 'active', 'cola'],
      ['P008', 'Iced Tea', 'Beverages', 'SS-IT-008', 18, 35, 12, 'bottle', 3, 20, '2026-12-01', 'active', 'iced-tea'],
      ['P009', 'Choco Frozen Bar', 'Frozen Foods', 'SS-FB-009', 25, 50, 18, 'piece', 18, 10, '2026-11-10', 'active', 'frozen-bar'],
    ]
  );

  setSheetData(ss, 'Categories',
    ['id', 'name', 'icon', 'productCount'],
    [
      ['cat-01', 'Snacks', 'fast-food-outline', 5],
      ['cat-02', 'Beverages', 'cafe-outline', 2],
      ['cat-03', 'Bakery', 'pizza-outline', 1],
      ['cat-04', 'Frozen Foods', 'snow-outline', 1],
      ['cat-05', 'Dairy', 'water-outline', 0],
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
  // "Submit Today's Sales" is tapped in the Sales Count page.
  setSheetData(ss, 'SalesHistory',
    ['id', 'date', 'productId', 'productName', 'qty', 'priceAtSale', 'submittedAt'],
    []
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
