/**
 * Google Apps Script to update Boom Barrier Status (Tag #, Payment Status, Comments)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet with the boom barrier data
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code
 * 4. Replace 'YOUR_SHEET_ID' with your actual Google Sheet ID (found in the URL)
 * 5. Replace 'Sheet1' with your actual sheet name if different
 * 6. Update column indices below to match your sheet structure
 * 7. Save the script
 * 8. Deploy > New deployment > Type: Web app
 * 9. Execute as: Me
 * 10. Who has access: Anyone (IMPORTANT: Must be "Anyone" for CORS to work)
 * 11. Click Deploy
 * 12. Copy the Web App URL and update it in boom-barrier-status.js
 */

// Configuration - UPDATE THESE VALUES
const SHEET_ID = 'YOUR_SHEET_ID'; // Replace with your Google Sheet ID
const SHEET_NAME = 'Sheet1'; // Replace with your sheet name if different

// Column indices (0-based, A=0, B=1, C=2, etc.)
// Update these to match your actual column positions
const COLUMN_INDICES = {
  VEHICLE_NUMBER: 0,    // Column A - Vehicle Number
  PARKING_NAME: 1,      // Column B - Parking Name
  TYPE: 2,              // Column C - Type (Car, Two Wheeler)
  AMOUNT: 3,            // Column D - Amount
  NAME: 4,              // Column E - Name
  TAG: 5,               // Column F - Tag #
  PENDING: 6,           // Column G - Pending (Payment Status)
  PARKING_LOCATION: 7,  // Column H - Parking Location
  COMMENT: 8,           // Column I - Comment
  DOOR_NUMBER: 9        // Column J - Door Number (if exists, otherwise use Name field)
};

/**
 * Main function to handle HTTP GET requests (for testing or direct access)
 */
function doGet(e) {
  try {
    // For GET requests, we can return data or a simple message
    // This is useful for testing or direct browser access
    const action = e.parameter.action;
    
    if (action === 'getBoomBarrierData') {
      const data = getAllBoomBarrierData();
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'success',
          data: data
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default response for GET requests
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'info',
        message: 'Boom Barrier Status API',
        note: 'Use POST requests for updates. Use ?action=getBoomBarrierData for GET requests.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        data: { success: false, error: error.toString() }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main function to handle HTTP POST requests
 */
function doPost(e) {
  try {
    // Check if postData exists
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error',
          data: { success: false, error: 'No request data received' }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse the request
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error',
          data: { success: false, error: 'Invalid JSON in request: ' + parseError.toString() }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const action = requestData.action;
    
    if (!action) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error',
          data: { success: false, error: 'Missing action' }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if SHEET_ID is configured
    if (SHEET_ID === 'YOUR_SHEET_ID') {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error',
          data: { success: false, error: 'SHEET_ID not configured. Please update the script with your Google Sheet ID.' }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle updateBoomBarrierCommonFields action - updates parking location and pending for all records with same door number
    if (action === 'updateBoomBarrierCommonFields') {
      const doorNumber = requestData.doorNumber;
      const parkingLocation = requestData.parkingLocation || '';
      const pending = requestData.pending || '0';
      
      if (!doorNumber) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'error',
            data: { success: false, error: 'Missing doorNumber' }
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const result = updateBoomBarrierCommonFields(doorNumber, parkingLocation, pending);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: result.success ? 'success' : 'error',
          data: result
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle updateBoomBarrier action
    if (action === 'updateBoomBarrier') {
      const doorNumber = requestData.doorNumber;
      const vehicleNumber = requestData.vehicleNumber;
      const tag = requestData.tag || '';
      const comment = requestData.comment || '';
      
      if (!doorNumber || !vehicleNumber) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'error',
            data: { success: false, error: 'Missing doorNumber or vehicleNumber' }
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const result = updateBoomBarrierRecord(doorNumber, vehicleNumber, tag, '', '', comment);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: result.success ? 'success' : 'error',
          data: result
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle getBoomBarrierData action - retrieves all data from Google Sheet
    if (action === 'getBoomBarrierData') {
      const data = getAllBoomBarrierData();
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'success',
          data: data
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle updateMultipleBoomBarrier action (for updating multiple records at once)
    if (action === 'updateMultipleBoomBarrier') {
      const commonFields = requestData.commonFields; // {doorNumber, pending}
      const updates = requestData.updates; // Array of {doorNumber, vehicleNumber, tag, parkingLocation, comment}
      
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      // First, update common fields (currently only pending) for all records with same door number
      if (commonFields && commonFields.doorNumber) {
        const commonResult = updateBoomBarrierCommonFields(
          commonFields.doorNumber,
          '', // parkingLocation is now per-vehicle
          commonFields.pending || '0'
        );
        results.push({ type: 'common', result: commonResult });
        if (commonResult.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      // Then, update individual records (tag, parking location and comment)
      if (updates && Array.isArray(updates) && updates.length > 0) {
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          const result = updateBoomBarrierRecord(
            update.doorNumber,
            update.vehicleNumber,
            update.tag || '',
            commonFields && commonFields.pending ? commonFields.pending : '', // pending - common for this batch
            update.parkingLocation || '',
            update.comment || ''
          );
          results.push({ type: 'individual', result: result });
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'success',
          data: {
            success: true,
            updated: successCount,
            errors: errorCount,
            results: results
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        data: { success: false, error: 'Unknown action: ' + action }
      }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        data: { success: false, error: error.toString() }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Extract door number from a string (e.g., "C-1104" or "C1104" from "C-1104 - John Doe")
 */
function extractDoorNumber(text) {
  if (!text) return '';
  // Match patterns like "A-1001", "A1001", "B-202", "C1104", etc. (case insensitive)
  const match = text.toString().match(/([A-Z])-?(\d+)/i);
  if (match) {
    return match[1].toUpperCase() + '-' + match[2];
  }
  return '';
}

/**
 * Normalize door number to handle both "C-1104" and "C1104" formats
 */
function normalizeDoorNumber(doorNumber) {
  if (!doorNumber) return '';
  let normalized = doorNumber.toString().toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^([A-Z])(\d+)$/);
  if (match) {
    return match[1] + '-' + match[2];
  }
  return normalized;
}

/**
 * Update parking location and pending for all records with the same door number
 * @param {string} doorNumber - Door number (e.g., "C-1104" or "C1104")
 * @param {string} parkingLocation - Parking location
 * @param {string} pending - Pending amount (0 for paid)
 * @return {object} Result object with success status and count of updated rows
 */
function updateBoomBarrierCommonFields(doorNumber, parkingLocation, pending) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    if (!spreadsheet) {
      return { success: false, error: 'Spreadsheet not found with ID: ' + SHEET_ID };
    }
    
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return { success: false, error: 'Sheet not found: ' + SHEET_NAME };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return { success: false, error: 'No data rows found (only header or empty sheet)' };
    }
    
    const normalizedDoorNumber = normalizeDoorNumber(doorNumber);
    const updatedRows = [];
    
    // Find and update all rows with matching door number
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // Try to get door number from doorNumber, parkingName, or name fields
      const rowDoorNumber = normalizeDoorNumber(
        row[COLUMN_INDICES.DOOR_NUMBER] || 
        extractDoorNumber(row[COLUMN_INDICES.PARKING_NAME] || '') || 
        extractDoorNumber(row[COLUMN_INDICES.NAME] || '')
      );
      
      if (rowDoorNumber === normalizedDoorNumber) {
        const rowNum = i + 1; // +1 because sheet rows are 1-indexed
        
        // Update Parking Location
        if (COLUMN_INDICES.PARKING_LOCATION !== undefined) {
          sheet.getRange(rowNum, COLUMN_INDICES.PARKING_LOCATION + 1).setValue(parkingLocation);
        }
        
        // Update Pending
        if (COLUMN_INDICES.PENDING !== undefined) {
          sheet.getRange(rowNum, COLUMN_INDICES.PENDING + 1).setValue(pending);
        }
        
        updatedRows.push(rowNum);
      }
    }
    
    if (updatedRows.length === 0) {
      return { success: false, error: 'No records found for door number: ' + doorNumber };
    }
    
    Logger.log('Updated ' + updatedRows.length + ' rows for door number: ' + doorNumber);
    
    return { 
      success: true, 
      message: 'Common fields updated successfully',
      updatedRows: updatedRows.length
    };
    
  } catch (error) {
    Logger.log('Error updating common fields: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Update a boom barrier record in Google Sheets
 * @param {string} doorNumber - Door number (e.g., "C-1104" or "C1104")
 * @param {string} vehicleNumber - Vehicle number to identify the specific record
 * @param {string} tag - Tag number
 * @param {string} pending - Pending amount (0 for paid)
 * @param {string} parkingLocation - Parking location
 * @param {string} comment - Comment
 * @return {object} Result object with success status
 */
function updateBoomBarrierRecord(doorNumber, vehicleNumber, tag, pending, parkingLocation, comment) {
  try {
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    if (!spreadsheet) {
      return { success: false, error: 'Spreadsheet not found with ID: ' + SHEET_ID };
    }
    
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return { success: false, error: 'Sheet not found: ' + SHEET_NAME };
    }
    
    // Get all data
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return { success: false, error: 'No data rows found (only header or empty sheet)' };
    }
    
    // Normalize door number for matching
    const normalizedDoorNumber = normalizeDoorNumber(doorNumber);
    const vehicleNumberUpper = vehicleNumber.toUpperCase();
    
    // Find the matching row
    let foundRow = -1;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowVehicleNumber = (row[COLUMN_INDICES.VEHICLE_NUMBER] || '').toString().toUpperCase();
      // Try to get door number from doorNumber, parkingName, or name fields
      const rowDoorNumber = normalizeDoorNumber(
        row[COLUMN_INDICES.DOOR_NUMBER] || 
        extractDoorNumber(row[COLUMN_INDICES.PARKING_NAME] || '') || 
        extractDoorNumber(row[COLUMN_INDICES.NAME] || '')
      );
      
      // Match by vehicle number and door number
      if (rowVehicleNumber === vehicleNumberUpper && rowDoorNumber === normalizedDoorNumber) {
        foundRow = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }
    
    if (foundRow === -1) {
      return { success: false, error: 'Record not found for door number: ' + doorNumber + ', vehicle: ' + vehicleNumber };
    }
    
    // Update the row
    // Update Tag # (Column F, index 5)
    if (COLUMN_INDICES.TAG !== undefined) {
      sheet.getRange(foundRow, COLUMN_INDICES.TAG + 1).setValue(tag);
    }
    
    // Update Comment (Column I, index 8)
    if (COLUMN_INDICES.COMMENT !== undefined) {
      sheet.getRange(foundRow, COLUMN_INDICES.COMMENT + 1).setValue(comment);
    }
    
    // Update Pending, if provided
    if (pending !== '' && COLUMN_INDICES.PENDING !== undefined) {
      sheet.getRange(foundRow, COLUMN_INDICES.PENDING + 1).setValue(pending);
    }
    
    // Update Parking Location, if provided
    if (parkingLocation !== '' && COLUMN_INDICES.PARKING_LOCATION !== undefined) {
      sheet.getRange(foundRow, COLUMN_INDICES.PARKING_LOCATION + 1).setValue(parkingLocation);
    }
    
    Logger.log('Updated row ' + foundRow + ' for door number: ' + doorNumber + ', vehicle: ' + vehicleNumber);
    
    return { 
      success: true, 
      message: 'Record updated successfully',
      row: foundRow
    };
    
  } catch (error) {
    Logger.log('Error updating boom barrier record: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get all boom barrier data from Google Sheet
 * Returns an array of all records
 */
function getAllBoomBarrierData() {
  try {
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    if (!spreadsheet) {
      Logger.log('Spreadsheet not found with ID: ' + SHEET_ID);
      return [];
    }
    
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      Logger.log('Sheet not found: ' + SHEET_NAME);
      return [];
    }
    
    // Get all data
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      Logger.log('No data rows found (only header or empty sheet)');
      return [];
    }
    
    const records = [];
    
    // Process data rows (skip header row at index 0)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[COLUMN_INDICES.VEHICLE_NUMBER]) {
        continue;
      }
      
      const record = {
        vehicleNumber: (row[COLUMN_INDICES.VEHICLE_NUMBER] || '').toString(),
        parkingName: (row[COLUMN_INDICES.PARKING_NAME] || '').toString(),
        type: (row[COLUMN_INDICES.TYPE] || '').toString(),
        amount: (row[COLUMN_INDICES.AMOUNT] || '').toString(),
        name: (row[COLUMN_INDICES.NAME] || '').toString(),
        tag: (row[COLUMN_INDICES.TAG] || '').toString(),
        pending: (row[COLUMN_INDICES.PENDING] || '0').toString(),
        parkingLocation: (row[COLUMN_INDICES.PARKING_LOCATION] || '').toString(),
        comment: (row[COLUMN_INDICES.COMMENT] || '').toString(),
        doorNumber: (row[COLUMN_INDICES.DOOR_NUMBER] || '').toString()
      };
      
      records.push(record);
    }
    
    Logger.log('Retrieved ' + records.length + ' records from Google Sheet');
    return records;
    
  } catch (error) {
    Logger.log('Error getting boom barrier data: ' + error.toString());
    return [];
  }
}

/**
 * Test function - can be run manually to test updating a record
 * Replace with test values from your sheet
 */
function testUpdateBoomBarrier() {
  const result = updateBoomBarrierRecord(
    'C-1104',           // doorNumber
    'TN-01-AB-1234',   // vehicleNumber
    'TAG123',          // tag
    '500',             // pending
    'Test comment'     // comment
  );
  Logger.log('Update result: ' + JSON.stringify(result));
}

/**
 * Test function - can be run manually to test retrieving all data
 */
function testGetAllBoomBarrierData() {
  const data = getAllBoomBarrierData();
  Logger.log('Retrieved ' + data.length + ' records');
  if (data.length > 0) {
    Logger.log('First record: ' + JSON.stringify(data[0]));
  }
}
