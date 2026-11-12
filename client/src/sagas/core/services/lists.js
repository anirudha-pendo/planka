/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';
import toast from 'react-hot-toast';

import { goToBoard } from './router';
import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import trackPendoEvent from '../../../utils/pendo';
import ToastTypes from '../../../constants/ToastTypes';

export function* createList(boardId, data) {
  const localId = yield call(createLocalId);

  const nextData = {
    ...data,
    position: yield select(selectors.selectNextListPosition, boardId),
  };

  yield put(
    actions.createList({
      ...nextData,
      boardId,
      id: localId,
    }),
  );

  let list;
  try {
    ({ item: list } = yield call(request, api.createList, boardId, nextData));
  } catch (error) {
    yield put(actions.createList.failure(localId, error));
    return;
  }

  yield put(actions.createList.success(localId, list));
}

export function* createListInCurrentBoard(data) {
  const { boardId } = yield select(selectors.selectPath);

  yield call(createList, boardId, data);
}

export function* handleListCreate(list) {
  yield put(actions.handleListCreate(list));
}

export function* updateList(id, data) {
  yield put(actions.updateList(id, data));

  let list;
  try {
    ({ item: list } = yield call(request, api.updateList, id, data));
  } catch (error) {
    yield put(actions.updateList.failure(id, error));
    return;
  }

  yield put(actions.updateList.success(list));
}

export function* handleListUpdate(list) {
  const currentCard = yield select(selectors.selectCurrentCard);

  let fetch = false;
  if (list.boardId) {
    const isAvailableForCurrentUser = yield select(
      selectors.selectIsListWithIdAvailableForCurrentUser,
      list.id,
    );

    fetch = !isAvailableForCurrentUser;
  }

  let users;
  let cards;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;

  if (fetch) {
    try {
      ({
        item: list, // eslint-disable-line no-param-reassign
        included: {
          users,
          cards,
          cardMemberships,
          cardLabels,
          taskLists,
          tasks,
          attachments,
          customFieldGroups,
          customFields,
          customFieldValues,
        },
      } = yield call(request, api.getList, list.id));
    } catch {
      fetch = false;
    }
  }

  yield put(
    actions.handleListUpdate(
      list,
      fetch,
      users,
      cards,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
    ),
  );

  if (list.boardId === null && currentCard && list.id === currentCard.listId) {
    yield call(goToBoard, currentCard.boardId);
  }
}

export function* moveList(id, index) {
  const { boardId } = yield select(selectors.selectListById, id);
  const position = yield select(selectors.selectNextListPosition, boardId, index, id);

  yield call(updateList, id, {
    position,
  });
}

export function* transferList(id, boardId) {
  const currentCard = yield select(selectors.selectCurrentCard);

  // TODO: hack?
  if (currentCard && id === currentCard.listId) {
    yield call(goToBoard, currentCard.boardId);
  }

  yield call(updateList, id, {
    boardId,
  });
}

export function* sortList(id, data) {
  yield put(actions.sortList(id, data));

  let list;
  let cards;

  try {
    ({
      item: list,
      included: { cards },
    } = yield call(request, api.sortList, id, data));
  } catch (error) {
    yield put(actions.sortList.failure(id, error));
    return;
  }

  yield put(actions.sortList.success(list, cards));

  // Pendo: the server sorted the list's cards
  yield call(trackPendoEvent, 'list_sorted', {
    listId: list.id,
    fieldName: data.fieldName,
    order: data.order,
    cardCount: cards ? cards.length : 0,
  });
}

export function* moveListCards(id, nextId) {
  const cardIds = yield select(selectors.selectCardIdsByListId, id);

  if (cardIds.length === 0) {
    return;
  }

  const { boardId } = yield select(selectors.selectListById, id);

  yield put(actions.moveListCards(id, nextId, cardIds));

  let list;
  let cards;
  let activities;

  try {
    ({
      item: list,
      included: { cards, activities },
    } = yield call(request, api.moveListCards, id, {
      listId: nextId,
    }));
  } catch (error) {
    yield put(actions.moveListCards.failure(id, error));

    // Pendo: the bulk move of the list's cards failed
    yield call(trackPendoEvent, 'list_cards_archived', {
      listId: id,
      targetListId: nextId,
      boardId,
      cardCount: cardIds.length,
      success: false,
    });

    return;
  }

  yield put(actions.moveListCards.success(list, cards, activities));

  // Pendo: all of the list's cards were moved in one bulk operation
  yield call(trackPendoEvent, 'list_cards_archived', {
    listId: id,
    targetListId: nextId,
    boardId,
    cardCount: cards ? cards.length : cardIds.length,
    success: true,
  });
}

export function* moveListCardsToArchiveList(id) {
  const archiveListId = yield select(selectors.selectArchiveListIdForCurrentBoard);

  yield call(moveListCards, id, archiveListId);
}

export function* clearTrashListInCurrentBoard() {
  const trashListId = yield select(selectors.selectTrashListIdForCurrentBoard);
  const { boardId } = yield select(selectors.selectPath);
  // Pendo: counted before clearing, covers the trash cards loaded in the client
  const trashCardIds = yield select(selectors.selectCardIdsByListId, trashListId);

  // Pendo: trash_emptied properties shared by both outcomes
  const trashEmptiedProperties = {
    boardId,
    listId: trashListId,
    cardCount: trashCardIds ? trashCardIds.length : 0,
  };

  yield put(actions.clearList(trashListId));

  yield call(toast, {
    type: ToastTypes.EMPTY_TRASH,
    params: {
      listId: trashListId,
    },
  });

  let list;
  try {
    ({ item: list } = yield call(request, api.clearList, trashListId));
  } catch (error) {
    yield put(actions.clearList.failure(trashListId, error));

    // Pendo: the server didn't clear the trash list
    yield call(trackPendoEvent, 'trash_emptied', {
      ...trashEmptiedProperties,
      success: false,
    });

    return;
  }

  yield put(actions.clearList.success(list));

  // Pendo: the server cleared the trash list and permanently deleted its cards
  yield call(trackPendoEvent, 'trash_emptied', {
    ...trashEmptiedProperties,
    success: true,
  });
}

export function* handleListClear(list) {
  yield put(actions.handleListClear(list));
}

export function* deleteList(id) {
  const trashListId = yield select(selectors.selectTrashListIdForCurrentBoard);
  const cardIds = yield select(selectors.selectCardIdsByListId, id);

  yield put(actions.deleteList(id, trashListId, cardIds));

  let list;
  let cards;

  try {
    ({
      item: list,
      included: { cards },
    } = yield call(request, api.deleteList, id));
  } catch (error) {
    yield put(actions.deleteList.failure(id, error));
    return;
  }

  yield put(actions.deleteList.success(list, cards));
}

export function* handleListDelete(list, cards) {
  yield put(actions.handleListDelete(list, cards));
}

export function* addListToBoardFilter(id, boardId) {
  yield put(actions.addListToBoardFilter(id, boardId));
}

export function* addListToFilterInCurrentBoard(id) {
  const { boardId } = yield select(selectors.selectPath);

  yield call(addListToBoardFilter, id, boardId);
}

export function* removeListFromBoardFilter(id, boardId) {
  yield put(actions.removeListFromBoardFilter(id, boardId));
}

export function* removeListFromFilterInCurrentBoard(id) {
  const { boardId } = yield select(selectors.selectPath);

  yield call(removeListFromBoardFilter, id, boardId);
}

export default {
  createList,
  createListInCurrentBoard,
  handleListCreate,
  updateList,
  handleListUpdate,
  moveList,
  transferList,
  sortList,
  moveListCardsToArchiveList,
  clearTrashListInCurrentBoard,
  handleListClear,
  deleteList,
  handleListDelete,
  addListToBoardFilter,
  addListToFilterInCurrentBoard,
  removeListFromBoardFilter,
  removeListFromFilterInCurrentBoard,
};
