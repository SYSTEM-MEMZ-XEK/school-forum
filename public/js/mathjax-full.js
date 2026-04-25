// MathJax 完整配置（含自动渲染）
window.MathJax = {
  tex: { 
    inlineMath: [['$', '$'], ['\\(', '\\)']], 
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true
  },
  options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
  startup: { 
    typeset: false,
    pageReady: function() {
      return MathJax.startup.defaultPageReady().then(function() {
        console.log('MathJax initial typesetting complete');
        if (typeof MathJax.typesetPromise === 'function') {
          MathJax.typesetPromise()['catch'](function(err) { console.error('MathJax initial typeset failed:', err); });
        }
      });
    }
  },
  svg: { scale: 1.5 }
};

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
