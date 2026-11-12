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

// Boot Novus by Pendo once with an anonymous visitor. The signed-in user is
// identified later, once the core data is fetched (see sagas/core/services/core.js).
// The demo-mode login screen reads credentials from the URL fragment, and the app
// doesn't route on the hash, so the fragment is cleared from every recorded URL.
window.pendo.initialize({
  visitor: {
    id: '',
  },
  location: {
    transforms: [
      {
        attr: 'hash',
        action: 'Clear',
      },
    ],
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Root, { store, history }));
