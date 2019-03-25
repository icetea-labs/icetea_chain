/* global fetch */

const PLAIN_IMPORT_REGEX = /^[ \t]*import\s+["'](https?:\/\/.+)["'][ \t]*$/gm
const REQUIRE_REGEX = /\brequire\s*\(\s*["'](https?:\/\/.+)["']\s*\)/g

// From https://github.com/<owner>/<repo>/<path to the file>
// To https://raw.githubusercontent.com/<owner>/<repo>/master/<path to the file>
function changeGithubPath (src) {
  if (!src.startsWith('https://github.com/')) {
    return src
  }
  const parts = src.replace('https://github.com/', '').split('/')
  const path = parts.slice(2)
  const repo = parts.slice(0, 2)
  const url = ['https://raw.githubusercontent.com', ...repo, 'master', ...path].join('/')
  return url
}

function preparePromises (src, regex, map) {
  let e = regex.exec(src)
  while (e) {
    const p = e[1]
    const content = fetch(changeGithubPath(p)).then(resp => resp.text())
    map[p] = content

    e = regex.exec(src)
  }
}

function resolveRegEx (src, regex, wrapFn) {
  const map = {}
  preparePromises(src, regex, map)
  const promises = Object.values(map)
  if (!promises.length) return Promise.resolve(src)
  return Promise.all(promises).then(values => {
    const keys = Object.keys(map)
    for (let i = 0; i < keys.length; i++) {
      map[keys[i]] = wrapFn ? wrapFn(values[i]) : values[i]
    }
  }).then(() => {
    return src.replace(regex, function (match, group) {
      return map[group]
    })
  }).then(src => resolveRegEx(src, regex, wrapFn))
}

function resolveImports (src) {
  return resolveRegEx(src, PLAIN_IMPORT_REGEX, function (src) {
    // return '(function(){\n' + src.trim() + '\n}).call(global)'
    return src // for import, include as is
  })
}

function resolveRequires (src) {
  return resolveRegEx(src, REQUIRE_REGEX, function (src) {
    return '(function(){const module={exports:{}};const exports=module.exports;\n' + src.trim() + ';\nreturn module.exports}).call(global)'
  })
}

exports.resolveExternal = function (src) {
  return resolveImports(src).then(src => resolveRequires(src))
}
