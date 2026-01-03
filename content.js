// Main entry point
async function initExtension() {
  try {
    console.log('[Baomoi Filter] Initializing...');
    
    // Lấy cấu hình ban đầu
    await BM.Storage.getConfig();
    
    // Thực hiện lọc lần đầu
    await BM.Filter.hideNewsItems();
    
    // Thiết lập Observer
    BM.Observer.setupMutationObserver();
    
    // Khởi tạo UI (Sidebar & Toggle Button)
    BM.UI.createSidebar();
    
    console.log('[Baomoi Filter] Ready');
  } catch (error) {
    console.error('[Baomoi Filter] Init error:', error);
  }
}

// Lắng nghe message từ background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TOGGLE_SIDEBAR") {
    BM.UI.toggleSidebar();
  }
});

// Chạy extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}
