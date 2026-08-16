const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/CheckHistoryTab.tsx', 'utf8');

const targetStr = `        </div>
      )}  );
    </>
  );
}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, `        </div>
      )}
    </>
  );
}`);
  fs.writeFileSync('src/pages/admin/CheckHistoryTab.tsx', code);
} else {
  console.log("Could not find the target string. Dumping tail:");
  console.log(code.slice(-200));
}
