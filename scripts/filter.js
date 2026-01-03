window.BM = window.BM || {};

BM.Filter = {
  processedItems: new WeakSet(),

  // Hàm kiểm tra xem một mục tin có nên ẩn không
  shouldHideItem: function(item, keywords, sources) {
    if (keywords.length === 0 && sources.length === 0) return { hide: false };
    
    const textContent = item.innerText;
    const lowerTextContent = textContent.toLowerCase();
    
    // Kiểm tra từ khóa
    if (keywords.length > 0) {
      const matchedKeywords = keywords.filter(keyword => {
        if (keyword.includes('*')) {
          const regex = BM.Utils.createWildcardRegex(keyword);
          return regex.test(textContent);
        }
        return lowerTextContent.includes(keyword.toLowerCase());
      });
      
      if (matchedKeywords.length > 0) {
        return { 
          hide: true, 
          reason: 'keyword', 
          matches: matchedKeywords 
        };
      }
    }
    
    // Kiểm tra nguồn tin
    if (sources.length > 0) {
      const sourceElement = item.querySelector('a.bm-card-source');
      if (sourceElement) {
        const sourceName = (sourceElement.getAttribute('title') || sourceElement.innerText).toLowerCase();
        const matchedSources = sources.filter(source => 
          sourceName.includes(source.toLowerCase())
        );
        
        if (matchedSources.length > 0) {
          return { 
            hide: true, 
            reason: 'source', 
            matches: matchedSources,
            sourceName: sourceName
          };
        }
      }
    }
    
    return { hide: false };
  },
  
  // Trích xuất tiêu đề (cho log)
  getNewsTitle: function(item) {
    const titleElement = item.querySelector('h3, h2, .title');
    return titleElement ? titleElement.innerText.trim() : 'Không có tiêu đề';
  },

  // Áp dụng hiệu ứng ẩn
  applyHidingEffect: function(item, opacity, hideResult) {
    const title = this.getNewsTitle(item);
    console.log(`%c🚫 "${title}"`, 'color: #e74c3c; font-weight: bold');
    
    if (opacity === '0') {
      item.style.display = 'none';
    } else {
      item.style.opacity = opacity;
      item.style.transition = 'opacity 0.3s ease';
    }
  },

  // Xử lý từng phần tử tin tức
  processNewsItem: async function(item) {
    if (this.processedItems.has(item)) return;
    this.processedItems.add(item);
    
    try {
      const { keywords, sources, opacity } = await BM.Storage.getConfig();
      if (keywords.length === 0 && sources.length === 0) return;
      
      const hideResult = this.shouldHideItem(item, keywords, sources);
      if (hideResult.hide) {
        this.applyHidingEffect(item, opacity, hideResult);
      }
    } catch (error) {
      console.error('Error in processNewsItem:', error);
    }
  },

  // Hàm chính để ẩn các mục tin (quét toàn trang)
  hideNewsItems: async function() {
    try {
      const { keywords, sources, selector, opacity } = await BM.Storage.getConfig();
      
      const newsItems = document.querySelectorAll(selector);
      if (!newsItems || newsItems.length === 0) return;
      
      // Reset opacity (optional, but good if settings changed)
      newsItems.forEach(item => {
         // Chỉ reset nếu item chưa bị ẩn hoặc cần update lại
         // Thực tế ta cứ chạy logic check lại là được, 
         // nhưng để tối ưu có thể bỏ qua bước reset nếu không cần thiết.
         // Ở bản cũ có reset để đảm bảo cài đặt mới update đúng.
         if (item.style.opacity && item.style.opacity !== '1') {
             item.style.opacity = '1';
         }
         if (item.style.display === 'none') item.style.display = '';
      });
      
      let hiddenCount = 0;
      for (const item of newsItems) {
        this.processedItems.add(item);
        const hideResult = this.shouldHideItem(item, keywords, sources);
        if (hideResult.hide) {
          this.applyHidingEffect(item, opacity, hideResult);
          hiddenCount++;
        }
      }
      
      if (hiddenCount > 0) {
        console.log(`%c=== Đã ẩn ${hiddenCount} tin tức ===`, 'color: #2ecc71');
      }
    } catch (error) {
      console.error('Error in hideNewsItems:', error);
    }
  }
};
