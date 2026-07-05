import { JSDOM } from 'jsdom';

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <title data-rh="true">Server Title</title>
  <meta data-rh="true" name="description" content="Server Desc" />
</head>
<body><div id="root"></div></body>
</html>
`);
global.window = dom.window;
global.document = dom.window.document;

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider, Helmet } from 'react-helmet-async';

const App = () => (
  <HelmetProvider>
    <Helmet>
      <title>Client Title</title>
      <meta name="description" content="Client Desc" />
    </Helmet>
  </HelmetProvider>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);

setTimeout(() => {
  console.log(document.head.innerHTML);
}, 1000);
