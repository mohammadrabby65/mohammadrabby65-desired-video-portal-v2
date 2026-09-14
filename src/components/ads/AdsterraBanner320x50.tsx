import { useEffect, useRef, memo } from "react";

export const AdsterraBanner320x50 = memo(function AdsterraBanner320x50() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous ad iframe if any to prevent duplicate ads
    container.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.width = "320";
    iframe.height = "50";
    iframe.title = "Advertisement";
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("frameborder", "0");
    iframe.style.width = "320px";
    iframe.style.height = "50px";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.display = "block";

    container.appendChild(iframe);

    const adHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 320px; height: 50px; overflow: hidden; background: transparent; display: flex; justify-content: center; align-items: center; }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '50852686dec83b5570037d76992663e4',
      'format' : 'iframe',
      'height' : 50,
      'width' : 320,
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://predestineheadypleasure.com/50852686dec83b5570037d76992663e4/invoke.js"></script>
</body>
</html>`;

    try {
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(adHtml);
        doc.close();
      } else {
        iframe.srcdoc = adHtml;
      }
    } catch {
      iframe.srcdoc = adHtml;
    }

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div
      id="adsterra-banner-320x50-container"
      className="w-full flex justify-center items-center mb-3 sm:mb-4 overflow-hidden"
    >
      <div
        ref={containerRef}
        className="w-[320px] h-[50px] max-w-full flex justify-center items-center overflow-hidden"
      />
    </div>
  );
});
