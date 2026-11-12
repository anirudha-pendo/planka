/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Novus by Pendo lifecycle helpers. The install snippet in index.html defines
// `window.pendo` and boots it once in index.js; these calls only update who the
// visitor is. Analytics must never break the app, so every call is guarded.

export const identifyPendoVisitor = (user) => {
  if (!user || !window.pendo || typeof window.pendo.identify !== 'function') {
    return;
  }

  try {
    window.pendo.identify({
      visitor: {
        id: user.id,
        email: user.email,
        full_name: user.name,
        role: user.role,
        username: user.username,
        organization: user.organization,
        language: user.language,
        createdAt: user.createdAt,
        isDeactivated: user.isDeactivated,
        isTotpEnabled: user.isTotpEnabled,
        totpEnabledAt: user.totpEnabledAt,
        termsAcceptedAt: user.termsAcceptedAt,
        defaultEditorMode: user.defaultEditorMode,
        defaultHomeView: user.defaultHomeView,
        defaultProjectsOrder: user.defaultProjectsOrder,
        autoLogoutMode: user.autoLogoutMode,
        subscribeToOwnCards: user.subscribeToOwnCards,
        subscribeToCardWhenCommenting: user.subscribeToCardWhenCommenting,
        turnOffRecentCardHighlighting: user.turnOffRecentCardHighlighting,
        enableFavoritesByDefault: user.enableFavoritesByDefault,
      },
    });
  } catch {
    /* empty */
  }
};

// `clearSession` isn't stubbed by the install snippet, so it only exists once
// the agent script has finished loading.
export const clearPendoSession = () => {
  if (!window.pendo || typeof window.pendo.clearSession !== 'function') {
    return;
  }

  try {
    window.pendo.clearSession();
  } catch {
    /* empty */
  }
};
