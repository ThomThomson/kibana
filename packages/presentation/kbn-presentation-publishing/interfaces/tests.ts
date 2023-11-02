/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { PublishesViewMode, PublishesWritableViewMode, ViewMode } from './publishes_view_mode';

const useSubjectFromReactiveVar = <T extends unknown = unknown>(value: T) => {
  const subject = useMemo<BehaviorSubject<T>>(
    () => new BehaviorSubject<T>(value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => subject.next(value), [subject, value]);
  return subject;
};

const ComponentWithHookState = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const viewModeSubject = useSubjectFromReactiveVar(viewMode);

  const api: PublishesWritableViewMode = useMemo(() => {
    return {
      viewMode: viewModeSubject,
      setViewMode: (newViewMode) => setViewMode(newViewMode),
    };
  }, []);

  // do something with the API...
};

const ComponentWithRXJSState = () => {
  const rxjsViewModeStore = useRef(new BehaviorSubject<ViewMode>('view'));

  const api: PublishesWritableViewMode = useMemo(() => {
    return {
      viewMode: rxjsViewModeStore,
      setViewMode: (newViewMode) => rxjsViewModeStore.current.next(newViewMode),
    };
  }, []);

  // do something with the API...
};

const embeddableInputToSubject = <T extends unknown = unknown>(
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

const ComponentWithEmbeddableState = () => {
  const subscriptions = useRef<Subscription>(new Subscription());
  const superEmbeddable = useRef<IEmbeddable>(new SomeEmbeddable());
  const viewModeSubject = embeddableInputToSubject(subscriptions, superEmbeddable, 'viewMode');

  // unsubscribe from scriptions on unmount
  useEffect(() => {
    return () => subscriptions.current?.unsubscribe();
  }, []);

  const api: PublishesWritableViewMode = useMemo(() => {
    return {
      viewMode: viewModeSubject,
      setViewMode: (newViewMode) => superEmbeddable.current.updateInput({ viewMode: newViewMode }),
    };
  }, []);

  // do something with the API...
};

const ComponentWithReduxState = () => {
  const dispatch = useDispatch();
  const viewMode = useSelector((state) => state.viewMode);
  const viewModeSubject = useSubjectFromReactiveVar(viewMode);

  const api: PublishesWritableViewMode = useMemo(() => {
    return {
      viewMode: viewModeSubject,
      setViewMode: (newViewMode) => dispatch(setViewMode(newViewMode)),
    };
  }, []);
};
