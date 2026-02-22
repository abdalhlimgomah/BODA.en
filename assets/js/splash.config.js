tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        'buda-blue': '#0078D7',
        'buda-orange': '#F25822',
        'buda-green': '#00A651',
        'buda-purple': '#60399E',
        'buda-crown': '#FFC107',
        'bg-gradient-start': '#0f172a', 
        'bg-gradient-end': '#1e3a8a',   
        primary: "#F25822",
        "background-light": "#0F1A35",
        "background-dark": "#0F1A35",
      },
      fontFamily: {
        display: ["'Fredoka'", "cursive", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
      }
    },
  },
};
