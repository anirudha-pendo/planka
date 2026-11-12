/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import omit from 'lodash/omit';
import truncate from 'lodash/truncate';
import { call, put, select } from 'redux-saga/effects';
import toast from 'react-hot-toast';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import trackPendoEvent from '../../../utils/pendo-track';
import { AttachmentTypes } from '../../../constants/Enums';
import ToastTypes from '../../../constants/ToastTypes';

export function* createAttachment(cardId, data) {
  const localId = yield call(createLocalId);
  const currentUserId = yield select(selectors.selectCurrentUserId);

  const nextData = {
    ...data,
    name: truncate(data.name, {
      length: 128,
    }),
  };

  yield put(
    actions.createAttachment({
      ...omit(nextData, ['file', 'url']),
      cardId,
      id: localId,
      creatorUserId: currentUserId,
    }),
  );

  // File details for the attachment_added Track Event. Link attachments have none.
  const trackedFileProperties = {
    attachment_type: nextData.type,
    file_size: nextData.file ? nextData.file.size : null,
    mime_type: (nextData.file && nextData.file.type) || null,
  };

  let attachment;
  try {
    ({ item: attachment } = yield nextData.type === AttachmentTypes.FILE
      ? call(request, api.createAttachmentWithFile, cardId, nextData, localId)
      : call(request, api.createAttachment, cardId, nextData));
  } catch (error) {
    yield put(actions.createAttachment.failure(localId, error));

    let failureReason = (error && error.code) || 'unknown';

    if (error.code === 'E_UNPROCESSABLE_ENTITY') {
      let toastType;
      if (error.message.startsWith('Upload limit')) {
        toastType = ToastTypes.FILE_IS_TOO_BIG;
        failureReason = 'file_is_too_big';
      } else if (error.message === 'Storage limit reached') {
        toastType = ToastTypes.NOT_ENOUGH_STORAGE;
        failureReason = 'not_enough_storage';
      }

      if (toastType) {
        yield call(toast, {
          type: toastType,
        });
      }
    }

    // Upload or link attachment finished without being saved
    yield call(trackPendoEvent, 'attachment_added', {
      ...trackedFileProperties,
      success: false,
      failure_reason: failureReason,
    });

    return;
  }

  yield put(actions.createAttachment.success(localId, attachment));

  // Upload or link attachment finished and was saved
  yield call(trackPendoEvent, 'attachment_added', {
    ...trackedFileProperties,
    success: true,
    failure_reason: null,
  });
}

export function* createAttachmentInCurrentCard(data) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(createAttachment, cardId, data);
}

export function* handleAttachmentCreate(attachment, requestId) {
  const isExists = yield select(selectors.selectIsAttachmentWithIdExists, requestId);

  if (!isExists) {
    yield put(actions.handleAttachmentCreate(attachment));
  }
}

export function* updateAttachment(id, data) {
  yield put(actions.updateAttachment(id, data));

  let attachment;
  try {
    ({ item: attachment } = yield call(request, api.updateAttachment, id, data));
  } catch (error) {
    yield put(actions.updateAttachment.failure(id, error));
    return;
  }

  yield put(actions.updateAttachment.success(attachment));
}

export function* handleAttachmentUpdate(attachment) {
  yield put(actions.handleAttachmentUpdate(attachment));
}

export function* deleteAttachment(id) {
  yield put(actions.deleteAttachment(id));

  let attachment;
  try {
    ({ item: attachment } = yield call(request, api.deleteAttachment, id));
  } catch (error) {
    yield put(actions.deleteAttachment.failure(id, error));
    return;
  }

  yield put(actions.deleteAttachment.success(attachment));
}

export function* handleAttachmentDelete(attachment) {
  yield put(actions.handleAttachmentDelete(attachment));
}

export default {
  createAttachment,
  createAttachmentInCurrentCard,
  handleAttachmentCreate,
  updateAttachment,
  handleAttachmentUpdate,
  deleteAttachment,
  handleAttachmentDelete,
};
