module.exports = function(fileInfo, api, options) {
  let j = api.jscodeshift;
  if (!options.propName || !options.propValueOrParams) {
    throw new Error('"propName" and "propValueOrParams" options are required.');
  }

  const newOptions = {
    /**
     * Identifier for the default props in the class.
     */
    'DEFAULT_PROPS_IDENTIFIER': options.defaultPropsIdentifier || 'defaultProps',

    /**
     * Name of the new prop.
     */
    'PROP_NAME': options.propName,

    /**
     * Value of the prop. It can be a numeric, string or boolean value.
     * In case of function prop, it should have function params as value.
     */
    'PROP_VALUE_OR_PARAMS': options.propValueOrParams,

    /**
     * Type of the prop. Can have values from string, number, function, boolean.
     * TODO: Support for object type needs to be added.
     */
    'PROP_TYPE': options.propType || 'string',

    /**
     * Name of the function in case of a function prop.
     * TODO: Anonymous functions are not supported for now.
     */
    'PROP_VALUE_FUNCTION_NAME': options.propValueFnName,
    // See https://github.com/benjamn/recast/blob/master/lib/options.ts for all
    // the command line options which can be passed.

    /**
     * Print options to be used for the final string output. See the recast options
     * https://github.com/benjamn/recast/blob/master/lib/options.ts for all possible
     * parameters which can be passed from command line.
     */
    'PRINT_OPTIONS': options.printOptions
  };

  return j(fileInfo.source)
    .find(j.ClassProperty)
    .forEach(path => {
      if (path.value.key.name === newOptions.DEFAULT_PROPS_IDENTIFIER) {
        // dataCmp : value from expression
        let property = j.objectProperty(
          j.identifier(newOptions.PROP_NAME),
          getValueExpression(j, newOptions)
        );

        // Modify the existing properties
        path.value.value.properties.push(property);
      }
    })
    .toSource();
};

const getValueExpression = (j, options) => {
  const {PROP_VALUE_FUNCTION_NAME, PROP_VALUE_OR_PARAMS, PROP_TYPE} = options;
  let expression;
  // See https://npmdoc.github.io/node-npmdoc-jscodeshift/build/apidoc.html
  // for help in forming the expression or literal
  if (PROP_TYPE === 'function') {
    if (!PROP_VALUE_FUNCTION_NAME) {
      throw new Error('"propValueFnName" option is missing.');
    }
    expression = j.callExpression(
      j.identifier(PROP_VALUE_FUNCTION_NAME),
      [j.identifier(PROP_VALUE_OR_PARAMS)]
    );
  } else if (PROP_TYPE === 'number') {
    expression = j.numericLiteral(PROP_VALUE_OR_PARAMS);
  } else if (PROP_TYPE === 'string') {
    expression = j.stringLiteral(PROP_VALUE_OR_PARAMS);
  } else if (PROP_TYPE === 'boolean') {
    expression = j.booleanLiteral(PROP_VALUE_OR_PARAMS);
  } else {
    throw new Error('"propType" can have values only in "string", "number", "boolean" or "function".');
  }
  return expression;
}