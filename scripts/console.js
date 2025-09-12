// https://app.slack.com/client/T053ZFRG5/later slack saved items export (console)
	var before_start, after_finished, before_loop, after_element_clicked;
	before_start = 2000;
	after_finished = before_start;
	before_loop = 3000;
	after_element_clicked = before_loop - 1000;
	var elementsToResize = ['body', 'html', '.p-client_container', '.p-ia4_client_container', '.p-ia4_client', '.p-theme_background', '.p-client_workspace_wrapper', '.p-client_workspace', '.p-client_workspace__layout', '.p-view_contents'];
	for (var j = 0; j < elementsToResize.length; j++) {
		var elementToResize = elementsToResize[j];
		document.querySelector(elementToResize).style.setProperty('max-height', '100%', 'important');
		document.querySelector(elementToResize).style.setProperty('height', '100%', 'important');
		document.querySelector(elementToResize).style.setProperty('max-width', '100%', 'important');
		document.querySelector(elementToResize).style.setProperty('width', '100%', 'important');
	}
	//var z = prompt('Set zoom level!');
	document.body.style.zoom = parseFloat(0.05) // Set to 0.1 to get 100, Set to 0.001 to get 1000 and so on
	var allBookmarks = [["SAVED ITEMS"]];//[["Bookmarked Text", "Link"]];
	var allBookmarkMap = new Map();
	setTimeout(function() {
		var targetClass = 'p-saved_item'; // Replace with actual class name
		var targetParam = 'dir'; // Replace with actual parameter name
		var targetParamValue = 'auto'; // Replace with actual parameter value
		var divs = document.querySelectorAll(`.${targetClass}`);
		var divsToBeClicked = document.querySelectorAll('div.c-message_kit__message');
		console.log('Number of bookmarks: ', divs.length);
		var index = 0;
		function loopThroughBookmarks() {
		  setTimeout(function() {   //  call a setTimeout when the loop is called
			var bookmark = [];
			var node = divs[index];
			var divVariable = node;
			var messageNode = divsToBeClicked[index];
			//console.log('divVariable', divVariable);
			//console.log('messageNode', messageNode);
			// sender
			var messageSenderNameElement = divVariable?.querySelector('span[data-qa="message_sender_name"]');
			var messageSenderName = messageSenderNameElement && messageSenderNameElement.innerText;
			// text
			var targetSpan = divVariable?.querySelector('span[dir="auto"]');
			if (!targetSpan) {
			  var truncateSpans = divVariable?.querySelectorAll('span.c-truncate');
			  if (truncateSpans) {
				  targetSpan = truncateSpans.length > 1 ? truncateSpans[1] : truncateSpans[0];
				}
			}
			// var bookmarkedMessage = messageSenderName + ": " + (targetSpan?.innerText ?? "");
			// bookmark.push(bookmarkedMessage);
			// console.table("BOOKMARKED MESSAGE(INFO) -> " + bookmarkedMessage); // Pretty print using console.table
			//click above bookmark to view the thread
			divsToBeClicked[index].click();
			setTimeout(() => {
				// console.log('Element clicked and rendered:');
				var isChannel = document.querySelectorAll('div.p-view_header').length ? true : false;
				var thread = document.querySelectorAll('div.p-block_kit_renderer');
				var threadSenders = document.querySelectorAll('button.c-message__sender_button');
				//console.log('thread', isChannel, thread, threadSenders);
				// element with attribute data-qa-label="later"
				var later = document.querySelectorAll('[data-qa-label="later"]');
				// pull 'a.c-link.c-timestamp' from the first later element only, where the value includes 'archive'
				//var theLinkElement = document.querySelector("a.c-link.c-timestamp[href*='archive']");
				//var theLinkElements = document.querySelectorAll("a.c-link.c-timestamp[href*='archive']");
				//var theLinkL = theLinkElements[theLinkElements.length -1].getAttribute('href');
				//var theLink0 = theLinkElements[0].getAttribute('href');
				//bookmark.push(theLink0);
				//bookmark.push(theLinkL);
				//console.log('LATER', later);
				for (var i = 0; i < later.length; i++) {
					var msg = later[i].innerText?.replace(/\s+/g, ' ')?.trim();
					msg = msg?.substring(0,300);
					var link = later[i].innerHTML;
					var parser = new DOMParser();
					var doc = parser.parseFromString(later[i].innerHTML, 'text/html');
					var href = doc.querySelector('a[href*="archives"]').getAttribute('href');
					bookmark.push(msg);
					bookmark.push(href);
				}
				/* no thread just text
				for (var i = 0; i < thread.length; i++) {
					node = thread[i];
					var text = node.innerText;
					if(isChannel) {
						//console.log(text.includes((targetSpan.innerText).substring(0, targetSpan.innerText.length-1)));
						if(text.includes((targetSpan.innerText).substring(0, targetSpan.innerText.length-1))){
							//console.log(i);
							bookmark.push(text);
							console.log("THREAD MESSAGE(INFO) -> " + text);
							break;
						}
					}
					else {
						//console.log(i);
						var threadMessage = threadSenders[i].innerText + ": " + text;
						bookmark.push(threadMessage);
						console.log("THREAD MESSAGE(INFO) -> " + threadMessage);
					}
				}
				*/
			}, after_element_clicked);
			index++;
			allBookmarks.push(bookmark);
			//if (index < 1) {
			if (index < divs.length) {
			  loopThroughBookmarks();
			}
			else {
				setTimeout(() => {
					function dedupe(data) {
					 const seen = new Set();
					 return data.filter(item => {
					 if (!seen.has(item[0])) {
					 seen.add(item[0]);
					 return true;
					 }
					 return false;
					 });
					}
					function arrayToOtl(data){
					  return data.map(row =>
						row
						.map(String)  // convert every value to String
						.map(v => v.replaceAll('"', '""'))  // escape double quotes
						.map(v => v.replaceAll('Saved for later ', '\r\n'))  // escape double quotes
						.map(v => `${v}`)  // quote it
						.join('\r\n\t')  // next line and tab it
					  ).join('\r\n\r\n');  // rows starting on new lines
					}
					// console.log(arrayToCsv(allBookmarks));
					// console.log("SAVED ITEMS");
					var uniq = dedupe(allBookmarks);
					console.log(arrayToOtl(uniq));
				}, after_finished);
			}
		  }, before_loop)
		}
		loopThroughBookmarks();
	}, before_start); // Adjust delay as needed
