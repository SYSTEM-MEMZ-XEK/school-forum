// 代码高亮初始化
(function() {
  if (window.hljs) { 
    hljs.highlightAll(); 
  } else {
    setTimeout(function() { 
      if (window.hljs) hljs.highlightAll(); 
    }, 100);
  }
})();
