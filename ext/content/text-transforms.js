'use strict';

// Text transforms: `regex==replacement` entries separated by newlines or
// commas, applied to the HTML of catalog teasers, thread subjects and post
// messages.
const TextTransforms = {
  // Pattern -> replacement. Entries with an empty pattern, no `==` or an
  // invalid regex are skipped.
  parse(text) {
    const transforms = {};
    for (const entry of (text || '').split(/\n|,/)) {
      const [pattern, replacement] = entry.split("==");
      if (!pattern || replacement === undefined) continue;
      try {
        new RegExp(pattern, 'g');
        transforms[pattern] = replacement;
      } catch (e) {
        console.log("Failed to add invalid transform: " + entry);
      }
    }
    return transforms;
  },

  current() {
    return TextTransforms.parse(Settings.textTransforms());
  },

  isEnabled() {
    return !Util.isEmpty(TextTransforms.current());
  },

  applyToElement(transforms, element) {
    if (!transforms || !element) return;
    let html = element.innerHTML;
    if (!html) return;
    let patternMatch = false;
    for (const pattern in transforms) {
      const regex = new RegExp(pattern, 'g');
      if (regex.test(html)) {
        patternMatch = true;
        html = html.replaceAll(regex, transforms[pattern]);
      }
    }
    if (patternMatch) {
      element.innerHTML = html;
    }
  },
};
