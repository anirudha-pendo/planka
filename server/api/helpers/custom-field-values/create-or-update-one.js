/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'json',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const customFieldValue = await CustomFieldValue.qm.createOrUpdateOne({
      ...values,
      cardId: values.card.id,
      customFieldGroupId: values.customFieldGroup.id,
      customFieldId: values.customField.id,
    });

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'customFieldValueUpdate',
      {
        item: customFieldValue,
      },
      inputs.request,
    );

    const webhooks = await Webhook.qm.getAll();

    // TODO: with prevData?
    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.CUSTOM_FIELD_VALUE_UPDATE,
      buildData: () => ({
        item: customFieldValue,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [values.card],
          customFieldGroups: [values.customFieldGroup],
          customFields: [values.customField],
        },
      }),
      user: inputs.actorUser,
    });

    // Pendo Track Event: a field value was stored on the card
    sails.helpers.utils.sendPendoTrackEvent.with({
      event: 'Custom field value saved',
      visitorId: inputs.actorUser.id,
      properties: {
        card_id: customFieldValue.cardId,
        custom_field_id: customFieldValue.customFieldId,
        board_id: inputs.board.id,
        project_id: inputs.project.id,
      },
    });

    return customFieldValue;
  },
};
