/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { ProxyAgent } = require('undici');

const REQUEST_TIMEOUT = 5000;

/**
 * Sends a Track Event to the Pendo Track API.
 *
 * Fire-and-forget: failures are logged and never reach the caller, so analytics
 * can not break the request that produced the event.
 *
 * @param {string} event - Track Event name, as registered in Pendo.
 * @param {string} visitorId - ID of the user the event belongs to.
 * @param {Object} [properties] - Event properties.
 * @returns {Promise<void>}
 */
async function sendPendoTrackEvent(event, visitorId, properties) {
  const { pendoTrackEventSecret, pendoDataHost, pendoAccountId, outgoingProxy } =
    sails.config.custom;

  const body = JSON.stringify({
    event,
    visitorId,
    type: 'track',
    accountId: pendoAccountId,
    timestamp: Date.now(),
    properties: properties || {},
  });

  try {
    const response = await fetch(`https://${pendoDataHost}/data/track`, {
      body,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pendo-integration-key': pendoTrackEventSecret,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      dispatcher: outgoingProxy ? new ProxyAgent(outgoingProxy) : undefined,
    });

    if (!response.ok) {
      const message = await response.text();

      sails.log.error(
        `Pendo track event "${event}" failed with status ${response.status} and message: ${message}`,
      );
    }
  } catch (error) {
    sails.log.error(`Pendo track event "${event}" failed with error: ${error}`);
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
      type: 'ref',
    },
    properties: {
      type: 'ref',
    },
  },

  fn(inputs) {
    if (!sails.config.custom.pendoTrackEventSecret || !sails.config.custom.pendoDataHost) {
      return;
    }

    const visitorId = _.isNil(inputs.visitorId) ? 'system' : String(inputs.visitorId);

    sendPendoTrackEvent(inputs.event, visitorId, inputs.properties);
  },
};
