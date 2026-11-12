/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Sends a Pendo Track Event through the browser agent. The agent attaches the
// visitor and account on its own, so callers pass only event properties.
// Analytics must never break the flow it observes: a missing agent or a
// throwing call is ignored.
const trackPendoEvent = (name, properties) => {
  try {
    if (window.pendo && typeof window.pendo.track === 'function') {
      window.pendo.track(name, properties);
    }
  } catch {
    /* empty */
  }
};

export default trackPendoEvent;
