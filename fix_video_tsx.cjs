const fs = require('fs');
let code = fs.readFileSync('src/pages/Video.tsx', 'utf-8');

const oldLogic = `  let metaDesc = video.metaDescription || "";
  if (!metaDesc) {
    let text = (video.description || "").replace(/\\s+/g, " ").trim();
    if (text.length > 155) {
      let cutoff = text.substring(0, 153).lastIndexOf(" ");
      if (cutoff === -1) cutoff = 152;
      metaDesc = text.substring(0, cutoff).trim() + "...";
    } else {
      metaDesc = text;
    }
  }

  return (
      <div className="flex-1 min-w-0 p-4 container mx-auto">`;

code = code.replace(oldLogic, `  return (
      <div className="flex-1 min-w-0 p-4 container mx-auto">`);

const newLogicLoc = `  const breadcrumbs = [
    { name: "Home", item: "/" },
    ...(categoryName && categorySlug ? [{ name: categoryName, item: \`/category/\${categorySlug}\` }] : []),
    { name: video.title, item: \`/video/\${video.slug}\` }
  ];

  let metaDesc = video.metaDescription || "";
  if (!metaDesc) {
    let text = (video.description || "").replace(/\\s+/g, " ").trim();
    if (text.length > 155) {
      let cutoff = text.substring(0, 153).lastIndexOf(" ");
      if (cutoff === -1) cutoff = 152;
      metaDesc = text.substring(0, cutoff).trim() + "...";
    } else {
      metaDesc = text;
    }
  }

  return (`;

code = code.replace(`  const breadcrumbs = [
    { name: "Home", item: "/" },
    ...(categoryName && categorySlug ? [{ name: categoryName, item: \`/category/\${categorySlug}\` }] : []),
    { name: video.title, item: \`/video/\${video.slug}\` }
  ];

  return (`, newLogicLoc);

fs.writeFileSync('src/pages/Video.tsx', code);
