/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, distinctUntilKeyChanged, Subscription } from 'rxjs';
import { EmbeddableInput } from '../lib';
import { PanelEmbeddable, PresentationPanelLegacyEmbeddableAPI } from './types';

const behaviorSubjectFromInput = <T extends unknown = unknown>(
  subscription: Subscription,
  embeddable: PanelEmbeddable,
  key: keyof EmbeddableInput
) => {
  const subject = new BehaviorSubject<T | undefined>(embeddable.getInput()[key] as T);
  subscription.add(
    embeddable
      .getInput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => subject.next(embeddable.getInput()[key] as T))
  );
  return subject;
};

export const legacyEmbeddableToApi = (
  embeddable: PanelEmbeddable
): { api: PresentationPanelLegacyEmbeddableAPI; destroyAPI: () => void } => {
  // panel title
  // panel description
  // parent
  // data loading
  // data views
  // disabled action ids
  // fatal errors
  // local unified serach
  // view mode

  const subscriptions = new Subscription();

  const panelTitle = behaviorSubjectFromInput<string>(subscriptions, embeddable, 'title');
  const hidePanelTitle = behaviorSubjectFromInput<boolean>(
    subscriptions,
    embeddable,
    'hidePanelTitles'
  );

  return {
    api: { panelTitle, hidePanelTitle },
    destroyAPI: () => {
      subscriptions.unsubscribe();
    },
  };
};
