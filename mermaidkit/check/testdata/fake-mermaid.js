// A stand-in for a tool's mermaid bundle, in the shape esbuild's
// --format=iife --global-name=fakeMermaid gives it: parse rejects a diagram
// with a ";" in it, with a reason longer than two lines, throws on "throw",
// and leaves its promise pending on "hang". A label ("[...]") goes through
// DOMPurify as mermaid's does, and DOMPurify here is what it is without a
// document: isSupported false, and no addHook or sanitize.
var fakeMermaid = (() => {
  const DOMPurify = { isSupported: false };
  const parse = (text) => {
    if (text.includes('throw')) throw new Error('thrown at once\nline two\nline three');
    if (text.includes('hang')) return new Promise(() => {});
    if (text.includes(';')) {
      return Promise.reject(new Error('Parse error on line 9:\n...D->>D: owner = new session; unan\n----------------------^\nExpecting a message'));
    }
    const label = text.match(/\[([^\]]*)\]/);
    if (label) {
      try {
        DOMPurify.addHook('beforeSanitizeAttributes', () => {});
        if (DOMPurify.sanitize(label[1]) !== label[1]) throw new Error('the label changed');
        DOMPurify.removeHooks('beforeSanitizeAttributes');
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.resolve({ diagramType: 'sequence' });
  };
  return { default: { parse }, DOMPurify };
})();
