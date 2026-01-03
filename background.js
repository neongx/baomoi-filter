// Tạo context menu khi extension được cài đặt
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "baomoi-filter-settings",
    title: "Cấu hình bộ lọc BaoMoi",
    contexts: ["all"]
  });
});

// Xử lý khi click vào context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "baomoi-filter-settings") {
    if (tab && tab.id) {
       chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" })
         .catch(err => console.log("Không thể gửi tin nhắn tới tab (có thể do trang chưa tải xong):", err));
    }
  }
});

// Xử lý khi click vào icon extension
chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" })
      .catch(err => console.log("Không thể gửi tin nhắn tới tab (có thể do trang chưa tải xong):", err));
  }
});
