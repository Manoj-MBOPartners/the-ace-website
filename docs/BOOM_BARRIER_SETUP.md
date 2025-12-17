# Boom Barrier Status Setup Guide

This guide will help you set up the Boom Barrier Status system that allows updating tag numbers, payment status, and comments in Google Sheets.

## Features

- Search for vehicle records by door number (supports formats: "C-1104" or "C1104")
- Display vehicle information with editable fields
- Update Tag #, Payment Status (Pending amount), and Comments
- Automatically sync updates to Google Sheets
- Disable editing for paid records (payment status only)

## Files Created

1. **boom-barrier-status.html** - The main web page for boom barrier status
2. **scripts/boom-barrier-status.js** - JavaScript for the page functionality
3. **scripts/boom-barrier-google-script.gs** - Google Apps Script to update Google Sheets

## Setup Instructions

### Step 1: Prepare Your Google Sheet

1. Open your Google Sheet containing the boom barrier data
2. Ensure the sheet has the following columns (in this order):
   - Column A: Vehicle Number
   - Column B: Parking Name
   - Column C: Type (Car, Two Wheeler)
   - Column D: Amount
   - Column E: Name
   - Column F: Tag #
   - Column G: Pending (Payment Status - numeric amount or 0 for paid)
   - Column H: Comment
   - Column I: Door Number (optional - if not present, will extract from Name field)

3. Note your Google Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the `SHEET_ID_HERE` part

### Step 2: Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code
3. Open the file `scripts/boom-barrier-google-script.gs` from this project
4. Copy the entire contents and paste it into the Apps Script editor
5. Update the configuration at the top of the script:
   ```javascript
   const SHEET_ID = 'YOUR_SHEET_ID'; // Replace with your actual Google Sheet ID
   const SHEET_NAME = 'Sheet1'; // Replace with your sheet name if different
   ```
6. **IMPORTANT**: If your columns are in a different order, update the `COLUMN_INDICES` object:
   ```javascript
   const COLUMN_INDICES = {
     VEHICLE_NUMBER: 0,    // Column A (0-based index)
     PARKING_NAME: 1,     // Column B
     TYPE: 2,             // Column C
     AMOUNT: 3,           // Column D
     NAME: 4,             // Column E
     TAG: 5,              // Column F
     PENDING: 6,          // Column G
     COMMENT: 7,          // Column H
     DOOR_NUMBER: 8       // Column I (optional)
   };
   ```
7. Save the script (Ctrl+S or Cmd+S)
8. Click **Deploy > New deployment**
9. Click the gear icon (⚙️) next to "Select type" and choose **Web app**
10. Configure the deployment:
    - **Description**: "Boom Barrier Status Updates" (optional)
    - **Execute as**: Me
    - **Who has access**: **Anyone** (IMPORTANT: Must be "Anyone" for CORS to work)
11. Click **Deploy**
12. Copy the **Web App URL** (it will look like: `https://script.google.com/macros/s/.../exec`)

### Step 3: Update JavaScript File

1. Open `scripts/boom-barrier-status.js`
2. Find this line near the top:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace `'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'` with the Web App URL you copied in Step 2
4. Save the file
5. Run the minification script to update the minified version:
   ```bash
   node minify.js
   ```

### Step 4: Test the Integration

1. Open `boom-barrier-status.html` in your browser
2. Search for a door number (e.g., "C-1104" or "C1104")
3. Update Tag #, Payment Status, and Comment fields
4. Click "Tag(s) Issued"
5. Check your Google Sheet to verify the updates were saved

## Column Mapping

The script expects the following column structure:

| Column | Index | Field | Description |
|--------|-------|-------|-------------|
| A | 0 | Vehicle Number | Unique identifier for the vehicle |
| B | 1 | Parking Name | Parking location name |
| C | 2 | Type | Vehicle type (Car, Two Wheeler) |
| D | 3 | Amount | Parking amount |
| E | 4 | Name | Owner/Resident name |
| F | 5 | Tag # | Tag number (editable) |
| G | 6 | Pending | Pending amount (0 = paid, >0 = pending) |
| H | 7 | Comment | Comments (editable) |
| I | 8 | Door Number | Door number (optional, can extract from Name) |

## Troubleshooting

### Updates not saving to Google Sheet

1. **Check Google Script URL**: Make sure the URL in `boom-barrier-status.js` matches your deployed script URL
2. **Check Sheet ID**: Verify the `SHEET_ID` in the Google Script matches your sheet
3. **Check Column Indices**: Ensure `COLUMN_INDICES` matches your actual column positions
4. **Check Permissions**: Make sure the Web App deployment has "Anyone" access
5. **Check Browser Console**: Open browser developer tools (F12) and check for error messages

### Records not found

1. **Check Door Number Format**: The script normalizes door numbers, so "C-1104" and "C1104" should both work
2. **Check Vehicle Number**: The script matches by both door number and vehicle number
3. **Check Data**: Verify the door number and vehicle number exist in your Google Sheet

### CORS Errors

- Make sure the Web App deployment has "Anyone" access (not "Only myself")
- Try redeploying the script as a new version

## Testing the Google Script

You can test the Google Script directly:

1. In the Apps Script editor, select the function `testUpdateBoomBarrier`
2. Click the Run button (▶️)
3. Check the Execution log for results
4. Verify the test data was updated in your Google Sheet

## Notes

- The script updates records by matching both Door Number and Vehicle Number
- Door numbers are normalized (e.g., "C1104" becomes "C-1104")
- Payment status is stored as a numeric value (0 for paid, amount for pending)
- Multiple records can be updated at once when clicking "Tag(s) Issued"
- If Google Sheet update fails, local updates still succeed (with a warning message)

