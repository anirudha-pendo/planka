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

// Boot Novus by Pendo once with an anonymous visitor. The signed-in user is identified
// later, in the initializeCore saga, once the current user has been fetched.
window.pendo.initialize({
  visitor: {
    id: '',
  },
  location: {
    // In demo mode the login page prefills its form from the URL fragment
    // (#emailOrUsername=...&password=...), so the fragment can carry credentials.
    // The app routes with browser history and never on the hash, so clearing the
    // fragment from recorded URLs loses no page identity.
    transforms: [{ attr: 'hash', action: 'Clear' }],
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Root, { store, history }));
