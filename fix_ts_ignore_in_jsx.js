export default (file, api) => {
    const j = api.jscodeshift;

    const root = j(file.source);
    const process = path => {
        for (const child of path.node.children) {
            if (
                child.type === 'JSXText' &&
                child.value.includes('@ts-ignore')
            ) {
                const indent = ' '.repeat(child.indent);
                child.value = `\n${indent}{/*\n${indent}    // @ts-ignore */}\n${' '.repeat(
                    child.indent,
                )}`;
            }
        }
    };
    // root.find(j.JSXElement).forEach(path => {
    root.find(j.JSXFragment).forEach(path => {
        process(path);
    });
    root.find(j.JSXElement).forEach(path => {
        process(path);
    });
    return root.toSource();
};

// module.exports.parser = 'tsx';
