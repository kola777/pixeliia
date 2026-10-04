/**
 * Default (web) gallery: expo-media-library's new class API has no web
 * implementation — importing it breaks the web bundle at load time
 * (`class extends undefined`). The native variant lives in
 * gallery.native.ts, picked up automatically on Android/iOS.
 * On web, "save to gallery" becomes a real browser download instead.
 */

type WebAnchor = {
  href: string;
  download: string;
  click: () => void;
};

type WebBody = {
  appendChild: (el: unknown) => void;
  removeChild: (el: unknown) => void;
};

type WebDocument = {
  createElement: (tag: string) => WebAnchor;
  body: WebBody;
};

function webDocument(): WebDocument | undefined {
  const doc = (globalThis as Record<string, unknown>).document as WebDocument | undefined;
  if (doc && typeof doc.createElement === 'function' && doc.body) {
    return doc;
  }
  return undefined;
}

export async function requestGalleryAccess(): Promise<boolean> {
  // Browsers grant downloads without a permission prompt.
  return true;
}

export async function saveToGallery(uri: string): Promise<void> {
  const doc = webDocument();
  if (!doc) {
    throw new Error('Saving is only available on Android and iOS.');
  }
  const anchor = doc.createElement('a');
  anchor.href = uri;
  anchor.download = `pixeliia-${Date.now()}.jpg`;
  doc.body.appendChild(anchor);
  anchor.click();
  doc.body.removeChild(anchor);
}
