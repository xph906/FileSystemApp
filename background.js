chrome.app.runtime.onLaunched.addListener(function(launchData) {
	console.log("LaunchData:"+launchData);
  chrome.app.window.create('index.html', {bounds: {width: 800, height: 500}}, function(win) {
    win.contentWindow.launchData = launchData;
  });
});

chrome.runtime.onConnect.addListener(function(connection) {   
    connection.onMessage.addListener(devToolsListener);
    bg.console.log("[devtools] successfully created tunnel with devtools-page");
    connection.onDisconnect.addListener(function (connection){
        connection.onMessage.removeListener(devToolsListener);
    });
    
});

chrome.runtime.onConnectExternal.addListener(function(port) {
 	port.onMessage.addListener(function(msg) {
		/*
		 *{name:"TimingResult",firstURL:firstURL, resultArr:rsMsg, loadingTime:stdLoadingTime}
		 */
		if(msg.name=="TimingResult"){
			console.log("receive TimingResult msg for :"+msg.firstURL+" with loading time: "+msg.loadingTime);
			console.log("contents: "+msg.resultArr);
			
			chrome.app.window.create('index.html', function(win) {
				win.contentWindow.launchData = msg;
			});
			/*var config = {type: 'saveFile', suggestedName: "timingFile"};
			chrome.fileSystem.chooseEntry(config, 
				function(writableEntry) {
					var blob = new Blob([msg.resultArr], {type: 'text/plain'});
					writeFileEntry(writableEntry, blob, 
						function(e) { console.log('Write Complete');});
			});*/
		}//if	
  });//listener
});
