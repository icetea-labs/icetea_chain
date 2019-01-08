document.getElementById("form").addEventListener("submit", (e) => {
    if (!document.getElementById("data").value.trim().length) {
        alert("Please input contract source!")
        e.preventDefault();
    }

    // TODO: more input validation
})

function replaceAll(text, search, replacement) {
    return text.split(search).join(replacement);
}

function buildData () {
    let pText = document.getElementById("params").value;
    pText = replaceAll(pText, "\r", "\n");
    pText = replaceAll(pText, "\n\n", "\n");
    let params = pText.split("\n").filter((e) => {
        return e.trim().length;
    })

    // Build data JSON
    var data = {
        op: 0,
        src: btoa(document.getElementById("src").value),
        params: params
    }

    document.getElementById("data").value = JSON.stringify(data); 
}

document.getElementById("src").addEventListener("input", buildData);
document.getElementById("params").addEventListener("input", buildData);