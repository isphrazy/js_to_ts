// @ts-nocheck
import * as ts from 'typescript';
import * as fs from 'fs';

function compile(fileNames: string[], options: ts.CompilerOptions): void {
    const program = ts.createProgram(fileNames, options);
    const emitResult = program.emit();

    const allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    const fileToLines = {};
    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            const {
                line,
                character,
            } = diagnostic.file.getLineAndCharacterOfPosition(
                diagnostic.start!,
            );
            const message = ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                '\n',
            );
            // console.log(
            //     `${diagnostic.file.fileName} (${line + 1},${character +
            //         1}): ${message}`,
            // );
            if (!diagnostic.file.fileName.includes('/node_modules/')) {
                const lines = fileToLines[diagnostic.file.fileName] || [];
                lines.push(line + 1);
                fileToLines[diagnostic.file.fileName] = lines;
            }
        } else {
            // console.log(
            //     `${ts.flattenDiagnosticMessageText(
            //         diagnostic.messageText,
            //         '\n',
            //     )}`,
            // );
        }
    });
    const jsonFileToLines = JSON.stringify(fileToLines);
    console.log(jsonFileToLines);
    // fs.writeFile(outFileName, jsonFileToLines, err => {
    //     if (err) {
    //         return console.error(err);
    //     }
    //     console.log('File saved');
    // });

    const exitCode = emitResult.emitSkipped ? 1 : 0;
    // console.log(`Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}

compile(process.argv.slice(2), {
    allowSyntheticDefaultImports: true,
    noFallthroughCasesInSwitch: true,
    noUnusedParameters: true,
    noImplicitReturns: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    noUnusedLocals: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ESNext,
    // module: ts.ModuleKind.CommonJS,
    strict: true,
    jsx: ts.JsxEmit.React,
    composite: true,
    declarationDir: './decl',
    outDir: './dist/',
    sourceMap: true,
    strictNullChecks: true,
    alwaysStrict: true,
    suppressImplicitAnyIndexErrors: false,
});

