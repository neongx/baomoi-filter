// Lưu trữ cấu hình để tránh truy vấn lặp lại
let cachedConfig = null;
// Theo dõi các phần tử tin tức đã xử lý
let processedItems = new WeakSet();

// Hàm lấy cấu hình từ storage, sử dụng Promise để xử lý bất đồng bộ
function getConfig() {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  
  return new Promise(resolve => {
    chrome.storage.sync.get(
      {
        keywords: [],
        sources: [],
        selector: '.bm-card',
        opacity: '0.2'
      },
      items => {
        cachedConfig = items;
        resolve(items);
      }
    );
  });
}

// Hàm chuyển đổi wildcard pattern thành RegExp
function createWildcardRegex(pattern) {
  // Escape các ký tự đặc biệt của regex trừ *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Thay thế * bằng .* (khớp bất kỳ chuỗi nào)
  const regexString = escaped.replace(/\*/g, '.*');
  return new RegExp(regexString, 'i'); // 'i' flag để không phân biệt hoa thường
}

// Hàm kiểm tra xem một mục tin có nên ẩn không và trả về lý do
function shouldHideItem(item, keywords, sources) {
  if (keywords.length === 0 && sources.length === 0) return { hide: false };
  
  const textContent = item.innerText; // Giữ nguyên case để regex xử lý 'i' flag hoặc toLowerCase tùy logic
  const lowerTextContent = textContent.toLowerCase();
  
  // Kiểm tra từ khóa
  if (keywords.length > 0) {
    const matchedKeywords = keywords.filter(keyword => {
      // Nếu có ký tự *, dùng regex
      if (keyword.includes('*')) {
        const regex = createWildcardRegex(keyword);
        return regex.test(textContent);
      }
      // Ngược lại dùng includes như cũ
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
}

// Hàm trích xuất tiêu đề tin tức
function getNewsTitle(item) {
  const titleElement = item.querySelector('h3, h2, .title');
  return titleElement ? titleElement.innerText.trim() : 'Không có tiêu đề';
}

// Áp dụng hiệu ứng ẩn cho các mục tin
function applyHidingEffect(item, opacity, hideResult) {
  // Log thông tin về việc ẩn tin tức
  const title = getNewsTitle(item);
  console.log(`%c🚫 "${title}"`, 'color: #e74c3c; font-weight: bold');
  if (hideResult.reason === 'keyword') {
    console.log(`-- từ khóa: ${hideResult.matches.join(', ')}`);
  } else if (hideResult.reason === 'source') {
    console.log(`-- nguồn: ${hideResult.matches.join(', ')}`);
  }
  
  // Áp dụng hiệu ứng ẩn
  if (opacity === '0') {
    item.style.display = 'none';
  } else {
    item.style.opacity = opacity;
    // Thêm transition để hiệu ứng mượt mà hơn
    item.style.transition = 'opacity 0.3s ease';
  }
}

// Xử lý từng phần tử tin tức
async function processNewsItem(item) {
  // Kiểm tra xem phần tử đã được xử lý chưa
  if (processedItems.has(item)) return;
  
  // Đánh dấu phần tử đã được xử lý
  processedItems.add(item);
  
  try {
    const { keywords, sources, opacity } = await getConfig();
    
    // Nếu không có từ khóa và nguồn nào được thiết lập, không cần lọc
    if (keywords.length === 0 && sources.length === 0) return;
    
    // Kiểm tra và áp dụng bộ lọc
    const hideResult = shouldHideItem(item, keywords, sources);
    if (hideResult.hide) {
      applyHidingEffect(item, opacity, hideResult);
    }
  } catch (error) {
    console.error('Error in processNewsItem:', error);
  }
}

// Hàm chính để ẩn các mục tin
async function hideNewsItems() {
  try {
    const { keywords, sources, selector, opacity } = await getConfig();
    
    // Nếu không có từ khóa và nguồn nào được thiết lập, không cần lọc
    if (keywords.length === 0 && sources.length === 0) return;
    
    console.log('%c=== Bắt đầu quá trình lọc tin tức ===', 'color: #3498db; font-weight: bold');
    console.log(`Từ khóa bị chặn: ${keywords.length > 0 ? keywords.join(', ') : 'Không có'}`);
    console.log(`Nguồn bị chặn: ${sources.length > 0 ? sources.join(', ') : 'Không có'}`);
    
    // Lấy danh sách các phần tử tin tức dựa theo selector
    const newsItems = document.querySelectorAll(selector);
    if (!newsItems || newsItems.length === 0) {
      console.log('Không tìm thấy tin tức nào với selector:', selector);
      return;
    }
    
    console.log(`Đã tìm thấy ${newsItems.length} tin tức để kiểm tra`);
    
    // Reset opacity của tất cả các mục tin
    newsItems.forEach(item => {
      item.style.opacity = '1';
      if (item.style.display === 'none') {
        item.style.display = '';
      }
    });
    
    let hiddenCount = 0;
    
    // Áp dụng hiệu ứng ẩn cho các mục tin phù hợp
    for (const item of newsItems) {
      // Đánh dấu phần tử đã được xử lý
      processedItems.add(item);
      
      const hideResult = shouldHideItem(item, keywords, sources);
      if (hideResult.hide) {
        applyHidingEffect(item, opacity, hideResult);
        hiddenCount++;
      }
    }
    
    console.log(`%c=== Kết thúc lọc: Đã ẩn ${hiddenCount}/${newsItems.length} tin tức ===`, 'color: #2ecc71; font-weight: bold');
  } catch (error) {
    console.error('Error in hideNewsItems:', error);
  }
}

// Tìm container chứa tin tức để theo dõi
function findNewsContainer() {
  // Thử tìm các container phổ biến
  const selectors = [
    '.news-container', 
    '.feed-container', 
    '.news-feed',
    '.content-feed',
    'main', 
    '#content',
    '.content-area'
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  
  // Nếu không tìm thấy container cụ thể, thử tìm container chứa các phần tử tin tức
  const config = cachedConfig || { selector: '.bm-card' };
  const newsItem = document.querySelector(config.selector);
  if (newsItem) {
    // Tìm parent node gần nhất có thể là container
    let parent = newsItem.parentElement;
    while (parent && parent !== document.body) {
      // Kiểm tra xem parent có chứa nhiều tin tức không
      if (parent.querySelectorAll(config.selector).length > 1) {
        return parent;
      }
      parent = parent.parentElement;
    }
  }
  
  // Fallback về body nếu không tìm thấy
  return document.body;
}

// Xử lý các node mới được thêm vào
function handleNewNodes(addedNodes) {
  if (!cachedConfig) return;
  
  const selector = cachedConfig.selector;
  
  // Lọc ra các node là Element
  const elementNodes = Array.from(addedNodes).filter(node => node.nodeType === 1);
  
  for (const node of elementNodes) {
    // Kiểm tra nếu node là phần tử tin tức
    if (node.matches && node.matches(selector)) {
      processNewsItem(node);
    }
    
    // Kiểm tra các phần tử tin tức con
    if (node.querySelectorAll) {
      const newsItems = node.querySelectorAll(selector);
      for (const item of newsItems) {
        processNewsItem(item);
      }
    }
  }
}

// Sử dụng throttle để tránh gọi hideNewsItems quá nhiều lần
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Kiểm tra các phần tử tin tức mới định kỳ
function checkForNewItems() {
  if (!cachedConfig) return;
  
  const newsItems = document.querySelectorAll(cachedConfig.selector);
  let newItemsCount = 0;
  
  for (const item of newsItems) {
    if (!processedItems.has(item)) {
      newItemsCount++;
      processNewsItem(item);
    }
  }
  
  if (newItemsCount > 0) {
    console.log(`Đã phát hiện và xử lý ${newItemsCount} phần tử tin tức mới`);
  }
}

// Thiết lập MutationObserver để theo dõi thay đổi DOM
const setupMutationObserver = () => {
  const throttledHideNewsItems = throttle(hideNewsItems, 300);
  const throttledCheckNewItems = throttle(checkForNewItems, 300);
  
  const observer = new MutationObserver((mutationsList) => {
    let hasNewNodes = false;
    
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        handleNewNodes(mutation.addedNodes);
      }
    }
    
    if (hasNewNodes) {
      console.log('Phát hiện thay đổi DOM, kiểm tra tin tức mới...');
      // Sử dụng setTimeout để đảm bảo DOM đã được cập nhật hoàn toàn
      setTimeout(throttledCheckNewItems, 100);
    }
  });
  
  // Tìm container chứa tin tức để theo dõi
  const newsContainer = findNewsContainer();
  console.log('Thiết lập theo dõi thay đổi DOM trên:', newsContainer);
  
  // Thiết lập observer với cấu hình phù hợp
  observer.observe(newsContainer, { 
    childList: true, 
    subtree: true,
    attributes: false,
    characterData: false
  });
  
  // Thiết lập kiểm tra định kỳ để bắt các tin tức mới có thể bị bỏ qua
  setInterval(checkForNewItems, 2000);
  
  return observer;
};

// Khởi tạo extension
async function initExtension() {
  try {
    // Lấy cấu hình
    await getConfig();
    
    // Thực hiện lọc ban đầu
    await hideNewsItems();
    
    // Thiết lập observer sau khi đã có cấu hình
    const observer = setupMutationObserver();
    
    // Lắng nghe thay đổi cấu hình
    chrome.storage.onChanged.addListener(changes => {
      console.log('Cấu hình đã thay đổi, cập nhật lại bộ lọc...');
      cachedConfig = null; // Reset cache khi cấu hình thay đổi
      getConfig().then(() => hideNewsItems());
    });
    
    console.log('Extension đã được khởi tạo thành công');
  } catch (error) {
    console.error('Lỗi khi khởi tạo extension:', error);
  }
}


// Khởi chạy extension khi trang đã tải
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}

/* --- SIDEBAR & SETTINGS LOGIC --- */

// Inject CSS cho Sidebar
function injectSidebarStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .bm-filter-sidebar {
      position: fixed;
      top: 0;
      left: -320px; /* Bắt đầu bên ngoài màn hình bên trái */
      width: 300px;
      height: 100vh;
      background: #ffffff;
      box-shadow: 2px 0 10px rgba(0,0,0,0.1);
      z-index: 999999;
      transition: left 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
    }
    
    .bm-filter-sidebar.open {
      left: 0;
    }
    
    .bm-sidebar-header {
      padding: 15px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .bm-sidebar-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }
    
    .bm-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0 5px;
    }
    
    .bm-sidebar-content {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }
    
    .bm-form-group {
      margin-bottom: 20px;
    }
    
    .bm-form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 14px;
      color: #444;
    }
    
    .bm-input-wrapper {
      display: flex;
      gap: 5px;
    }
    
    .bm-input {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .bm-btn {
      padding: 8px 15px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .bm-btn:hover {
      background: #2980b9;
    }
    
    .bm-btn-save {
      width: 100%;
      margin-top: 10px;
      background: #2ecc71;
    }
    
    .bm-btn-save:hover {
      background: #27ae60;
    }

    .bm-tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      padding: 8px;
      border: 1px solid #eee;
      border-radius: 4px;
      min-height: 40px;
      margin-top: 5px;
      background: #fafafa;
    }

    .bm-tag {
      display: inline-flex;
      align-items: center;
      background-color: #e0e0e0;
      color: #333;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .bm-tag-remove {
      margin-left: 5px;
      cursor: pointer;
      font-weight: bold;
      color: #666;
    }
    
    .bm-tag-remove:hover {
      color: #000;
    }
    
    .bm-status-msg {
      margin-top: 10px;
      text-align: center;
      font-size: 13px;
      min-height: 18px;
    }
  `;
  document.head.appendChild(style);
}

// Tạo Sidebar DOM
function createSidebar() {
  const sidebar = document.createElement('div');
  sidebar.id = 'bm-filter-sidebar';
  sidebar.className = 'bm-filter-sidebar';
  
  sidebar.innerHTML = `
    <div class="bm-sidebar-header">
      <h3>Cấu hình Bộ lọc</h3>
      <button class="bm-close-btn" id="bm-close-sidebar">&times;</button>
    </div>
    <div class="bm-sidebar-content">
      <div class="bm-form-group">
        <label>Từ khóa chặn</label>
        <div class="bm-input-wrapper">
          <input type="text" id="bm-keyword-input" class="bm-input" placeholder="Nhập từ khóa...">
          <button id="bm-add-keyword" class="bm-btn">Thêm</button>
        </div>
        <div id="bm-keywords-list" class="bm-tags-container"></div>
      </div>
      
      <div class="bm-form-group">
        <label>Nguồn chặn</label>
        <div class="bm-input-wrapper">
          <input type="text" id="bm-source-input" class="bm-input" placeholder="Nhập nguồn...">
          <button id="bm-add-source" class="bm-btn">Thêm</button>
        </div>
        <div id="bm-sources-list" class="bm-tags-container"></div>
      </div>
      
      <div class="bm-form-group">
        <label>Độ mờ tin bị ẩn: <span id="bm-opacity-value">0.2</span></label>
        <input type="range" id="bm-opacity-input" min="0" max="1" step="0.1" value="0.2" style="width: 100%">
      </div>

      <div class="bm-form-group">
        <label>CSS Selector (Nâng cao)</label>
        <input type="text" id="bm-selector-input" class="bm-input" value=".bm-card">
      </div>
      
      <div id="bm-status" class="bm-status-msg"></div>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  
  // Binding Events
  document.getElementById('bm-close-sidebar').addEventListener('click', toggleSidebar);
  document.getElementById('bm-add-keyword').addEventListener('click', () => addTag('keyword'));
  document.getElementById('bm-keyword-input').addEventListener('keypress', (e) => e.key === 'Enter' && addTag('keyword'));
  
  document.getElementById('bm-add-source').addEventListener('click', () => addTag('source'));
  document.getElementById('bm-source-input').addEventListener('keypress', (e) => e.key === 'Enter' && addTag('source'));
  
  // Auto-save on opacity change (using 'change' for performance on slide end)
  document.getElementById('bm-opacity-input').addEventListener('change', (e) => {
    saveSidebarSettings();
  });
  
  document.getElementById('bm-opacity-input').addEventListener('input', (e) => {
    document.getElementById('bm-opacity-value').textContent = e.target.value;
    // Optional: Live preview opacity if desired, but waiting for save is consistent
  });

  // Auto-save on selector change
  document.getElementById('bm-selector-input').addEventListener('change', () => {
    saveSidebarSettings();
  });

  // Load initial settings
  loadSidebarSettings();
}

let sidebarState = {
  keywords: [],
  sources: []
};

function renderTags(type) {
  const container = document.getElementById(type === 'keyword' ? 'bm-keywords-list' : 'bm-sources-list');
  const list = type === 'keyword' ? sidebarState.keywords : sidebarState.sources;
  
  container.innerHTML = '';
  list.forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'bm-tag';
    tag.innerHTML = `
      <span>${item}</span>
      <span class="bm-tag-remove" data-type="${type}" data-index="${index}">&times;</span>
    `;
    container.appendChild(tag);
  });
  
  // Add remove events
  container.querySelectorAll('.bm-tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      const t = e.target.dataset.type;
      if (t === 'keyword') sidebarState.keywords.splice(idx, 1);
      else sidebarState.sources.splice(idx, 1);
      renderTags(t);
      saveSidebarSettings(); // Auto-save on remove
    });
  });
}

function addTag(type) {
  const input = document.getElementById(type === 'keyword' ? 'bm-keyword-input' : 'bm-source-input');
  const val = input.value.trim();
  const list = type === 'keyword' ? sidebarState.keywords : sidebarState.sources;
  
  if (val && !list.includes(val)) {
    list.push(val);
    renderTags(type);
    input.value = '';
    saveSidebarSettings(); // Auto-save on add
  }
}

async function loadSidebarSettings() {
  const config = await getConfig();
  sidebarState.keywords = config.keywords || [];
  sidebarState.sources = config.sources || [];
  
  renderTags('keyword');
  renderTags('source');
  
  document.getElementById('bm-opacity-input').value = config.opacity || '0.2';
  document.getElementById('bm-opacity-value').textContent = config.opacity || '0.2';
  document.getElementById('bm-selector-input').value = config.selector || '.bm-card';
}

async function saveSidebarSettings() {
  const settings = {
    keywords: sidebarState.keywords,
    sources: sidebarState.sources,
    opacity: document.getElementById('bm-opacity-input').value,
    selector: document.getElementById('bm-selector-input').value
  };
  
  await chrome.storage.sync.set(settings);
  cachedConfig = null; // Clear cache
  
  const status = document.getElementById('bm-status');
  status.textContent = 'Đã lưu & áp dụng!';
  status.style.color = 'green';
  
  // Re-run filter immediately
  await hideNewsItems();
  
  setTimeout(() => {
    status.textContent = '';
  }, 1500);
}

function toggleSidebar() {
  const sidebar = document.getElementById('bm-filter-sidebar');
  if (!sidebar) {
    injectSidebarStyles();
    createSidebar();
    // Small delay to allow DOM insertion before adding class for transition
    setTimeout(() => document.getElementById('bm-filter-sidebar').classList.add('open'), 10);
  } else {
    sidebar.classList.toggle('open');
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TOGGLE_SIDEBAR") {
    toggleSidebar();
  }
});
