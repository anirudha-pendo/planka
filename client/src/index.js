/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

import store from './store';
import history from './history';
import Root from './components/common/Root';

import './i18n';

// Boot Pendo once with an anonymous visitor. The signed-in user is registered
// later with `pendo.identify` once the core bootstrap has loaded them.
window.pendo.initialize({
  visitor: {
    id: '',
  },
  location: {
    transforms: [
      // In demo mode the login screen prefills its form from the URL fragment
      // (`/login#emailOrUsername=...&password=...`), so the fragment can carry
      // credentials. The app routes on the pathname, never on the hash, so
      // clearing it keeps credentials out of recorded URLs without merging pages.
      {
        attr: 'hash',
        action: 'Clear',
      },
    ],
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Root, { store, history }));
