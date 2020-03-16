const directImport = (name, root, j) => {
  let res = false;
  root.find(j.NewExpression).forEach(path => {
    try {
      if (path.value.callee.name === name) {
        res = true;
      }
    } catch (e) {}
  });
  root.find(j.ClassDeclaration).forEach(path => {
    try {
      if (path.value.superClass.name === name) {
        res = true;
      }
    } catch (e) {}
  });
  return res;
};

const inlineRequire = (root, j) => {
  root.find(j.CallExpression).forEach(path => {
    try {
      if (path.value.callee.name !== "require" || path.parentPath.parentPath.parentPath.parentPath.name === "body") {
        return;
      }
      const file = path.value.arguments[0].value;
      const name =
        file
          .split("/")
          .slice(-1)
          .pop()
          .replace(/([-_]\w)/g, g => g[1].toUpperCase()) + "Module";
      root.get().node.program.body.unshift("import " + name + " from '" + file + "';");
      path.replace(name);
    } catch (e) {}
  });
};

export default (file, api: core.API, options) => {
  const j = api.jscodeshift;

  let root = j(file.source);
  inlineRequire(root, j);
  root.find(j.VariableDeclaration).forEach(path => {
    try {
      path.value.declarations.map(decl => {
        if (decl.init.callee.name === "require") {
          if (decl.id.properties) {
            // const {A, B} = require(...);
            //console.log(decl.id.properties);
            //          console.log(path.value.declarations[0].id.properties[0].value.name);
            const imports = [];
            path.value.declarations[0].id.properties.map(property => {
              const varName = property.key.name;
              let asName = property.value.name;
              if (!asName) {
                imports.push(varName);
                path.insertAfter("const {" + j(property.value.properties).toSource() + "} = " + varName + ";");
              } else if (varName !== asName) {
                imports.push(varName + " as " + asName);
              } else {
                imports.push(j(property).toSource());
              }
            });
            path.insertBefore(
              "import {" + imports.join(", ") + "} from '" + path.value.declarations[0].init.arguments[0].value + "';"
            );
          } else {
            const val = j(path.value.declarations[0].id).toSource();
            let toImport = "* as " + val;
            if (path.value.declarations[0].id) {
              const shouldDirectImport = directImport(path.value.declarations[0].id.name, root, j);

              if (shouldDirectImport) {
                toImport = val;
              }
            }
            const module = path.value.declarations[0].init.arguments[0].value;
            if (!module.startsWith(".")) {
              toImport = val;
            }

            path.insertBefore("import " + toImport + " from '" + module + "';");
          }
        } else if (decl.init.callee.callee.name === "require") {
          // const A = require(x)(y) =>
          // import AModule from x;
          // const A = x(y);
          const moduleName = decl.init.callee.arguments[0].value;
          const arg = j(decl.init.arguments).toSource();
          const varName = decl.id.name;
          const importModuleName = varName + "Module";
          path.insertBefore("import " + importModuleName + " from '" + moduleName + "';");
          path.insertBefore("const " + varName + " = " + importModuleName + "(" + arg + ");");
        }
      });
      //const decl = path.value.declarations[0];

      path.replace("");
    } catch (e) {
    }
  });

  return root.toSource();
};

