/**
 * Google Apps Script for FAQs and Announcements Management
 * Supports CRUD operations for both FAQs (Sheet1) and Announcements (Sheet2)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet with FAQs and Announcements
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code
 * 4. Update SHEET_ID below with your actual Google Sheet ID
 * 5. Save the script
 * 6. Deploy > New deployment > Type: Web app
 * 7. Execute as: Me
 * 8. Who has access: Anyone (IMPORTANT: Must be "Anyone" for CORS to work)
 * 9. Click Deploy
 * 10. Copy the Web App URL and update it in faqs.js
 */

const SHEET_ID = "1c6pXD1hL-GmIqfnCIwVUAlRGv75AiSbSkIJG9_6XNeA";
const BUCKET_NAME = "tara_vault";
const FILE_NAME = "FAQ.csv";
const PROJECT_ID = "project-049fd3bf-7c2e-4a73-890";
const DATA_STORE_ID = "tara2";

/**
 * Handles GET requests - Fetch FAQs or Announcements
 */
function doGet(e) {
  try {
    const type = e.parameter.type || 'faqs'; // 'faqs' or 'announcements'
    const rowNumber = e.parameter.row; // Optional: specific row number
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet;
    
    if (type === 'announcements') {
      sheet = ss.getSheets()[1] || ss.getSheets()[0]; // Sheet2 (index 1) or fallback to Sheet1
    } else {
      sheet = ss.getSheets()[0]; // Sheet1 for FAQs
    }
    
    const rows = sheet.getDataRange().getValues();
    
    if (rowNumber) {
      // Return specific row
      const rowIndex = parseInt(rowNumber);
      if (rowIndex > 0 && rowIndex <= rows.length) {
        const row = rows[rowIndex - 1]; // Convert to 0-based index
        if (type === 'announcements') {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            data: {
              row: rowIndex,
              timestamp: row[0] || "",
              announcement: row[1] || ""
            }
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            data: {
              row: rowIndex,
              question: row[0] || "",
              answer: row[1] || "",
              timestamp: row[2] || ""
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      } else {
        throw new Error('Invalid row number');
      }
    } else {
      // Return all rows (skip header)
      if (type === 'announcements') {
        const announcements = rows.slice(1).map((row, index) => ({
          id: `announcement-${index + 2}`, // Row number (index + 2 because we skip header)
          row: index + 2,
          timestamp: row[0] || "",
          announcement: row[1] || ""
        }));
        return ContentService.createTextOutput(JSON.stringify(announcements))
                             .setMimeType(ContentService.MimeType.JSON);
      } else {
        const faqs = rows.slice(1).map((row, index) => ({
          id: `faq-${index + 2}`, // Row number (index + 2 because we skip header)
          row: index + 2,
          question: row[0] || "",
          answer: row[1] || "",
          timestamp: row[2] || ""
        }));
        return ContentService.createTextOutput(JSON.stringify(faqs))
                             .setMimeType(ContentService.MimeType.JSON);
      }
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error',
      data: { error: err.toString() }
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles POST requests - All CRUD operations
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const type = data.type || 'faqs'; // 'faqs' or 'announcements'
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet;
    
    if (type === 'announcements') {
      // Get or create Sheet2 for announcements
      const sheets = ss.getSheets();
      if (sheets.length > 1) {
        sheet = sheets[1]; // Sheet2
      } else {
        // Create Sheet2 if it doesn't exist
        sheet = ss.insertSheet('Sheet2');
        // Add header row
        sheet.getRange(1, 1, 1, 2).setValues([['Timestamp', 'Announcement']]);
      }
    } else {
      sheet = ss.getSheets()[0]; // Sheet1 for FAQs
    }
    
    switch (action) {
      case 'getFAQs':
      case 'getAnnouncements':
        return handleGet(type, sheet, data.row);
      
      case 'addFAQ':
      case 'addAnnouncement':
        return handleAdd(type, sheet, data.data);
      
      case 'updateFAQ':
      case 'updateAnnouncement':
        return handleUpdate(type, sheet, data.id || data.row, data.data);
      
      case 'deleteFAQ':
      case 'deleteAnnouncement':
        return handleDelete(type, sheet, data.id || data.row);
      
      default:
        throw new Error('Unknown action: ' + action);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      data: { error: err.toString() }
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET operation
 */
function handleGet(type, sheet, rowNumber) {
  const rows = sheet.getDataRange().getValues();
  
  if (rowNumber) {
    const rowIndex = parseInt(rowNumber);
    if (rowIndex > 0 && rowIndex <= rows.length) {
      const row = rows[rowIndex - 1];
      if (type === 'announcements') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          data: {
            row: rowIndex,
            timestamp: row[0] || "",
            announcement: row[1] || ""
          }
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          data: {
            row: rowIndex,
            question: row[0] || "",
            answer: row[1] || "",
            timestamp: row[2] || ""
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      throw new Error('Invalid row number');
    }
  } else {
    // Return all (skip header)
    if (type === 'announcements') {
      const items = rows.slice(1).map((row, index) => ({
        id: `announcement-${index + 2}`,
        row: index + 2,
        timestamp: row[0] || "",
        announcement: row[1] || ""
      }));
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: items
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      const items = rows.slice(1).map((row, index) => ({
        id: `faq-${index + 2}`,
        row: index + 2,
        question: row[0] || "",
        answer: row[1] || "",
        timestamp: row[2] || ""
      }));
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: items
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
}

/**
 * Handle ADD operation
 */
function handleAdd(type, sheet, data) {
  const itemsToAdd = Array.isArray(data) ? data : [data];
  const timestamp = new Date();
  
  itemsToAdd.forEach(item => {
    if (type === 'announcements') {
      if (item.announcement) {
        sheet.appendRow([timestamp, item.announcement]);
      }
    } else {
      if (item.question && item.answer) {
        sheet.appendRow([item.question, item.answer, timestamp]);
      }
    }
  });
  
  // Trigger GCS update and re-index (only for FAQs)
  if (type === 'faqs') {
    pushFileToGCS(SHEET_ID);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { message: `Successfully added ${itemsToAdd.length} ${type === 'announcements' ? 'announcement(s)' : 'FAQ(s)'}` }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle UPDATE operation
 */
function handleUpdate(type, sheet, idOrRow, data) {
  let rowIndex;
  
  // Extract row number from ID (e.g., "faq-5" -> 5) or use direct row number
  if (typeof idOrRow === 'string' && idOrRow.includes('-')) {
    rowIndex = parseInt(idOrRow.split('-')[1]);
  } else {
    rowIndex = parseInt(idOrRow);
  }
  
  const rows = sheet.getDataRange().getValues();
  
  if (rowIndex < 2 || rowIndex > rows.length) {
    throw new Error(`${type === 'announcements' ? 'Announcement' : 'FAQ'} not found with row: ${rowIndex}`);
  }
  
  // Update the row (0-based index)
  if (type === 'announcements') {
    sheet.getRange(rowIndex, 1).setValue(new Date()); // Update timestamp
    sheet.getRange(rowIndex, 2).setValue(data.announcement || '');
  } else {
    sheet.getRange(rowIndex, 1).setValue(data.question || '');
    sheet.getRange(rowIndex, 2).setValue(data.answer || '');
    sheet.getRange(rowIndex, 3).setValue(new Date()); // Update timestamp
  }
  
  // Trigger GCS update and re-index (only for FAQs)
  if (type === 'faqs') {
    pushFileToGCS(SHEET_ID);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { message: `${type === 'announcements' ? 'Announcement' : 'FAQ'} updated successfully` }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle DELETE operation
 */
function handleDelete(type, sheet, idOrRow) {
  let rowIndex;
  
  // Extract row number from ID (e.g., "faq-5" -> 5) or use direct row number
  if (typeof idOrRow === 'string' && idOrRow.includes('-')) {
    rowIndex = parseInt(idOrRow.split('-')[1]);
  } else {
    rowIndex = parseInt(idOrRow);
  }
  
  const rows = sheet.getDataRange().getValues();
  
  if (rowIndex < 2 || rowIndex > rows.length) {
    throw new Error(`${type === 'announcements' ? 'Announcement' : 'FAQ'} not found with row: ${rowIndex}`);
  }
  
  // Delete the row
  sheet.deleteRow(rowIndex);
  
  // Trigger GCS update and re-index (only for FAQs)
  if (type === 'faqs') {
    pushFileToGCS(SHEET_ID);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: { message: `${type === 'announcements' ? 'Announcement' : 'FAQ'} deleted successfully` }
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Push FAQ data to Google Cloud Storage
 */
function pushFileToGCS(sheetId) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // Proper CSV escaping for commas and quotes
    let csvContent = data.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    const blob = Utilities.newBlob(csvContent, "text/csv", FILE_NAME);

    // Upload to GCS
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${FILE_NAME}`;
    const options = {
      method: "POST",
      contentType: "text/csv",
      payload: blob.getBytes(),
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() == 200) {
      console.log("GCS Upload Success");
      triggerVertexAIImport(PROJECT_ID, DATA_STORE_ID, BUCKET_NAME, FILE_NAME);
    } else {
      console.error("GCS Upload Failed: " + response.getContentText());
      // Don't throw error - allow FAQ operations to succeed even if GCS fails
    }
  } catch (err) {
    console.error("Error in pushFileToGCS: " + err.toString());
    // Don't throw error - allow FAQ operations to succeed even if GCS fails
  }
}

/**
 * Trigger Vertex AI re-indexing
 */
function triggerVertexAIImport(projectId, dataStoreId, bucket, file) {
  try {
    const url = `https://discoveryengine.googleapis.com/v1/projects/${projectId}/locations/global/collections/default_collection/dataStores/${dataStoreId}/branches/0/documents:import`;
    
    const payload = {
      gcsSource: { inputUris: [`gs://${bucket}/${file}`] },
      reconciliationMode: "INCREMENTAL"
    };

    const options = {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    console.log("Vertex AI Re-index Triggered: " + response.getContentText());
  } catch (err) {
    console.error("Error in triggerVertexAIImport: " + err.toString());
    // Don't throw error - allow FAQ operations to succeed even if re-index fails
  }
}
