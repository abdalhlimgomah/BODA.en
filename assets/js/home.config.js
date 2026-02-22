if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          primary: "#f97316",
          secondary: "#1e3a8a",
          "background-light": "#f3f4f6",
          "background-dark": "#0f172a",
          "surface-light": "#ffffff",
          "surface-dark": "#1e293b",
        },
        fontFamily: { display: ["Inter", "sans-serif"] },
        borderRadius: { DEFAULT: "0.5rem", xl: "1rem", "2xl": "1.5rem" },
      },
    },
  };
} else {
  console.warn('tailwind is not defined; skipping tailwind.config for home.config.js');
}
