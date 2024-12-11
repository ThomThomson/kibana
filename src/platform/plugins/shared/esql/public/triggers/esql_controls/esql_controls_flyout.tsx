/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/react';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButton,
  EuiTitle,
  EuiFlyoutFooter,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFormRow,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiTextArea,
  EuiSwitch,
  EuiSwitchEvent,
  EuiSpacer,
} from '@elastic/eui';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { tracksOverlays } from '@kbn/presentation-containers';
import { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import ESQLEditor from '@kbn/esql-editor';
import type { ISearchGeneric } from '@kbn/search-types';
import {
  getESQLQueryColumnsRaw,
  getIndexPatternFromESQLQuery,
  getESQLResults,
} from '@kbn/esql-utils';
import { type ESQLColumn, parse, walk } from '@kbn/esql-ast';
import { buildQueryUntilPreviousCommand } from '@kbn/esql-validation-autocomplete/src/shared/resources_helpers';
import { getQueryForFields } from '@kbn/esql-validation-autocomplete/src/autocomplete/helper';
import { monaco } from '@kbn/monaco';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { esqlVariablesService } from '../../../common';
import { EsqlControlFlyoutType, type ESQLControlState } from './types';
import { updateQueryStringWithVariable } from './helpers';

interface ESQLControlsFlyoutProps {
  search: ISearchGeneric;
  controlType: EsqlControlType;
  queryString: string;
  dashboardApi: DashboardApi;
  panelId?: string;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  closeFlyout: () => void;
}

const getControlFlyoutType = (controlType: EsqlControlType) => {
  switch (controlType) {
    case EsqlControlType.TIME_LITERAL:
    case EsqlControlType.FIELDS:
      return EsqlControlFlyoutType.STATIC_VALUES;
    case EsqlControlType.VALUES:
      return EsqlControlFlyoutType.VALUES_FROM_QUERY;
    default:
      return EsqlControlFlyoutType.STATIC_VALUES;
  }
};

const getValuesFromQueryField = (queryString: string) => {
  const validQuery = `${queryString} ""`;
  const { root } = parse(validQuery);
  const lastCommand = root.commands[root.commands.length - 1];
  const columns: ESQLColumn[] = [];

  walk(lastCommand, {
    visitColumn: (node) => columns.push(node),
  });

  if (columns.length) {
    return `${columns[columns.length - 1].name}`;
  }
};

const getVariableName = (controlType: EsqlControlType, queryString: string) => {
  switch (controlType) {
    case EsqlControlType.TIME_LITERAL:
      return '?interval';
    case EsqlControlType.FIELDS:
      return '?field';
    case EsqlControlType.VALUES:
      const field = getValuesFromQueryField(queryString);
      if (field) {
        // variables names can't have special characters, only underscore
        return `?${field.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      return '';
    default:
      return '?variable';
  }
};

const getSuggestedValues = (controlType: EsqlControlType) => {
  switch (controlType) {
    case EsqlControlType.TIME_LITERAL:
      return '5 minutes, 1 hour, 1 day, 1 week, 1 year';
    default:
      return undefined;
  }
};

const controlTypeOptions = [
  {
    label: i18n.translate('esql.flyout.controlTypeOptions.staticValuesLabel', {
      defaultMessage: 'Static Values',
    }),
    'data-test-subj': 'staticValues',
    key: EsqlControlFlyoutType.STATIC_VALUES,
  },
  {
    label: i18n.translate('esql.flyout.controlTypeOptions.valuesFromQueryLabel', {
      defaultMessage: 'Values from a query',
    }),
    'data-test-subj': 'valuesFromQuery',
    key: EsqlControlFlyoutType.VALUES_FROM_QUERY,
  },
];

const minimumWidthButtonGroup = [
  {
    id: `small`,
    label: i18n.translate('esql.flyout.minimumWidth.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: `medium`,
    label: i18n.translate('esql.flyout.minimumWidth.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: `large`,
    label: i18n.translate('esql.flyout.minimumWidth.large', {
      defaultMessage: 'Large',
    }),
  },
];

export function ESQLControlsFlyout({
  search,
  controlType,
  queryString,
  dashboardApi,
  panelId,
  cursorPosition,
  initialState,
  closeFlyout,
}: ESQLControlsFlyoutProps) {
  const isControlInEditMode = initialState !== undefined;
  const flyoutType = getControlFlyoutType(controlType);
  const [controlFlyoutType, setControlFlyoutType] = useState<EuiComboBoxOptionOption[]>([
    controlTypeOptions.find((option) => option.key === flyoutType)!,
  ]);
  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [esqlQueryErrors, setEsqlQueryErrors] = useState<Error[] | undefined>();

  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);
  const dashboardPanels = useStateFromPublishingSubject(dashboardApi.children$);
  const suggestedVariableName = initialState
    ? `?${initialState.variableName}`
    : getVariableName(controlType, queryString);
  const [variableName, setVariableName] = useState(suggestedVariableName);

  // time literal control option and values
  const suggestedStaticValues = initialState
    ? initialState.availableOptions.join(',')
    : getSuggestedValues(controlType);
  const [values, setValues] = useState<string | undefined>(suggestedStaticValues);
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  // fields control option
  const [availableFieldsOptions, setAvailableFieldsOptions] = useState<EuiComboBoxOptionOption[]>(
    []
  );

  const [selectedFields, setSelectedFields] = useState<EuiComboBoxOptionOption[]>(
    initialState
      ? initialState.availableOptions.map((option) => {
          return {
            label: option,
            'data-test-subj': option,
            key: option,
          };
        })
      : []
  );

  // values from query control option
  const [valuesQuery, setValuesQuery] = useState<string>(initialState?.esqlQuery ?? '');

  const onFlyoutTypeChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setControlFlyoutType(selectedOptions);
  }, []);

  const onFieldsChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedFields(selectedOptions);
  }, []);

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      setVariableName(e.target.value);
    },
    []
  );

  const onValuesChange = useCallback(
    (e: { target: { value: React.SetStateAction<string | undefined> } }) => {
      setValues(e.target.value);
    },
    []
  );

  const onLabelChange = useCallback((e: { target: { value: React.SetStateAction<string> } }) => {
    setLabel(e.target.value);
  }, []);

  const onMinimumSizeChange = useCallback((optionId: string) => {
    setMinimumWidth(optionId);
  }, []);

  const onGrowChange = useCallback((e: EuiSwitchEvent) => {
    setGrow(e.target.checked);
  }, []);

  const addToESQLVariablesService = useCallback(
    (varName: string, variableValue: string, variableType: EsqlControlType, query: string) => {
      esqlVariablesService.addVariable({
        key: varName,
        value: variableValue,
        type: variableType,
      });
      esqlVariablesService.setEsqlQueryWithVariables(query);
    },
    []
  );

  const onCreateVariableControl = useCallback(async () => {
    const availableOptions =
      controlType === EsqlControlType.TIME_LITERAL || controlType === EsqlControlType.VALUES
        ? values?.split(',').map((value) => value.trim()) ?? []
        : selectedFields.map((field) => field.label);
    const varName = variableName.replace('?', '');
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      width: minimumWidth,
      title: label || varName,
      variableName: varName,
      variableType: controlType,
      esqlQuery: valuesQuery || queryString,
      grow,
    };

    if (panelId && cursorPosition && availableOptions.length && !isControlInEditMode) {
      // create a new control
      controlGroupApi?.addNewPanel({
        panelType: 'esqlControl',
        initialState: {
          ...state,
          id: uuidv4(),
        },
      });

      const query = updateQueryStringWithVariable(queryString, variableName, cursorPosition);

      addToESQLVariablesService(varName, availableOptions[0], controlType, query);
      const embeddable = dashboardPanels[panelId!];
      // open the edit flyout to continue editing
      await (embeddable as { onEdit: () => Promise<void> }).onEdit();
    } else if (isControlInEditMode && panelId && availableOptions.length) {
      // edit an existing control
      controlGroupApi?.replacePanel(panelId, {
        panelType: 'esqlControl',
        initialState: state,
      });
      addToESQLVariablesService(varName, availableOptions[0], controlType, '');
    }
    closeFlyout();
  }, [
    valuesQuery,
    controlType,
    values,
    selectedFields,
    variableName,
    minimumWidth,
    grow,
    label,
    panelId,
    cursorPosition,
    isControlInEditMode,
    closeFlyout,
    controlGroupApi,
    queryString,
    addToESQLVariablesService,
    dashboardPanels,
  ]);

  const onCancel = useCallback(() => {
    closeFlyout();
    // remove the variable from the service
    esqlVariablesService.removeVariable(variableName);

    const overlayTracker = tracksOverlays(dashboardApi) ? dashboardApi : undefined;
    overlayTracker?.clearOverlays();
  }, [closeFlyout, dashboardApi, variableName]);

  useEffect(() => {
    if (controlType === EsqlControlType.FIELDS && !availableFieldsOptions.length) {
      // get the valid query until the prev command and get the columns
      const { root } = parse(queryString);
      const queryForFields = getQueryForFields(
        buildQueryUntilPreviousCommand(root.commands, queryString),
        root.commands
      );
      getESQLQueryColumnsRaw({
        esqlQuery: queryForFields,
        search,
      }).then((columns) => {
        setAvailableFieldsOptions(
          columns.map((col) => {
            return {
              label: col.name,
              'data-test-subj': col.name,
              key: col.name,
            };
          })
        );
      });
    }
  }, [availableFieldsOptions.length, controlType, queryString, search]);

  useEffect(() => {
    const variableExists =
      esqlVariablesService.variableExists(variableName.replace('?', '')) && !isControlInEditMode;
    if (controlType === EsqlControlType.FIELDS) {
      setFormIsInvalid(!selectedFields.length || !variableName || variableExists);
    }

    if (controlType === EsqlControlType.TIME_LITERAL) {
      setFormIsInvalid(!values || !variableName || variableExists);
    }

    if (controlType === EsqlControlType.VALUES) {
      setFormIsInvalid(!valuesQuery || !variableName || variableExists);
    }
  }, [controlType, isControlInEditMode, selectedFields.length, values, valuesQuery, variableName]);

  const onValuesQuerySubmit = useCallback(
    async (query: string) => {
      if (valuesQuery !== query) {
        try {
          getESQLResults({
            esqlQuery: query,
            search,
            signal: undefined,
            filter: undefined,
            dropNullColumns: true,
          }).then((results) => {
            const valuesArray = results.response.values.map((value) => value[0]);
            setValues(valuesArray.filter((v) => v).join(', '));
            setEsqlQueryErrors([]);
          });
          setValuesQuery(query);
        } catch (e) {
          setEsqlQueryErrors([e]);
        }
      }
    },
    [search, valuesQuery]
  );

  useEffect(() => {
    if (controlType === EsqlControlType.VALUES && !values?.length) {
      const column = getValuesFromQueryField(queryString);
      const queryForValues =
        suggestedVariableName !== ''
          ? `FROM ${getIndexPatternFromESQLQuery(queryString)} | STATS BY ${column}`
          : '';
      onValuesQuerySubmit(queryForValues);
    }
  }, [
    controlType,
    onValuesQuerySubmit,
    queryString,
    suggestedVariableName,
    values?.length,
    variableName,
  ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('esql.flyout.title', {
              defaultMessage: 'Create ES|QL control',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area
          overflow-y: auto;
          pointer-events: none;
          .euiFlyoutBody__overflow {
            -webkit-mask-image: none;
            padding-left: inherit;
            margin-left: inherit;
            overflow-y: hidden;
            transform: initial;
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            block-size: 100%;
          }
        `}
      >
        <EuiFormRow
          label={i18n.translate('esql.flyout.controlTypeOptions.label', {
            defaultMessage: 'Type',
          })}
          fullWidth
        >
          <EuiComboBox
            aria-label={i18n.translate('esql.flyout.controlTypeOptions.placeholder', {
              defaultMessage: 'Select a control type',
            })}
            placeholder={i18n.translate('esql.flyout.controlTypeOptions.placeholder', {
              defaultMessage: 'Select a control type',
            })}
            singleSelection={{ asPlainText: true }}
            options={controlTypeOptions}
            selectedOptions={controlFlyoutType}
            onChange={onFlyoutTypeChange}
            fullWidth
            isDisabled={controlType !== EsqlControlType.VALUES}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('esql.flyout.variableName.label', {
            defaultMessage: 'Name',
          })}
          fullWidth
          autoFocus
          isInvalid={
            !variableName ||
            (esqlVariablesService.variableExists(variableName.replace('?', '')) &&
              !isControlInEditMode)
          }
          error={
            !variableName
              ? i18n.translate('esql.flyout.variableName.error', {
                  defaultMessage: 'Variable name is required',
                })
              : esqlVariablesService.variableExists(variableName.replace('?', '')) &&
                !isControlInEditMode
              ? i18n.translate('esql.flyout.variableNameExists.error', {
                  defaultMessage: 'Variable name already exists',
                })
              : undefined
          }
        >
          <EuiFieldText
            placeholder={i18n.translate('esql.flyout.variableName.placeholder', {
              defaultMessage: 'Set a variable name',
            })}
            value={variableName}
            onChange={onVariableNameChange}
            aria-label={i18n.translate('esql.flyout.variableName.placeholder', {
              defaultMessage: 'Set a variable name',
            })}
            fullWidth
            disabled={isControlInEditMode}
          />
        </EuiFormRow>
        {controlType === EsqlControlType.VALUES &&
          controlFlyoutType[0]?.key === EsqlControlFlyoutType.VALUES_FROM_QUERY && (
            <EuiFormRow
              label={i18n.translate('esql.flyout.valuesQueryEditor.label', {
                defaultMessage: 'Values query',
              })}
              fullWidth
              isInvalid={!valuesQuery}
              error={
                !valuesQuery
                  ? i18n.translate('esql.flyout.valuesQueryEditor.error', {
                      defaultMessage: 'Query is required',
                    })
                  : undefined
              }
            >
              <ESQLEditor
                query={{ esql: valuesQuery }}
                onTextLangQueryChange={(q) => {
                  setValuesQuery(q.esql);
                }}
                hideTimeFilterInfo={true}
                disableAutoFocus={true}
                errors={esqlQueryErrors}
                editorIsInline
                hideRunQueryText
                onTextLangQuerySubmit={async (q, a) => {
                  if (q) {
                    await onValuesQuerySubmit(q.esql);
                  }
                }}
                isDisabled={false}
                isLoading={false}
              />
            </EuiFormRow>
          )}
        {controlType === EsqlControlType.FIELDS && (
          <EuiFormRow
            label={i18n.translate('esql.flyout.values.label', {
              defaultMessage: 'Values',
            })}
            helpText={i18n.translate('esql.flyout.values.multipleValuesDropdownLabel', {
              defaultMessage: 'Select multiple values',
            })}
            fullWidth
            isInvalid={!selectedFields.length}
            error={
              !selectedFields.length
                ? i18n.translate('esql.flyout.values.error', {
                    defaultMessage: 'At least one field is required',
                  })
                : undefined
            }
          >
            <EuiComboBox
              aria-label={i18n.translate('esql.flyout.fieldsOptions.placeholder', {
                defaultMessage: 'Select the fields options',
              })}
              placeholder={i18n.translate('esql.flyout.fieldsOptions.placeholder', {
                defaultMessage: 'Select the fields options',
              })}
              options={availableFieldsOptions}
              selectedOptions={selectedFields}
              onChange={onFieldsChange}
              fullWidth
            />
          </EuiFormRow>
        )}
        {(controlType === EsqlControlType.TIME_LITERAL ||
          (controlType === EsqlControlType.VALUES &&
            controlFlyoutType[0]?.key === EsqlControlFlyoutType.STATIC_VALUES)) && (
          <EuiFormRow
            label={i18n.translate('esql.flyout.values.label', {
              defaultMessage: 'Values',
            })}
            helpText={i18n.translate('esql.flyout.values.helpText', {
              defaultMessage:
                'Comma separated values (e.g. 5 minutes, 1 hour, 1 day, 1 week, 1 year)',
            })}
            fullWidth
            isInvalid={!values}
            error={
              !values
                ? i18n.translate('esql.flyout.values.error', {
                    defaultMessage: 'Values are required',
                  })
                : undefined
            }
          >
            <EuiFieldText
              placeholder={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Set the static values',
              })}
              value={values}
              onChange={onValuesChange}
              aria-label={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Set a variable name',
              })}
              fullWidth
            />
          </EuiFormRow>
        )}

        {controlType === EsqlControlType.VALUES &&
          controlFlyoutType[0]?.key === EsqlControlFlyoutType.VALUES_FROM_QUERY && (
            <EuiFormRow
              label={i18n.translate('esql.flyout.previewValues.placeholder', {
                defaultMessage: 'Values preview',
              })}
              fullWidth
            >
              <EuiTextArea
                placeholder={i18n.translate('esql.flyout.values.placeholder', {
                  defaultMessage: 'Set the static values',
                })}
                value={values}
                disabled
                compressed
                onChange={() => {}}
                aria-label={i18n.translate('esql.flyout.previewValues.placeholder', {
                  defaultMessage: 'Values preview',
                })}
                fullWidth
              />
            </EuiFormRow>
          )}

        <EuiFormRow
          label={i18n.translate('esql.flyout.label.label', {
            defaultMessage: 'Label',
          })}
          labelAppend={i18n.translate('esql.flyout.label.extraLabel', {
            defaultMessage: 'Optional',
          })}
          fullWidth
        >
          <EuiFieldText
            placeholder={i18n.translate('esql.flyout.label.placeholder', {
              defaultMessage: 'Set a label',
            })}
            value={label}
            onChange={onLabelChange}
            aria-label={i18n.translate('esql.flyout.label.placeholder', {
              defaultMessage: 'Set a label',
            })}
            fullWidth
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('esql.flyout.minimumWidth.label', {
            defaultMessage: 'Minimum Width',
          })}
          fullWidth
        >
          <EuiButtonGroup
            legend={i18n.translate('esql.flyout.minimumWidth.label', {
              defaultMessage: 'Minimum Width',
            })}
            options={minimumWidthButtonGroup}
            idSelected={minimumWidth}
            onChange={(id) => onMinimumSizeChange(id)}
            type="single"
            isFullWidth
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          label={i18n.translate('esql.flyout.grow.label', {
            defaultMessage: 'Expand width to fit available space',
          })}
          color="primary"
          checked={grow ?? false}
          onChange={(e) => onGrowChange(e)}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              id="lnsCancelEditOnFlyFlyout"
              onClick={onCancel}
              flush="left"
              aria-label={i18n.translate('esql.flyout..cancelFlyoutAriaLabel', {
                defaultMessage: 'Cancel applied changes',
              })}
              data-test-subj="cancelEsqlControlsFlyoutButton"
            >
              {i18n.translate('esql.flyout.cancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onCreateVariableControl}
              fill
              aria-label={i18n.translate('esql.flyout..applyFlyoutAriaLabel', {
                defaultMessage: 'Apply changes',
              })}
              disabled={formIsInvalid}
              color={formIsInvalid ? 'danger' : 'primary'}
              iconType="check"
              data-test-subj="saveEsqlControlsFlyoutButton"
            >
              {i18n.translate('esql.flyout.saveLabel', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
