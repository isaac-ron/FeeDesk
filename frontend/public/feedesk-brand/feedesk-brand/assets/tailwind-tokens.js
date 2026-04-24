// FeeDesk Tailwind CSS v3 theme extension
// Add to your tailwind.config.js under theme.extend

module.exports = {
  theme: {
    extend: {
      colors: {
        'fd-blue': {
          50:  '#E8F3FF',
          100: '#C7E8FF',
          200: '#93D0FF',
          300: '#5CB8FF',
          400: '#2F7DE0',
          500: '#1A65C9',
          600: '#1251A3',  // Brand primary
          700: '#103A7A',
          800: '#0C2D5F',
          900: '#071E42',
        },
        'fd-gray': {
          50:  '#F9FAFB',
          100: '#F3F4F6',
          300: '#D1D5DB',
          400: '#9CA3AF',
          600: '#4B5563',
          800: '#1A1F2B',
          900: '#0C1018',
          950: '#070C14',
        },
      },
      fontFamily: {
        'display': ['Manrope', 'sans-serif'],
        'mono-brand': ['"Space Mono"', 'monospace'],
      },
      fontWeight: {
        'extrabold': '800',
      },
      letterSpacing: {
        'tightest': '-0.05em',
        'tighter':  '-0.03em',
        'brand':     '0.16em',
      },
      borderRadius: {
        'brand': '13px',
      },
    },
  },
};
