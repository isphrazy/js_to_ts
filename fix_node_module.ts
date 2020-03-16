import core = require('jscodeshift');

'use strict';
exports.__esModule = true;
let printExport = function(name, value, j) {
    if (name === 'delete') {
        name = '__need_fix_delete';
    }
    return 'export const ' + name + ' = ' + j(value).toSource() + ';';
};
let findDecl = function(varName, root, j) {
    let res;
    root.find(j.VariableDeclaration).forEach(function(path) {
        try {
            if (path.value.declarations[0].id.name === varName) {
                res = path;
            }
        } catch (e) {}
    });
    return res;
};
/**
 * module.exports { A: ...,  } => export export const A = ...;
 * module.exports = ClassA => export default ClassA;
 * @param root
 * @param j
 */
let fixModuleExportObj = function(root, j) {
    root.find(j.ExpressionStatement).forEach(function(path) {
        try {
            let exp = path.value.expression;
            if (
                exp.type !== 'AssignmentExpression' ||
                exp.left.object.name !== 'module' ||
                exp.left.property.name !== 'exports'
            ) {
                return;
            }
            if (exp.right.type === 'Identifier') {
                // module.exports = ClassA;
                path.insertBefore('export default ' + exp.right.name + ';');
            } else if (exp.right.type === 'ArrowFunctionExpression') {
                  path.insertBefore(
                    'export default ' + j(exp.right).toSource() + ';',
                );
            } else {
                exp.right.properties.map(function(property) {
                    if (property.type === 'SpreadElement') {
                        // module.exports = { ...varA }
                        root.find(j.VariableDeclarator).forEach(function(v) {
                            try {
                                if (
                                    v.value.id.name !== property.argument.name
                                ) {
                                    return;
                                }
                                if (v.value.init.properties) {
                                    v.value.init.properties.map(function(p) {
                                        path.insertBefore(
                                            printExport(p.key.name, p.value, j),
                                        );
                                    });
                                } else if (
                                    v.value.init.callee.name === 'require'
                                ) {
                                    path.insertBefore(
                                        'export * from "' +
                                            v.value.init.arguments[0].value +
                                            '";',
                                    );
                                } else {
                                    console.log('problem with ', v);
                                }
                            } catch (e) {}
                        });
                    } else {
                        if (
                            property.key.type === 'Identifier' &&
                            property.key.type === property.value.type
                        ) {
                            // const A = 'hi';
                            // module.exports = { A }
                            let p = findDecl(property.value.name, root, j);
                            if (p) {
                                path.insertBefore(
                                    'export { ' + property.value.name + ' };',
                                );
                            }
                        } else {
                            path.insertBefore(
                                printExport(
                                    property.key.name,
                                    property.value,
                                    j,
                                ),
                            );
                        }
                    }
                });
            }
            path.replace('');
        } catch (e) {}
    });
};
/**
 * fix module.export.A = ... to export const A = ...
 * @param root
 * @param j
 */
let fixModuleExportIdent = function(root, j) {
    root.find(j.ExpressionStatement).forEach(function(path) {
        try {
            let obj = path.value.expression.left.object;
            if (
                obj.object.name !== 'module' ||
                obj.property.name !== 'exports'
            ) {
                return;
            }
            path.insertBefore(
                printExport(
                    path.value.expression.left.property.name,
                    path.value.expression.right,
                    j,
                ),
            );
            path.replace('');
        } catch (e) {}
    });
};
/**
 * module.export.A = ...
 * const b = module.export.A;
 *
 * will be converted to
 *
 * const b = A;
 * @param root
 * @param j
 */
let fixUseModuleExport = function(root, j) {
    root.find(j.MemberExpression).forEach(function(path) {
        try {
            if (
                path.value.object.object.name !== 'module' ||
                path.value.object.property.name !== 'exports'
            ) {
                return;
            }
            path.replace(path.value.property);
        } catch (e) {}
    });
};
exports['default'] = (function (file, api, options) {
    let j = api.jscodeshift;
    let root = j(file.source);
    fixModuleExportObj(root, j);
    root = j(root.toSource());
    fixModuleExportIdent(root, j);
    root = j(root.toSource());
    fixUseModuleExport(root, j);
    return root.toSource();
};
