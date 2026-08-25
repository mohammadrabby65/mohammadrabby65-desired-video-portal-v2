const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

if (!content.includes('useLanguage')) {
  content = content.replace(
    'import { NavLink, Link } from "react-router-dom";',
    'import { NavLink, Link } from "react-router-dom";\nimport { useLanguage } from "../../contexts/LanguageContext";'
  );
  
  content = content.replace(
    'export function Sidebar({ isOpen, onClose }: SidebarProps) {',
    'export function Sidebar({ isOpen, onClose }: SidebarProps) {\n  const { t } = useLanguage();'
  );
  
  content = content.replace(
    />\s*Home\s*<\/NavLink>/g,
    '>{t("Home")}</NavLink>'
  );
  
  content = content.replace(
    />\s*Categories\s*<\/h3>/g,
    '>{t("Categories")}</h3>'
  );
  
  fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
  console.log('Patched Sidebar.tsx');
}
