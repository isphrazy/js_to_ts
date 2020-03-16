const fs = require('fs');

const findPath = (filePath, importPath) => {
    const filePathArr = filePath.split('/');
    filePathArr.pop();
    const importPathArr = importPath.split('/');
    while (importPathArr[0] === '..') {
        filePathArr.pop();
        importPathArr.shift();
    }
    if (importPathArr[0] === '.') {
        importPathArr.shift();
    }
    console.log('filePathArr', filePathArr);

    return filePathArr.concat(importPathArr).join('/');
};
/**
 * If we see import * as A from 'path/to/file'. We will read
 * path/to/file and see if there is export default there.
 */
export default (file, api, options) => {
    console.log('start');
    const j = api.jscodeshift;

    const root = j(file.source);
    root.find(j.ImportDeclaration).forEach(path => {
        try {
            if (path.value.specifiers[0].type !== 'ImportNamespaceSpecifier') {
                return;
            }
            const filePath = file.path;
            const importPath = path.value.source.value;
            let importFilePath = findPath(filePath, importPath);
            let isDir = false;
            try {
                isDir = fs.lstatSync(importFilePath).isDirectory();
                if (isDir) {
                    importFilePath += '/index.ts';
                }
            } catch (e) {}
            if (!isDir) {
                importFilePath = importFilePath + '.ts';
            }
            if (!fs.existsSync(importFilePath)) {
                console.log('file not exists: ', importFilePath);
                return;
            }
            let isExportDefault = false;
            const content = fs.readFileSync(importFilePath, 'utf8');
            console.log('content', content);
            for (const line of content.split('\n')) {
                if (line.startsWith('export default ')) {
                    console.log('set true');
                    isExportDefault = true;
                }
            }
            console.log('isExportDefault', isExportDefault);
            if (isExportDefault) {
                path.replace(
                    'import ' +
                        path.value.specifiers[0].local.name +
                        " from '" +
                        importPath +
                        "';",
                );
            }
        } catch (e) {
            console.log(e);
        }
    });
    return root.toSource();
};
