import { useEffect, useRef, memo } from "react";

/**
 * Adsterra 320x50 Banner component
 * Displays directly above the video player on the video page.
 * Uses an isolated sandbox iframe or iframe container approach so that document.write
 * calls from invoke.js execute cleanly without overwriting host document,
 * or attaches safely with proper script isolation.
 */
export const AdsterraBanner320x50 = memo(function AdsterraBanner320x50() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create an isolated iframe to safely host the Adsterra 320x50 banner
    // This guarantees that atOptions & invoke.js work predictably in React SPA
    // and never collide with other ads or wipe page content with document.write.
    const iframe = document.createElement("iframe");
    iframe.style.width = "320px";
    iframe.style.height = "50px";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.scrolling = "no";
    iframe.title = "Advertisement";
    iframe.setAttribute("loading", "lazy");

    container.innerHTML = "";
    container.appendChild(iframe);

    const adHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=320, initial-scale=1">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 320px;
      height: 50px;
      overflow: hidden;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : 'd98194a994675cda590ee4fb9013dadf',
      'format' : 'iframe',
      'height' : 50,
      'width' : 320,
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://predestineheadypleasure.com/d98194a994675cda590ee4fb9013dadf/invoke.js"></script>
</body>
</html>`;

    try {
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(adHtml);
        doc.close();
      }
    } catch {
      // In case contentDocument is restricted, fallback to srcdoc
      iframe.srcdoc = adHtml;
    }

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      id="adsterra-banner-320x50-wrapper"
      className="w-full flex justify-center items-center py-2 px-2 overflow-hidden"
    >
      <div
        ref={containerRef}
        className="w-[320px] max-w-full h-[50px] min-h-[50px] flex justify-center items-center overflow-hidden"
        style={{ width: "320px", height: "50px" }}
      />
    </div>
  );
});
