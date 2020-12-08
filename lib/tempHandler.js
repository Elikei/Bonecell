const fs = require('fs');
const path = require('path');
const config = require('../configger')();

exports.getTempContent = function(temp) {
  const file = ('template/' + temp);
  return fs.readFileSync(file, 'utf8');
}

exports.getJsonContent = function(temp) {
  return require('../template/serviceItem.json');
  // return require('./serviceTemp/' + temp + '.json');
}

exports.initFile = function(content, param, type, updateType) {
  let middlePath = 'src/lib/' + type;
  if (type === 'controller') {
    middlePath = 'src/app/controller'
  }

  const file = path.join(config.projDir[param.projName], middlePath, param.apiGroup + '.ts');
    content = content.replace(/🥩/g, param.apiGroup);
  let camelparam = param.apiGroup;
  if (param.apiGroup.indexOf('-') > 0) {
    camelparam = param.apiGroup[0];
    for (let i = 1; i < param.apiGroup.length; i++) {
      if (param.apiGroup[i] != '-') {
        if (param.apiGroup[i-1] === '-') {
          camelparam += param.apiGroup[i].toUpperCase();
        } else {
          camelparam += param.apiGroup[i]
        }
      }
    }
  }
  content = content.replace(/🍗/g, camelparam);
  content = content.replace(/🍖/g, upper(camelparam));
  if (updateType) {
    content = content.replace(/🍟/g, param.apiName);
    content = content.replace(/🍔/g, upper(param.apiName));
    content = updateContent(content, updateType, file);
  }

  // console.log(content);
  fs.writeFileSync(file, content, 'utf8');
  console.log('🖌  ' + type + ' Done!');
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
