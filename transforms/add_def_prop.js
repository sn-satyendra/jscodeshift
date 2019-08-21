module.exports = function(fileInfo, api, options) {
  let j = api.jscodeshift;
  if (!options.propName || !options.propValue) {
    throw new Error('"propName" and "propValue" options are required.');
  }
  const newOptions = {
    'DEFAULT_PROPS_IDENTIFIER': options.defaultPropsIdentifier || 'static defaultProps',
    'PROP_TYPES_IDENTIFIER': options.propTypesIdentifier || 'static propTypes',
    'TAB_CHAR': options.tab || '  ',
    'NEW_LINE_CHAR': options.newline || '\n',
    'DEFAULT_PROP_NAME': options.propName,
    'DEFAULT_PROP_VALUE': options.propValue,
    'PRINT_OPTIONS': options.printOptions || {
      tabWidth: 4
    }
  };

  const source = fileInfo.source;
  let strDefProps = getBlockAsString(source, newOptions.DEFAULT_PROPS_IDENTIFIER);

  let newSource = source;

  if (strDefProps) {
    const modifiedProps = modifyDefaultProps(j, strDefProps, newOptions);
    newSource = source.replace(strDefProps, modifiedProps);
  } else {
    const propTypeBounds = getBlockBoundingIndexes(source, newOptions.PROP_TYPES_IDENTIFIER);
    const defPropDeclaration = `${newOptions.NEW_LINE_CHAR}${newOptions.NEW_LINE_CHAR}${newOptions.TAB_CHAR}${newOptions.DEFAULT_PROPS_IDENTIFIER} = `;
    const defPropAssignment = `{${newOptions.TAB_CHAR}${newOptions.TAB_CHAR}${getNewDefaultProp(newOptions)}${newOptions.TAB_CHAR}}`;
    newSource = newSource.slice(0, propTypeBounds.endIndex + 1) + defPropDeclaration + defPropAssignment + newSource.slice(propTypeBounds.endIndex + 1);
  }

  // console.log(newSource);

  return j(fileInfo.source)
    .findVariableDeclarators('foo')
    .renameTo('bar')
    .toSource();
};

/**
 * Get the specified code block as string. Block is identified by enclosing set of curly
 * braces i.e {...}.
 *
 * @param {String} source            Source string code which needs to be searched  
 * @param {String} blockIdentifier   Identifier for the block which can be used to uniquely determine the block start
 */
const getBlockAsString = (source, blockIdentifier) => {
  const indexes = getBlockBoundingIndexes(source, blockIdentifier);
  return indexes !== null && source.substring(indexes.startIndex, indexes.endIndex);
};

/**
 * Get the startIndex and endIndex for a specified block of code.
 *
 * @param {String} source            Source string code which needs to be searched  
 * @param {String} blockIdentifier   Identifier for the block which can be used to uniquely determine the block start
 */
const getBlockBoundingIndexes = (source, blockIdentifier) => {
  const defPropStart = getBlockStartIndex(source, blockIdentifier);
  if (defPropStart !== -1) {
    let startIndex = source.indexOf('{', defPropStart + 1);
    // Find the ending }
    let stackMatch = ['{'];
    let endIndex = startIndex + 1;
    while (true) {
      if (source[endIndex] === '{') {
        stackMatch.push('{');
      } else if (source[endIndex] === '}') {
        stackMatch.pop();
      }
      if (stackMatch.length === 0) {
        break;
      }
      endIndex++;
    }
    return {
      startIndex,
      endIndex: endIndex + 1
    };
  }
  return null;
};

/**
 * Get the startIndex of the block of code.
 *
 * @param {String} source            Source string code which needs to be searched  
 * @param {String} blockIdentifier   Identifier for the block which can be used to uniquely determine the block start
 */
const getBlockStartIndex = (source, blockIdentifier) => source.indexOf(blockIdentifier);

/**
 * Modify the provided string block of defaultProps using the options passed.
 *
 * @param {String} strDefProps  String representation of default props
 * @param {Object} options      Options for transformation
 */
const modifyDefaultProps = (j, strDefProps, options) => {
  const BLOCK_IDENTIFIER = 'const defaultProps = ';
  let parsed = j(BLOCK_IDENTIFIER + strDefProps);
  parsed.find(j.VariableDeclarator)
    .forEach(path => {
      if (path.value.id.name === 'defaultProps') {
        // getDataCmpAttribute(this)
        let callExpression = j.callExpression(
          j.identifier('getDataCmpAttribute'),
          [j.identifier('this')]
        );

        // dataCmp : getDataCmpAttribute(this)
        let property = j.objectProperty(
          j.identifier('dataCmp'),
          callExpression
        );

        // Modify the existing properties
        path.value.init.properties.push(property);
      }
    });
  console.log(parsed.toSource());
  return parsed.toSource(options.PRINT_OPTIONS).replace(BLOCK_IDENTIFIER, '');
};

/**
 * Get the string representation of the new prop which should be added in default props.
 *
 * @param {Object} options      Options for transformation
 */
const getNewDefaultProp = options => {
  const {
    DEFAULT_PROP_NAME,
    DEFAULT_PROP_VALUE,
    NEW_LINE_CHAR,
    TAB_CHAR
  } = options;
  return `${NEW_LINE_CHAR}${TAB_CHAR}${TAB_CHAR}${DEFAULT_PROP_NAME}: ${DEFAULT_PROP_VALUE}${NEW_LINE_CHAR}`
};