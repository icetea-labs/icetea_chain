document.getElementById("form").addEventListener("submit", (e) => {
    if (!document.getElementById("name").value.trim().length) {
        alert("Please input contract function name!")
        e.preventDefault();
    }

    // TODO: more input validation
})

function replaceAll(text, search, replacement) {
    return text.split(search).join(replacement);
}

function buildData() {
    let pText = document.getElementById("params").value;
    pText = replaceAll(pText, "\r", "\n");
    pText = replaceAll(pText, "\n\n", "\n");
    let params = pText.split("\n").filter((e) => {
        return e.trim().length;
    })

    console.log(params);

    var data = {
        op: 1,
        name: document.getElementById("name").value,
        params: params
    }

    document.getElementById("data").value = JSON.stringify(data); 
}

document.getElementById("name").addEventListener("change", buildData);
document.getElementById("params").addEventListener("input", buildData);