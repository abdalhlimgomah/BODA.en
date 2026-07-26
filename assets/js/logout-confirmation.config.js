tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#135bec",
        "primary-dark": "#0e45b8",
        "danger": "#FF6B00", // Vibrant Orange as requested
        "background-light": "#f6f6f8",
        "background-dark": "#101622",
        "surface-dark": "#1c212c",
        "border-dark": "#2d3648",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
    },
  },
}
