$(document).ready(function () {

	if (window.location.href.indexOf('#') !== -1) {
		window.history.replaceState({}, document.title, window.location.pathname);
	}

	/* General */

	function goToStep(n) {
		$('.sidebar-step').removeClass('current-step');
		$($('.sidebar-step')[n-1]).addClass('current-step');

		$('body').removeClass('page1 page2 page3 page4').addClass('page'+n);

		ga('send', 'event', 'Sidebar', 'click', 'step'+n);
	};

	var currentStep = 1;

	$('#step1').click(function () {
		goToStep(1);
	});

	$('#step2').click(function () {
		goToStep(2);
	});

	$('#step3').click(function () {
		goToStep(3);
	});

	$('#step4').click(function () {
		goToStep(4);
	});

	/* STEP 1 Generate */

	$('#rule-name').click(function () {
		$('#rule-name').removeClass('invalid-input');
	});

	$('#rule-desc').click(function () {
		$('#rule-desc').removeClass('invalid-input');
	});

	$('#rule-xml').click(function () {
		$('#pp-right').removeClass('invalid-input');
	});

	$('#rule-xml').change(function () {
		if($('#rule-xml').val() !== '') {
			$('#pp-upload').css('height', '0px');
			$('#pp-file').attr('disabled', 'true');
			$('#rule-xml').css('height', '130px');
		}
		else {
			$('#pp-upload').css('height', '65px');
			$('#pp-file').removeAttr('disabled');
			$('#rule-xml').css('height', '65px');
		}
	});

	$('#pp-file').change(function (ev) {
		var el = $(ev.target);

		$('#pp-right').removeClass('invalid-input');
		$(el[0].nextSibling.nextSibling.nextSibling.nextSibling).text(el[0].value.substr(12));
		if(el[0].value === '')
			$(el[0].nextSibling.nextSibling.nextSibling.nextSibling).text('No file selected');
	});

	var CHUNK_SIZE = 5 * 1024 * 1024;
	var miLib, mi;
	var processing = false;

	var oParser = new DOMParser();
	var oDOM = '';

	function parseFile(file) {
		if (processing) {
			return;
		}
		processing = true;

		var fileSize = file.size, offset = 0, state = 0, seek = null;
		var statusInterval;

		mi.open_buffer_init(fileSize, offset);

		var processChunk = function(e) {
			var l;
			if (e.target.error === null) {
				var chunk = new Uint8Array(e.target.result);
				l = chunk.length;
				state = mi.open_buffer_continue(chunk, l);
				offset += l;
				chunk = null;
			} else {
				var msg = 'An error happened reading your file!';
				console.err(msg, e.target.error);
				processing = false;
				clearInterval(statusInterval);
				alert(msg);
				return;
			}
			// bit 4 set means finalized
			if ((state >> 3) % 2 !== 0 || offset >= fileSize) {
				var result = mi.inform();
				mi.close();
				generateDone(result);
				processing = false;
				clearInterval(statusInterval);
				return;
			}
			seek(l);
		};

		seek = function(length) {
			if (processing) {
				var r = new FileReader();
				var blob = file.slice(offset, length + offset);
				r.onload = processChunk;
				r.readAsArrayBuffer(blob);
			}
			else {
				mi.close();
				processing = false;
				clearInterval(statusInterval);
			}
		};

		//print status
		statusInterval = window.setInterval(function() {
			console.log((offset / fileSize * 100).toFixed(0));
		}, 1000);

		//start
		seek(CHUNK_SIZE);
	}

	function addAttributes (oDOM) {
  	    $('#attributes-panel').removeClass('disabled-div');

		var attributes = getAttributes(oDOM);

		for(var i = 0; i < attributes.length; i++) {
			addApRow(attributes[i]['tag'], attributes[i]['val']);
		}

		goToStep(2);
		$('#page3').removeClass('disabled-div');
		$('#page4').removeClass('disabled-div');
	}

	function generateDone(xmlFromMediaInfo) {
  	    addAttributes(oParser.parseFromString(xmlFromMediaInfo, "text/xml"));

		ga('send', 'event', 'Step 1 Generate', 'generation', 'success with file');
	}

	var miLib = MediaInfo(function() {
		console.debug('MediaInfo ready');

    	window['miLib'] = miLib; // debug
    	mi = new miLib.MediaInfo();

    	$('#pp-file').removeAttr('disabled');
    	$('#pp-upload').removeClass('disabled-div');
	});

	$('#generate-button').click(function () {
		if ($('#rule-name').val() !== ''
			&& $('#rule-desc').val() !== ''
			&& ($('#pp-file')[0].files.length > 0
				|| $('#rule-xml').val() !== '')) {

			if ($('#rule-xml').val() !== '') {
				oDOM = oParser.parseFromString($('#rule-xml').val(), "text/xml");

				if($(oDOM.documentElement)[0].outerHTML.indexOf('parsererror') === -1){
					addAttributes(oDOM);

					ga('send', 'event', 'Step 1 Generate', 'generation', 'success with xml');
				}
				else {
					ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - invalid xml');
				}
			}
			else {
			  	if ($('#pp-file')[0].files.length > 0) {
			  		parseFile($('#pp-file')[0].files[0]);
			    }
			}
		}
		else {
			if($('#rule-name').val() === '') {
				$('#rule-name').addClass('invalid-input');
				ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - no name');
			}
			if ($('#rule-desc').val() === '') {
				$('#rule-desc').addClass('invalid-input');
				ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - no description');
			}
			if ($('#pp-file')[0].files.length <= 0 && $('#rule-xml').val() === '') {
				$('#pp-right').addClass('invalid-input');
				ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - no file or xml');
			}
		}

		ga('send', 'event', 'Step 1 Generate', 'click', 'generate attributes');
	});

	/* STEP 2 Build */

	var deletedAttributes = [];

	function getAttributes(oDOM) {
		var attributes = [];

		var elements = oDOM.getElementsByTagName("*");

		var element;
		for (var i = 0; i < elements.length; i++) {

			element = $(elements[i])[0];
			if (element.children.length === 0) {
				attributes.push({
					tag: element.tagName,
					val: element.textContent
				});
			}
		}

		return attributes;
	}

	function addApRow(tag, val) {
		$('#ap-main').append('<div class="ap-row"><div class="ap-col ap-col-tag"><input type="text" value="'+tag+'"></div><div class="ap-col ap-col-val"><input type="text" value="'+val+'"><i class="material-icons no-highlight">delete</i></div></div>');

		$('.ap-row:last-of-type .ap-col-val i').click(function (ev) {
			var el = $(ev.target);

			deletedAttributes.push([el[0].parentElement.previousSibling.children[0].text, el[0].previousSibling.text]);

			$(el[0].parentElement.parentElement).remove();

			ga('send', 'event', 'Step 2 Build', 'click', 'remove attribute');
		});
	};

	$('#delete-all-button').click(function() {
		if(confirm("Delete all attributes?")) {
			$('.ap-row').each(function () {
				$(this).remove();
			});

			$('#attributes-panel').addClass('disabled-div');
		}
	});

	$('#ap-footer').click(function () {
		addApRow('', '');

		var apMainViewport = document.getElementById("ap-main");
		apMainViewport.scrollTop = apMainViewport.scrollHeight;
	});

	/* STEP 3 Test */

	/* STEP 4 Submit */

});


