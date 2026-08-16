const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/DeadUrls.tsx', 'utf8');
const target = content.substring(content.indexOf('  const checkUrl ='), content.indexOf('  const processBatch ='));
const replacement = `  const checkUrl = async (video: ScanResult): Promise<ScanResult> => {
    const startTime = performance.now();
    try {
      const response = await fetch('/api/admin/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: video.videoUrl })
      });
      
      const data = await response.json();
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      return { 
        ...video, 
        status: data.status || 'error', 
        statusCode: data.statusCode || 0, 
        responseTime 
      };
    } catch (err: any) {
      const endTime = performance.now();
      return { 
        ...video, 
        status: 'error', 
        statusCode: 0, 
        responseTime: Math.round(endTime - startTime)
      };
    }
  };

`;
content = content.replace(target, replacement);
fs.writeFileSync('src/pages/admin/DeadUrls.tsx', content);
