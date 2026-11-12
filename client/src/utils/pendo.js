/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Novus by Pendo lifecycle. The install snippet in index.html defines a
// `window.pendo` stub that queues calls until the agent script loads, so
// `initialize` and `identify` are safe right away. `clearSession` isn't part of
// that stub and only exists once the agent has loaded.

const getPendo = () => window.pendo;

// Called exactly once, at app entry. An empty visitor id lets the agent resume
// the previous visitor from its own storage, or start an anonymous one.
export const initializePendo = () => {
  const pendo = getPendo();

  if (!pendo) {
    return;
  }

  pendo.initialize({
    visitor: {
      id: '',
    },
    location: {
      transforms: [
        // In demo mode the login screen prefills its form from the URL
        // fragment, e.g. /login#emailOrUsername=...&password=..., so the
        // fragment can carry credentials. The app routes on the pathname
        // (browser history), never on the hash, so the fragment carries no
        // page identity and is dropped from every recorded URL.
        {
          attr: 'hash',
          action: 'Clear',
        },
      ],
    },
  });
};

// Called whenever the signed-in user's profile is loaded.
export const identifyPendoVisitor = (user) => {
  const pendo = getPendo();

  if (!pendo || !user) {
    return;
  }

  pendo.identify({
    visitor: {
      id: user.id,
      email: user.email,
      full_name: user.name,
      username: user.username,
      role: user.role,
      organization: user.organization,
      language: user.language,
      isDeactivated: user.isDeactivated,
      createdAt: user.createdAt,
      isTotpEnabled: user.isTotpEnabled,
      totpEnabledAt: user.totpEnabledAt,
      termsAcceptedAt: user.termsAcceptedAt,
      isDefaultAdmin: user.isDefaultAdmin,
      subscribeToOwnCards: user.subscribeToOwnCards,
      subscribeToCardWhenCommenting: user.subscribeToCardWhenCommenting,
      turnOffRecentCardHighlighting: user.turnOffRecentCardHighlighting,
      enableFavoritesByDefault: user.enableFavoritesByDefault,
      defaultEditorMode: user.defaultEditorMode,
      defaultHomeView: user.defaultHomeView,
      defaultProjectsOrder: user.defaultProjectsOrder,
      autoLogoutMode: user.autoLogoutMode,
    },
  });
};

// Called on sign-out, so the next person to sign in here starts as a fresh
// anonymous visitor rather than inheriting the previous identity.
export const clearPendoSession = () => {
  const pendo = getPendo();

  if (!pendo || typeof pendo.clearSession !== 'function') {
    return;
  }

  pendo.clearSession();
};
