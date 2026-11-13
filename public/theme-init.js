// Apply the saved theme before first paint to avoid a light flash (strict CSP compatible)
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var override = params.get('theme');
    var stored = localStorage.getItem('prayogshala_theme_v1');
    var isDark = override === 'dark'
      ? true
      : override === 'light'
        ? false
        : stored === 'dark' || stored === 'light'
          ? stored === 'dark'
          : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#060d14');
    }
  } catch (e) {}
})();
