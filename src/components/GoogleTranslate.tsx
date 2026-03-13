"use client";

import React, { useEffect } from "react";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

// module-level flag to avoid injecting the script multiple times
let _googleTranslateScriptLoaded = false;

export default function GoogleTranslate() {
  useEffect(() => {
    if (_googleTranslateScriptLoaded) {
      // script already loaded — ensure init function exists
      if (window.google && typeof window.google.translate !== "undefined") {
        // already initialized
        return;
      }
      // otherwise do nothing; the global callback should run on script load
      return;
    }

    _googleTranslateScriptLoaded = true;

    // attach init function required by Google Translate callback
    window.googleTranslateElementInit = function () {
      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element"
        );
      } catch (e) {
        // swallow errors and log for debugging
        // eslint-disable-next-line no-console
        console.error("google translate init error", e);
      }
    };

    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.defer = true;
    script.id = "google-translate-script";
    document.head.appendChild(script);

    return () => {
      // keep the script loaded for the lifetime of the app (don't remove)
    };
  }, []);

  return (
    <div
      id="google_translate_element"
      className="fixed top-4 right-4 z-50 bg-white/80 backdrop-blur px-2 py-1 rounded-md shadow-sm text-xs"
    />
  );
}
