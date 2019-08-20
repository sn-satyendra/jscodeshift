module.exports = function(fileInfo, api, options) {
  let j = api.jscodeshift;
  if (!options.propName || !options.propValue) {
    throw '"propName" and "propValue" options are required.';
  }
  const newOptions = {
    'DEFAULT_PROPS_IDENTIFIER': options.defaultPropsIdentifier || 'static defaultProps',
    'PROP_TYPES_IDENTIFIER': options.propTypesIdentifier || 'static propTypes',
    'TAB_CHAR': options.tab || '  ',
    'NEW_LINE_CHAR': options.newline || '\n',
    'DEFAULT_PROP_NAME': options.propName,
    'DEFAULT_PROP_VALUE': options.propValue
  };

  const source = fileInfo.source;
  let strDefProps = getBlockAsString(source, newOptions.DEFAULT_PROPS_IDENTIFIER);

  let newSource = source;

  if (strDefProps) {
    const modifiedProps = modifyDefaultProps(strDefProps, newOptions);
    newSource = source.replace(strDefProps, modifiedProps);
  } else {
    const propTypeBounds = getBlockBoundingIndexes(source, newOptions.PROP_TYPES_IDENTIFIER);
    const defPropDeclaration = `${newOptions.NEW_LINE_CHAR}${newOptions.NEW_LINE_CHAR}${newOptions.TAB_CHAR}${newOptions.DEFAULT_PROPS_IDENTIFIER} = `;
    const defPropAssignment = `{${newOptions.TAB_CHAR}${newOptions.TAB_CHAR}${getNewDefaultProp(newOptions)}${newOptions.TAB_CHAR}}`;
    newSource = newSource.slice(0, propTypeBounds.endIndex + 1) + defPropDeclaration + defPropAssignment + newSource.slice(propTypeBounds.endIndex + 1);
  }

  console.log(newSource);

  return j(fileInfo.source)
    .findVariableDeclarators('foo')
    .renameTo('bar')
    .toSource();
};

const getBlockAsString = (source, blockIdentifier) => {
  const indexes = getBlockBoundingIndexes(source, blockIdentifier);
  return indexes !== null && source.substring(indexes.startIndex, indexes.endIndex);
};

const getBlockBoundingIndexes = (source, blockIdentifier) => {
  const defPropStart = getBlockStartIndex(source, blockIdentifier);
  if (defPropStart !== -1) {
    let startIndex =  source.indexOf('{', defPropStart + 1);
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

const getBlockStartIndex = (source, blockIdentifier) => source.indexOf(blockIdentifier);

const modifyDefaultProps = (strDefProps, options) => {
  const {NEW_LINE_CHAR, TAB_CHAR} = options;
  let strProps = strDefProps.replace('{', '');
  let idxLastBracket = strProps.lastIndexOf('}');
  strProps = strProps.substring(0, idxLastBracket);

  let props = strProps.split(',');

  // If there is already a defaultProp present then remove the \n from end of last prop
  if (props.length > 0) {
    let lastItem = props[props.length - 1];
    lastItem = lastItem.replace(/(\r\n|\n|\r)/gm, '');
    lastItem = `${NEW_LINE_CHAR}${lastItem}`;
    props[props.length - 1] = lastItem.trimRight();
  }

  props.push(getNewDefaultProp(options));
  return `{${props.join(',')}${TAB_CHAR}}`;
};

const getNewDefaultProp = options => {
  const {DEFAULT_PROP_NAME, DEFAULT_PROP_VALUE, NEW_LINE_CHAR, TAB_CHAR} = options;
  return `${NEW_LINE_CHAR}${TAB_CHAR}${TAB_CHAR}${DEFAULT_PROP_NAME}: ${DEFAULT_PROP_VALUE}${NEW_LINE_CHAR}`
};