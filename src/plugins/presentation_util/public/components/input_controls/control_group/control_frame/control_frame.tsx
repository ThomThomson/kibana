/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import useMount from 'react-use/lib/useMount';
import classNames from 'classnames';
import { EuiFormControlLayout, EuiFormLabel, EuiFormRow, EuiIcon } from '@elastic/eui';

import { InputControlEmbeddable } from '../../embeddable/types';

interface ControlFrameProps {
  embeddable: InputControlEmbeddable;
  twoLine?: boolean;
}

export const ControlFrame = ({ twoLine, embeddable }: ControlFrameProps) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  useMount(() => {
    if (embeddableRoot.current && embeddable) embeddable.render(embeddableRoot.current);
  });

  const form = (
    <EuiFormControlLayout
      className="controlFrame--formControlLayout"
      fullWidth
      prepend={
        twoLine ? undefined : (
          <EuiFormLabel className="controlFrame__prepend" htmlFor={embeddable.id}>
            <EuiIcon className="controlFrame__prependIcon" type="pencil" />
            {embeddable.getInput().title}
          </EuiFormLabel>
        )
      }
    >
      <div
        className={classNames('controlFrame--control', {
          'controlFrame--twoLine': twoLine,
          'controlFrame--single': !twoLine,
        })}
        id={embeddable.id}
        ref={embeddableRoot}
      />
    </EuiFormControlLayout>
  );

  const twoLineLabel = (
    <>
      {embeddable.getInput().title}
      <EuiIcon className="controlFrame__labelIcon" size="m" type="pencil" />
    </>
  );

  return (
    <EuiFormRow fullWidth label={twoLine ? twoLineLabel : undefined}>
      {form}
    </EuiFormRow>
  );
};
