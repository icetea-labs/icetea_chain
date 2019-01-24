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

    run(compiledSrc, context) {
        const patchedSrc = this.patch(compiledSrc);
        this.doRun(patchedSrc, context);
    }

    doRun(compiledSrc, context) {
        throw "Not implemented";
    }

    verify(src) {
        this.lint(src);
        //halt(src);
    }
}