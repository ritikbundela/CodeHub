export const domElements = {
  // Submit button (Optional now, bas fallback ke liye)
  submitButton: '[data-e2e-locator="console-submit-button"], [data-testid="submit-button"], button:contains("Submit")',
  
  // Submission Result ke liye multiple selectors (Best match ke liye)
  // Hum in sabko check karenge
  submissionResultSelectors: [
    '[data-e2e-locator="submission-result"]',
    '.text-green-s',          // LeetCode ka common success class
    '.text-green-500',        // Tailwind style success
    'span[class*="text-green"]',
    'div[class*="text-green"]'
  ]
};