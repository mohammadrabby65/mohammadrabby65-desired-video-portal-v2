const fs = require('fs');
let code = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');

code = code.replace(
`  const checkAndRedirectTelegram = (): boolean => {
    try {
      const redirectDone = localStorage.getItem("desiredhub_telegram_redirect_done");
      if (!redirectDone) {
        localStorage.setItem("desiredhub_telegram_redirect_done", "true");
        window.open("https://t.me/+WBulzWgERLA4Nzhl", "_blank");
        return true;
      }
    } catch (e) {
      console.error("Error with Telegram redirect:", e);
    }
    return false;
  };`,
`  const checkAndRedirectTelegram = () => {
    try {
      const redirectDone = localStorage.getItem("desiredhub_telegram_joined");
      if (!redirectDone) {
        localStorage.setItem("desiredhub_telegram_joined", "true");
        window.open("https://t.me/+WBulzWgERLA4Nzhl", "_blank");
      }
    } catch (e) {
      console.error("Error with Telegram redirect:", e);
    }
  };`
);

code = code.replace(
`      } else {
        if (checkAndRedirectTelegram()) {
          return;
        }
        videoRef.current.play();`,
`      } else {
        checkAndRedirectTelegram();
        videoRef.current.play();`
);

code = code.replace(
`          onClick={async () => {
            if (checkAndRedirectTelegram()) {
              return;
            }
            if (videoRef.current) {`,
`          onClick={async () => {
            checkAndRedirectTelegram();
            if (videoRef.current) {`
);

fs.writeFileSync('src/components/video/VideoPlayer.tsx', code);
