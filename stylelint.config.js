export default {
  extends: ['stylelint-config-recommended'],
  rules: {
    // Bulma-specific overrides (copy-paste this exactly)
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          // Bulma uses @import for Google Fonts a lot
          'import',
          // If you ever use @extend (rare in Bulma, but safe)
          'extend',
        ],
      },
    ],
    // Bulma has some very specific selectors – turn off the noisy ones
    'no-descending-specificity': null, // Bulma loves this pattern
    'selector-max-compound-selectors': null,
    'selector-class-pattern': null, // Bulma classes are very consistent but complex
    'max-nesting-depth': null, // Bulma nesting is moderate
    'declaration-block-no-duplicate-properties': true,
    'color-named': 'never',
    'function-url-quotes': 'always',
  },
};
