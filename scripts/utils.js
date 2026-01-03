// Namespace global
window.BM = window.BM || {};

BM.Utils = {
  // Hàm chuyển đổi wildcard pattern thành RegExp
  createWildcardRegex: function(pattern) {
    // Escape các ký tự đặc biệt của regex trừ *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Thay thế * bằng .* (khớp bất kỳ chuỗi nào)
    const regexString = escaped.replace(/\*/g, '.*');
    return new RegExp(regexString, 'i'); // 'i' flag để không phân biệt hoa thường
  },

  // Sử dụng throttle để tránh gọi hàm quá nhiều lần
  throttle: function(func, limit) {
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
};
