$(document).ready(function () {

	/* General */

	var currentStep = 1;

	$('.sidebar-step').click(function (ev) {
		var el = $(ev.target);

		$('.sidebar-step').removeClass('current-step');
		if(el.hasClass('sidebar-step'))
			el.addClass('current-step');
		else
			$(el[0].parentElement).addClass('current-step');

		if (el.is('#step1') || $(el[0].parentElement).is('#step1')) {
			$('body').removeClass('page2 page3 page4');
			$('body').addClass('page1');

			ga('send', 'event', 'Sidebar', 'click', 'step1');
		}
		else if (el.is('#step2') || $(el[0].parentElement).is('#step2')) {
			$('body').removeClass('page1 page3 page4');
			$('body').addClass('page2');

			ga('send', 'event', 'Sidebar', 'click', 'step2');
		}
		else if (el.is('#step3') || $(el[0].parentElement).is('#step3')) {
			$('body').removeClass('page1 page2 page4');
			$('body').addClass('page3');

			ga('send', 'event', 'Sidebar', 'click', 'step3');
		}
		else if (el.is('#step4') || $(el[0].parentElement).is('#step4')) {
			$('body').removeClass('page1 page2 page3');
			$('body').addClass('page4');

			ga('send', 'event', 'Sidebar', 'click', 'step4');
		}
	});

	/* STEP 1 Generate */

	$('#rule-xml').change(function () {
		if($('#rule-xml').val() !== '') $('#pp-upload').css('display', 'none');
		else $('#pp-upload').css('display', 'block');
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

	function apRow(tag, val) {
		return '<div class="ap-row"><div class="ap-col ap-col-tag"><input type="text" value="'+tag+'"></div><div class="ap-col ap-col-val"><input type="text" value="'+val+'"><i class="material-icons no-highlight">delete</i></div></div>';
	}

	function addApRow(tag, val) {
		$('#ap-main').append(apRow(tag, val));

		$('.ap-row:last-of-type .ap-col-val i').click(function (ev) {
			var el = $(ev.target);

			deletedAttributes.push(apRow(el[0].parentElement.previousSibling.children[0].text, el[0].previousSibling.text));

			$(el[0].parentElement.parentElement).remove();

			ga('send', 'event', 'Step 2 Build', 'click', 'remove attribute');
		});
	};

	$('#generate-button').click(function () {

		var oParser = new DOMParser();
		var oDOM = oParser.parseFromString($('#rule-xml').val().trim(), "text/xml");

		if ($('#rule-name').val() !== ''
			&& $('#rule-desc').val() !== ''
			&& $(oDOM.documentElement)[0].outerHTML.indexOf('parsererror') === -1) {

			$('#attributes-panel').removeClass('disabled-div');

		var attributes = getAttributes(oDOM);

		for(var i = 0; i < attributes.length; i++) {
			addApRow(attributes[i]['tag'], attributes[i]['val']);
		}

		ga('send', 'event', 'Step 2 Build', 'generation', 'success');
	}
	else {
		if($('#rule-name').val() === '') {
			$('#rule-name').addClass('invalid-input');
			ga('send', 'event', 'Step 2 Build', 'generation', 'failure - no title');
		}
		if ($('#rule-desc').val() === '') {
			$('#rule-desc').addClass('invalid-input');
			ga('send', 'event', 'Step 2 Build', 'generation', 'failure - no description');
		}
		if ($(oDOM.documentElement)[0].outerHTML.indexOf('parsererror') !== -1) {
			$('#rule-xml').addClass('invalid-input');
			ga('send', 'event', 'Step 2 Build', 'generation', 'failure - no/invalid xml');
		}
	}

	ga('send', 'event', 'Step 2 Build', 'click', 'generate attributes');
	});

	$('#ap-footer').click(function () {
		addApRow('', '');

		var apMainViewport = document.getElementById("ap-main");
		apMainViewport.scrollTop = apMainViewport.scrollHeight;
	});

	/* STEP 3 Test */

	/* STEP 4 Submit */

});

