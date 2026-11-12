/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /config/test-smtp:
 *   post:
 *     summary: Test SMTP configuration
 *     description: Sends a test email to verify the SMTP is configured correctly. Only available when SMTP is configured via the UI.
 *     tags:
 *       - Config
 *     operationId: testSmtpConfig
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Config'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

const Errors = {
  NOT_AVAILABLE: {
    notAvailable: 'Not available',
  },
};

module.exports = {
  exits: {
    notAvailable: {
      responseType: 'forbidden',
    },
  },

  async fn() {
    const { currentUser } = this.req;

    if (sails.config.custom.smtpHost) {
      return Errors.NOT_AVAILABLE;
    }

    const { transporter, config } = await sails.helpers.utils.makeSmtpTransporter({
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      dnsTimeout: 3000,
    });

    if (!transporter) {
      return Errors.NOT_AVAILABLE;
    }

    const logs = ['📧 Sending test email...'];
    try {
      /* eslint-disable no-underscore-dangle */
      const info = await transporter.sendMail({
        to: currentUser.email,
        subject: this.req.i18n.__('Test Title'),
        text: this.req.i18n.__('This is a test text message!'),
        html: this.req.i18n.__('This is a <i>test</i> <b>html</b> <code>message</code>!'),
      });
      /* eslint-enable no-underscore-dangle */
      logs.push('✅ Email sent successfully.', '');

      // Pendo: the SMTP test delivered an email
      sails.helpers.utils.sendPendoTrackEvent.with({
        event: 'Test email sent',
        visitorId: currentUser.id,
        properties: {
          role: currentUser.role,
        },
      });

      logs.push(`📬 Message ID: ${info.messageId}`);
      if (info.response) {
        logs.push(`📤 Server response: ${info.response.trim()}`);
      }

      logs.push('', '🎉 Your configuration is working correctly.');
    } catch (error) {
      logs.push('❌ Failed to send email.', '');

      if (error.code) {
        logs.push(`⚠️ Error code: ${error.code}`);
      }
      logs.push(`💬 Reason: ${error.message.trim()}`);

      if (error.code === 'EDNS') {
        logs.push('', '💡 Hint: Check your host setting.');
      } else if (error.code === 'ETIMEDOUT') {
        logs.push('', '💡 Hint: Check your host and port settings.');
      } else if (error.code === 'EAUTH') {
        logs.push('', '💡 Hint: Check your username and password.');
      } else if (error.code === 'ESOCKET') {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          logs.push('', '💡 Hint: Check your host and port settings.');
        } else if (error.message.includes('wrong version number')) {
          logs.push('', '💡 Hint: Try toggling "Use secure connection".');
        } else if (error.message.includes('certificate')) {
          logs.push('', '💡 Hint: Try toggling "Reject unauthorized TLS certificates".');
        }
      }
    } finally {
      transporter.close();
    }

    return {
      item: sails.helpers.config.presentOne(config),
      included: {
        logs,
      },
    };
  },
};
