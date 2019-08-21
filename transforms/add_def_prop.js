module.exports = function(fileInfo, api, options) {
  let j = api.jscodeshift;
  if (!options.propName || !options.propValue) {
    throw new Error('"propName" and "propValue" options are required.');
  }
  const newOptions = {
    'DEFAULT_PROPS_IDENTIFIER': options.defaultPropsIdentifier || 'defaultProps',
    'PROP_NAME': options.propName,
    'PROP_VALUE_OR_PARAMS': options.propValueOrParams || 'this',
    'IS_PROP_VALUE_FUNCTION_CALL': options.propIsFunctionCall || true,
    'PROP_VALUE_FUNCTION_NAME': options.propValueFnName || 'getDataCmpAttribute',
    // See https://github.com/benjamn/recast/blob/master/lib/options.ts for all
    // the command line options which can be passed.
    'PRINT_OPTIONS': options.printOptions
  };

  let ss = j(fileInfo.source)
    .find(j.ClassProperty)
    .forEach(path => {
      if (path.value.key.name === newOptions.DEFAULT_PROPS_IDENTIFIER) {
        // getDataCmpAttribute(this)
        let callExpression = j.callExpression(
          j.identifier(newOptions.PROP_VALUE_FUNCTION_NAME),
          [j.identifier(newOptions.PROP_VALUE_OR_PARAMS)]
        );

        // dataCmp : getDataCmpAttribute(this)
        let property = j.objectProperty(
          j.identifier(newOptions.PROP_NAME),
          callExpression
        );

        // Modify the existing properties
        path.value.value.properties.push(property);
      }
    })
    .toSource();
  console.log(ss);
  return ss;
};