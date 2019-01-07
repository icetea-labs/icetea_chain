document.getElementById("form").addEventListener("submit", (e) => {
    if (!document.getElementById("data").value.trim().length) {
        alert("Please input contract source!")
        e.preventDefault();
    }

    // TODO: more input validation
})

document.getElementById("src").addEventListener("input", () => {
    // Build data JSON
    var data = {
        op: 0,
        src: btoa(document.getElementById("src").value)
    }

    document.getElementById("data").value = JSON.stringify(data); 
})