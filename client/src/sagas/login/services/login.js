/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';

import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import i18n from '../../../i18n';
import { setAccessToken } from '../../../utils/access-token-storage';
import trackPendoEvent from '../../../utils/pendo-track';
import AccessTokenSteps from '../../../constants/AccessTokenSteps';

// Remembers whether the terms step was passed in the current sign-in attempt,
// so a sign-in that ends at the TOTP challenge can still report it.
let isTermsAcceptedInCurrentLogin = false;

export function* initializeLogin() {
  const { item: bootstrap } = yield call(api.getBootstrap); // TODO: handle error

  yield put(actions.initializeLogin(bootstrap));
}

export function* authenticate(data) {
  isTermsAcceptedInCurrentLogin = false;

  yield put(actions.authenticate(data));

  let accessToken;
  try {
    ({ item: accessToken } = yield call(api.createAccessToken, data));
  } catch (error) {
    // Sign-in attempt rejected at the password step (bad credentials, or a
    // terms or TOTP step the visitor still has to pass).
    yield call(trackPendoEvent, 'login_failed', {
      error_step: (error && error.step) || 'none',
      error_code: (error && error.code) || 'unknown',
      attempt_stage: 'password',
    });

    let terms;
    if (error.step === AccessTokenSteps.ACCEPT_TERMS) {
      ({ item: terms } = yield call(api.getTerms, i18n.resolvedLanguage));
    }

    yield put(actions.authenticate.failure(error, terms));
    return;
  }

  yield call(setAccessToken, accessToken);

  yield call(trackPendoEvent, 'login_completed', {
    completion_step: 'password',
    totp_required: false,
    terms_accepted: false,
    trust_device: false,
    language: i18n.resolvedLanguage,
  });

  yield put(actions.authenticate.success(accessToken));
}

export function* clearAuthenticateError() {
  yield put(actions.clearAuthenticateError());
}

export function* acceptTerms(signature) {
  yield put(actions.acceptTerms(signature));

  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  let accessToken;
  try {
    ({ item: accessToken } = yield call(api.acceptTerms, {
      pendingToken,
      signature,
      initialLanguage: i18n.resolvedLanguage,
    }));
  } catch (error) {
    if (error && error.step === AccessTokenSteps.VERIFY_TOTP) {
      isTermsAcceptedInCurrentLogin = true;
    }

    yield put(actions.acceptTerms.failure(error));
    return;
  }

  yield call(setAccessToken, accessToken);

  yield call(trackPendoEvent, 'login_completed', {
    completion_step: 'accept_terms',
    totp_required: false,
    terms_accepted: true,
    trust_device: false,
    language: i18n.resolvedLanguage,
  });

  isTermsAcceptedInCurrentLogin = false;

  yield put(actions.acceptTerms.success(accessToken));
}

export function* cancelTerms() {
  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  yield put(actions.cancelTerms());

  try {
    yield call(api.revokePendingToken, {
      pendingToken,
    });
  } catch (error) {
    yield put(actions.cancelTerms.failure(error));
    return;
  }

  yield put(actions.cancelTerms.success(pendingToken));
}

export function* updateTermsLanguage(value) {
  yield put(actions.updateTermsLanguage(value));

  let terms;
  try {
    ({ item: terms } = yield call(api.getTerms, value));
  } catch (error) {
    yield put(actions.updateTermsLanguage.failure(error));
    return;
  }

  yield put(actions.updateTermsLanguage.success(terms));
}

export function* verifyTotp(data) {
  yield put(actions.verifyTotp(data));

  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  let accessToken;
  try {
    ({ item: accessToken } = yield call(api.verifyTotp, {
      ...data,
      pendingToken,
    }));
  } catch (error) {
    // Sign-in attempt rejected at the TOTP challenge.
    yield call(trackPendoEvent, 'login_failed', {
      error_step: (error && error.step) || AccessTokenSteps.VERIFY_TOTP,
      error_code: (error && error.code) || 'unknown',
      attempt_stage: 'totp',
    });

    yield put(actions.verifyTotp.failure(error));
    return;
  }

  yield call(setAccessToken, accessToken);

  yield call(trackPendoEvent, 'login_completed', {
    completion_step: 'verify_totp',
    totp_required: true,
    terms_accepted: isTermsAcceptedInCurrentLogin,
    trust_device: !!data.trustDevice,
    language: i18n.resolvedLanguage,
  });

  isTermsAcceptedInCurrentLogin = false;

  yield put(actions.verifyTotp.success(accessToken));
}

export function* cancelTotpChallenge() {
  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  yield put(actions.cancelTotpChallenge());

  try {
    yield call(api.revokePendingToken, {
      pendingToken,
    });
  } catch (error) {
    yield put(actions.cancelTotpChallenge.failure(error));
    return;
  }

  yield put(actions.cancelTotpChallenge.success());
}

export default {
  initializeLogin,
  authenticate,
  clearAuthenticateError,
  acceptTerms,
  cancelTerms,
  updateTermsLanguage,
  verifyTotp,
  cancelTotpChallenge,
};
