const fs = require('fs');
let code = fs.readFileSync('src/pages/Categories.tsx', 'utf8');
code = code.replace('const { data: rawCategories = [], isLoading } = usePublicCategories();', 'const { data: rawCategories = [], isLoading, error } = usePublicCategories();');
code = code.replace(') : categories?.length === 0 ? (', ') : error ? ( <div>Error: {error.message}</div> ) : categories?.length === 0 ? (');
fs.writeFileSync('src/pages/Categories.tsx', code);
