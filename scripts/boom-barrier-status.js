// Boom barrier data storage
let boomBarrierData = [];
let currentRecords = [];

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybmeKv0ncX9uV8X6iyNMjH4Hm7KfRlcaO5uvpcX0JPKt8wlEOD79vExb86nhgj-s8D/exec';

// Fetch boom barrier data from Google Sheet via Google Apps Script
async function loadBoomBarrierData() {
  try {
    // Check if Google Script URL is configured
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
      console.warn('Google Script URL not configured. Cannot load data from Google Sheet.');
      return [];
    }
    
    console.log('Loading boom barrier data from Google Sheet...');
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'getBoomBarrierData'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data from Google Sheet: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error retrieving data from Google Sheet');
    }
    
    if (responseData.status === 'success' && Array.isArray(responseData.data)) {
      boomBarrierData = responseData.data;
      console.log(`Loaded ${boomBarrierData.length} records from Google Sheet`);
      return boomBarrierData;
    } else {
      throw new Error('Invalid data format received from Google Script');
    }
  } catch (error) {
    console.error('Error loading boom barrier data from Google Sheet:', error);
    // Return empty array on error so the page can still function
    return [];
  }
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      let cleaned = current.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      values.push(cleaned);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last value
  let cleaned = current.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  values.push(cleaned);
  
  return values;
}

// Normalize door number to handle both "C-1104" and "C1104" formats
function normalizeDoorNumber(doorNumber) {
  if (!doorNumber) return '';
  // Remove all spaces and convert to uppercase
  let normalized = doorNumber.toString().toUpperCase().replace(/\s+/g, '');
  // If it doesn't have a dash, add one after the letter (e.g., "C1104" -> "C-1104")
  const match = normalized.match(/^([A-Z])(\d+)$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  // If it already has a dash, just return it
  return normalized;
}

// Extract door number from a string (e.g., "C-1104" or "C1104" from "C-1104 - John Doe")
function extractDoorNumber(text) {
  if (!text) return '';
  // Match patterns like "A-1001", "A1001", "B-202", "C1104", etc. (case insensitive)
  const match = text.match(/([A-Z])-?(\d+)/i);
  if (match) {
    return `${match[1].toUpperCase()}-${match[2]}`;
  }
  return '';
}

// Check if two door numbers match (handles both formats)
function doorNumbersMatch(door1, door2) {
  if (!door1 || !door2) return false;
  
  // Normalize both to handle "C-1104" and "C1104" formats
  const norm1 = normalizeDoorNumber(door1);
  const norm2 = normalizeDoorNumber(door2);
  
  // Check exact match
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for partial matches)
  const norm1NoDash = norm1.replace(/-/g, '');
  const norm2NoDash = norm2.replace(/-/g, '');
  if (norm1NoDash === norm2NoDash) return true;
  
  return false;
}

// Find records by door number (case insensitive, supports both "C-1104" and "C1104")
function findRecordsByDoorNumber(doorNumber) {
  const searchKey = doorNumber.trim().toUpperCase();
  const normalizedSearchKey = normalizeDoorNumber(searchKey);
  const searchKeyNoDash = normalizedSearchKey.replace(/-/g, '');
  
  console.log('Searching for door number:', searchKey);
  console.log('Normalized search key:', normalizedSearchKey);
  console.log('Total records in database:', boomBarrierData.length);
  
  const results = boomBarrierData.filter(record => {
    const recordDoorNumber = (record.doorNumber || '').toUpperCase();
    const recordName = (record.name || '').toUpperCase();
    const recordVehicleNumber = (record.vehicleNumber || '').toUpperCase();
    const recordParkingName = (record.parkingName || '').toUpperCase();
    
    // Normalize record door number
    const normalizedRecordDoorNumber = normalizeDoorNumber(recordDoorNumber);
    
    // Try to extract door number from name if door number column is empty
    let extractedDoorNumber = normalizedRecordDoorNumber;
    if (!extractedDoorNumber && recordName) {
      extractedDoorNumber = extractDoorNumber(recordName);
    }
    
    // Check exact match using normalized door numbers
    if (doorNumbersMatch(searchKey, recordDoorNumber)) {
      console.log('Match found in doorNumber field:', record);
      return true;
    }
    
    // Check extracted door number
    if (extractedDoorNumber && doorNumbersMatch(searchKey, extractedDoorNumber)) {
      console.log('Match found in extracted door number:', record);
      return true;
    }
    
    // Check if door number contains the search key (normalized)
    if (normalizedRecordDoorNumber.includes(normalizedSearchKey) || 
        normalizedRecordDoorNumber.includes(searchKeyNoDash) ||
        normalizedRecordDoorNumber.replace(/-/g, '').includes(searchKeyNoDash)) {
      console.log('Match found (contains) in doorNumber:', record);
      return true;
    }
    
    // Check if door number is in Name field (format: "A-1001 - John Doe" or "A1001 - John Doe")
    const normalizedRecordName = normalizeDoorNumber(recordName);
    if (normalizedRecordName.includes(normalizedSearchKey) || 
        normalizedRecordName.includes(searchKeyNoDash) ||
        recordName.includes(normalizedSearchKey) || 
        recordName.includes(searchKeyNoDash)) {
      console.log('Match found in name field:', record);
      return true;
    }
    
    // Check in vehicle number (sometimes door number might be there)
    const normalizedVehicleNumber = normalizeDoorNumber(recordVehicleNumber);
    if (normalizedVehicleNumber.includes(normalizedSearchKey) || 
        normalizedVehicleNumber.includes(searchKeyNoDash)) {
      console.log('Match found in vehicleNumber:', record);
      return true;
    }
    
    // Check in parking name
    const normalizedParkingName = normalizeDoorNumber(recordParkingName);
    if (normalizedParkingName.includes(normalizedSearchKey) || 
        normalizedParkingName.includes(searchKeyNoDash)) {
      console.log('Match found in parkingName:', record);
      return true;
    }
    
    // Check if door number column is empty but name field starts with door number pattern
    if (recordDoorNumber === '' && recordName.match(new RegExp(`^${searchKeyNoDash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s-]`, 'i'))) {
      console.log('Match found (starts with) in name:', record);
      return true;
    }
    
    // Check all raw values for the search key (normalized)
    if (record.raw && record.raw.some(val => {
      if (!val) return false;
      const valUpper = val.toString().toUpperCase();
      const normalizedVal = normalizeDoorNumber(valUpper);
      return normalizedVal.includes(normalizedSearchKey) || 
             normalizedVal.includes(searchKeyNoDash) ||
             normalizedVal.replace(/-/g, '') === searchKeyNoDash;
    })) {
      console.log('Match found in raw values:', record);
      return true;
    }
    
    return false;
  });
  
  console.log(`Found ${results.length} matching records`);
  return results;
}

// Parse pending amount - can be a number or text
function parsePendingAmount(pending) {
  if (!pending || pending === '') return 0;
  
  // If it's text "Paid", return 0
  const pendingLower = pending.toString().toLowerCase().trim();
  if (pendingLower === 'paid' || pendingLower === '0') return 0;
  
  // Try to parse as number
  const num = parseFloat(pending.toString().replace(/,/g, '').replace(/"/g, '').trim());
  return isNaN(num) ? 0 : num;
}

// Check if payment is pending
function isPaymentPending(pending) {
  const pendingAmount = parsePendingAmount(pending);
  return pendingAmount !== 0;
}

// Display vehicle records
function displayVehicleRecords(records) {
  currentRecords = records;
  const container = document.getElementById('vehicleRecords');
  container.innerHTML = '';
  
  if (records.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No records found for this door number.</p>';
    return;
  }
  
  // Get common values from first record (all records should have same door number)
  const firstRecord = records[0];
  const commonPendingAmount = parsePendingAmount(firstRecord.pending);
  const commonIsPending = isPaymentPending(firstRecord.pending);
  // Try to get door number from doorNumber, parkingName, or name fields
  const doorNumber = normalizeDoorNumber(
    firstRecord.doorNumber || 
    extractDoorNumber(firstRecord.parkingName || '') || 
    extractDoorNumber(firstRecord.name || '')
  );
  
  // Display all vehicle records first
  records.forEach((record, index) => {
    const recordDiv = document.createElement('div');
    recordDiv.className = 'vehicle-record';
    recordDiv.id = `record-${index}`;
    
    const pendingAmount = parsePendingAmount(record.pending);
    const isPending = isPaymentPending(record.pending);
    const statusClass = isPending ? 'status-pending' : 'status-paid';
    const statusText = isPending ? 'Pending' : 'Paid';
    const parkingLocation = (record.parkingLocation || '').toLowerCase();
    const isStilt = parkingLocation === 'stilt';
    const isBasement = parkingLocation === 'basement';
    
    // Determine vehicle type (2W or 4W)
    const vehicleType = (record.type || '').toLowerCase();
    let typeDisplay = '';
    if (vehicleType.includes('two') || vehicleType.includes('2w') || vehicleType.includes('wheeler')) {
      typeDisplay = '2W';
    } else if (vehicleType.includes('car') || vehicleType.includes('4w') || vehicleType.includes('four')) {
      typeDisplay = '4W';
    } else {
      // Default to 4W if unclear
      typeDisplay = '4W';
    }
    
    const vehicleNumber = escapeHtml(record.vehicleNumber || '-');
    const recordTitle = `${vehicleNumber} | ${typeDisplay}`;
    
    recordDiv.innerHTML = `
      <div class="record-header">
        <div class="record-title">${recordTitle}</div>
        <div class="record-status ${statusClass}">${statusText}</div>
      </div>
      
      <div class="edit-section">
        <div class="edit-field">
          <label for="tag-${index}">Tag # *</label>
          <input type="text" id="tag-${index}" value="${escapeHtml(record.tag || '')}" placeholder="Enter tag number (numbers only)" pattern="[0-9]+" required>
        </div>
        <div class="edit-field">
          <label for="vehicleParkingLocation-${index}">Parking Location *</label>
          <select id="vehicleParkingLocation-${index}" required>
            <option value="">Select Parking Location</option>
            <option value="stilt" ${isStilt ? 'selected' : ''}>Stilt</option>
            <option value="basement" ${isBasement ? 'selected' : ''}>Basement</option>
          </select>
        </div>
        <div class="edit-field">
          <label for="comment-${index}">Comment</label>
          <textarea id="comment-${index}" placeholder="Enter any comments">${escapeHtml(record.comment || '')}</textarea>
        </div>
      </div>
    `;
    
    container.appendChild(recordDiv);
    
    // Add input event listener to restrict Tag # to numbers only
    const tagInput = document.getElementById(`tag-${index}`);
    if (tagInput) {
      tagInput.addEventListener('input', function(e) {
        // Remove any non-numeric characters
        this.value = this.value.replace(/[^0-9]/g, '');
      });
      
      // Also prevent paste of non-numeric content
      tagInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const numbersOnly = paste.replace(/[^0-9]/g, '');
        this.value = numbersOnly;
      });
    }
  });
  
  // Add common fields section (Parking Location and Payment Status) before the button
  const commonFieldsDiv = document.createElement('div');
  commonFieldsDiv.className = 'vehicle-record';
  commonFieldsDiv.id = 'common-fields';
  commonFieldsDiv.style.marginBottom = '20px';
  commonFieldsDiv.style.marginTop = '20px';
  commonFieldsDiv.style.border = '2px solid #000080';

  commonFieldsDiv.innerHTML = `
    <div class="edit-section">
      <div class="edit-field">
        <label for="commonPaymentStatus">Payment Status</label>
        <select id="commonPaymentStatus" ${!commonIsPending ? 'disabled' : ''}>
          <option value="0" ${!commonIsPending ? 'selected' : ''}>Paid (₹0)</option>
          <option value="${commonPendingAmount}" ${commonIsPending ? 'selected' : ''}>Pending (${formatCurrency(commonPendingAmount)})</option>
        </select>
      </div>
    </div>
  `;
  
  container.appendChild(commonFieldsDiv);
  
  // Add page-level "Tag(s) issued" button after common fields
  const tagIssuedButton = document.createElement('button');
  tagIssuedButton.type = 'button';
  tagIssuedButton.className = 'tag-issued-button';
  tagIssuedButton.id = 'tagIssuedButton';
  tagIssuedButton.textContent = records.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
  tagIssuedButton.style.marginTop = '20px';
  tagIssuedButton.onclick = handleAllTagsIssued;
  container.appendChild(tagIssuedButton);
}

// Format currency
function formatCurrency(value) {
  if (!value || value === '') return '₹0';
  const num = parseFloat(value.toString().replace(/,/g, '')) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  document.getElementById('successMessage').style.display = 'none';
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
  document.getElementById('errorMessage').style.display = 'none';
}

// Hide messages
function hideMessages() {
  document.getElementById('errorMessage').style.display = 'none';
  document.getElementById('successMessage').style.display = 'none';
}

// Handle all tags issued button click (page level)
async function handleAllTagsIssued() {
  if (!currentRecords || currentRecords.length === 0) {
    showError('No records found');
    return;
  }
  
  const button = document.getElementById('tagIssuedButton');
  if (!button) {
    showError('Button not found');
    return;
  }
  
  // Disable button and show loading
  button.disabled = true;
  button.textContent = 'Updating...';
  
  try {
    // Get common field (Payment Status)
    const commonPaymentStatusSelect = document.getElementById('commonPaymentStatus');
    
    if (!commonPaymentStatusSelect) {
      showError('Common payment status field not found');
      button.disabled = false;
      button.textContent = currentRecords.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
      return;
    }
    
    // Get door number from first record (all records have same door number)
    // Try to get door number from doorNumber, parkingName, or name fields
    const firstRecord = currentRecords[0];
    const doorNumber = normalizeDoorNumber(
      firstRecord.doorNumber || 
      extractDoorNumber(firstRecord.parkingName || '') || 
      extractDoorNumber(firstRecord.name || '')
    );
    
    if (!doorNumber) {
      showError('Could not determine door number from record data');
      button.disabled = false;
      button.textContent = currentRecords.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
      return;
    }
    
    let commonPendingAmount = 0;
    if (commonPaymentStatusSelect) {
      const selectedValue = commonPaymentStatusSelect.value;
      if (selectedValue === '0') {
        commonPendingAmount = 0;
      } else {
        commonPendingAmount = parseFloat(selectedValue) || parsePendingAmount(firstRecord.pending);
      }
    }
    
    // Collect individual updates (Tag #, Parking Location and Comment per record)
    const updates = [];
    
    for (let i = 0; i < currentRecords.length; i++) {
      const record = currentRecords[i];
      const tagInput = document.getElementById(`tag-${i}`);
      const commentTextarea = document.getElementById(`comment-${i}`);
      const parkingLocationSelect = document.getElementById(`vehicleParkingLocation-${i}`);
      
      if (!tagInput || !commentTextarea || !parkingLocationSelect) {
        continue;
      }
      
      // Validate Tag # - must be numbers only and not empty
      const tagValue = tagInput.value.trim();
      if (!tagValue) {
        showError(`Tag # is required for Vehicle ${i + 1}`);
        button.disabled = false;
        button.textContent = currentRecords.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
        return;
      }
      
      if (!/^\d+$/.test(tagValue)) {
        showError(`Tag # must contain only numbers for Vehicle ${i + 1}`);
        button.disabled = false;
        button.textContent = currentRecords.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
        return;
      }
      
      const parkingLocationValue = parkingLocationSelect.value.trim();
      if (!parkingLocationValue) {
        showError(`Parking Location is required for Vehicle ${i + 1}`);
        button.disabled = false;
        button.textContent = currentRecords.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
        return;
      }
      
      updates.push({
        doorNumber: doorNumber,
        vehicleNumber: record.vehicleNumber || '',
        tag: tagValue,
        parkingLocation: parkingLocationValue,
        comment: commentTextarea.value.trim()
      });
    }
    
    if (updates.length === 0) {
      showError('No records to update');
      button.disabled = false;
      button.textContent = currentRecords.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
      return;
    }
    
    // Send updates to Google Sheet if URL is configured
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          cache: 'no-store',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'updateMultipleBoomBarrier',
            commonFields: {
              doorNumber: doorNumber,
              pending: commonPendingAmount.toString()
            },
            updates: updates
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update Google Sheet: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        
        if (responseData.status === 'error') {
          throw new Error(responseData.data?.error || 'Error updating Google Sheet');
        }
        
        console.log('Google Sheet update response:', responseData);
      } catch (googleError) {
        console.error('Error updating Google Sheet:', googleError);
        // Continue with local update even if Google Sheet update fails
        showError('Warning: Local update succeeded but Google Sheet update failed. ' + googleError.message);
      }
    }
    
    // Update local data
    // Update individual fields (tag, parking location, pending and comment) per record
    let successCount = 0;
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const record = currentRecords[i];
      
      // Find and update the record in the data array
      const originalRecord = boomBarrierData.find(r => {
        const rDoorNumber = normalizeDoorNumber(
          r.doorNumber || 
          extractDoorNumber(r.parkingName || '') || 
          extractDoorNumber(r.name || '')
        );
        // Match by vehicle number and door number
        return r.vehicleNumber === update.vehicleNumber && rDoorNumber === doorNumber;
      });
      
      if (originalRecord) {
        originalRecord.tag = update.tag;
        originalRecord.comment = update.comment;
        originalRecord.parkingLocation = update.parkingLocation;
        originalRecord.pending = commonPendingAmount.toString();
      }
      
      // Update current records
      if (record) {
        record.tag = update.tag;
        record.comment = update.comment;
        record.parkingLocation = update.parkingLocation;
        record.pending = commonPendingAmount.toString();
      }
      
      successCount++;
    }
    
    // Refresh the display to show updated statuses
    const recordsToDisplay = [...currentRecords];
    displayVehicleRecords(recordsToDisplay);
    
    if (successCount > 0) {
      showSuccess(`${successCount} record(s) updated successfully!`);
    }
    
    // Re-enable button (will be recreated in displayVehicleRecords, but just in case)
    setTimeout(() => {
      const newButton = document.getElementById('tagIssuedButton');
      if (newButton) {
        newButton.disabled = false;
        newButton.textContent = recordsToDisplay.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
      }
    }, 100);
    
    // Scroll to top of results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
  } catch (error) {
    console.error('Error updating records:', error);
    showError('Failed to update records. Please try again.');
    button.disabled = false;
    button.textContent = currentRecords.length === 1 ? 'Tag Issued' : 'Tag(s) Issued';
  }
}

// Handle tag issued button click (individual record - kept for backward compatibility)
async function handleTagIssued(recordIndex) {
  if (!currentRecords || !currentRecords[recordIndex]) {
    showError('Record not found');
    return;
  }
  
  const record = currentRecords[recordIndex];
  const tagInput = document.getElementById(`tag-${recordIndex}`);
  const paymentStatusSelect = document.getElementById(`paymentStatus-${recordIndex}`);
  const commentTextarea = document.getElementById(`comment-${recordIndex}`);
  const button = document.querySelector(`#record-${recordIndex} .tag-issued-button`);
  
  // Get pending amount from dropdown value
  let pendingAmount = 0;
  if (paymentStatusSelect) {
    const selectedValue = paymentStatusSelect.value;
    if (selectedValue === '0') {
      pendingAmount = 0;
    } else {
      pendingAmount = parseFloat(selectedValue) || parsePendingAmount(record.pending);
    }
  }
  
  const updatedData = {
    tag: tagInput.value.trim(),
    pending: pendingAmount.toString(),
    comment: commentTextarea.value.trim()
  };
  
  // Disable button and show loading
  button.disabled = true;
  button.textContent = 'Updating...';
  
  try {
    // Update the record in the data array
    const originalRecord = boomBarrierData.find(r => 
      r.vehicleNumber === record.vehicleNumber && 
      r.doorNumber === record.doorNumber &&
      r.name === record.name
    );
    
    if (originalRecord) {
      originalRecord.tag = updatedData.tag;
      originalRecord.pending = updatedData.pending;
      originalRecord.comment = updatedData.comment;
    }
    
    // Update current records
    currentRecords[recordIndex].tag = updatedData.tag;
    currentRecords[recordIndex].pending = updatedData.pending;
    currentRecords[recordIndex].comment = updatedData.comment;
    
    // Update the UI
    const newPendingAmount = parsePendingAmount(updatedData.pending);
    const newIsPending = isPaymentPending(updatedData.pending);
    const statusClass = newIsPending ? 'status-pending' : 'status-paid';
    const statusText = newIsPending ? 'Pending' : 'Paid';
    const statusElement = document.querySelector(`#record-${recordIndex} .record-status`);
    if (statusElement) {
      statusElement.className = `record-status ${statusClass}`;
      statusElement.textContent = statusText;
    }
    
    // Update payment status dropdown
    if (paymentStatusSelect) {
      if (newPendingAmount === 0) {
        paymentStatusSelect.value = '0';
        paymentStatusSelect.options[1].text = 'Pending';
        paymentStatusSelect.options[1].value = '0';
      } else {
        paymentStatusSelect.value = newPendingAmount.toString();
        paymentStatusSelect.options[1].text = `Pending (${formatCurrency(newPendingAmount)})`;
        paymentStatusSelect.options[1].value = newPendingAmount.toString();
      }
      paymentStatusSelect.disabled = !newIsPending;
    }
    
    showSuccess(`Vehicle ${recordIndex + 1} updated successfully!`);
    
    // Re-enable button
    button.disabled = false;
    button.textContent = 'Tag Issued';
    
    // Note: In a real application, you would save this to a backend/Google Sheet here
    // For now, the data is only updated in memory
    
  } catch (error) {
    console.error('Error updating record:', error);
    showError('Failed to update record. Please try again.');
    button.disabled = false;
    button.textContent = 'Tag Issued';
  }
}

// Handle form submission
document.getElementById('searchForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  hideMessages();
  
  const doorNumber = document.getElementById('doorNumber').value.trim();
  
  if (!doorNumber) {
    showError('Please enter a door number');
    return;
  }
  
  // Disable search button and show loading state
  const searchButton = document.querySelector('.search-button');
  const originalButtonText = searchButton.textContent;
  searchButton.disabled = true;
  searchButton.textContent = 'Searching...';
  
  // Hide previous results
  document.getElementById('results').style.display = 'none';
  
  try {
    // Ensure data is loaded
    if (boomBarrierData.length === 0) {
      await loadBoomBarrierData();
    }
    
    const records = findRecordsByDoorNumber(doorNumber);
    
    // Re-enable search button
    searchButton.disabled = false;
    searchButton.textContent = originalButtonText;
    
    if (records.length === 0) {
      showError('No records found for this door number. Please check and try again.');
      return;
    }
    
    // Display records
    displayVehicleRecords(records);
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
  } catch (error) {
    // Re-enable search button
    searchButton.disabled = false;
    searchButton.textContent = originalButtonText;
    
    console.error('Search error:', error);
    showError('Failed to search for records. Please try again or contact the administrator if the problem persists.');
  }
});

// Initialize data on page load
loadBoomBarrierData().then(() => {
  console.log('Boom barrier data loaded successfully');
});

