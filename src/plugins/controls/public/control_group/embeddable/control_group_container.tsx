/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { uniqBy } from 'lodash';
import ReactDOM from 'react-dom';
import deepEqual from 'fast-deep-equal';
import { Filter, uniqFilters } from '@kbn/es-query';
import { EMPTY, merge, pipe, Subject, Subscription } from 'rxjs';
import {
  distinctUntilChanged,
  debounceTime,
  catchError,
  switchMap,
  map,
  skip,
  mapTo,
} from 'rxjs/operators';

import {
  ControlGroupInput,
  ControlGroupOutput,
  ControlPanelState,
  ControlsPanels,
  CONTROL_GROUP_TYPE,
} from '../types';
import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
} from '../../../../presentation_util/public';
import { pluginServices } from '../../services';
import { DataView } from '../../../../data_views/public';
import { DEFAULT_CONTROL_WIDTH } from '../editor/editor_constants';
import { ControlGroup } from '../component/control_group_component';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlEmbeddable, ControlInput, ControlOutput } from '../../types';
import {
  Container,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  ErrorEmbeddable,
  isErrorEmbeddable,
} from '../../../../embeddable/public';

const ControlGroupReduxWrapper = withSuspense<
  ReduxEmbeddableWrapperPropsWithChildren<ControlGroupInput>
>(LazyReduxEmbeddableWrapper);

interface ChildEmbeddableOrderCache {
  IdsToOrder: { [key: string]: number };
  idsInOrder: string[];
  lastChildId: string;
}

const controlOrdersAreEqual = (panelsA: ControlsPanels, panelsB: ControlsPanels) => {
  const ordersA = Object.values(panelsA).map((panel) => ({
    id: panel.explicitInput.id,
    order: panel.order,
  }));
  const ordersB = Object.values(panelsB).map((panel) => ({
    id: panel.explicitInput.id,
    order: panel.order,
  }));
  return deepEqual(ordersA, ordersB);
};

export class ControlGroupContainer extends Container<
  ControlInput,
  ControlGroupInput,
  ControlGroupOutput
> {
  public readonly type = CONTROL_GROUP_TYPE;

  private subscriptions: Subscription = new Subscription();
  private domNode?: HTMLElement;
  private childOrderCache: ChildEmbeddableOrderCache;
  private recalculateFilters$: Subject<null>;

  constructor(initialInput: ControlGroupInput, parent?: Container) {
    super(
      initialInput,
      { embeddableLoaded: {} },
      pluginServices.getServices().controls.getControlFactory,
      parent,

      // stop the parent container from building all embeddables immediately so we can build them in order
      true
    );

    this.recalculateFilters$ = new Subject();

    // set up order cache so that it is aligned on input changes.
    this.childOrderCache = this.getEmbeddableOrderCache();
    this.initializeChildrenInOrder();

    // when all children are ready setup subscriptions
    this.untilReady().then(() => {
      this.recalculateDataViews();
      this.recalculateFilters();
      this.setupSubscriptions();
    });
  }

  private setupSubscriptions = () => {
    /**
     * refresh control order cache and make all panels refreshInputFromParent whenever panel orders change
     */
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          skip(1),
          distinctUntilChanged((a, b) => controlOrdersAreEqual(a.panels, b.panels))
        )
        .subscribe(() => {
          this.recalculateDataViews();
          this.recalculateFilters();
          this.childOrderCache = this.getEmbeddableOrderCache();
          this.childOrderCache.idsInOrder.forEach((id) =>
            this.getChild(id)?.refreshInputFromParent()
          );
        })
    );

    /**
     * Create a pipe that outputs the child's ID, any time any child's output changes.
     */
    const anyChildChangePipe = pipe(
      map(() => this.getChildIds()),
      distinctUntilChanged(deepEqual),

      // children may change, so make sure we subscribe/unsubscribe with switchMap
      switchMap((newChildIds: string[]) =>
        merge(
          ...newChildIds.map((childId) =>
            this.getChild(childId)
              .getOutput$()
              .pipe(
                // Embeddables often throw errors into their output streams.
                catchError(() => EMPTY),
                mapTo(childId)
              )
          )
        )
      )
    );

    /**
     * run OnChildOutputChanged when any child's output has changed
     */
    this.subscriptions.add(
      this.getOutput$()
        .pipe(anyChildChangePipe)
        .subscribe((childOutputChangedId) => {
          this.recalculateDataViews();
          if (childOutputChangedId === this.childOrderCache.lastChildId) {
            // the last control's output has updated, recalculate filters
            this.recalculateFilters$.next();
            return;
          }

          // when output changes on a child which isn't the last - make the next embeddable updateInputFromParent
          const nextOrder = this.childOrderCache.IdsToOrder[childOutputChangedId] + 1;
          if (nextOrder >= Object.keys(this.children).length) return;
          setTimeout(
            () =>
              this.getChild(this.childOrderCache.idsInOrder[nextOrder]).refreshInputFromParent(),
            1 // run on next tick
          );
        })
    );

    /**
     * debounce output recalculation
     */
    this.subscriptions.add(
      this.recalculateFilters$.pipe(debounceTime(10)).subscribe(() => this.recalculateFilters())
    );
  };

  private initializeChildrenInOrder = async () => {
    const { panels } = this.getInput();
    for (const childId of this.childOrderCache.idsInOrder) {
      await this.createEmbeddableFromPanel(panels[childId]);
      await this.untilEmbeddableLoaded(childId);
    }
  };

  private async createEmbeddableFromPanel(panel: ControlPanelState) {
    this.updateOutput({
      embeddableLoaded: {
        ...this.output.embeddableLoaded,
        [panel.explicitInput.id]: false,
      },
    });
    const inputForChild = this.getInputForChild(panel.explicitInput.id);
    try {
      const factory = this.getFactory(panel.type);
      if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);

      const embeddable = await factory.create(inputForChild, this);
      if (embeddable && !embeddable.deferEmbeddableLoad) {
        this.setChildLoaded(embeddable);
      }
      return embeddable;
    } catch (e) {
      return new ErrorEmbeddable(e, { id: panel.explicitInput.id }, this);
    }
  }

  private getPrecedingFilters = (id: string) => {
    let filters: Filter[] = [];
    const order = this.childOrderCache.IdsToOrder?.[id];
    if (!order || order === 0) return filters;
    for (let i = 0; i < order; i++) {
      const embeddable = this.getChild<ControlEmbeddable>(this.childOrderCache.idsInOrder[i]);
      if (!embeddable || isErrorEmbeddable(embeddable)) return filters;
      filters = [...filters, ...(embeddable.getOutput().filters ?? [])];
    }
    return filters;
  };

  private getEmbeddableOrderCache = (): ChildEmbeddableOrderCache => {
    const panels = this.getInput().panels;
    const IdsToOrder: { [key: string]: number } = {};
    const idsInOrder: string[] = [];
    Object.values(panels)
      .sort((a, b) => (a.order > b.order ? 1 : -1))
      .forEach((panel) => {
        IdsToOrder[panel.explicitInput.id] = panel.order;
        idsInOrder.push(panel.explicitInput.id);
      });
    const lastChildId = idsInOrder[idsInOrder.length - 1];
    return { IdsToOrder, idsInOrder, lastChildId };
  };

  private recalculateFilters = () => {
    const allFilters: Filter[] = [];
    Object.values(this.children).map((child) => {
      const childOutput = child.getOutput() as ControlOutput;
      allFilters.push(...(childOutput?.filters ?? []));
    });
    this.updateOutput({ filters: uniqFilters(allFilters) });
  };

  private recalculateDataViews = () => {
    const allDataViews: DataView[] = [];
    Object.values(this.children).map((child) => {
      const childOutput = child.getOutput() as ControlOutput;
      allDataViews.push(...(childOutput.dataViews ?? []));
    });
    this.updateOutput({ dataViews: uniqBy(allDataViews, 'id') });
  };

  protected createNewPanelState<TEmbeddableInput extends ControlInput = ControlInput>(
    factory: EmbeddableFactory<ControlInput, ControlOutput, ControlEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): ControlPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    let nextOrder = 0;
    if (Object.keys(this.getInput().panels).length > 0) {
      nextOrder =
        Object.values(this.getInput().panels).reduce((highestSoFar, panel) => {
          if (panel.order > highestSoFar) highestSoFar = panel.order;
          return highestSoFar;
        }, 0) + 1;
    }
    return {
      order: nextOrder,
      width: this.getInput().defaultControlWidth ?? DEFAULT_CONTROL_WIDTH,
      ...panelState,
    } as ControlPanelState<TEmbeddableInput>;
  }

  protected getInheritedInput(id: string): ControlInput {
    const { filters, query, ignoreParentSettings, timeRange } = this.getInput();

    const precedingFilters = this.getPrecedingFilters(id);
    const allFilters = [
      ...(ignoreParentSettings?.ignoreFilters ? [] : filters ?? []),
      ...precedingFilters,
    ];
    return {
      filters: allFilters,
      query: ignoreParentSettings?.ignoreQuery ? undefined : query,
      timeRange: ignoreParentSettings?.ignoreTimerange ? undefined : timeRange,
      id,
    };
  }

  public untilReady = () => {
    const panelsLoading = () =>
      Object.keys(this.getInput().panels).some(
        (panelId) => !this.getOutput().embeddableLoaded[panelId]
      );
    if (panelsLoading()) {
      return new Promise<void>((resolve, reject) => {
        const subscription = merge(this.getOutput$(), this.getInput$()).subscribe(() => {
          if (this.destroyed) reject();
          if (!panelsLoading()) {
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  };

  public render(dom: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;
    const PresentationUtilProvider = pluginServices.getContextProvider();
    ReactDOM.render(
      <PresentationUtilProvider>
        <ControlGroupReduxWrapper embeddable={this} reducers={controlGroupReducers}>
          <ControlGroup />
        </ControlGroupReduxWrapper>
      </PresentationUtilProvider>,
      dom
    );
  }

  public destroy() {
    super.destroy();
    this.subscriptions.unsubscribe();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }
}
