// Name: ocr-gt-tools.js

var lChanged = false;
$(document).bind('drop dragover', function(e) {
    // Prevent the default browser drop action:
    e.preventDefault();
});
$(document).bind('drop', function(e) {
    e.preventDefault();

    if (lChanged) {
        window.alert("Ungesicherte Inhalte vorhanden, bitte zuerst speichern!");
    } else {

        var url = $(e.originalEvent.dataTransfer.getData('text/html')).find('img').attr('src');

        if (url) {
            ActionForURL(url);
        }
    }
});

/**
 * Transform text file to array of line comments
 *
 * @param {String} txt Contents of the text file
 *
 * @return {Array} List of line comments
 */
function parseLineComments(txt) {
    var lines = txt.split(/\n/);
    var comments = [];
    for (var i = 0; i < lines.length ; i++) {
        comments.push(lines[i].replace(/^\d+:\s*/, ''));
    }
    return comments;
}

function addCommentFields(comments) {
    $("*[contenteditable]").parent().each(function(idx) {
        $(this).append(
            '<td id="line-comment-' + (idx + 1) + '" class="comment" contenteditable>' +
                comments[idx] +
            'XXX</td>'
        );
    });
}


function ActionForURL(url) {

    if (!url) {
        return;
    }

    $("#wait_load").removeClass("hidden");
    //console.log(url);
    // http://digi.bib.uni-mannheim.de/fileadmin/vl/ubmaosi/59087/thumbs/59087_0017.jpg
    var neuurl = url.replace('/thumbs/', '/min/'); //'http://digi.bib.uni-mannheim.de/fileadmin/vl/ubmaosi/59087/min/59087_0017.jpg';
    var hocrUrl = url.replace('/thumbs/', '/hocr/');
    hocrUrl = hocrUrl.replace('.jpg', '.hocr');

    $('#file_name').html(url);
    $('#file_image').html('<img src=' + url + '>');

    $.ajax({
        type: 'POST',
        url: '/cgi-bin/erzeuge_files.pl?action=create',
        data: {'data_url': url},
        beforeSend: function(xhr) {
            // to instantly see when a new document has been retrieved
            $("#file_correction").addClass("hidden");
        },
        success: function(res) {
            // file correction will be loaded
            var now = new Date();
            var nowString = now.getFullYear() + now.getMonth() + now.getDay() +  now.getTime();
            //console.log(nowString);
            window.location.hash = res.imageUrl;
            //$("#file_correction").load( res.correctionUrl + "?time=" + now, function(response, status, xhr) {
            $("#file_correction").load(res.correctionUrl + '?akt=' + nowString, function(response, status, xhr) {
                $.ajax({
                    type: 'GET',
                    url: res.commentsUrl,
                    error: function(x, e) {
                        window.alert(x.status + " FEHLER aufgetreten: \n" + e);
                    },
                    success: function(response, status, xhr) {
                        var comments = parseLineComments(response);
                        addCommentFields(comments);
                        // hide waiting spinner
                        $("#wait_load").addClass("hidden");
                        // show new document
                        $("#file_correction").removeClass("hidden");
                    }
                });
            });

            // Firefox 1.0+
            // http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
            var isFirefox = typeof InstallTrigger !== 'undefined';
            if (isFirefox) {
            } else {
                // Zoom buttons only for non-IE
                $("#zoom_button_plus").removeClass("hidden");
                $("#zoom_button_minus").removeClass("hidden");
            }
            $("#save_button").removeClass("hidden");
            // activate button if #file_correction is changed
            document.getElementById("file_correction").addEventListener("input", IfChanged);

            $("#save_button").off("click").on("click", function() {
                //
                if (lChanged) {
                    $("#wait_save").addClass("wait").removeClass("hidden");
                    $("#disk").addClass("hidden");

                    var myCorrection = $("#file_correction").html();
                    var myURL   = res.correctionUrl;
                    var mySection = res.pathSection;
                    var myID = res.pathId;
                    var myPage = res.pathPage;

                    $.ajax({
                        type: 'post',
                        url: 'save_changes.pl',
                        data: {'data_changes': myCorrection,
                               'data_url': myURL,
                               'data_section': mySection,
                               'data_id': myID,
                               'data_page': myPage
                        },
                        success: function() {
                            // after #file_correction is saved
                            lChanged = false;
                            $("#wait_save").removeClass("wait").addClass("hidden");
                            $("#disk").removeClass("hidden");
                            $("#save_button").addClass("inaktiv").removeClass("aktiv");
                            document.getElementById("file_correction").addEventListener("input", IfChanged);
                        },
                        error: function(x, e) {
                            window.alert(x.status + " FEHLER aufgetreten");
                        }
                    });
                }
            });
            $("#zoom_button_plus").on("click", function() {
                var nZoom = parseFloat($("#file_correction").css("zoom"));
                nZoom = nZoom + 0.4;
                $("#file_correction").css("zoom", nZoom);
            });
            $("#zoom_button_minus").on("click", function() {
                var nZoom = parseFloat($("#file_correction").css("zoom"));
                nZoom = nZoom - 0.4;
                $("#file_correction").css("zoom", nZoom);
            });

            // Add links to downloads to the DOM
            $("#file_links").html(
                "<div id='file_rem'><a download href='" + res.commentsUrl + "' target='_blank'>anmerkungen.txt</a></div>" +
                "<div id='file_o_rem'><a download href='" + res.correctionUrl + "' target='_blank'>correction.html</a></div>" +
                "<div id='file_m_rem'><a download href='" + res.correctionPath + "correction_remarks.html' target='_blank'>correction_remarks.html</a></div>");

        },
        error: function(x, e) {
            window.alert(x.status + " FEHLER aufgetreten: \n" + e);
        }
    });
}

function IfChanged() {
    //window.alert("input event fired");
    $("#save_button").removeClass("inaktiv").addClass("aktiv");
    document.getElementById("file_correction").removeEventListener("input", IfChanged);
    lChanged = true;
}

function showRemark(nID) {
    if ($("#" + nID).hasClass("hidden")) {
        $("#" + nID).removeClass("hidden");
        $("#tools-" + nID).find("span.span-commenting-o").addClass("hidden");
        $("#tools-" + nID).find("span.span-map-o").removeClass("hidden");
    } else {
        $("#" + nID).addClass("hidden");
        $("#tools-" + nID).find("span.span-map-o").addClass("hidden");
        $("#tools-" + nID).find("span.span-commenting-o").removeClass("hidden");
    }
}

function resetAllEntries() {

    var r = window.confirm("Alle Eingaben zurücksetzen?");
    if (r) {
        $('tr:nth-child(3n)').find('td:nth-child(1)').each(function() {
            console.log($(this).html());
            $(this).html('');
        });
        $('tr:nth-child(4n)').find('td:nth-child(1)').each(function() {
            console.log($(this).html());
            $(this).html('');
        });
    }
}

function hashChanged() {
    var cHash = window.location.hash;

    if (lChanged) {
        window.alert("Ungesicherte Inhalte vorhanden, bitte zuerst speichern!");
    } else {
        if (cHash !== '') {
            ActionForURL(cHash.substring(1));
        }
    }
}

// vim: sw=4 ts=4 :
