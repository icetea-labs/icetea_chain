module.exports = class Runner {
    lint(src) {
        return src;
    }

    compile(src) {
        return src;
    }

    patch(compiledSrc) {
        return compiledSrc;
    }

    run(compiledSrc, context, info) {
        const patchedSrc = this.patch(compiledSrc);
        this.doRun(patchedSrc, context, info);
    }

    doRun(compiledSrc, context, info) {
        throw new Error("Not implemented");
    }

    verify(src) {
        this.lint(src);
    }
}