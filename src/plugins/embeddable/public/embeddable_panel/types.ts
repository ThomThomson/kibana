/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import { PublishesPanelTitle } from '@kbn/presentation-publishing';
import { MaybePromise } from '@kbn/utility-types';
import { ReactNode } from 'react';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../lib';

export type PanelEmbeddable = IEmbeddable<
  EmbeddableInput,
  EmbeddableOutput,
  MaybePromise<ReactNode>
>;

export type EmbeddablePanelProps = Omit<PresentationPanelProps, 'Component'> & {
  embeddable: PanelEmbeddable | (() => Promise<PanelEmbeddable>);
};

export type UnwrappedEmbeddablePanelProps = Omit<EmbeddablePanelProps, 'embeddable'> & {
  embeddable: PanelEmbeddable;
};

export type PresentationPanelLegacyEmbeddableAPI = PublishesPanelTitle; // TODO: add more API methods

export type LegacyEmbeddableCompatibilityComponent = React.ForwardRefExoticComponent<
  React.RefAttributes<PresentationPanelLegacyEmbeddableAPI>
>;
