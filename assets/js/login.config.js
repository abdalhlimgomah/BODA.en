if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    theme: {
      extend: {
        colors: { 'boda-navy': '#0a1f44', 'boda-orange': '#FF5722', 'boda-border': '#1a2b49' },
        fontFamily: { sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'] }
      }
    }
  };
} else {
  console.warn('tailwind is not defined; skipping tailwind.config for login.config.js');
}
