import { useEffect, useRef } from 'react';

export function MarketingBox({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Check if script is already injected in this container
    if (containerRef.current.querySelector('script')) {
      return;
    }

    const optionsScript = document.createElement('script');
    optionsScript.type = 'text/javascript';
    optionsScript.text = `
      atOptions = {
        'key' : '6b2ec9be5bbd699983d1904e1c8dc370',
        'format' : 'iframe',
        'height' : 250,
        'width' : 300,
        'params' : {}
      };
    `;
    
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://predestineheadypleasure.com/6b2ec9be5bbd699983d1904e1c8dc370/invoke.js';
    
    containerRef.current.appendChild(optionsScript);
    containerRef.current.appendChild(invokeScript);

    return () => {
      // Clean up on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className={`flex justify-center items-center w-full my-6 overflow-hidden ${className}`}>
      <div 
        ref={containerRef} 
        className="w-[300px] h-[250px] bg-neutral-900/20 flex items-center justify-center relative rounded-md border border-neutral-800/50"
      >
        <span className="text-neutral-600 text-xs absolute -z-10">Advertisement</span>
      </div>
    </div>
  );
}
