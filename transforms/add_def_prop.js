const DEFAULT_PROPS_IDENTIFIER = 'static defaultProps';
const PROP_TYPES_IDENTIFIER = 'static propTypes';
const TAB_CHAR = '  ';
const NEW_LINE_CHAR = '\n';
const DEFAULT_PROP_NAME = 'dataCmp';
const DEFAULT_PROP_VALUE = 'getDataCmpAttribute(this)';
const DEFAULT_IMPORT_STATEMENT = 'import {getDataCmpAttribute} from "../utilities/ComponentUtilities";';

module.exports = function(fileInfo, api) {
  let j = api.jscodeshift;

  let source = fileInfo.source;
  let strDefProps = getBlockAsString(source, DEFAULT_PROPS_IDENTIFIER);
  let newSource = source;
  if (strDefProps) {
    let modifiedProps = modifyDefaultProps(strDefProps);
    newSource = source.replace(strDefProps, modifiedProps);
  } else {
    let propTypeBounds = getBlockBoundingIndexes(source, PROP_TYPES_IDENTIFIER);
    let defaultProps = `${NEW_LINE_CHAR}${NEW_LINE_CHAR}${TAB_CHAR}${DEFAULT_PROPS_IDENTIFIER} = {${TAB_CHAR}${TAB_CHAR}${getNewDefaultProp()}${TAB_CHAR}}`;
    newSource = newSource.slice(0, propTypeBounds.endIndex + 1) + defaultProps + newSource.slice(propTypeBounds.endIndex + 1);
    
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

const modifyDefaultProps = strDefProps => {
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

  props.push(getNewDefaultProp(DEFAULT_PROP_NAME, DEFAULT_PROP_VALUE));
  return `{${props.join(',')}${TAB_CHAR}}`;
};

const getNewDefaultProp = (key = DEFAULT_PROP_NAME, value = DEFAULT_PROP_VALUE) => `${NEW_LINE_CHAR}${TAB_CHAR}${TAB_CHAR}${key}: ${value}${NEW_LINE_CHAR}`;