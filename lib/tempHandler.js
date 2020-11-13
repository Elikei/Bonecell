const fs = require('fs');
const path = require('path');
const config = require('../configger')();

exports.getTempContent = function(temp) {
  const file = ('template/' + temp);
  return fs.readFileSync(file, 'utf8');
}

exports.initFile = function(content, param, type, updateType) {
  let middlePath = 'src/lib/' + type;
  if (type === 'controller') {
    middlePath = 'src/app/controller'
  }
  const file = path.join(config.projDir[param[0]], middlePath, param[1] + '.ts');
  content = content.replace(/🦴/g, param[1]);
  if (updateType) {
    content = content.replace(/🍖/g, param[2]);
    content = content.replace(/🍗/g, upper(param[2]));
    content = updateContent(content, updateType, file);
  }
  // console.log('🔥' + content);
  fs.writeFileSync(file, content, 'utf8');
  console.log('🖌  ' + type + ' Done!')
}

function updateContent(tempContent, updateType, file) {
  let originContent = fs.readFileSync(file, 'utf8');
  if (updateType === 'CS') {
    return CSupdate(tempContent, originContent);
  } else if (updateType === 'IS') {
    return ISupdate(tempContent, originContent);
  } else {
    return;
  }
}

function CSupdate(tempContent, originContent) {
  let originContentFmt = originContent.split('\n');
  let tempContentFmt = tempContent.split('\n');
  for (let i in originContentFmt) {
    if (originContentFmt[originContentFmt.length - i - 1].indexOf('}') > -1) {
      i = originContentFmt.length - i;
      const ahead = originContentFmt.slice(0, i-1);
      const tail = tempContentFmt.concat(originContentFmt.slice(i-1));
      const content = ahead.concat(tail).join('\n');
      return content;
    }
  }
}

function ISupdate(tempContent, originContent) {
  let result = originContent + '\n' + tempContent;
  return result;
}

function upper(s) {
  let S = s[0].toUpperCase() + s.slice(1);
  return S;
}
