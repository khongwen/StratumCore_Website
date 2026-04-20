/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      colors: {
        ink:    '#1C1C1E',   // primary dark / near-black
        teal:   '#00C9BB',   // brand teal accent
        orange: '#D4751A',   // brand orange accent
        stone:  '#F2F2F2',   // light grey backgrounds
        body:   '#222222',   // body text
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 7vw, 6rem)',   { lineHeight: '1.0',  letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.5rem, 5vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(2rem, 3.5vw, 3rem)',   { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
      },
      spacing: {
        nav: '72px',
      },
      maxWidth: {
        site: '1280px',
      },
    },
  },
};
