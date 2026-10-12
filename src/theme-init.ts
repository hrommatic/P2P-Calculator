try {
  const theme = localStorage.getItem('p2p_calc_theme');
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark', 'theme-navy');
    root.classList.add('theme-light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.add('dark', 'theme-navy');
    root.classList.remove('theme-light');
    root.style.colorScheme = 'dark';
  }
} catch {
  document.documentElement.classList.add('dark', 'theme-navy');
  document.documentElement.style.colorScheme = 'dark';
}
