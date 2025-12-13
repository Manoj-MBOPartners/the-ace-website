/**
 * Google Apps Script for Newsletter Builder - Google Drive Storage
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project
 * 3. Paste this code
 * 4. Replace 'PASTE_YOUR_FOLDER_ID_HERE' with your Google Drive folder ID
 * 5. Save the script
 * 6. Deploy > New deployment > Type: Web app
 * 7. Execute as: Me
 * 8. Who has access: Anyone (IMPORTANT: Must be "Anyone" for CORS to work)
 * 9. Click Deploy
 * 10. Copy the Web App URL and update it in newsletter-builder.html
 */

const FOLDER_ID = "10hxTvAHVluqprvUHwFgfN5VEVjNFoe6I";

/**
 * Handle GET requests - Download files (for images)
 * Returns image data as base64 data URL for direct use in img tags
 */
function doGet(e) {
  try {
    const fileId = e.parameter.id;
    if (!fileId) {
      return ContentService
        .createTextOutput('Newsletter Builder API - Use POST method for all operations or provide file ID via ?id=')
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    try {
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      const mimeType = file.getMimeType();
      const base64Data = Utilities.base64Encode(blob.getBytes());
      
      // Return as data URL for direct use in img tags
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      return ContentService
        .createTextOutput(dataUrl)
        .setMimeType(ContentService.MimeType.TEXT);
    } catch (error) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error',
          data: { success: false, error: "Error: " + error.toString() }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        data: { success: false, error: error.toString() }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests - All operations (list, download, upload)
 * Following the exact pattern from google-apps-script-code.gs
 */
function doPost(e) {
  try {
    // Check if postData exists - EXACTLY like property tax script
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error',
          data: { success: false, error: 'No request data received' }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse the request - EXACTLY like property tax script
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
    
    // 🔹 LIST FILES
    if (action === "list") {
      try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const files = folder.getFiles();
        const result = [];

        while (files.hasNext()) {
          const file = files.next();
          result.push({
            id: file.getId(),
            name: file.getName(),
            size: file.getSize(),
            lastModified: file.getLastUpdated().toISOString()
          });
        }

        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'success',
            data: result
          }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'error',
            data: { success: false, error: error.toString() }
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 🔹 DOWNLOAD FILE
    if (action === "download") {
      try {
        const fileId = requestData.id;
        if (!fileId) {
          return ContentService
            .createTextOutput(JSON.stringify({ 
              status: 'error',
              data: { success: false, error: "Missing file ID" }
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }
        
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();
        const content = blob.getDataAsString();
        
        // Check if it's HTML content and return with appropriate MIME type
        // Use HTML MIME type for HTML files, TEXT for others
        const mimeType = file.getMimeType();
        let outputMimeType = ContentService.MimeType.TEXT;
        
        if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
          outputMimeType = ContentService.MimeType.HTML;
        } else if (mimeType === 'application/json') {
          outputMimeType = ContentService.MimeType.JSON;
        }
        
        // Return content directly - CORS handled by Google Apps Script deployment
        return ContentService
          .createTextOutput(content)
          .setMimeType(outputMimeType);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'error',
            data: { success: false, error: "Error: " + error.toString() }
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 🔹 UPLOAD FILE
    if (action === "upload") {
      if (!requestData.base64 || !requestData.name) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'error',
            data: { success: false, error: 'Missing base64 or name' }
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const bytes = Utilities.base64Decode(requestData.base64);
      const blob = Utilities.newBlob(bytes, requestData.type || 'application/octet-stream', requestData.name);

      const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
      
      // Make file publicly accessible for direct image loading
      // Note: This requires the file to be shared. For production, you may want to use
      // a service account or OAuth to handle permissions properly.
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareError) {
        // If sharing fails, log but continue - the file can still be accessed via the script
        console.log('Warning: Could not set file sharing:', shareError);
      }

      // Return URL that can be used in img tags
      // Use Google Drive thumbnail API which works reliably for publicly shared files
      const scriptUrl = ScriptApp.getService().getUrl();
      const scriptImageUrl = `${scriptUrl}?id=${file.getId()}`;
      
      // Google Drive thumbnail URL (more reliable for images)
      const driveThumbnailUrl = `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w2000`;
      
      // Also provide Google Drive direct view URL as fallback
      const driveViewUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;

      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'success',
          data: {
            success: true,
            id: file.getId(),
            name: file.getName(),
            url: scriptImageUrl,
            driveUrl: driveThumbnailUrl,
            driveViewUrl: driveViewUrl
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        data: { success: false, error: 'Unknown action' }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error',
        data: { success: false, error: error.toString() }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}


