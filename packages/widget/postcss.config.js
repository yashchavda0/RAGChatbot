import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import prefixSelector from 'postcss-prefix-selector';

// Scopes every compiled selector under the widget's own root wrapper element so
// the widget's styles can never leak onto (or be overridden by) the host page,
// and the host page's own styles never leak into the widget's own rendering.
const WIDGET_ROOT_SELECTOR = '.rag-widget-root';

export default {
  plugins: [
    tailwindcss('./tailwind.config.ts'),
    prefixSelector({
      prefix: WIDGET_ROOT_SELECTOR,
      transform(prefix, selector, prefixedSelector) {
        const trimmed = selector.trim();

        // `:root`/`html`/`body` carry global custom properties and base resets —
        // apply them directly to the widget's own root element instead of the
        // real page <html>/<body>, which we must never touch.
        if (trimmed === ':root' || trimmed === 'html' || trimmed === 'body') {
          return prefix;
        }

        // `.dark` toggles the theme by class, not by nesting — keep it a
        // compound selector on the root element rather than a descendant.
        if (trimmed === '.dark') {
          return `${prefix}.dark`;
        }
        if (trimmed.startsWith('.dark ')) {
          return trimmed.replace(/^\.dark\s+/, `${prefix}.dark `);
        }

        return prefixedSelector;
      },
    }),
    autoprefixer(),
  ],
};
