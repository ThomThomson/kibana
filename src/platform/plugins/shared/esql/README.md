# @kbn/esql

## Component properties
The editor accepts the following properties:
- query: This is the **AggregateQuery** query. i.e. (`{esql: from index1 | limit 10}`)
- onTextLangQueryChange: callback that is called every time the query is updated
- errors: array of `Error`.
- warning: A string for visualizing warnings
- onTextLangQuerySubmit: callback that is called when the user submits the query
- isLoading: As the editor is not responsible for the data fetching request, the consumer could update this property when the data are being fetched. If this property is defined, the query history component will be rendered
```

To use it on your application, you need to add the textBasedLanguages to your requiredBundles and the @kbn/esql to your tsconfig.json and use the component like that:
import { ESQLLangEditor } from '@kbn/esql/public';

 <ESQLLangEditor
  query={query}
  onTextLangQueryChange={onTextLangQueryChange}
  errors={props.textBasedLanguageModeErrors}
  isDisabled={false}
  onTextLangQuerySubmit={onTextLangQuerySubmit}
 />
```

## Usage so far
The ESQLEditor is currently part of the unified search component. 
If your application uses the dataview picker then it can be enabled by adding

```
textBasedLanguages: ['ESQL'],
```

om the dataViewPickerProps property.

It is also part of the:
- Lens inline editing component
- Maps new ES|QL layer
- ML data visualizer
- Alerts

## Want to add support for a new command?
Follow this [guide](ADD_COMMAND_GUIDE.md).