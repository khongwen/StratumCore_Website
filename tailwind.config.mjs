/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      // Mirrors the CSS variables in src/styles/global.css. Change both.
      colors: {
        ink:      '#1C1B19',   // headings / primary text, warm near-black
        teal:     '#00C9BB',   // logo teal — logo and tiny marks only
        accent:   '#09716A',   // working teal: AA as text and as button fill
        orange:   '#D4751A',
        bg:       '#F6F4EF',   // page background, warm off-white
        bgalt:    '#EFECE4',   // alternating section band
        surface:  '#FFFFFF',   // cards
        hairline: '#E4DFD5',   // warm divider
        // `text-body` is only ever used on headings, so it maps to ink.
        body:     '#1C1B19',
        stone:    '#EFECE4',
      },
      fontFamily: {
        // `font-serif` = display (Fraunces); `font-sans` = body (Hanken Grotesk).
        // The logo is pinned to Georgia in global.css and uses neither.
        serif: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'],
        sans:  ['"Hanken Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
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
        site: '1360px',
      },
    },
  },
};
