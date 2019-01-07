document.getElementById("form").addEventListener("submit", (e) => {
    if (!document.getElementById("data").value.trim().length) {
        alert("Please input some source!")
        e.preventDefault();
    }

    // TODO: more input validation
})

document.getElementById("src").addEventListener("keyup", () => {
    // Build data JSON
    var data = {
        op: 0,
        src: btoa(document.getElementById("src").value)
    }

    document.getElementById("data").value = JSON.stringify(data); 
})