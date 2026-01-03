window.BM = window.BM || {};

BM.Storage = {
  cachedConfig: null,

  // Hàm lấy cấu hình từ storage
  getConfig: function() {
    if (this.cachedConfig) return Promise.resolve(this.cachedConfig);
    
    return new Promise(resolve => {
      chrome.storage.sync.get(
        {
          keywords: [],
          sources: [],
          selector: '.bm-card',
          opacity: '0.2'
        },
        items => {
          this.cachedConfig = items;
          resolve(items);
        }
      );
    });
  },
  
  // Hàm lưu cấu hình (chủ yếu dùng cho UI, nhưng có thể hữu ích ở đây)
  saveConfig: function(settings) {
    return new Promise(resolve => {
      chrome.storage.sync.set(settings, () => {
        this.cachedConfig = null; // Clear cache
        resolve();
      });
    });
  },

  clearCache: function() {
    this.cachedConfig = null;
  }
};

// Lắng nghe thay đổi cấu hình
chrome.storage.onChanged.addListener(changes => {
  console.log('Cấu hình đã thay đổi, cập nhật lại bộ lọc...');
  BM.Storage.clearCache(); 
  // Trigger re-filter if possible, logic này có thể ở content.js chính
  if (BM.Filter && typeof BM.Filter.hideNewsItems === 'function') {
    BM.Storage.getConfig().then(() => BM.Filter.hideNewsItems());
  }
});
