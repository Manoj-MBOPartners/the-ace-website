// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw81EIDpihUHq_CywacZgEa9Bwd6S_pORuQdVECtCLrED73smNxYB2BfLVEt9mG-so3/exec';

// Verify script is loaded
console.log('✅ FAQs script file loaded successfully');
console.log('Script URL:', GOOGLE_SCRIPT_URL);

// Format timestamp for display
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      // If it's not a valid date, try to parse it
      return timestamp;
    }
    
    // Format as: "Jan 15, 2024, 3:45 PM"
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  } catch (error) {
    // If parsing fails, return the original timestamp
    return timestamp;
  }
}

// State management
let faqs = [];
let announcements = [];
let editingId = null;
let editingAnnouncementId = null;
let qaPairCounter = 0;
let inlineQAPairCounter = 0;
let inlineAnnouncementCounter = 0;
let faqsLoaded = false; // Track if FAQs have been loaded
let announcementsLoaded = false; // Track if announcements have been loaded
let existingFAQsShown = false; // Track if existing FAQs are displayed
let existingAnnouncementsShown = false; // Track if announcements are displayed
let displayMode = 'none'; // 'faqs', 'announcements', 'both', or 'none'
let searchQuery = ''; // Track current search query

// Initialize immediately when script loads
console.log('FAQs script loaded, initializing...');

// Function to initialize FAQs page
function initializeFAQs() {
  console.log('initializeFAQs() called');
  const addForm = document.getElementById('addForm');
  const inlineContainer = document.getElementById('inlineQAContainer');
  
  if (!addForm || !inlineContainer) {
    console.warn('Form elements not found, retrying in 100ms...');
    setTimeout(initializeFAQs, 100);
    return;
  }
  
  console.log('Form elements found, initializing inline form');
  
  // Handle query parameter for specific question if present
  const urlParams = new URLSearchParams(window.location.search);
  const faqIdParam = urlParams.get('id');
  
  if (faqIdParam) {
    // If query parameter exists, show that FAQ (will load FAQs automatically)
    showExistingItems();
  } else {
    // Initialize with one Q&A pair for adding new FAQs/Announcements
    addInlineQAPair();
  }
}

// Try initialization immediately if DOM is ready
if (document.readyState === 'loading') {
  console.log('DOM is still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    initializeFAQs();
  });
} else {
  console.log('DOM already loaded, initializing immediately');
  // DOM is already loaded, initialize immediately
  initializeFAQs();
}

// Show existing FAQs
// Show existing FAQs only
async function showExistingFAQsOnly() {
  const itemsList = document.getElementById('itemsList');
  const addForm = document.getElementById('addForm');
  
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  // Toggle behavior - if FAQs are already shown, hide them
  if (displayMode === 'faqs' && itemsList.style.display !== 'none') {
    hideExistingItems();
    return;
  }
  
  // Hide the add form
  if (addForm) {
    addForm.style.display = 'none';
  }
  
  // Show the items list
  itemsList.style.display = 'block';
  
  // Show search container
  const searchContainer = document.getElementById('searchContainer');
  if (searchContainer) {
    searchContainer.style.display = 'block';
  }
  
  // Load FAQs if not already loaded
  if (!faqsLoaded) {
    await loadFAQs();
  }
  
  // Display FAQs only
  displayMode = 'faqs';
  displayFAQsOnly();
  
  // Update button text
  const showFAQsButton = document.getElementById('showFAQsButton');
  if (showFAQsButton) {
    showFAQsButton.textContent = 'Hide Existing FAQs';
    showFAQsButton.setAttribute('onclick', 'hideExistingItems()');
  }
  
  // Reset announcements button
  const showAnnouncementsButton = document.getElementById('showAnnouncementsButton');
  if (showAnnouncementsButton) {
    showAnnouncementsButton.textContent = 'Show Existing Announcements';
    showAnnouncementsButton.setAttribute('onclick', 'showExistingAnnouncementsOnly()');
  }
  
  // Handle query parameter for single FAQ view
  const urlParams = new URLSearchParams(window.location.search);
  const faqIdParam = urlParams.get('id');
  if (faqIdParam) {
    toggleSingleFAQView(faqIdParam);
  }
}

// Show existing Announcements only
async function showExistingAnnouncementsOnly() {
  const itemsList = document.getElementById('itemsList');
  const addForm = document.getElementById('addForm');
  
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  // Toggle behavior - if announcements are already shown, hide them
  if (displayMode === 'announcements' && itemsList.style.display !== 'none') {
    hideExistingItems();
    return;
  }
  
  // Hide the add form
  if (addForm) {
    addForm.style.display = 'none';
  }
  
  // Show the items list
  itemsList.style.display = 'block';
  
  // Hide search container for announcements
  const searchContainer = document.getElementById('searchContainer');
  if (searchContainer) {
    searchContainer.style.display = 'none';
  }
  
  // Load Announcements if not already loaded
  if (!announcementsLoaded) {
    await loadAnnouncements();
  }
  
  // Display Announcements only
  displayMode = 'announcements';
  displayAnnouncementsOnly();
  
  // Update button text
  const showAnnouncementsButton = document.getElementById('showAnnouncementsButton');
  if (showAnnouncementsButton) {
    showAnnouncementsButton.textContent = 'Hide Existing Announcements';
    showAnnouncementsButton.setAttribute('onclick', 'hideExistingItems()');
  }
  
  // Reset FAQs button
  const showFAQsButton = document.getElementById('showFAQsButton');
  if (showFAQsButton) {
    showFAQsButton.textContent = 'Show Existing FAQs';
    showFAQsButton.setAttribute('onclick', 'showExistingFAQsOnly()');
  }
}

// Show existing FAQs (kept for backward compatibility)
async function showExistingFAQs() {
  await showExistingFAQsOnly();
}

// Show existing items (kept for backward compatibility - shows both)
async function showExistingItems() {
  const itemsList = document.getElementById('itemsList');
  const addForm = document.getElementById('addForm');
  
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  // Toggle behavior
  if (displayMode === 'both' && itemsList.style.display !== 'none') {
    hideExistingItems();
    return;
  }
  
  // Hide the add form
  if (addForm) {
    addForm.style.display = 'none';
  }
  
  // Show the items list
  itemsList.style.display = 'block';
  
  // Load FAQs and Announcements if not already loaded
  if (!faqsLoaded) {
    await loadFAQs();
  }
  if (!announcementsLoaded) {
    await loadAnnouncements();
  }
  
  // Display combined list
  displayMode = 'both';
  displayCombinedItems();
  
  // Update button texts
  const showFAQsButton = document.getElementById('showFAQsButton');
  const showAnnouncementsButton = document.getElementById('showAnnouncementsButton');
  if (showFAQsButton) {
    showFAQsButton.textContent = 'Hide Existing FAQs';
    showFAQsButton.setAttribute('onclick', 'hideExistingItems()');
  }
  if (showAnnouncementsButton) {
    showAnnouncementsButton.textContent = 'Hide Existing Announcements';
    showAnnouncementsButton.setAttribute('onclick', 'hideExistingItems()');
  }
  
  // Handle query parameter for single FAQ view
  const urlParams = new URLSearchParams(window.location.search);
  const faqIdParam = urlParams.get('id');
  if (faqIdParam) {
    toggleSingleFAQView(faqIdParam);
  }
}

// Hide existing items and show add form
function hideExistingItems() {
  const itemsList = document.getElementById('itemsList');
  const addForm = document.getElementById('addForm');
  
  // Hide items list
  if (itemsList) {
    itemsList.style.display = 'none';
  }
  
  // Hide search container
  const searchContainer = document.getElementById('searchContainer');
  if (searchContainer) {
    searchContainer.style.display = 'none';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
      searchQuery = '';
    }
  }
  
  // Show add form
  if (addForm) {
    addForm.style.display = 'block';
  }
  
  // Reset button texts
  const showFAQsButton = document.getElementById('showFAQsButton');
  const showAnnouncementsButton = document.getElementById('showAnnouncementsButton');
  if (showFAQsButton) {
    showFAQsButton.textContent = 'Show Existing FAQs';
    showFAQsButton.setAttribute('onclick', 'showExistingFAQsOnly()');
  }
  if (showAnnouncementsButton) {
    showAnnouncementsButton.textContent = 'Show Existing Announcements';
    showAnnouncementsButton.setAttribute('onclick', 'showExistingAnnouncementsOnly()');
  }
  
  displayMode = 'none';
  existingFAQsShown = false;
  existingAnnouncementsShown = false;
}

// Hide existing FAQs (kept for backward compatibility)
function hideExistingFAQs() {
  hideExistingItems();
}

// Load FAQs from Google Script (only when needed)
async function loadFAQs() {
  console.log('loadFAQs() called');
  const itemsList = document.getElementById('itemsList');
  const messageContainer = document.getElementById('messageContainer');
  
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  if (!messageContainer) {
    console.error('messageContainer element not found!');
    return;
  }
  
  // Show loading message (only if itemsList is visible)
  if (itemsList.style.display !== 'none') {
    itemsList.innerHTML = '<div class="loading-message">Loading FAQs...</div>';
  }
  messageContainer.innerHTML = '';
  
  try {
    // Use GET request to fetch FAQs
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?type=faqs`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch FAQs: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    console.log('Response from Google Script:', responseData);
    
    // Handle direct array format from doGet
    if (Array.isArray(responseData)) {
      faqs = responseData.map((faq, index) => ({
        id: faq.id || `faq-${faq.row || index + 2}`,
        row: faq.row || index + 2,
        question: faq.question || '',
        answer: faq.answer || '',
        timestamp: faq.timestamp || ''
      }));
      console.log('Processed FAQs:', faqs.length, 'items');
      faqsLoaded = true;
      // Don't call displayFAQs here - will be called by displayCombinedItems
    } else if (responseData.status === 'success' && Array.isArray(responseData.data)) {
      faqs = responseData.data.map(faq => ({
        id: faq.id || `faq-${faq.row || faqs.length + 1}`,
        row: faq.row,
        question: faq.question || '',
        answer: faq.answer || '',
        timestamp: faq.timestamp || ''
      }));
      console.log('Processed FAQs:', faqs.length, 'items');
      faqsLoaded = true;
      // Don't call displayFAQs here - will be called by displayCombinedItems
    } else if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error retrieving FAQs');
    } else {
      throw new Error('Invalid data format received from Google Script');
    }
         } catch (error) {
           console.error('Error loading FAQs:', error);
           if (itemsList && itemsList.style.display !== 'none') {
             itemsList.innerHTML = `
               <div class="error-message">
                 Error loading FAQs: ${error.message}. Please check the browser console for more details.
               </div>
             `;
           }
         }
       }

// Load Announcements from Google Script (only when needed)
async function loadAnnouncements() {
  console.log('loadAnnouncements() called');
  const itemsList = document.getElementById('itemsList');
  const messageContainer = document.getElementById('messageContainer');
  
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  // Show loading message (only if itemsList is visible)
  if (itemsList.style.display !== 'none') {
    // Don't overwrite if FAQs are already loading
    if (!itemsList.innerHTML.includes('Loading')) {
      itemsList.innerHTML = '<div class="loading-message">Loading Announcements...</div>';
    }
  }
  
  try {
    // Use GET request to fetch announcements
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?type=announcements`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Announcements: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    console.log('Response from Google Script (Announcements):', responseData);
    
    // Handle direct array format from doGet
    if (Array.isArray(responseData)) {
      announcements = responseData.map((ann, index) => ({
        id: ann.id || `announcement-${ann.row || index + 2}`,
        row: ann.row || index + 2,
        timestamp: ann.timestamp || '',
        announcement: ann.announcement || ''
      }));
      console.log('Processed Announcements:', announcements.length, 'items');
      announcementsLoaded = true;
      // Don't call displayAnnouncements here - will be called by displayCombinedItems
    } else if (responseData.status === 'success' && Array.isArray(responseData.data)) {
      announcements = responseData.data.map(ann => ({
        id: ann.id || `announcement-${ann.row || announcements.length + 1}`,
        row: ann.row,
        timestamp: ann.timestamp || '',
        announcement: ann.announcement || ''
      }));
      console.log('Processed Announcements:', announcements.length, 'items');
      announcementsLoaded = true;
      // Don't call displayAnnouncements here - will be called by displayCombinedItems
    } else if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error retrieving Announcements');
    } else {
      throw new Error('Invalid data format received from Google Script');
    }
  } catch (error) {
    console.error('Error loading Announcements:', error);
    if (itemsList && itemsList.style.display !== 'none') {
      // Only show error if FAQs didn't already show an error
      if (!itemsList.innerHTML.includes('Error loading FAQs')) {
        itemsList.innerHTML = `
          <div class="error-message">
            Error loading Announcements: ${error.message}. Please check the browser console for more details.
          </div>
        `;
      }
    }
  }
}

// Display FAQs only
function displayFAQsOnly() {
  const itemsList = document.getElementById('itemsList');
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  // Handle query parameter for single FAQ view
  const urlParams = new URLSearchParams(window.location.search);
  const faqIdParam = urlParams.get('id');
  
  if (faqIdParam) {
    // Show only the specific FAQ
    displayFAQs(faqIdParam);
    return;
  }
  
  if (faqs.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❓</div>
        <div class="empty-state-text">No FAQs available yet.</div>
      </div>
    `;
    return;
  }
  
  // Filter FAQs by search query if present
  let filteredFAQs = faqs;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredFAQs = faqs.filter(faq => {
      const question = (faq.question || '').toLowerCase();
      const answer = (faq.answer || '').toLowerCase();
      return question.includes(query) || answer.includes(query);
    });
  }
  
  // Sort by timestamp (newest first) if available
  const sortedFAQs = [...filteredFAQs].sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  if (sortedFAQs.length === 0 && searchQuery.trim()) {
    itemsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">No FAQs found matching "${escapeHtml(searchQuery)}"</div>
      </div>
    `;
    return;
  }
  
  itemsList.innerHTML = sortedFAQs.map(faq => {
    const faqId = faq.id;
    const faqUrl = `${window.location.pathname}?id=${faqId}`;
    const isEditing = editingId === faqId;
    return `
      <div class="faq-item ${isEditing ? 'expanded' : ''}" id="faq-${faqId}">
        <div class="faq-question" ${!isEditing ? `onclick="toggleFAQ('${faqId}')" style="cursor: pointer;"` : ''}>
          ${isEditing 
            ? `<input type="text" class="faq-question-editable" id="edit-question-${faqId}" value="${escapeHtml(faq.question || '')}" />`
            : `<span class="faq-question-link">${escapeHtml(faq.question || '')}</span>`
          }
        </div>
        <div class="faq-answer">
          ${isEditing
            ? `<textarea class="faq-answer-editable" id="edit-answer-${faqId}">${escapeHtml(faq.answer || '')}</textarea>`
            : escapeHtml(faq.answer || '').replace(/\n/g, '<br>')
          }
        </div>
        <div class="faq-actions">
          ${isEditing
            ? `<div class="inline-edit-actions">
                <button class="inline-save-button" onclick="saveInlineFAQ('${faqId}')">Save</button>
                <button class="inline-cancel-button" onclick="cancelInlineEdit('${faqId}')">Cancel</button>
              </div>`
            : `<button class="faq-action-button" onclick="event.stopPropagation(); editFAQ('${faqId}')">Edit</button>
               <button class="faq-action-button delete" onclick="event.stopPropagation(); deleteFAQ('${faqId}')">Delete</button>
               <button class="share-link-button" onclick="event.stopPropagation(); copyShareLink('${faqId}')">Copy Link</button>`
          }
        </div>
      </div>
    `;
  }).join('');
  
  // Focus on editable field if editing
  if (editingId) {
    const editAnswer = document.getElementById(`edit-answer-${editingId}`);
    if (editAnswer) {
      setTimeout(() => editAnswer.focus(), 100);
    }
  }
}

// Display Announcements only
function displayAnnouncementsOnly() {
  const itemsList = document.getElementById('itemsList');
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  if (announcements.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📢</div>
        <div class="empty-state-text">No Announcements available yet.</div>
      </div>
    `;
    return;
  }
  
  // Sort by timestamp (newest first) if available
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  itemsList.innerHTML = sortedAnnouncements.map(ann => {
    const annId = ann.id;
    const isEditing = editingAnnouncementId === annId;
    const formattedTimestamp = formatTimestamp(ann.timestamp);
    const announcementText = escapeHtml(ann.announcement || '').replace(/\n/g, ' ').trim();
    return `
      <div class="faq-item announcement-item ${isEditing ? 'expanded' : ''}" id="announcement-${annId}">
        <div class="faq-question announcement-question" ${!isEditing ? `onclick="toggleAnnouncement('${annId}')" style="cursor: pointer;"` : ''}>
          <span class="announcement-text">${announcementText}</span>
          ${formattedTimestamp ? `<span class="announcement-timestamp">${formattedTimestamp}</span>` : ''}
        </div>
        <div class="faq-answer">
          ${isEditing
            ? `<textarea class="announcement-editable" id="edit-announcement-${annId}">${escapeHtml(ann.announcement || '')}</textarea>`
            : escapeHtml(ann.announcement || '').replace(/\n/g, '<br>')
          }
        </div>
        <div class="faq-actions">
          ${isEditing
            ? `<div class="inline-edit-actions">
                <button class="inline-save-button" onclick="saveInlineAnnouncement('${annId}')">Save</button>
                <button class="inline-cancel-button" onclick="cancelInlineEditAnnouncement('${annId}')">Cancel</button>
              </div>`
            : `<button class="faq-action-button" onclick="event.stopPropagation(); editAnnouncement('${annId}')">Edit</button>
               <button class="faq-action-button delete" onclick="event.stopPropagation(); deleteAnnouncement('${annId}')">Delete</button>`
          }
        </div>
      </div>
    `;
  }).join('');
  
  // Focus on editable field if editing
  if (editingAnnouncementId) {
    const editAnn = document.getElementById(`edit-announcement-${editingAnnouncementId}`);
    if (editAnn) {
      setTimeout(() => editAnn.focus(), 100);
    }
  }
}

// Display combined FAQs and Announcements
function displayCombinedItems() {
  const itemsList = document.getElementById('itemsList');
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  // Handle query parameter for single FAQ view
  const urlParams = new URLSearchParams(window.location.search);
  const faqIdParam = urlParams.get('id');
  
  if (faqIdParam) {
    // Show only the specific FAQ
    displayFAQs(faqIdParam);
    return;
  }
  
  // Filter FAQs by search query if present
  let filteredFAQs = faqs;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredFAQs = faqs.filter(faq => {
      const question = (faq.question || '').toLowerCase();
      const answer = (faq.answer || '').toLowerCase();
      return question.includes(query) || answer.includes(query);
    });
  }
  
  // Combine FAQs and Announcements
  const allItems = [];
  
  // Add FAQs
  filteredFAQs.forEach(faq => {
    allItems.push({
      type: 'faq',
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      timestamp: faq.timestamp,
      row: faq.row
    });
  });
  
  // Add Announcements
  announcements.forEach(ann => {
    allItems.push({
      type: 'announcement',
      id: ann.id,
      announcement: ann.announcement,
      timestamp: ann.timestamp,
      row: ann.row
    });
  });
  
  // Sort by timestamp (newest first) if available
  allItems.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  if (allItems.length === 0) {
    if (searchQuery.trim()) {
      itemsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">No FAQs found matching "${escapeHtml(searchQuery)}"</div>
        </div>
      `;
    } else {
      itemsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">No FAQs or Announcements found</div>
        </div>
      `;
    }
    return;
  }
  
  itemsList.innerHTML = allItems.map(item => {
    if (item.type === 'faq') {
      const faqId = item.id;
      const faqUrl = `${window.location.pathname}?id=${faqId}`;
      const isEditing = editingId === faqId;
      return `
        <div class="faq-item ${isEditing ? 'expanded' : ''}" id="faq-${faqId}">
          <div class="faq-question" ${!isEditing ? `onclick="toggleFAQ('${faqId}')" style="cursor: pointer;"` : ''}>
            ${isEditing 
              ? `<input type="text" class="faq-question-editable" id="edit-question-${faqId}" value="${escapeHtml(item.question || '')}" />`
              : `<span class="faq-question-link">${escapeHtml(item.question || '')}</span>`
            }
          </div>
          <div class="faq-answer">
            ${isEditing
              ? `<textarea class="faq-answer-editable" id="edit-answer-${faqId}">${escapeHtml(item.answer || '')}</textarea>`
              : escapeHtml(item.answer || '').replace(/\n/g, '<br>')
            }
          </div>
          <div class="faq-actions">
            ${isEditing
              ? `<div class="inline-edit-actions">
                  <button class="inline-save-button" onclick="saveInlineFAQ('${faqId}')">Save</button>
                  <button class="inline-cancel-button" onclick="cancelInlineEdit('${faqId}')">Cancel</button>
                </div>`
              : `<button class="faq-action-button" onclick="event.stopPropagation(); editFAQ('${faqId}')">Edit</button>
                 <button class="faq-action-button delete" onclick="event.stopPropagation(); deleteFAQ('${faqId}')">Delete</button>
                 <button class="share-link-button" onclick="event.stopPropagation(); copyShareLink('${faqId}')">Copy Link</button>`
            }
          </div>
        </div>
      `;
    } else {
      const annId = item.id;
      const isEditing = editingAnnouncementId === annId;
      const formattedTimestamp = formatTimestamp(item.timestamp);
      const announcementText = escapeHtml(item.announcement || '').replace(/\n/g, ' ').trim();
      return `
        <div class="faq-item announcement-item ${isEditing ? 'expanded' : ''}" id="announcement-${annId}">
          <div class="faq-question announcement-question" ${!isEditing ? `onclick="toggleAnnouncement('${annId}')" style="cursor: pointer;"` : ''}>
            <span class="announcement-text">${announcementText}</span>
            ${formattedTimestamp ? `<span class="announcement-timestamp">${formattedTimestamp}</span>` : ''}
          </div>
          <div class="faq-answer">
            ${isEditing
              ? `<textarea class="announcement-editable" id="edit-announcement-${annId}">${escapeHtml(item.announcement || '')}</textarea>`
              : escapeHtml(item.announcement || '').replace(/\n/g, '<br>')
            }
          </div>
          <div class="faq-actions">
            ${isEditing
              ? `<div class="inline-edit-actions">
                  <button class="inline-save-button" onclick="saveInlineAnnouncement('${annId}')">Save</button>
                  <button class="inline-cancel-button" onclick="cancelInlineEditAnnouncement('${annId}')">Cancel</button>
                </div>`
              : `<button class="faq-action-button" onclick="event.stopPropagation(); editAnnouncement('${annId}')">Edit</button>
                 <button class="faq-action-button delete" onclick="event.stopPropagation(); deleteAnnouncement('${annId}')">Delete</button>`
            }
          </div>
        </div>
      `;
    }
  }).join('');
  
  // Focus on editable field if editing
  if (editingId) {
    const editAnswer = document.getElementById(`edit-answer-${editingId}`);
    if (editAnswer) {
      setTimeout(() => editAnswer.focus(), 100);
    }
  }
  if (editingAnnouncementId) {
    const editAnn = document.getElementById(`edit-announcement-${editingAnnouncementId}`);
    if (editAnn) {
      setTimeout(() => editAnn.focus(), 100);
    }
  }
}

// Display FAQs
function displayFAQs(faqIdParam = null) {
  const itemsList = document.getElementById('itemsList');
  if (!itemsList) {
    console.error('itemsList element not found!');
    return;
  }
  
  // Check if we're viewing a single FAQ
  const isSingleFAQView = faqIdParam !== null;
  
  // Filter FAQs if viewing a single one
  const faqsToDisplay = isSingleFAQView 
    ? faqs.filter(faq => {
        const faqId = faq.id || `faq-${faqs.indexOf(faq) + 1}`;
        return faqId === faqIdParam;
      })
    : faqs;
  
  if (isSingleFAQView && faqsToDisplay.length === 0) {
    itemsList.innerHTML = `
      <div class="error-message">
        FAQ not found. <a href="${window.location.pathname}" style="color: #000080; text-decoration: underline;">View all FAQs & Announcements</a>
      </div>
    `;
    toggleSingleFAQView(true);
    return;
  }
  
  if (isSingleFAQView) {
    // Display only the single FAQ
    const faq = faqsToDisplay[0];
    const faqId = faq.id || `faq-${faqs.indexOf(faq) + 1}`;
    const questionId = `question-${faqId}`;
    const faqLink = `${window.location.origin}${window.location.pathname}?id=${faqId}`;
    const isEditing = editingId === faqId;
    
    // In single FAQ view, always show expanded (no toggle needed)
    itemsList.innerHTML = `
      <div class="faq-item expanded" id="faq-${faqId}">
        <div class="faq-question">
          ${isEditing 
            ? `<input type="text" class="faq-question-editable" id="edit-question-${faqId}" value="${escapeHtml(faq.question || '')}" />`
            : `<span class="faq-question-link" id="${questionId}">${escapeHtml(faq.question || '')}</span>`
          }
        </div>
        <div class="faq-answer">
          ${isEditing
            ? `<textarea class="faq-answer-editable" id="edit-answer-${faqId}">${escapeHtml(faq.answer || '')}</textarea>`
            : escapeHtml(faq.answer || '').replace(/\n/g, '<br>')
          }
        </div>
        <div class="faq-actions">
          ${isEditing
            ? `<div class="inline-edit-actions">
                <button class="inline-save-button" onclick="saveInlineFAQ('${faqId}')">Save</button>
                <button class="inline-cancel-button" onclick="cancelInlineEdit('${faqId}')">Cancel</button>
              </div>`
            : `<button class="faq-action-button" onclick="event.stopPropagation(); editFAQ('${faqId}')">Edit</button>
               <button class="faq-action-button delete" onclick="event.stopPropagation(); deleteFAQ('${faqId}')">Delete</button>
               <button class="share-link-button" onclick="event.stopPropagation(); copyShareLink('${faqId}')" title="Copy share link">🔗</button>`
          }
        </div>
      </div>
    `;
    
    // Focus on editable field if editing
    if (isEditing) {
      const editAnswer = document.getElementById(`edit-answer-${faqId}`);
      if (editAnswer) {
        setTimeout(() => editAnswer.focus(), 100);
      }
    }
    
    toggleSingleFAQView(true);
    handleQueryParameter();
  } else {
    // Display combined view (called from displayCombinedItems)
    displayCombinedItems();
  }
}

// Toggle visibility of elements for single FAQ view
function toggleSingleFAQView(isSingleView) {
  const header = document.querySelector('.faqs-header');
  const messageContainer = document.getElementById('messageContainer');
  
  if (header) {
    header.style.display = isSingleView ? 'none' : 'block';
  }
  
  // Keep message container visible for success/error messages
  if (messageContainer) {
    // Message container stays visible
  }
  
  // Add a back button if viewing single FAQ
  if (isSingleView) {
    const itemsList = document.getElementById('itemsList');
    if (itemsList && !document.getElementById('backToAllFAQs')) {
      const backButton = document.createElement('div');
      backButton.id = 'backToAllFAQs';
      backButton.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;';
      backButton.innerHTML = `
        <a href="${window.location.pathname}" style="color: #000080; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 8px;">
          ← Back to All FAQs & Announcements
        </a>
      `;
      itemsList.parentNode.insertBefore(backButton, itemsList);
    }
  } else {
    const backButton = document.getElementById('backToAllFAQs');
    if (backButton) {
      backButton.remove();
    }
  }
}

// Display Announcements
function displayAnnouncements() {
  const announcementsList = document.getElementById('announcementsList');
  
  if (!announcementsList) {
    console.error('announcementsList element not found');
    return;
  }
  
  if (announcements.length === 0) {
    announcementsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📢</div>
        <div class="empty-state-text">No announcements available yet. Add your first announcement below!</div>
      </div>
    `;
    return;
  }
  
  announcementsList.innerHTML = announcements.map((ann) => {
    const annId = ann.id || `announcement-${ann.row}`;
    const formattedTimestamp = formatTimestamp(ann.timestamp);
    
    const announcementText = escapeHtml(ann.announcement || '').replace(/\n/g, ' ').trim();
    return `
      <div class="faq-item announcement-item" id="announcement-${annId}">
        <div class="faq-question announcement-question">
          <span class="announcement-text">${announcementText}</span>
          ${formattedTimestamp ? `<span class="announcement-timestamp">${formattedTimestamp}</span>` : ''}
        </div>
        <div class="faq-answer">${escapeHtml(ann.announcement || '').replace(/\n/g, '<br>')}</div>
        <div class="faq-actions">
          <button class="faq-action-button" onclick="editAnnouncement('${annId}')">Edit</button>
          <button class="faq-action-button delete" onclick="deleteAnnouncement('${annId}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// Edit Announcement
// Enable inline editing for Announcement
function editAnnouncement(id) {
  const ann = announcements.find(a => a.id === id);
  if (!ann) {
    showMessage('Announcement not found', 'error');
    return;
  }
  
  // Cancel any other editing
  if (editingId) {
    cancelInlineEdit(editingId);
  }
  if (editingAnnouncementId && editingAnnouncementId !== id) {
    cancelInlineEditAnnouncement(editingAnnouncementId);
  }
  
  editingAnnouncementId = id;
  
  // Re-render the display to show editable fields
  if (displayMode === 'announcements' || displayMode === 'both') {
    displayAnnouncementsOnly();
  } else if (displayMode === 'faqs') {
    displayFAQsOnly();
  } else {
    displayCombinedItems();
  }
}

// Delete Announcement
async function deleteAnnouncement(id) {
  if (!confirm('Are you sure you want to delete this announcement?')) {
    return;
  }
  
  const ann = announcements.find(a => a.id === id);
  if (!ann) {
    showMessage('Announcement not found', 'error');
    return;
  }
  
  // Disable delete button and show loading state
  const deleteButton = document.querySelector(`#announcement-${id} .faq-action-button.delete`);
  const editButton = document.querySelector(`#announcement-${id} .faq-action-button:not(.delete)`);
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting...';
  }
  if (editButton) editButton.disabled = true;
  showMessage('Deleting announcement...', 'loading');
  
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'deleteAnnouncement',
        type: 'announcements',
        id: id,
        row: ann.row || parseInt(id.split('-')[1])
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete announcement: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error deleting announcement');
    }
    
    showMessage('Announcement deleted successfully', 'success');
    
    // Reload announcements and refresh the display
    await loadAnnouncements();
    
    // Refresh the display based on current view mode
    if (displayMode === 'announcements') {
      displayAnnouncementsOnly();
    } else if (displayMode === 'both') {
      displayCombinedItems();
    } else if (displayMode === 'faqs') {
      displayFAQsOnly();
    } else {
      // If not in any display mode, show announcements only
      displayAnnouncementsOnly();
    }
  } catch (error) {
    console.error('Error deleting announcement:', error);
    showMessage(`Error deleting announcement: ${error.message}`, 'error');
    // Re-enable buttons on error
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.textContent = 'Delete';
    }
    if (editButton) editButton.disabled = false;
  }
}

// Open add modal
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add New Q&A';
  document.getElementById('faqForm').reset();
  document.getElementById('multipleMode').checked = false;
  toggleMultipleMode();
  const modal = document.getElementById('faqModal');
  modal.classList.add('show');
  modal.setAttribute('tabindex', '-1');
  document.body.style.overflow = 'hidden';
  
  // Focus on first input
  setTimeout(() => {
    const firstInput = document.getElementById('question');
    if (firstInput) {
      firstInput.focus();
    } else {
      modal.focus();
    }
  }, 300);
}

// Toggle multiple mode
function toggleMultipleMode() {
  const multipleMode = document.getElementById('multipleMode').checked;
  const singleForm = document.getElementById('singleQAForm');
  const multipleForm = document.getElementById('multipleQAForm');
  
  if (multipleMode) {
    singleForm.style.display = 'none';
    multipleForm.style.display = 'block';
    if (document.getElementById('multipleQAContainer').children.length === 0) {
      addQAPair();
    }
  } else {
    singleForm.style.display = 'block';
    multipleForm.style.display = 'none';
    document.getElementById('multipleQAContainer').innerHTML = '';
    qaPairCounter = 0;
  }
}

// Add Q&A pair in multiple mode
function addQAPair() {
  qaPairCounter++;
  const container = document.getElementById('multipleQAContainer');
  const pairDiv = document.createElement('div');
  pairDiv.className = 'qa-pair';
  pairDiv.id = `qa-pair-${qaPairCounter}`;
  pairDiv.innerHTML = `
    <div class="qa-pair-header">
      <span class="qa-pair-number">Q&A ${qaPairCounter}</span>
      <button type="button" class="remove-qa-button" onclick="removeQAPair(${qaPairCounter})">Remove</button>
    </div>
    <div class="form-group">
      <label>Question *</label>
      <input
        type="text"
        class="form-input qa-pair-question"
        placeholder="Enter your question"
        required
      />
    </div>
    <div class="form-group">
      <label>Answer *</label>
      <textarea
        class="form-textarea qa-pair-answer"
        placeholder="Enter the answer"
        required
      ></textarea>
    </div>
  `;
  container.appendChild(pairDiv);
}

// Add Q&A pair in inline form
function addInlineQAPair() {
  inlineQAPairCounter++;
  const container = document.getElementById('inlineQAContainer');
  if (!container) {
    console.error('inlineQAContainer not found');
    return;
  }
  
  const pairDiv = document.createElement('div');
  pairDiv.className = 'qa-pair';
  pairDiv.id = `inline-qa-pair-${inlineQAPairCounter}`;
  const pairsCount = container.children.length;
  pairDiv.innerHTML = `
    <div class="qa-pair-header">
      <span class="qa-pair-number">Q&A ${inlineQAPairCounter}</span>
      ${pairsCount > 0 ? `<button type="button" class="remove-qa-button" onclick="removeInlineQAPair(${inlineQAPairCounter})">Remove</button>` : ''}
    </div>
    <div class="form-group">
      <label>Question (optional - leave empty for announcements)</label>
      <input
        type="text"
        class="form-input inline-qa-pair-question"
        placeholder="Enter your question (leave empty for announcements)"
      />
    </div>
    <div class="form-group">
      <label>Answer *</label>
      <textarea
        class="form-textarea inline-qa-pair-answer"
        placeholder="Enter the answer or announcement"
        required
      ></textarea>
    </div>
  `;
  container.appendChild(pairDiv);
  
  // Update remove buttons visibility
  updateInlineRemoveButtons();
}

// Remove inline Q&A pair
function removeInlineQAPair(id) {
  const pair = document.getElementById(`inline-qa-pair-${id}`);
  if (pair) {
    pair.remove();
    // Renumber remaining pairs
    const pairs = document.querySelectorAll('#inlineQAContainer .qa-pair');
    pairs.forEach((pair, index) => {
      const number = pair.querySelector('.qa-pair-number');
      if (number) {
        number.textContent = `Q&A ${index + 1}`;
      }
    });
    updateInlineRemoveButtons();
  }
}

// Update remove buttons visibility (hide for first pair)
function updateInlineRemoveButtons() {
  const pairs = document.querySelectorAll('#inlineQAContainer .qa-pair');
  pairs.forEach((pair, index) => {
    const header = pair.querySelector('.qa-pair-header');
    if (!header) return;
    
    let removeButton = header.querySelector('.remove-qa-button');
    
    if (pairs.length > 1) {
      // Show remove button for all pairs when more than one exists
      if (!removeButton) {
        const pairId = pair.id.replace('inline-qa-pair-', '');
        removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-qa-button';
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => removeInlineQAPair(pairId);
        header.appendChild(removeButton);
      }
      removeButton.style.display = 'block';
    } else {
      // Hide remove button when only one pair exists
      if (removeButton) {
        removeButton.style.display = 'none';
      }
    }
  });
}

// Handle inline form submission - merges FAQs and Announcements
async function handleInlineSubmit(event) {
  event.preventDefault();
  
  const submitButton = document.getElementById('inlineSubmitButton');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';
  
  try {
    // Collect all pairs
    const pairs = document.querySelectorAll('#inlineQAContainer .qa-pair');
    const faqData = [];
    const announcementData = [];
    
    pairs.forEach(pair => {
      const question = pair.querySelector('.inline-qa-pair-question').value.trim();
      const answer = pair.querySelector('.inline-qa-pair-answer').value.trim();
      
      if (!answer) {
        return; // Skip if answer is empty
      }
      
      // If question is empty but answer is not, treat as announcement
      if (!question && answer) {
        announcementData.push({ announcement: answer });
      } else if (question && answer) {
        // Both question and answer present, treat as FAQ
        faqData.push({ question, answer });
      }
    });
    
    if (faqData.length === 0 && announcementData.length === 0) {
      throw new Error('Please add at least one FAQ or Announcement');
    }
    
    // Save FAQs if any
    if (faqData.length > 0) {
      const faqPayload = {
        action: 'addFAQ',
        data: faqData.length === 1 ? faqData[0] : faqData
      };
      
      const faqResponse = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(faqPayload)
      });
      
      if (!faqResponse.ok) {
        throw new Error(`Failed to save FAQ: ${faqResponse.status} ${faqResponse.statusText}`);
      }
      
      const faqResponseData = await faqResponse.json();
      
      if (faqResponseData.status === 'error') {
        throw new Error(faqResponseData.data?.error || 'Error saving FAQ');
      }
    }
    
    // Save Announcements if any
    if (announcementData.length > 0) {
      const annPayload = {
        action: 'addAnnouncement',
        type: 'announcements',
        data: announcementData.length === 1 ? announcementData[0] : announcementData
      };
      
      const annResponse = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(annPayload)
      });
      
      if (!annResponse.ok) {
        throw new Error(`Failed to save Announcement: ${annResponse.status} ${annResponse.statusText}`);
      }
      
      const annResponseData = await annResponse.json();
      
      if (annResponseData.status === 'error') {
        throw new Error(annResponseData.data?.error || 'Error saving Announcement');
      }
    }
    
    // Success message
    const messages = [];
    if (faqData.length > 0) {
      messages.push(`${faqData.length} FAQ${faqData.length > 1 ? 's' : ''}`);
    }
    if (announcementData.length > 0) {
      messages.push(`${announcementData.length} Announcement${announcementData.length > 1 ? 's' : ''}`);
    }
    
    showMessage(
      `${messages.join(' and ')} added successfully`,
      'success'
    );
    
    // Clear the form
    document.getElementById('inlineQAContainer').innerHTML = '';
    inlineQAPairCounter = 0;
    addInlineQAPair(); // Add one empty pair
    
    submitButton.disabled = false;
    submitButton.textContent = 'Save';
  } catch (error) {
    console.error('Error saving:', error);
    showMessage(`Error saving: ${error.message}`, 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Save';
  }
}

// Add inline announcement
function addInlineAnnouncement() {
  inlineAnnouncementCounter++;
  const container = document.getElementById('inlineAnnouncementContainer');
  if (!container) {
    console.error('inlineAnnouncementContainer not found');
    return;
  }
  
  const annDiv = document.createElement('div');
  annDiv.className = 'announcement-pair';
  annDiv.id = `inline-announcement-${inlineAnnouncementCounter}`;
  const annsCount = container.children.length;
  annDiv.innerHTML = `
    <div class="qa-pair-header">
      <span class="qa-pair-number">Announcement ${inlineAnnouncementCounter}</span>
      ${annsCount > 0 ? `<button type="button" class="remove-qa-button" onclick="removeInlineAnnouncement(${inlineAnnouncementCounter})">Remove</button>` : ''}
    </div>
    <div class="form-group">
      <label>Announcement *</label>
      <textarea
        class="form-textarea inline-announcement-text"
        placeholder="Enter your announcement"
        required
      ></textarea>
    </div>
  `;
  container.appendChild(annDiv);
  updateInlineAnnouncementRemoveButtons();
}

// Remove inline announcement
function removeInlineAnnouncement(id) {
  const ann = document.getElementById(`inline-announcement-${id}`);
  if (ann) {
    ann.remove();
    const anns = document.querySelectorAll('#inlineAnnouncementContainer .announcement-pair');
    anns.forEach((ann, index) => {
      const number = ann.querySelector('.qa-pair-number');
      if (number) {
        number.textContent = `Announcement ${index + 1}`;
      }
    });
    updateInlineAnnouncementRemoveButtons();
  }
}

// Update remove buttons for announcements
function updateInlineAnnouncementRemoveButtons() {
  const anns = document.querySelectorAll('#inlineAnnouncementContainer .announcement-pair');
  anns.forEach((ann, index) => {
    const header = ann.querySelector('.qa-pair-header');
    if (!header) return;
    
    let removeButton = header.querySelector('.remove-qa-button');
    
    if (anns.length > 1) {
      if (!removeButton) {
        const annId = ann.id.replace('inline-announcement-', '');
        removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-qa-button';
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => removeInlineAnnouncement(annId);
        header.appendChild(removeButton);
      }
      removeButton.style.display = 'block';
    } else {
      if (removeButton) {
        removeButton.style.display = 'none';
      }
    }
  });
}

// Handle inline announcement submission
async function handleInlineAnnouncementSubmit(event) {
  event.preventDefault();
  
  const submitButton = document.getElementById('inlineAnnouncementSubmitButton');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';
  
  try {
    const anns = document.querySelectorAll('#inlineAnnouncementContainer .announcement-pair');
    const annData = [];
    
    anns.forEach(ann => {
      const text = ann.querySelector('.inline-announcement-text').value.trim();
      if (text) {
        annData.push({ announcement: text });
      }
    });
    
    if (annData.length === 0) {
      throw new Error('Please add at least one announcement');
    }
    
    const payload = {
      action: 'addAnnouncement',
      type: 'announcements',
      data: annData.length === 1 ? annData[0] : annData
    };
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save announcement: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error saving announcement');
    }
    
    showMessage(
      annData.length > 1 
        ? `${annData.length} announcements added successfully` 
        : 'Announcement added successfully',
      'success'
    );
    
    // Clear the form
    document.getElementById('inlineAnnouncementContainer').innerHTML = '';
    inlineAnnouncementCounter = 0;
    addInlineAnnouncement(); // Add one empty announcement
    
    submitButton.disabled = false;
    submitButton.textContent = 'Save Announcement';
  } catch (error) {
    console.error('Error saving announcement:', error);
    showMessage(`Error saving announcement: ${error.message}`, 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Save Announcement';
  }
}

// Show existing announcements
async function showExistingAnnouncements() {
  const announcementsList = document.getElementById('announcementsList');
  const addAnnouncementForm = document.getElementById('addAnnouncementForm');
  
  if (!announcementsList) {
    console.error('announcementsList element not found!');
    return;
  }
  
  // Check if announcements are already shown (toggle behavior)
  if (existingAnnouncementsShown && announcementsList.style.display !== 'none') {
    hideExistingAnnouncements();
    return;
  }
  
  // Hide the add form
  if (addAnnouncementForm) {
    addAnnouncementForm.style.display = 'none';
  }
  
  // Show the announcements list
  announcementsList.style.display = 'block';
  
  // Load announcements if not already loaded
  if (!announcementsLoaded) {
    await loadAnnouncements();
    existingAnnouncementsShown = true;
  }
  
  // Update button text
  const showButton = document.getElementById('showAnnouncementsButton');
  if (showButton) {
    showButton.textContent = 'Hide Existing Announcements';
    showButton.setAttribute('onclick', 'hideExistingAnnouncements()');
  }
}

// Hide existing announcements and show add form
function hideExistingAnnouncements() {
  const announcementsList = document.getElementById('announcementsList');
  const addAnnouncementForm = document.getElementById('addAnnouncementForm');
  
  // Hide announcements list
  if (announcementsList) {
    announcementsList.style.display = 'none';
  }
  
  // Show add form
  if (addAnnouncementForm) {
    addAnnouncementForm.style.display = 'block';
  }
  
  // Update button text
  const showButton = document.getElementById('showAnnouncementsButton');
  if (showButton) {
    showButton.textContent = 'Show Existing Announcements';
    showButton.setAttribute('onclick', 'showExistingAnnouncements()');
  }
}

// Handle announcement edit submission
async function handleAnnouncementSubmit(event) {
  event.preventDefault();
  
  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';
  
  try {
    const announcementText = document.getElementById('announcementText').value.trim();
    
    if (!announcementText) {
      throw new Error('Please enter an announcement');
    }
    
    const ann = editingAnnouncementId ? announcements.find(a => a.id === editingAnnouncementId) : null;
    
    const payload = {
      action: editingAnnouncementId ? 'updateAnnouncement' : 'addAnnouncement',
      type: 'announcements',
      data: { announcement: announcementText }
    };
    
    if (editingAnnouncementId && ann) {
      payload.id = editingAnnouncementId;
      payload.row = ann.row;
    }
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save announcement: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error saving announcement');
    }
    
    showMessage(
      editingAnnouncementId ? 'Announcement updated successfully' : 'Announcement added successfully',
      'success'
    );
    
    closeAnnouncementModal();
    await loadAnnouncements();
  } catch (error) {
    console.error('Error saving announcement:', error);
    showMessage(`Error saving announcement: ${error.message}`, 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Save';
  }
}

// Close announcement modal
function closeAnnouncementModal() {
  const modal = document.getElementById('announcementModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    editingAnnouncementId = null;
    const form = document.getElementById('announcementForm');
    if (form) {
      form.reset();
    }
  }
}

// Remove Q&A pair
function removeQAPair(id) {
  const pair = document.getElementById(`qa-pair-${id}`);
  if (pair) {
    pair.remove();
    // Renumber remaining pairs
    const pairs = document.querySelectorAll('.qa-pair');
    pairs.forEach((pair, index) => {
      const number = pair.querySelector('.qa-pair-number');
      if (number) {
        number.textContent = `Q&A ${index + 1}`;
      }
    });
  }
}

// Save inline FAQ edit
async function saveInlineFAQ(id) {
  const faq = faqs.find(f => f.id === id);
  if (!faq) {
    showMessage('FAQ not found', 'error');
    return;
  }
  
  const questionInput = document.getElementById(`edit-question-${id}`);
  const answerInput = document.getElementById(`edit-answer-${id}`);
  
  if (!questionInput || !answerInput) {
    showMessage('Edit fields not found', 'error');
    return;
  }
  
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();
  
  if (!question || !answer) {
    showMessage('Please fill in both question and answer', 'error');
    return;
  }
  
  // Disable inputs and show loading state
  questionInput.disabled = true;
  answerInput.disabled = true;
  const saveButton = document.querySelector(`#faq-${id} .inline-save-button`);
  const cancelButton = document.querySelector(`#faq-${id} .inline-cancel-button`);
  const originalSaveText = saveButton ? saveButton.textContent : 'Save';
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
  }
  if (cancelButton) {
    cancelButton.disabled = true;
  }
  showMessage('Saving FAQ...', 'loading');
  
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'updateFAQ',
        type: 'faqs',
        id: id,
        row: faq.row,
        data: { question, answer }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update FAQ: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error updating FAQ');
    }
    
    // Update local data
    faq.question = question;
    faq.answer = answer;
    
    // Cancel editing
    editingId = null;
    
    // Re-render based on current view
    const urlParams = new URLSearchParams(window.location.search);
    const faqIdParam = urlParams.get('id');
    
    if (faqIdParam === id) {
      // Single FAQ view - reload to show updated FAQ
      await loadFAQs();
      displayFAQs(faqIdParam);
    } else if (displayMode === 'faqs' || displayMode === 'both') {
      displayFAQsOnly();
    } else {
      displayCombinedItems();
    }
    
    showMessage('FAQ updated successfully', 'success');
  } catch (error) {
    console.error('Error updating FAQ:', error);
    showMessage(`Error updating FAQ: ${error.message}`, 'error');
    // Re-enable inputs and buttons on error
    questionInput.disabled = false;
    answerInput.disabled = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = originalSaveText;
    }
    if (cancelButton) {
      cancelButton.disabled = false;
    }
  }
}

// Cancel inline FAQ edit
function cancelInlineEdit(id) {
  editingId = null;
  
  // Re-render based on current view
  const urlParams = new URLSearchParams(window.location.search);
  const faqIdParam = urlParams.get('id');
  
  if (faqIdParam === id) {
    // Single FAQ view
    displayFAQs(faqIdParam);
  } else if (displayMode === 'faqs' || displayMode === 'both') {
    displayFAQsOnly();
  } else {
    displayCombinedItems();
  }
}

// Save inline Announcement edit
async function saveInlineAnnouncement(id) {
  const ann = announcements.find(a => a.id === id);
  if (!ann) {
    showMessage('Announcement not found', 'error');
    return;
  }
  
  const announcementInput = document.getElementById(`edit-announcement-${id}`);
  
  if (!announcementInput) {
    showMessage('Edit field not found', 'error');
    return;
  }
  
  const announcement = announcementInput.value.trim();
  
  if (!announcement) {
    showMessage('Please enter an announcement', 'error');
    return;
  }
  
  // Disable input and show loading state
  announcementInput.disabled = true;
  const saveButton = document.querySelector(`#announcement-${id} .inline-save-button`);
  const cancelButton = document.querySelector(`#announcement-${id} .inline-cancel-button`);
  const originalSaveText = saveButton ? saveButton.textContent : 'Save';
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
  }
  if (cancelButton) {
    cancelButton.disabled = true;
  }
  showMessage('Saving announcement...', 'loading');
  
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'updateAnnouncement',
        type: 'announcements',
        id: id,
        row: ann.row,
        data: { announcement }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update Announcement: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error updating Announcement');
    }
    
    // Update local data
    ann.announcement = announcement;
    
    // Cancel editing
    editingAnnouncementId = null;
    
    // Re-render
    if (displayMode === 'announcements' || displayMode === 'both') {
      displayAnnouncementsOnly();
    } else {
      displayCombinedItems();
    }
    
    showMessage('Announcement updated successfully', 'success');
  } catch (error) {
    console.error('Error updating Announcement:', error);
    showMessage(`Error updating Announcement: ${error.message}`, 'error');
    // Re-enable input and buttons on error
    announcementInput.disabled = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = originalSaveText;
    }
    if (cancelButton) {
      cancelButton.disabled = false;
    }
  }
}

// Cancel inline Announcement edit
function cancelInlineEditAnnouncement(id) {
  editingAnnouncementId = null;
  
  // Re-render
  if (displayMode === 'announcements' || displayMode === 'both') {
    displayAnnouncementsOnly();
  } else {
    displayCombinedItems();
  }
}

// Edit FAQ
// Enable inline editing for FAQ
function editFAQ(id) {
  const faq = faqs.find(f => f.id === id);
  if (!faq) {
    showMessage('FAQ not found', 'error');
    return;
  }
  
  // Cancel any other editing
  if (editingId && editingId !== id) {
    cancelInlineEdit(editingId);
  }
  if (editingAnnouncementId) {
    cancelInlineEditAnnouncement(editingAnnouncementId);
  }
  
  editingId = id;
  
  // Re-render the display to show editable fields
  const urlParams = new URLSearchParams(window.location.search);
  const faqIdParam = urlParams.get('id');
  
  if (faqIdParam === id) {
    // Single FAQ view
    displayFAQs(faqIdParam);
  } else if (displayMode === 'faqs' || displayMode === 'both') {
    displayFAQsOnly();
  } else if (displayMode === 'announcements') {
    displayAnnouncementsOnly();
  } else {
    displayCombinedItems();
  }
}

// Delete FAQ
async function deleteFAQ(id) {
  if (!confirm('Are you sure you want to delete this Q&A?')) {
    return;
  }
  
  const faq = faqs.find(f => f.id === id);
  if (!faq) {
    showMessage('FAQ not found', 'error');
    return;
  }
  
  // Disable delete button and show loading state
  const deleteButton = document.querySelector(`#faq-${id} .faq-action-button.delete`);
  const editButton = document.querySelector(`#faq-${id} .faq-action-button:not(.delete)`);
  const copyButton = document.querySelector(`#faq-${id} .share-link-button`);
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting...';
  }
  if (editButton) editButton.disabled = true;
  if (copyButton) copyButton.disabled = true;
  showMessage('Deleting FAQ...', 'loading');
  
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'deleteFAQ',
        type: 'faqs',
        id: id,
        row: faq.row
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete FAQ: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error deleting FAQ');
    }
    
    showMessage('FAQ deleted successfully', 'success');
    
    // If we're in single FAQ view and deleted that FAQ, redirect to all FAQs
    const urlParams = new URLSearchParams(window.location.search);
    const currentFaqId = urlParams.get('id');
    if (currentFaqId === id) {
      // Redirect to all FAQs page after a short delay
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1500);
    } else {
      // Reload FAQs and refresh the display
      await loadFAQs();
      
      // Refresh the display based on current view mode
      if (displayMode === 'faqs') {
        displayFAQsOnly();
      } else if (displayMode === 'announcements') {
        displayAnnouncementsOnly();
      } else if (displayMode === 'both') {
        displayCombinedItems();
      } else {
        // If not in any display mode, show FAQs only
        displayFAQsOnly();
      }
    }
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    showMessage(`Error deleting FAQ: ${error.message}`, 'error');
    // Re-enable buttons on error
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.textContent = 'Delete';
    }
    if (editButton) editButton.disabled = false;
    if (copyButton) copyButton.disabled = false;
  }
}

// Handle form submission
async function handleSubmit(event) {
  event.preventDefault();
  
  const submitButton = document.getElementById('submitButton');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';
  
  try {
    const multipleMode = document.getElementById('multipleMode').checked;
    let qaData = [];
    
    if (multipleMode) {
      // Collect multiple Q&A pairs
      const pairs = document.querySelectorAll('.qa-pair');
      pairs.forEach(pair => {
        const question = pair.querySelector('.qa-pair-question').value.trim();
        const answer = pair.querySelector('.qa-pair-answer').value.trim();
        if (question && answer) {
          qaData.push({ question, answer });
        }
      });
      
      if (qaData.length === 0) {
        throw new Error('Please add at least one Q&A pair');
      }
    } else {
      // Single Q&A
      const question = document.getElementById('question').value.trim();
      const answer = document.getElementById('answer').value.trim();
      
      if (!question || !answer) {
        throw new Error('Please fill in both question and answer');
      }
      
      qaData = [{ question, answer }];
    }
    
    // Prepare payload
    const payload = {
      action: editingId ? 'updateFAQ' : 'addFAQ',
      type: 'faqs',
      data: multipleMode ? qaData : qaData[0]
    };
    
    if (editingId) {
      const faq = faqs.find(f => f.id === editingId);
      if (faq) {
        payload.id = editingId;
        payload.row = faq.row;
      } else {
        payload.id = editingId;
      }
    }
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save FAQ: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (responseData.status === 'error') {
      throw new Error(responseData.data?.error || 'Error saving FAQ');
    }
    
    showMessage(
      editingId 
        ? 'FAQ updated successfully' 
        : multipleMode 
          ? `${qaData.length} Q&A added successfully` 
          : 'Q&A added successfully',
      'success'
    );
    
    closeModal();
    
    // If we're editing in single FAQ view, preserve the query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const currentFaqId = urlParams.get('id');
    if (editingId && currentFaqId === editingId) {
      // Stay in single FAQ view after editing
      loadFAQs();
    } else if (editingId && currentFaqId) {
      // If editing a different FAQ while viewing another, redirect to the edited FAQ
      window.location.href = `${window.location.pathname}?id=${editingId}`;
    } else {
      // Normal reload
      loadFAQs();
    }
  } catch (error) {
    console.error('Error saving FAQ:', error);
    showMessage(`Error saving FAQ: ${error.message}`, 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Save';
  }
}

// Close modal
function closeModal() {
  const modal = document.getElementById('faqModal');
  modal.classList.remove('show');
  modal.removeAttribute('tabindex');
  document.body.style.overflow = '';
  editingId = null;
  document.getElementById('faqForm').reset();
}

// Close modal on backdrop click
function closeModalOnBackdrop(event) {
  if (event.target === event.currentTarget) {
    closeModal();
  }
}

// Handle modal keyboard events
function handleModalKeyDown(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modal = document.getElementById('faqModal');
    if (modal.classList.contains('show')) {
      closeModal();
    }
  }
});

// Copy share link
function copyShareLink(faqId) {
  // Construct full URL with domain
  const fullUrl = `${window.location.origin}${window.location.pathname}?id=${faqId}`;
  
  navigator.clipboard.writeText(fullUrl).then(() => {
    showMessage('Share link copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy link:', err);
    // Fallback: select text
    const textArea = document.createElement('textarea');
    textArea.value = fullUrl;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showMessage('Share link copied to clipboard!', 'success');
    } catch (err) {
      showMessage('Failed to copy link. Please copy manually: ' + fullUrl, 'error');
    }
    document.body.removeChild(textArea);
  });
}

// Show message
function showMessage(message, type) {
  const messageContainer = document.getElementById('messageContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `${type}-message`;
  messageDiv.textContent = message;
  messageContainer.innerHTML = '';
  messageContainer.appendChild(messageDiv);
  
  // Auto-remove success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
}

// Toggle FAQ expand/collapse
function toggleFAQ(id) {
  const faqItem = document.getElementById(`faq-${id}`);
  if (faqItem) {
    faqItem.classList.toggle('expanded');
  }
}

// Toggle Announcement expand/collapse
function toggleAnnouncement(id) {
  const annItem = document.getElementById(`announcement-${id}`);
  if (annItem) {
    annItem.classList.toggle('expanded');
  }
}

// Handle search input
function handleSearch(event) {
  searchQuery = event.target.value;
  const clearButton = document.getElementById('clearSearchButton');
  if (clearButton) {
    clearButton.style.display = searchQuery.trim() ? 'block' : 'none';
  }
  
  // Re-display FAQs with search filter
  if (displayMode === 'faqs' || displayMode === 'both') {
    if (displayMode === 'faqs') {
      displayFAQsOnly();
    } else {
      displayCombinedItems();
    }
  }
}

// Clear search
function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    searchQuery = '';
  }
  const clearButton = document.getElementById('clearSearchButton');
  if (clearButton) {
    clearButton.style.display = 'none';
  }
  
  // Re-display FAQs without search filter
  if (displayMode === 'faqs' || displayMode === 'both') {
    if (displayMode === 'faqs') {
      displayFAQsOnly();
    } else {
      displayCombinedItems();
    }
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle query parameter for specific FAQ
function handleQueryParameter() {
  const urlParams = new URLSearchParams(window.location.search);
  const faqId = urlParams.get('id');
  
  if (faqId) {
    console.log('Query parameter found, displaying FAQ:', faqId);
    setTimeout(() => {
      const element = document.getElementById(`faq-${faqId}`);
      if (element) {
        // Scroll to the top of the page since we're showing only one FAQ
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.warn('FAQ element not found for ID:', faqId);
      }
    }, 100);
  }
}

// Handle popstate for browser back/forward navigation
window.addEventListener('popstate', function() {
  // Reload FAQs when navigating back/forward to handle query parameter changes
  loadFAQs();
});

// Make all functions globally accessible for inline onclick handlers
window.loadFAQs = loadFAQs;
window.loadAnnouncements = loadAnnouncements;
window.openAddModal = openAddModal;
window.closeModal = closeModal;
window.addQAPair = addQAPair;
window.removeQAPair = removeQAPair;
window.editFAQ = editFAQ;
window.deleteFAQ = deleteFAQ;
window.saveInlineFAQ = saveInlineFAQ;
window.cancelInlineEdit = cancelInlineEdit;
window.saveInlineAnnouncement = saveInlineAnnouncement;
window.cancelInlineEditAnnouncement = cancelInlineEditAnnouncement;
window.toggleFAQ = toggleFAQ;
window.toggleAnnouncement = toggleAnnouncement;
window.handleSearch = handleSearch;
window.clearSearch = clearSearch;
window.copyShareLink = copyShareLink;
window.handleSubmit = handleSubmit;
window.closeModalOnBackdrop = closeModalOnBackdrop;
window.handleModalKeyDown = handleModalKeyDown;
window.toggleMultipleMode = toggleMultipleMode;
window.handleQueryParameter = handleQueryParameter;
window.toggleSingleFAQView = toggleSingleFAQView;
window.showExistingFAQs = showExistingFAQs;
window.hideExistingFAQs = hideExistingFAQs;
window.showExistingItems = showExistingItems;
window.hideExistingItems = hideExistingItems;
window.showExistingFAQsOnly = showExistingFAQsOnly;
window.showExistingAnnouncementsOnly = showExistingAnnouncementsOnly;
window.displayCombinedItems = displayCombinedItems;
window.displayFAQsOnly = displayFAQsOnly;
window.displayAnnouncementsOnly = displayAnnouncementsOnly;
window.addInlineQAPair = addInlineQAPair;
window.removeInlineQAPair = removeInlineQAPair;
window.handleInlineSubmit = handleInlineSubmit;
window.updateInlineRemoveButtons = updateInlineRemoveButtons;
window.displayAnnouncements = displayAnnouncements;
window.editAnnouncement = editAnnouncement;
window.deleteAnnouncement = deleteAnnouncement;
window.addInlineAnnouncement = addInlineAnnouncement;
window.removeInlineAnnouncement = removeInlineAnnouncement;
window.handleInlineAnnouncementSubmit = handleInlineAnnouncementSubmit;
window.updateInlineAnnouncementRemoveButtons = updateInlineAnnouncementRemoveButtons;
window.showExistingAnnouncements = showExistingAnnouncements;
window.hideExistingAnnouncements = hideExistingAnnouncements;
window.handleAnnouncementSubmit = handleAnnouncementSubmit;
window.closeAnnouncementModal = closeAnnouncementModal;
