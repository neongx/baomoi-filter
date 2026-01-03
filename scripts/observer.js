window.BM = window.BM || {};

BM.Observer = {
  // Tìm container chứa tin tức
  findNewsContainer: function() {
    const selectors = [
      '.news-container', '.feed-container', '.news-feed', '.content-feed',
      'main', '#content', '.content-area'
    ];
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) return container;
    }
    
    // Fallback logic
    // ... có thể implement thêm logic tìm kiếm thông minh từ content.js cũ
    // For brevity, defaulting to body if not found
    return document.body;
  },

  handleNewNodes: function(addedNodes) {
    BM.Storage.getConfig().then(config => {
      const selector = config.selector;
      const elementNodes = Array.from(addedNodes).filter(node => node.nodeType === 1);
      
      for (const node of elementNodes) {
        if (node.matches && node.matches(selector)) {
          BM.Filter.processNewsItem(node);
        }
        if (node.querySelectorAll) {
          const newsItems = node.querySelectorAll(selector);
          for (const item of newsItems) {
            BM.Filter.processNewsItem(item);
          }
        }
      }
    });
  },

  checkForNewItems: function() {
     BM.Storage.getConfig().then(config => {
        const newsItems = document.querySelectorAll(config.selector);
        for (const item of newsItems) {
           BM.Filter.processNewsItem(item);
        }
     });
  },

  setupMutationObserver: function() {
    const throttledCheck = BM.Utils.throttle(() => this.checkForNewItems(), 300);
    
    const observer = new MutationObserver((mutationsList) => {
      let hasNewNodes = false;
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasNewNodes = true;
          this.handleNewNodes(mutation.addedNodes);
        }
      }
      
      if (hasNewNodes) {
        setTimeout(throttledCheck, 100);
      }
    });
    
    const newsContainer = this.findNewsContainer();
    console.log('[Baomoi Filter] Observing:', newsContainer);
    
    observer.observe(newsContainer, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false
    });
    
    // Fallback interval
    setInterval(() => this.checkForNewItems(), 2000);
    
    return observer;
  }
};
