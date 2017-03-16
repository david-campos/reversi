const LOGS_URI = "http://localhost/log.php";

var glob_doLog = true;

function answerReception() {
    if (this.readyState == 4) {
        if (this.status == 200) {
            console.log("Server answer", this.responseText);
        } else {
            console.log("Failed to log, stopping logs.", this.status, this.responseText);
            glob_doLog = false;
        }
    }
}

function serialize(obj) {
    var str = [];
    for (var p in obj)
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    return str.join("&");
}

/**
 * Logs the data to the server
 * @param data {Object} data to send
 */
function log(data) {
    if (glob_doLog) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            answerReception.bind(this)()
        };
        xhttp.open("POST", LOGS_URI, true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send(serialize(data));
    }
}