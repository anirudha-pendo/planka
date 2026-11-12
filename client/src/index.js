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

// Boot Pendo once with an anonymous visitor. The signed-in user is identified
// later, in the core saga, once the current user has been fetched.
window.pendo.initialize({
  visitor: {
    id: '',
  },
  location: {
    // In demo mode the login screen prefills its form from the URL fragment
    // (#emailOrUsername=...&password=...), so the fragment can carry a password.
    // Routing is path-based (createBrowserHistory), so the fragment carries no
    // page identity and clearing it from recorded URLs is safe.
    transforms: [{ attr: 'hash', action: 'Clear' }],
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Root, { store, history }));
