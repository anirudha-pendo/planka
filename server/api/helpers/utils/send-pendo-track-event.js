/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { ProxyAgent } = require('undici');

const REQUEST_TIMEOUT = 5000;

/**
 * Posts a Track Event to the Pendo Track API.
 * Failures are logged and never reach the caller.
 *
 * @param {Object} body - Track Event payload.
 * @returns {Promise<void>}
 */
async function sendTrackEvent(body) {
  const { pendoDataHost, pendoTrackEventSecret, outgoingProxy } = sails.config.custom;

  try {
    const response = await fetch(`https://${pendoDataHost}/data/track`, {
      headers: {
        'Content-Type': 'application/json',
        'x-pendo-integration-key': pendoTrackEventSecret,
      },
      body: JSON.stringify(body),
      method: 'POST',
      dispatcher: outgoingProxy ? new ProxyAgent(outgoingProxy) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      sails.log.error(`Pendo track event "${body.event}" failed with status ${response.status}`);
    }
  } catch (error) {
    sails.log.error(`Pendo track event "${body.event}" failed with error: ${error}`);
  }
}

module.exports = {
  sync: true,

  inputs: {
    event: {
      type: 'string',
      required: true,
    },
    visitorId: {
      type: 'string',
    },
    accountId: {
      type: 'string',
    },
    properties: {
      type: 'json',
    },
  },

  fn(inputs) {
    if (!sails.config.custom.pendoTrackEventSecret) {
      return;
    }

    // Fire and forget, so tracking never delays or breaks the request.
    sendTrackEvent({
      type: 'track',
      event: inputs.event,
      visitorId: inputs.visitorId || 'system',
      accountId: inputs.accountId || sails.config.custom.pendoAccountId || 'system',
      timestamp: Date.now(),
      properties: inputs.properties || {},
    });
  },
};
