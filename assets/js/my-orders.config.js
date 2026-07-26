if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          primary: "#1e3a8a",
          secondary: "#f97316",
          "background-light": "#f3f4f6",
          "background-dark": "#111827",
          "surface-light": "#ffffff",
          "surface-dark": "#1f2937",
          "text-light": "#1f2937",
          "text-dark": "#f9fafb",
          "accent-yellow": "#facc15",
        },
        fontFamily: { display: ["Cairo", "sans-serif"] },
        borderRadius: { DEFAULT: "0.5rem" },
      },
    },
  };
} else {
  console.warn('tailwind is not defined; skipping tailwind.config for my-orders.config.js');
}
