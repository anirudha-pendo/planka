/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Sends a Pendo Track Event when the Pendo agent is loaded on the page. The
// agent attaches the visitor and account itself, so callers only pass event
// properties. Tracking must never break the flow that reports it, so a missing
// agent or a thrown error is ignored.

export default (name, properties) => {
  try {
    const { pendo } = window;

    if (pendo && typeof pendo.track === 'function') {
      pendo.track(name, properties);
    }
  } catch {
    /* tracking failures are ignored */
  }
};
