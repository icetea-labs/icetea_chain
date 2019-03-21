const regex = /^[ \t]*import\s+["'](https?:\/\/.+)["'][ \t]*$/gm

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

function preparePromises (src, map) {
  let e = regex.exec(src)
  while (e) {
    const p = e[1]
    const content = window.fetch(changeGithubPath(p)).then(resp => resp.text())
    map[p] = content

    e = regex.exec(src)
  }
}

exports.resolveImports = function (src) {
  const map = {}
  preparePromises(src, map)
  const promises = Object.values(map)
  if (!promises.length) return Promise.resolve(src)
  return Promise.all(promises).then(values => {
    const keys = Object.keys(map)
    for (let i = 0; i < keys.length; i++) {
      map[keys[i]] = ';' + values[i]
    }
  }).then(() => {
    return src.replace(regex, function (match, group) {
      return map[group]
    })
  })
}
