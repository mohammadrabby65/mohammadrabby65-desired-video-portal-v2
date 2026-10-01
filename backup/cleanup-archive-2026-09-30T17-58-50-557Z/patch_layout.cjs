const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

const anchorImports = `import { Link, Outlet } from "react-router-dom";
import { Menu, User } from "lucide-react";`;

const patchImports = `import { Link, Outlet, useNavigate } from "react-router-dom";
import { Menu, Dices } from "lucide-react";`;

const anchorState = `  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  usePopunderRecovery();`;

const patchState = `  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavigatingRandom, setIsNavigatingRandom] = useState(false);
  const navigate = useNavigate();
  usePopunderRecovery();

  const handleRandomVideo = async () => {
    if (isNavigatingRandom) return;
    setIsNavigatingRandom(true);
    try {
      const res = await fetch("/api/videos/random-slug");
      if (res.ok) {
        const data = await res.json();
        if (data.slug) {
          navigate(\`/video/\${data.slug}\`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch random video", err);
    } finally {
      setIsNavigatingRandom(false);
    }
  };`;

const anchorLink = `            <Link
              to="/admin"
              className="p-2 rounded-full    group relative overflow-hidden flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-neutral-800/0 group-hover:bg-white/10 rounded-full  " />
              <div className="bg-neutral-900/80 backdrop-blur-md p-2 rounded-full  relative z-10">
                <User className="w-5 h-5 text-neutral-400 group-hover:text-white  " />
              </div>
            </Link>`;

const patchButton = `            <button
              onClick={handleRandomVideo}
              disabled={isNavigatingRandom}
              title="Random Video"
              className="p-2 rounded-full group relative overflow-hidden flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 transition-transform duration-200"
            >
              <div className="absolute inset-0 bg-neutral-800/0 group-hover:bg-primary/20 rounded-full transition-colors duration-300" />
              <div className="bg-neutral-900/80 backdrop-blur-md p-2 rounded-full relative z-10 border border-neutral-800 group-hover:border-primary/50 transition-colors duration-300">
                <Dices className={\`w-5 h-5 text-primary group-hover:text-accent transition-colors \${isNavigatingRandom ? 'animate-spin' : ''}\`} />
              </div>
            </button>`;

if (code.includes(anchorImports) && code.includes(anchorState) && code.includes(anchorLink)) {
  code = code.replace(anchorImports, patchImports);
  code = code.replace(anchorState, patchState);
  code = code.replace(anchorLink, patchButton);
  fs.writeFileSync('src/components/layout/Layout.tsx', code);
  console.log("Patched Layout.tsx successfully");
} else {
  console.log("Failed to find anchors in Layout.tsx");
  if (!code.includes(anchorImports)) console.log("Missing imports anchor");
  if (!code.includes(anchorState)) console.log("Missing state anchor");
  if (!code.includes(anchorLink)) console.log("Missing link anchor");
}
