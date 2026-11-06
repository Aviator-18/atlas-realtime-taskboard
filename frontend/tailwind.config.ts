import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-canvas': 'var(--surface-canvas)',
        'surface-lane': 'var(--surface-lane)',
        'surface-raised': 'var(--surface-raised)',
        rule: 'var(--rule)',
        'rule-strong': 'var(--rule-strong)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        accent: 'var(--accent)',
        'accent-wash': 'var(--accent-wash)',
        'priority-high-ink': 'var(--priority-high-ink)',
        'priority-high-wash': 'var(--priority-high-wash)',
        'priority-medium-ink': 'var(--priority-medium-ink)',
        'priority-medium-wash': 'var(--priority-medium-wash)',
        'priority-low-ink': 'var(--priority-low-ink)',
        'priority-low-wash': 'var(--priority-low-wash)',
        danger: 'var(--danger)',
        'warning-wash': 'var(--warning-wash)',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        floating: '0 6px 16px rgba(31, 37, 44, 0.18)',
      },
      transitionDuration: {
        fast: '120ms',
        drawer: '180ms',
      },
    },
  },
  plugins: [],
};

export default config;
