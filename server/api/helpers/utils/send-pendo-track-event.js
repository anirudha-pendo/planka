/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { ProxyAgent } = require('undici');

// PLANKA has no account or tenant concept, so every event is attributed to the
// same Pendo account.
const DEFAULT_ACCOUNT_ID = 'system';

async function sendPendoTrackEvent(body) {
  try {
    const response = await fetch(`https://${sails.config.custom.pendoDataHost}/data/track`, {
      headers: {
        'Content-Type': 'application/json',
        'x-pendo-integration-key': sails.config.custom.pendoTrackEventSecret,
      },
      body: JSON.stringify(body),
      method: 'POST',
      dispatcher: sails.config.custom.outgoingProxy
        ? new ProxyAgent(sails.config.custom.outgoingProxy)
        : undefined,
    });

    if (!response.ok) {
      sails.log.warn(`Pendo track event "${body.event}" failed with status ${response.status}`);
    }
  } catch (error) {
    sails.log.warn(`Pendo track event "${body.event}" failed with error: ${error}`);
  }
}

/**
 * Sends a server-side Pendo Track Event without blocking the request.
 * Does nothing when PENDO_TRACK_EVENT_SECRET is not configured.
 */
module.exports = {
  sync: true,

  inputs: {
    event: {
      type: 'string',
      required: true,
    },
    visitorId: {
      type: 'ref',
    },
    accountId: {
      type: 'ref',
    },
    properties: {
      type: 'ref',
    },
    request: {
      type: 'ref',
    },
  },

  fn(inputs) {
    if (!sails.config.custom.pendoTrackEventSecret) {
      return;
    }

    try {
      const body = {
        type: 'track',
        event: inputs.event,
        visitorId: inputs.visitorId ? String(inputs.visitorId) : 'system',
        accountId: inputs.accountId ? String(inputs.accountId) : DEFAULT_ACCOUNT_ID,
        timestamp: Date.now(),
        properties: inputs.properties || {},
      };

      if (inputs.request && inputs.request.headers && inputs.request.headers['user-agent']) {
        body.context = {
          userAgent: inputs.request.headers['user-agent'],
        };
      }

      sendPendoTrackEvent(body);
    } catch (error) {
      sails.log.warn(`Pendo track event "${inputs.event}" failed with error: ${error}`);
    }
  },
};
