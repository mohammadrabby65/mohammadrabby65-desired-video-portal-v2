import React from 'react';
import { renderToString } from 'react-dom/server';
import { HelmetProvider, Helmet } from 'react-helmet-async';

const helmetContext = {};
const app = renderToString(
  <HelmetProvider context={helmetContext}>
    <Helmet>
      <title>Test Title</title>
      <meta name="description" content="Test Description" />
    </Helmet>
  </HelmetProvider>
);

const { helmet } = helmetContext;
console.log(helmet.title.toString());
console.log(helmet.meta.toString());
