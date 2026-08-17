const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/DeadUrls.tsx', 'utf8');

// Import setDoc
content = content.replace(
  "addDoc, serverTimestamp",
  "addDoc, setDoc, serverTimestamp"
);

// Replace addDoc with setDoc
const oldCode = `    try {
      await addDoc(collection(db, 'deadUrlCheckHistory'), {
        postId: video.id,
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        status: res.status,
        statusCode: res.statusCode || 0,
        errorMessage: res.errorMessage || null,
        responseTime: res.responseTime || null,
        checkedAt: serverTimestamp()
      });
    } catch (e) {`;

const newCode = `    try {
      const historyData: any = {
        postId: video.id,
        title: video.title,
        videoUrl: video.videoUrl,
        status: res.status,
        statusCode: res.statusCode || 0,
        errorMessage: res.errorMessage || null,
        responseTime: res.responseTime || null,
        checkedAt: serverTimestamp()
      };
      // Only set thumbnailUrl if it exists so we don't overwrite a previously saved one with undefined
      if (video.thumbnailUrl) {
        historyData.thumbnailUrl = video.thumbnailUrl;
      }
      await setDoc(doc(db, 'deadUrlCheckHistory', video.id), historyData, { merge: true });
    } catch (e) {`;

if (content.includes("await addDoc(collection(db, 'deadUrlCheckHistory')")) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('src/pages/admin/DeadUrls.tsx', content);
}
