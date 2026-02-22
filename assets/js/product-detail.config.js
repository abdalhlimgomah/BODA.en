if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          brand: { navy: '#0A1E40', orange: '#FF6600', gray: '#666666', lightgray: '#F0F0F0' }
        },
        fontFamily: { sans: ['Inter', 'Roboto', 'sans-serif'] }
      }
    }
  };
} else {
  console.warn('tailwind is not defined; skipping tailwind.config for product-detail.config.js');
}
