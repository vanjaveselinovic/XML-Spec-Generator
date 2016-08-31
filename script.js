$(document).ready(function () {
	var mediaInfoLoaded = false;

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

	$('#step1').click(function () {
		if (!$('#page1').hasClass('disabled-div')) goToStep(1);
	});

	$('#step2').click(function () {
		if (!$('#page2').hasClass('disabled-div')) goToStep(2);
	});

	$('#step3').click(function () {
		if (!$('#page3').hasClass('disabled-div')) goToStep(3);
	});

	$('#step4').click(function () {
		if (!$('#page4').hasClass('disabled-div')) goToStep(4);
	});

	/* MediaInfo */

	var CHUNK_SIZE = 5 * 1024 * 1024;
	var miLib, mi;
	var processing = false;

	var oParser = new DOMParser();

	function parseFile(file, step) {
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
				parseDone(result, step);
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

	function parseDone(xmlFromMediaInfo, step) {
		if (step === 1) {
  	    	addAttributes(oParser.parseFromString(xmlFromMediaInfo, "text/xml"));
			ga('send', 'event', 'Step 1 Generate', 'generation', 'success with file');
		}
		else if (step === 3) {
			testAgainstSpec(oParser.parseFromString(xmlFromMediaInfo, "text/xml"));
			ga('send', 'event', 'Step 3 Test', 'generation', 'success with file');
		}
	}

	var miLib = MediaInfo(function() {
		console.debug('MediaInfo ready');

    	window['miLib'] = miLib; // debug
    	mi = new miLib.MediaInfo();

    	$('#pp-file').removeAttr('disabled');
    	$('#pp-upload').removeClass('disabled-div');

    	$('#tp-file').removeAttr('disabled');
    	$('#tp-upload').removeClass('disabled-div');

    	mediaInfoLoaded = true;
	});

	/* STEP 1 Generate */

	$('#rule-name').focus(function () {
		$('#rule-name').removeClass('missing-input');
	});

	$('#rule-desc').focus(function () {
		$('#rule-desc').removeClass('missing-input');
	});

	$('#rule-xml').focus(function () {
		$('#pp-right').removeClass('missing-input invalid-input');
	});

	$('#rule-xml').change(function () {
		if ($('#rule-xml').val() !== '') {
			$('#pp-upload').css('height', '0px');
			if (mediaInfoLoaded) $('#pp-file').attr('disabled', 'true');
			$('#rule-xml').css('height', '130px');
		}
		else {
			$('#pp-upload').css('height', '65px');
			if (mediaInfoLoaded) $('#pp-file').removeAttr('disabled');
			$('#rule-xml').css('height', '65px');
		}
	});

	$('#pp-file').change(function (ev) {
		var el = $(ev.target);

		$('#pp-right').removeClass('missing-input');
		$('#pp-selected-file').text(el[0].value.substr(12));
		if (el[0].value === '')
			$('#pp-selected-file').text('No file selected');
	});

	function getAttributes(oDOM) {
		var tracks = [];

		var elements = oDOM.getElementsByTagName("track");

		var track, attribute;
		for (var j = 0; j < elements.length; j++) {
			track = $(elements[j])[0];

			if ($(track)[0].children.length !== 0 && $(track)[0].attributes.type !== undefined) {
				tracks.push({
					type: $(track)[0].attributes.type.value,
					attributes: []
				});

				for (var i = 0; i < $(track)[0].children.length; i++) {
					attribute = $($(track)[0].children[i])[0];

					if (attribute.children.length === 0) {
						tracks[j].attributes.push({
							tag: attribute.tagName,
							val: attribute.textContent
						});
					}
				}
			}
		}

		return tracks;
	}

	function addAttributes (oDOM) {
		var tracks = getAttributes(oDOM);

		function doAddAttributes () {
			$('#ap-main').empty();
  	    	$('#page2').removeClass('disabled-div');

			for (var j = 0; j < tracks.length; j++) {
				addApTrack(tracks[j].type);
				for (var i = 0; i < tracks[j].attributes.length; i++) {
					addApRow(tracks[j].attributes[i].tag, tracks[j].attributes[i].val);
				}
			}

			goToStep(2);
			$('#page3, #page4').removeClass('disabled-div');
			$('#tp-xml, #test-button, #download-button, #submit-button').removeAttr('disabled');
			if (mediaInfoLoaded) $('#tp-file').removeAttr('disabled');

			$('html, body, #wrapper').animate({
		        scrollTop: $("#page2").offset().top
		    }, 200);

		    ga('send', 'event', 'Step 1 Generate', 'generation', 'success with xml');
		}

		if (tracks.length > 0) {
		    if($('.ap-row').length - $('.ap-track').length === 0) doAddAttributes();
			else {
				if (confirm("Overwrite existing attributes?")) {
					doAddAttributes();
					ga('send', 'event', 'Step 1 Generate', 'overwrite', 'accepted');
				}
				else {
					ga('send', 'event', 'Step 1 Generate', 'overwrite', 'rejected');
				}
			}
		}
		else {
			$('#pp-right').addClass('invalid-input');
			ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - invalid xml');
		}
	}

	$('#generate-button').click(function () {
		if ($('#rule-name').val() !== ''
			&& $('#rule-desc').val() !== ''
			&& ($('#pp-file')[0].files.length > 0
				|| $('#rule-xml').val() !== '')) {

			if ($('#rule-xml').val() !== '') {
				var oDOM = oParser.parseFromString($('#rule-xml').val(), "text/xml");

				if ($(oDOM.documentElement)[0].outerHTML.indexOf('parsererror') === -1){
					addAttributes(oDOM);
				}
				else {
					$('#pp-right').addClass('invalid-input');

					ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - invalid xml');
				}
			}
			else if ($('#pp-file')[0].files.length > 0) {
			  	parseFile($('#pp-file')[0].files[0], 1);
			}

		}
		else {
			if ($('#rule-name').val() === '') {
				$('#rule-name').addClass('missing-input');
				ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - no name');
			}
			if ($('#rule-desc').val() === '') {
				$('#rule-desc').addClass('missing-input');
				ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - no description');
			}
			if ($('#pp-file')[0].files.length <= 0 && $('#rule-xml').val() === '') {
				$('#pp-right').addClass('missing-input');
				ga('send', 'event', 'Step 1 Generate', 'generation', 'failure - no file or xml');
			}
		}

		ga('send', 'event', 'Step 1 Generate', 'click', 'generate attributes');
	});

	/* STEP 2 Build */

	var deletedAttributes = [];

	function addApTrack(type) {
		$('#ap-main').append('<div class="ap-row ap-track">'+type+' Track</div>');
	}

	function addApRow(tag, val) {
		$('#ap-main').append('<div class="ap-row"><div class="ap-col ap-col-tag"><input type="text" value="'+tag+'" tabindex="24"></div><div class="ap-col ap-col-val"><input type="text" value="'+val+'" tabindex="24"><i class="material-icons no-highlight">delete</i></div></div>');

		$('.ap-row:last-of-type .ap-col-val i').click(function (ev) {
			var el = $(ev.target);

			deletedAttributes.push([el[0].parentElement.previousSibling.children[0].text, el[0].previousSibling.text]);

			$(el[0].parentElement.parentElement).remove();

			if ($('.ap-row').length - $('.ap-track').length === 0) {
				$('#page2, #page3, #page4').addClass('disabled-div');
				goToStep(1);
				$('html, body, #wrapper').animate({
	                scrollTop: $("#page2").offset().top
	            }, 200);
			}

			ga('send', 'event', 'Step 2 Build', 'click', 'remove attribute');
		});
	};

	$('#delete-all-button').click(function() {
		if (confirm("Delete all attributes?")) {
			$('.ap-row').each(function () {
				$(this).remove();
			});

			$('#page2').addClass('disabled-div');
			goToStep(1);
			$('html, body, #wrapper').animate({
                scrollTop: $("#page2").offset().top
            }, 200);
		}
	});

	$('#ap-footer').click(function () {
		addApRow('', '');

		var apMainViewport = document.getElementById("ap-main");
		apMainViewport.scrollTop = apMainViewport.scrollHeight;
	});

	/* STEP 3 Test */

	$('#tp-xml').focus(function () {
		$('#test-panel').removeClass('missing-input invalid-input');
	});

	$('#tp-xml').change(function () {
		if ($('#tp-xml').val() !== '') {
			$('#tp-upload').css('height', '0px');
			if (mediaInfoLoaded) $('#tp-file').attr('disabled', 'true');
			$('#tp-xml').css('height', '150px');
		}
		else {
			$('#tp-upload').css('height', '80px');
			if (mediaInfoLoaded) $('#tp-file').removeAttr('disabled');
			$('#tp-xml').css('height', '150px');
		}
	});

	$('#tp-file').change(function (ev) {
		var el = $(ev.target);

		$('#test-panel').removeClass('missing-input');
		$('#tp-selected-file').text(el[0].value.substr(12));
		if (el[0].value === '')
			$('#tp-selected-file').text('No file selected');
	});

	function testAgainstSpec(oDOM) {
		var spec = {};
		var currentTrack = '';

		$('.ap-row').each(function () {
			if ($(this).hasClass('ap-track')) {
				currentTrack = $(this)[0].textContent.split(' ')[0];
				spec[currentTrack] = {};
			}
			else {
				spec[currentTrack][$(this)[0].children[0].children[0].value] = $(this)[0].children[1].children[0].value;
			}
		});

		var testTracks = getAttributes(oDOM);

		var failSpec = JSON.parse(JSON.stringify(spec));

		for (var track in spec) {
			for (var j = 0; j < testTracks.length; j++) {
				if (testTracks[j].type === track) {
					for (var attribute in spec[track]) {
						for (var i = 0; i < testTracks[j].attributes.length; i++) {
							if (testTracks[j].attributes[i]['tag'] === attribute) {
								if (spec[track][attribute] === testTracks[j].attributes[i]['val']) {
									delete failSpec[track][attribute];
								}
							}
						}
					}
				}
			}
		}

		for (var track in spec) {
			if (Object.keys(failSpec[track]).length === 0) delete failSpec[track];
		}

		if (Object.keys(failSpec).length === 0) {
			$('#fail-panel').css('display', 'none');
			$('#pass-panel').css('display', 'block');
		}
		else {
			function addMissingAttribute(track, tag) {
				$('#fail-attributes').append('<div class="fail-attribute"><div class="fail-track">'+track+'</div>'+tag+'<i class="material-icons attribute-missing-icon">block</i></div>');
			}

			function addWrongAttribute(track, tag) {
				$('#fail-attributes').append('<div class="fail-attribute"><div class="fail-track">'+track+'</div>'+tag+'<i class="material-icons attribute-wrong-icon">error_outline</i></div>');
			}

			var attributesMissing = JSON.parse(JSON.stringify(failSpec));

			for (var track in failSpec) {
				for (var j = 0; j < testTracks.length; j++) {
					if (testTracks[j].type === track) {
						for (var attribute in failSpec[track]) {
							for (var i = 0; i < testTracks[j].attributes.length; i++) {
								if (testTracks[j].attributes[i]['tag'] === attribute) {
									delete attributesMissing[track][attribute];
								}
							}
						}
					}
				}
			}

			$('#fail-attributes').empty();

			for (var track in failSpec) {
				for (var attribute in failSpec[track]) {
					if (attribute in attributesMissing[track]) addMissingAttribute(track, attribute);
					else addWrongAttribute(track, attribute);
				}
			}

			$('#pass-panel').css('display', 'none');
			$('#fail-panel').css('display', 'block');
		}
	}

	$('#test-button').click(function () {
		goToStep(3);

		if ($('#tp-xml').val() !== '') {
			var oDOM = oParser.parseFromString($('#tp-xml').val(), "text/xml");

			if ($(oDOM.documentElement)[0].outerHTML.indexOf('parsererror') === -1){
				testAgainstSpec(oDOM);

				ga('send', 'event', 'Step 3 Test', 'generation', 'success with xml');
			}
			else {
				$('#test-panel').addClass('invalid-input');

				ga('send', 'event', 'Step 3 Test', 'generation', 'failure - invalid xml');
			}
		}
		else if ($('#tp-file')[0].files.length > 0) {
		  	parseFile($('#tp-file')[0].files[0], 3);
		}
		else {
			$('#test-panel').addClass('missing-input');
			ga('send', 'event', 'Step 3 Test', 'generation', 'failure - no file or xml');
		}

		ga('send', 'event', 'Step 3 Test', 'click', 'test file/xml against spec');
	});

	/* STEP 4 Submit */

	$('#download-button').click(function () {
		var xmlString = '';

		xmlString += '<rule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="IMX30" xsi:noNamespaceSchemaLocation="multiType.xsd"><validator>com.signiant.compliance.validation.impl.MultiTypeFileValidator</validator>';

		var firstTrack = true;
		$('.ap-row').each(function () {
			if ($(this).hasClass('ap-track')) {
				if (firstTrack) {
					xmlString+='<track type="'+$(this)[0].textContent.split(' ')[0]+'">';
					firstTrack = false;
				}
				else {
					xmlString+='</track><track type="'+$(this)[0].textContent.split(' ')[0]+'">';
				}
			}
			else {
				xmlString+='<attribute name="'+$(this)[0].children[0].children[0].value+'"><value>';
				xmlString+=$(this)[0].children[1].children[0].value;
				xmlString+='</value></attribute>';
			}
		});

		xmlString += '</track></rule>';

		var a = document.createElement('a');
		a.style.display = 'none';
		var blob = new Blob([xmlString], {type: 'text/xml'});
		var filename = 'CloudSpeX Rule Generator - '+$('#rule-name').val()+'.xml';

	    if (window.navigator.msSaveOrOpenBlob)
	        window.navigator.msSaveOrOpenBlob(blob, filename);
	    else {
	        var url = URL.createObjectURL(blob);
	        a.href = url;
	        a.download = filename;
	        document.body.appendChild(a);
	        a.click();
	        setTimeout(function() {
	            document.body.removeChild(a);
	            window.URL.revokeObjectURL(url);  
	        }, 0); 
	    }
	});

	$('#submit-button').click(function () {
		var email = 'temp@temp.com';
		var subject = '?subject=CloudSpeX Rule Generator Submission';
		var body = '&body=Name: '+$('#rule-name').val()+'%0A%0ADescription: '+$('#rule-desc').val().replace('\n', '%0A');
		window.location.href = 'mailto:'+email+subject+body;
	});
});


