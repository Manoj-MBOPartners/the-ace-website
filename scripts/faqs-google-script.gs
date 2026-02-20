/**
 * Google Apps Script for TARA: FAQs and Announcements Management
 * Now with Asynchronous Background Syncing.
 */

const SHEET_ID = "1c6pXD1hL-GmIqfnCIwVUAlRGv75AiSbSkIJG9_6XNeA";
const BUCKET_NAME = "tara_vault";
const PROJECT_ID = "656911601245"; 
const DATA_STORE_ID = "tara2";

// Server-side cache duration (5 minutes = 300 seconds)
const CACHE_DURATION_SECONDS = 300;

function doGet(e) {
  try {
    const type = e.parameter.type || 'faqs';
    const cacheKey = `data_${type}`;
    
    // Try to get from cache first for faster response
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      Logger.log(`Returning cached data for ${type}`);
      return createJsonResponse(JSON.parse(cachedData));
    }
    
    // Cache miss - fetch from spreadsheet
    Logger.log(`Cache miss for ${type}, fetching from spreadsheet`);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = (type === 'announcements') ? (ss.getSheets()[1] || ss.insertSheet('Sheet2')) : ss.getSheets()[0];
    
    const data = sheet.getDataRange().getValues();
    
    // Skip header row (row 1, index 0)
    const rows = data.slice(1);
    
    const items = rows.map((row, index) => {
      const rowNum = index + 2; // +2 because we skipped header and arrays are 0-indexed
      if (type === 'announcements') {
        return {
          id: `announcement-${rowNum}`,
          row: rowNum,
          timestamp: row[0] ? row[0].toString() : '',
          announcement: row[1] ? row[1].toString() : ''
        };
      } else {
        return {
          id: `faq-${rowNum}`,
          row: rowNum,
          question: row[0] ? row[0].toString() : '',
          answer: row[1] ? row[1].toString() : '',
          timestamp: row[2] ? row[2].toString() : ''
        };
      }
    }).filter(item => {
      // Filter out empty rows - for FAQs, only require question (answer can be empty for unanswered questions)
      if (type === 'announcements') {
        return item.announcement && item.announcement.trim() !== '';
      } else {
        // Only require question to be non-empty (allows unanswered questions)
        return item.question && item.question.trim() !== '';
      }
    });
    
    // Cache the result for faster subsequent requests
    try {
      cache.put(cacheKey, JSON.stringify(items), CACHE_DURATION_SECONDS);
      Logger.log(`Cached ${items.length} ${type} items`);
    } catch (cacheErr) {
      Logger.log(`Cache write error: ${cacheErr}`);
    }
    
    return createJsonResponse(items);
  } catch (err) {
    return createJsonResponse({ status: 'error', data: { error: err.toString() } });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const type = data.type || 'faqs';
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = (type === 'announcements') ? (ss.getSheets()[1] || ss.insertSheet('Sheet2')) : ss.getSheets()[0];
    
    let result;
    switch (action) {
      case 'addFAQ': case 'addAnnouncement':
        result = handleAdd(type, sheet, data.data); break;
      case 'updateFAQ': case 'updateAnnouncement':
        result = handleUpdate(type, sheet, data.id || data.row, data.data); break;
      case 'deleteFAQ': case 'deleteAnnouncement':
        result = handleDelete(type, sheet, data.id || data.row); break;
      default: throw new Error('Unknown action: ' + action);
    }

    // Invalidate server-side cache after any data modification
    invalidateCache(type);

    // --- ASYNC TRIGGER ---
    // Schedules the GCS push to happen 1 second after this response returns.
    // Store the type to sync in ScriptProperties so backgroundSync knows what to push.
    const props = PropertiesService.getScriptProperties();
    const pendingSync = props.getProperty('pendingSync');
    
    // If there's already a pending sync for the other type, sync both
    if (pendingSync && pendingSync !== type) {
      props.setProperty('pendingSync', 'both');
    } else {
      props.setProperty('pendingSync', type);
    }
    
    ScriptApp.newTrigger('backgroundSync')
             .timeBased()
             .after(1000)
             .create();

    return createJsonResponse({ status: 'success', message: `${type} updated. Syncing with TARA in background.` });
  } catch (err) {
    return createJsonResponse({ status: 'error', data: { error: err.toString() } });
  }
}

// Invalidate server-side cache for a specific type
function invalidateCache(type) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = `data_${type}`;
    cache.remove(cacheKey);
    Logger.log(`Cache invalidated for ${type}`);
  } catch (err) {
    Logger.log(`Cache invalidation error: ${err}`);
  }
}

/**
 * Background Wrapper
 * Triggered functions cannot take arguments, so we read from ScriptProperties.
 */
function backgroundSync() {
  // Clean up the trigger so it doesn't run again
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'backgroundSync') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Read which type needs syncing from ScriptProperties
  const props = PropertiesService.getScriptProperties();
  const pendingSync = props.getProperty('pendingSync');
  props.deleteProperty('pendingSync'); // Clear after reading
  
  // Only sync the type that was updated
  if (pendingSync === 'both') {
    pushFileToGCS('faqs');
    pushFileToGCS('announcements');
  } else if (pendingSync === 'announcements') {
    pushFileToGCS('announcements');
  } else if (pendingSync === 'faqs') {
    pushFileToGCS('faqs');
  }
}

// --- CRUD Handlers (Updated to remove direct sync) ---

function handleAdd(type, sheet, data) {
  const itemsToAdd = Array.isArray(data) ? data : [data];
  const now = new Date();
  itemsToAdd.forEach(item => {
    (type === 'announcements') ? sheet.appendRow([now, item.announcement]) : sheet.appendRow([item.question, item.answer, now]);
  });
  return { status: 'success' };
}

function handleUpdate(type, sheet, idOrRow, data) {
  const rowIndex = extractRowIndex(idOrRow);
  const now = new Date();
  (type === 'announcements') ? sheet.getRange(rowIndex, 1, 1, 2).setValues([[now, data.announcement]]) : sheet.getRange(rowIndex, 1, 1, 3).setValues([[data.question, data.answer, now]]);
  return { status: 'success' };
}

function handleDelete(type, sheet, idOrRow) {
  const rowIndex = extractRowIndex(idOrRow);
  sheet.deleteRow(rowIndex);
  return { status: 'success' };
}

// --- Infrastructure ---

function pushFileToGCS(type) {
  const fileName = (type === 'announcements') 
    ? "Announcements.txt" 
    : "FAQ.txt";

  const sheetIndex = (type === 'announcements') ? 1 : 0;

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[sheetIndex];
    const data = sheet.getDataRange().getValues();

    // Convert entire sheet into unstructured plain text
    let textContent = "";

    data.forEach((row, index) => {
      if (type === 'announcements') {
        if (index !== 0) {
          textContent += `Announcement:\n${row[0]}\n`;
          textContent += `Timestamp: ${row[1]}\n\n`;
        }
      } else {
        if (index !== 0) {
          textContent += `Question:\n${row[0]}\n`;
          textContent += `Answer:\n${row[1]}\n`;
          textContent += `Timestamp: ${row[2]}\n\n`;
        }
      }
    });

    const blob = Utilities.newBlob(
      textContent,
      "text/plain",
      fileName
    );

    UrlFetchApp.fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${fileName}`,
      {
        method: "POST",
        contentType: "text/plain",
        payload: blob.getBytes(),
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }
      }
    );

    triggerVertexAIImport(fileName);

  } catch (err) {
    Logger.log(`Sync Error: ${err}`);
  }
}

function triggerVertexAIImport(fileName) {
  const url = `https://discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores/${DATA_STORE_ID}/branches/0/documents:import`;

  const payload = {
    gcsSource: {
      inputUris: [`gs://${BUCKET_NAME}/**`],
      dataSchema: "content"
    },
    reconciliationMode: "INCREMENTAL"
  };

  UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
}

// --- Utilities ---
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function extractRowIndex(idOrRow) {
  const index = (typeof idOrRow === 'string' && idOrRow.includes('-')) ? parseInt(idOrRow.split('-')[1]) : parseInt(idOrRow);
  if (isNaN(index) || index < 2) throw new Error("Invalid Row");
  return index;
}