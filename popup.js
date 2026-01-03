document.addEventListener('DOMContentLoaded', restoreOptions);

// Lấy các phần tử DOM một lần và lưu vào biến
const elements = {
  keywordInput: document.getElementById('keyword-input'),
  addKeywordBtn: document.getElementById('add-keyword-btn'),
  keywordsList: document.getElementById('keywords-list'),
  sources: document.getElementById('sources'),
  selector: document.getElementById('selector'),
  opacity: document.getElementById('opacitySlider'),
  save: document.getElementById('save'),
  status: document.getElementById('status')
};

let currentKeywords = [];

// Thêm sự kiện cho nút lưu
elements.save.addEventListener('click', saveOptions);

// Thêm sự kiện cho input và nút thêm từ khóa
elements.keywordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addKeyword();
  }
});

elements.addKeywordBtn.addEventListener('click', addKeyword);

// Hàm thêm từ khóa
function addKeyword() {
  const keyword = elements.keywordInput.value.trim();
  if (keyword && !currentKeywords.includes(keyword)) {
    currentKeywords.push(keyword);
    renderTags();
    elements.keywordInput.value = '';
  } else if (currentKeywords.includes(keyword)) {
    // Optional: Highlight existing tag or show message? 
    // For now just clear input if duplicate or ignore
    elements.keywordInput.value = '';
  }
  elements.keywordInput.focus();
}

// Hàm render tags
function renderTags() {
  elements.keywordsList.innerHTML = '';
  currentKeywords.forEach((keyword, index) => {
    const tag = document.createElement('div');
    tag.className = 'tag';
    
    const text = document.createElement('span');
    text.textContent = keyword;
    tag.appendChild(text);
    
    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      removeKeyword(index);
    });
    tag.appendChild(removeBtn);
    
    elements.keywordsList.appendChild(tag);
  });
}

// Hàm xóa từ khóa
function removeKeyword(index) {
  currentKeywords.splice(index, 1);
  renderTags();
}

// Hàm tiện ích để xử lý chuỗi đầu vào (cho sources)
function processInputArray(input) {
  return input.split('\n').map(item => item.trim()).filter(item => item);
}

// Sử dụng async/await để xử lý bất đồng bộ
async function saveOptions() {
  try {
    const options = {
      keywords: currentKeywords,
      sources: processInputArray(elements.sources.value),
      selector: elements.selector.value || '.bm-card',
      opacity: String(elements.opacity.value)
    };

    // Sử dụng Promise để xử lý chrome.storage.sync.set
    await new Promise(resolve => chrome.storage.sync.set(options, resolve));
    
    // Hiển thị thông báo
    elements.status.textContent = 'Đã lưu!';
    setTimeout(() => elements.status.textContent = '', 1500);
    console.log('Options saved:', options);
    
    // Tải lại tab hiện tại
    const tabs = await new Promise(resolve => 
      chrome.tabs.query({active: true, currentWindow: true}, resolve)
    );
    if (tabs && tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
    }
  } catch (error) {
    console.error('Error saving options:', error);
    elements.status.textContent = 'Lỗi khi lưu!';
    setTimeout(() => elements.status.textContent = '', 1500);
  }
}

async function restoreOptions() {
  try {
    const defaults = {
      keywords: [],
      sources: [],
      selector: '.bm-card',
      opacity: '0.2'
    };

    // Sử dụng Promise để xử lý chrome.storage.sync.get
    const items = await new Promise(resolve => 
      chrome.storage.sync.get(defaults, resolve)
    );
    
    currentKeywords = Array.isArray(items.keywords) ? items.keywords : [];
    renderTags();
    
    elements.sources.value = items.sources.join('\n');
    elements.selector.value = items.selector;
    elements.opacity.value = items.opacity;
  } catch (error) {
    console.error('Error restoring options:', error);
  }
}
