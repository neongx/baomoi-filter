window.BM = window.BM || {};

BM.UI = {
  sidebarState: {
    keywords: [],
    sources: []
  },

  injectSidebarStyles: function() {
    if (document.getElementById('bm-sidebar-style')) return;
    const style = document.createElement('style');
    style.id = 'bm-sidebar-style';
    style.textContent = `
      .bm-filter-sidebar {
        position: fixed;
        top: 0;
        left: -320px;
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
      .bm-filter-sidebar.open { left: 0; }
      .bm-sidebar-header {
        padding: 15px 20px;
        background: #f8f9fa;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .bm-sidebar-header h3 { margin: 0; font-size: 16px; color: #333; }
      .bm-close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0 5px; }
      .bm-sidebar-content { padding: 20px; overflow-y: auto; flex: 1; }
      .bm-form-group { margin-bottom: 20px; }
      .bm-form-group label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #444; }
      .bm-input-wrapper { display: flex; gap: 5px; }
      .bm-input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
      .bm-btn { padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
      .bm-btn:hover { background: #2980b9; }
      .bm-tags-container { display: flex; flex-wrap: wrap; gap: 5px; padding: 8px; border: 1px solid #eee; border-radius: 4px; min-height: 40px; margin-top: 5px; background: #fafafa; }
      .bm-tag { display: inline-flex; align-items: center; background-color: #e0e0e0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
      .bm-tag-remove { margin-left: 5px; cursor: pointer; font-weight: bold; color: #666; }
      .bm-tag-remove:hover { color: #000; }
      .bm-status-msg { margin-top: 10px; text-align: center; font-size: 13px; min-height: 18px; }
    `;
    document.head.appendChild(style);
  },

  createSidebar: function() {
    if (document.getElementById('bm-filter-sidebar')) return;

    this.injectSidebarStyles();
    
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
    
    // Bind Events
    document.getElementById('bm-close-sidebar').addEventListener('click', () => this.toggleSidebar());
    document.getElementById('bm-add-keyword').addEventListener('click', () => this.addTag('keyword'));
    document.getElementById('bm-keyword-input').addEventListener('keypress', (e) => e.key === 'Enter' && this.addTag('keyword'));
    
    document.getElementById('bm-add-source').addEventListener('click', () => this.addTag('source'));
    document.getElementById('bm-source-input').addEventListener('keypress', (e) => e.key === 'Enter' && this.addTag('source'));
    
    document.getElementById('bm-opacity-input').addEventListener('change', () => this.saveSidebarSettings());
    document.getElementById('bm-opacity-input').addEventListener('input', (e) => {
      document.getElementById('bm-opacity-value').textContent = e.target.value;
    });

    document.getElementById('bm-selector-input').addEventListener('change', () => this.saveSidebarSettings());

    // Load settings
    this.loadSidebarSettings();
  },

  renderTags: function(type) {
    const container = document.getElementById(type === 'keyword' ? 'bm-keywords-list' : 'bm-sources-list');
    const list = type === 'keyword' ? this.sidebarState.keywords : this.sidebarState.sources;
    
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
    
    container.querySelectorAll('.bm-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const t = e.target.dataset.type;
        if (t === 'keyword') this.sidebarState.keywords.splice(idx, 1);
        else this.sidebarState.sources.splice(idx, 1);
        this.renderTags(t);
        this.saveSidebarSettings();
      });
    });
  },

  addTag: function(type) {
    const input = document.getElementById(type === 'keyword' ? 'bm-keyword-input' : 'bm-source-input');
    const val = input.value.trim();
    const list = type === 'keyword' ? this.sidebarState.keywords : this.sidebarState.sources;
    
    if (val && !list.includes(val)) {
      list.push(val);
      this.renderTags(type);
      input.value = '';
      this.saveSidebarSettings();
    }
  },

  loadSidebarSettings: async function() {
    const config = await BM.Storage.getConfig();
    this.sidebarState.keywords = config.keywords || [];
    this.sidebarState.sources = config.sources || [];
    
    this.renderTags('keyword');
    this.renderTags('source');
    
    const opacityInput = document.getElementById('bm-opacity-input');
    if (opacityInput) {
        opacityInput.value = config.opacity || '0.2';
        document.getElementById('bm-opacity-value').textContent = config.opacity || '0.2';
    }
    const selectorInput = document.getElementById('bm-selector-input');
    if (selectorInput) {
        selectorInput.value = config.selector || '.bm-card';
    }
  },

  saveSidebarSettings: async function() {
    const settings = {
      keywords: this.sidebarState.keywords,
      sources: this.sidebarState.sources,
      opacity: document.getElementById('bm-opacity-input').value,
      selector: document.getElementById('bm-selector-input').value
    };
    
    await BM.Storage.saveConfig(settings);
    
    const status = document.getElementById('bm-status');
    status.textContent = 'Đã lưu & áp dụng!';
    status.style.color = 'green';
    
    // Trigger re-filter
    await BM.Filter.hideNewsItems();
    
    setTimeout(() => {
      status.textContent = '';
    }, 1500);
  },

  toggleSidebar: function() {
    const sidebar = document.getElementById('bm-filter-sidebar');
    if (!sidebar) {
      this.createSidebar();
      setTimeout(() => document.getElementById('bm-filter-sidebar').classList.add('open'), 10);
    } else {
      sidebar.classList.toggle('open');
    }
  }
};
